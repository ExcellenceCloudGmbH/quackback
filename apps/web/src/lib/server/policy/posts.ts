/**
 * Post view + create authorization.
 *
 * Composes with policy.boards — a post is never visible if its board
 * isn't visible, and create is always denied when view is denied.
 */
import { and, eq, or, sql, type SQL } from 'drizzle-orm'
import { posts, type AccessTier, type BoardAccess, type ModerationState } from '@/lib/server/db'
import type { PrincipalId } from '@quackback/ids'
import { allowDecision, denyDecision, isTeamActor, type Actor, type Decision } from './types'
import { canViewBoard, boardViewFilter } from './boards'
import { tierAllows } from './access'

/** The workspace moderation policy. Boards no longer have a per-board override. */
export type RequireApproval = 'none' | 'anonymous' | 'authenticated' | 'all'

interface PostShape {
  moderationState: ModerationState
  principalId?: PrincipalId | null
}

interface BoardShape {
  access: BoardAccess
}

const isTeam = isTeamActor

export function canViewPost(actor: Actor, post: PostShape, board: BoardShape): Decision {
  const boardDecision = canViewBoard(actor, board)
  if (!boardDecision.allowed) return boardDecision

  if (isTeam(actor)) {
    return post.moderationState === 'deleted' ? denyDecision('Post was removed') : allowDecision()
  }

  if (post.moderationState === 'published') return allowDecision()
  if (
    post.moderationState === 'pending' &&
    actor.principalId &&
    post.principalId === actor.principalId
  ) {
    return allowDecision()
  }
  return denyDecision('Post is not yet visible')
}

/**
 * SQL predicate for post list queries. Caller must join `boards` so
 * that boards.access is resolvable. The predicate composes WITH
 * `isNull(posts.deletedAt)` from existing list queries — never replaces it.
 */
export function postViewFilter(actor: Actor): SQL {
  if (isTeam(actor)) {
    return sql`${posts.moderationState} <> 'deleted'`
  }
  const principalIdParam: string | null = actor.principalId ?? null
  const ownPending =
    principalIdParam !== null
      ? and(eq(posts.moderationState, 'pending'), eq(posts.principalId, principalIdParam as never))
      : sql`false`
  return and(boardViewFilter(actor), or(eq(posts.moderationState, 'published'), ownPending))!
}

/**
 * Whether the requesting actor can post a comment on a post.
 *
 * Rules (applied in order):
 * 1. The actor must be able to view the post (board audience + moderation state).
 * 2. If comments are locked, only team members may bypass.
 */
export function canCreateComment(
  actor: Actor,
  post: PostShape & { isCommentsLocked: boolean },
  board: BoardShape
): Decision {
  const view = canViewPost(actor, post, board)
  if (!view.allowed) return view
  if (post.isCommentsLocked && !isTeam(actor)) {
    return denyDecision('Comments are locked on this post')
  }
  return allowDecision()
}

export type CreateDecision =
  | { allowed: true; requiresApproval: boolean }
  | { allowed: false; reason: string }

function submitDenyMessage(tier: AccessTier): string {
  switch (tier) {
    case 'anonymous':
      // Unreachable in practice — tierAllows('anonymous', …) always passes.
      return 'Submissions are not accepted on this board'
    case 'authenticated':
      return 'Sign in to submit on this board'
    case 'segments':
      return 'Only specific groups can submit on this board'
    case 'team':
      return 'Only team members can submit on this board'
  }
}

export function canCreatePost(
  actor: Actor,
  board: BoardShape,
  workspaceApproval: RequireApproval | undefined
): CreateDecision {
  // Submit is its own decision — a board can be public to view but
  // team-only to submit (admin-curated roadmap pattern). Gate on
  // access.submit directly rather than delegating to canViewBoard.
  if (!tierAllows(actor, board.access.submit, board.access.segmentIds)) {
    return { allowed: false, reason: submitDenyMessage(board.access.submit) }
  }

  // Team always bypasses the moderation queue.
  if (isTeam(actor)) {
    return { allowed: true, requiresApproval: false }
  }

  // Approval is the OR of the workspace policy and the per-board override.
  const requireApproval = workspaceApproval ?? 'none'
  const wsRequires =
    requireApproval === 'all' ||
    (requireApproval === 'anonymous' && actor.principalType !== 'user') ||
    (requireApproval === 'authenticated' && actor.principalType === 'user')

  return { allowed: true, requiresApproval: wsRequires || board.access.approval.posts }
}
