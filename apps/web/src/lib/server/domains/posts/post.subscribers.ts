/**
 * The people subscribed to a post, and a teammate adding or removing someone.
 * The one service the admin server fns, the REST API and the MCP tools all
 * call, so every surface applies the same rules:
 *
 * - Reading the list is `post.view_private` on a post the caller can see: it
 *   names customers next to their addresses, like the voters list.
 * - Changing someone else's subscription is `post.vote_on_behalf`, the
 *   permission that already lets a teammate act for a customer on a post
 *   (voting for them, and changing the subscription a vote made).
 * - Only someone with an account who can see the post can be added. Post
 *   notifications go to an account's address, and someone who can't see the
 *   post would otherwise get its title and comment previews by email.
 *
 * A subscription covers the whole thread (the post and the posts merged into
 * it), so adding someone already following any of them is a clean no-op, and
 * removing them removes every row in the thread. Following a post yourself
 * stays the bell's job (functions/subscriptions.ts).
 */
import { db, and, asc, eq, sql, postSubscriptions, principal, user } from '@/lib/server/db'
import { toUuid, type PostId, type PrincipalId } from '@quackback/ids'
import { can } from '@/lib/server/policy/authorize'
import type { Actor } from '@/lib/server/policy/types'
import { PERMISSIONS, type PermissionKey } from '@/lib/shared/permissions'
import { isTeamMember } from '@/lib/shared/roles'
import { realEmail } from '@/lib/shared/anonymous-email'
import { ForbiddenError, ValidationError } from '@/lib/shared/errors'
import { notTestPrincipal } from '@/lib/server/test-data'
import { resolveUserAvatarUrl } from '@/lib/server/domains/principals/principal-display'
import { createActivity } from '@/lib/server/domains/activity/activity.service'
import {
  getSubscriptionStatus,
  subscribeToPost,
  unsubscribeFromPost,
} from '@/lib/server/domains/subscriptions/subscription.service'
import {
  levelFromFlags,
  type SubscriptionLevel,
  type SubscriptionReason,
} from '@/lib/server/domains/subscriptions/subscription.types'
import { relatedPostIdsSql } from './post.merge-ids'
import { assertPostViewable, principalsWhoCanViewPost } from './post.access'

/** Someone subscribed to a post, as the team sees them. */
export interface PostSubscriberInfo {
  principalId: PrincipalId
  displayName: string | null
  email: string | null
  avatarUrl: string | null
  isTeamMember: boolean
  reason: SubscriptionReason
  level: SubscriptionLevel
  /** False for someone who lost sight of the post: kept, but not notified. */
  canView: boolean
  createdAt: Date
}

function assertCan(actor: Actor, permission: PermissionKey, action: string): void {
  if (!can(actor, permission)) throw new ForbiddenError('FORBIDDEN', `You cannot ${action}`)
}

async function assertCanManageSubscribers(postId: PostId, actor: Actor): Promise<void> {
  assertCan(actor, PERMISSIONS.POST_VOTE_ON_BEHALF, "change this post's subscribers")
  await assertPostViewable(postId, actor)
}

async function displayName(principalId: PrincipalId): Promise<string | null> {
  const [row] = await db
    .select({ displayName: principal.displayName })
    .from(principal)
    .where(eq(principal.id, principalId))
    .limit(1)
  return row?.displayName ?? null
}

/** Everyone subscribed to the post's thread, oldest subscription first. */
export async function listPostSubscribers(
  postId: PostId,
  actor: Actor
): Promise<PostSubscriberInfo[]> {
  assertCan(actor, PERMISSIONS.POST_VIEW_PRIVATE, "see this post's subscribers")
  await assertPostViewable(postId, actor)
  const rows = await db
    .select({
      principalId: postSubscriptions.principalId,
      postId: postSubscriptions.postId,
      reason: postSubscriptions.reason,
      notifyComments: postSubscriptions.notifyComments,
      notifyStatusChanges: postSubscriptions.notifyStatusChanges,
      createdAt: postSubscriptions.createdAt,
      displayName: principal.displayName,
      role: principal.role,
      avatarUrl: principal.avatarUrl,
      avatarKey: principal.avatarKey,
      email: user.email,
      userImage: user.image,
      userImageKey: user.imageKey,
    })
    .from(postSubscriptions)
    .innerJoin(principal, eq(principal.id, postSubscriptions.principalId))
    .leftJoin(user, eq(user.id, principal.userId))
    .where(
      and(
        sql`${postSubscriptions.postId} IN ${relatedPostIdsSql(toUuid(postId))}`,
        notTestPrincipal(postSubscriptions.principalId)
      )
    )
    .orderBy(asc(postSubscriptions.createdAt))

  // One entry per person: a row on the post and one on a merged source are the
  // same subscription to the thread, notified at the wider of the two levels.
  const byPrincipal = new Map<string, (typeof rows)[number]>()
  for (const row of rows) {
    const seen = byPrincipal.get(row.principalId)
    if (!seen) {
      byPrincipal.set(row.principalId, { ...row })
      continue
    }
    seen.notifyComments ||= row.notifyComments
    seen.notifyStatusChanges ||= row.notifyStatusChanges
    if (row.postId === postId) seen.reason = row.reason
  }
  const people = [...byPrincipal.values()]
  const visible = await principalsWhoCanViewPost(
    postId,
    people.map((p) => p.principalId)
  )
  return people.map((p) => ({
    principalId: p.principalId,
    displayName: p.displayName,
    email: realEmail(p.email),
    avatarUrl: resolveUserAvatarUrl({
      userImage: p.userImage,
      userImageKey: p.userImageKey,
      principalAvatarUrl: p.avatarUrl,
      principalAvatarKey: p.avatarKey,
    }),
    isTeamMember: isTeamMember(p.role),
    reason: p.reason as SubscriptionReason,
    level: levelFromFlags(p.notifyComments, p.notifyStatusChanges),
    canView: visible.has(p.principalId),
    createdAt: p.createdAt,
  }))
}

/**
 * A teammate subscribes someone to a post (reason 'added'). Refuses someone
 * without an account (INVALID_SUBSCRIBER) or who can't see the post
 * (SUBSCRIBER_CANNOT_SEE_POST). Someone already following the thread is left
 * as they are, level included.
 */
export async function addPostSubscriber(
  postId: PostId,
  principalId: PrincipalId,
  actor: Actor,
  opts?: { level?: Exclude<SubscriptionLevel, 'none'> }
): Promise<{ added: boolean }> {
  await assertCanManageSubscribers(postId, actor)
  const [target] = await db
    .select({ type: principal.type, userId: principal.userId })
    .from(principal)
    .where(eq(principal.id, principalId))
    .limit(1)
  if (!target || target.type !== 'user' || !target.userId) {
    throw new ValidationError(
      'INVALID_SUBSCRIBER',
      'Only someone with an account can be subscribed to a post'
    )
  }
  if (!(await principalsWhoCanViewPost(postId, [principalId])).has(principalId)) {
    throw new ValidationError('SUBSCRIBER_CANNOT_SEE_POST', 'This person cannot see this post')
  }
  if ((await getSubscriptionStatus(principalId, postId)).subscribed) return { added: false }
  const added = await subscribeToPost(principalId, postId, 'added', { level: opts?.level })
  if (added && principalId !== actor.principalId) {
    createActivity({
      postId,
      principalId: actor.principalId ?? null,
      type: 'subscriber.added',
      metadata: { subscriberName: await displayName(principalId) },
    })
  }
  return { added }
}

/**
 * A teammate unsubscribes someone from a post's thread, whatever made them
 * follow it. A clean no-op for someone who doesn't follow it.
 */
export async function removePostSubscriber(
  postId: PostId,
  principalId: PrincipalId,
  actor: Actor
): Promise<{ removed: boolean }> {
  await assertCanManageSubscribers(postId, actor)
  if (!(await getSubscriptionStatus(principalId, postId)).subscribed) return { removed: false }
  await unsubscribeFromPost(principalId, postId)
  if (principalId !== actor.principalId) {
    createActivity({
      postId,
      principalId: actor.principalId ?? null,
      type: 'subscriber.removed',
      metadata: { subscriberName: await displayName(principalId) },
    })
  }
  return { removed: true }
}
