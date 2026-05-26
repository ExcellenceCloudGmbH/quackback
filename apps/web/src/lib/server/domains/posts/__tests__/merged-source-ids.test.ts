/**
 * `listViewableMergedSourceIds` — the per-actor allowlist of post ids
 * that have been merged into a given canonical and whose board the
 * actor is entitled to view.
 *
 * Without this gate, the post-detail SQL's `WHERE c.post_id IN (...
 * UNION ALL SELECT id FROM posts WHERE canonical_post_id = $1)` would
 * union in comments from every merged source, including ones from
 * team-only / segment-restricted boards.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateId, type PrincipalId, type SegmentId } from '@quackback/ids'
import type { Actor } from '@/lib/server/policy'

const mockWhere = vi.fn()
const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere })
const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin })
const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

vi.mock('@/lib/server/db', () => ({
  db: {
    select: (...a: unknown[]) => mockSelect(...a),
  },
  posts: {
    id: 'posts.id',
    boardId: 'posts.board_id',
    canonicalPostId: 'posts.canonical_post_id',
    deletedAt: 'posts.deleted_at',
  },
  boards: { id: 'boards.id', audience: 'boards.audience' },
  eq: vi.fn((col, val) => ({ eq: [col, val] })),
  and: vi.fn((...parts) => ({ and: parts })),
  isNull: vi.fn((col) => ({ isNull: col })),
}))

function actor(overrides: Partial<Actor> = {}): Actor {
  return {
    principalId: 'prn_test' as PrincipalId,
    role: 'user',
    principalType: 'user',
    segmentIds: new Set<SegmentId>(),
    ...overrides,
  }
}

const CANON_ID = generateId('post')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('listViewableMergedSourceIds', () => {
  it('drops merged sources whose board is team-only when the actor is anonymous', async () => {
    mockWhere.mockResolvedValueOnce([
      { id: 'post_src_pub', audience: { kind: 'public' } },
      { id: 'post_src_team', audience: { kind: 'team' } },
    ])
    const { listViewableMergedSourceIds } = await import('../post.public.detail')
    const ids = await listViewableMergedSourceIds(CANON_ID, actor())
    expect(ids).toEqual(['post_src_pub'])
  })

  it('keeps a segments-audience source only when the actor is a member', async () => {
    mockWhere.mockResolvedValueOnce([
      { id: 'post_src_in', audience: { kind: 'segments', segmentIds: ['seg_a'] } },
      { id: 'post_src_out', audience: { kind: 'segments', segmentIds: ['seg_b'] } },
    ])
    const { listViewableMergedSourceIds } = await import('../post.public.detail')
    const ids = await listViewableMergedSourceIds(
      CANON_ID,
      actor({ segmentIds: new Set(['seg_a' as SegmentId]) })
    )
    expect(ids).toEqual(['post_src_in'])
  })

  it('returns every source id for a team actor regardless of audience', async () => {
    mockWhere.mockResolvedValueOnce([
      { id: 'post_src_pub', audience: { kind: 'public' } },
      { id: 'post_src_team', audience: { kind: 'team' } },
      { id: 'post_src_seg', audience: { kind: 'segments', segmentIds: ['seg_x'] } },
    ])
    const { listViewableMergedSourceIds } = await import('../post.public.detail')
    const ids = await listViewableMergedSourceIds(CANON_ID, actor({ role: 'admin' }))
    expect(ids.sort()).toEqual(['post_src_pub', 'post_src_seg', 'post_src_team'].sort())
  })

  it('returns an empty array when no merged sources exist', async () => {
    mockWhere.mockResolvedValueOnce([])
    const { listViewableMergedSourceIds } = await import('../post.public.detail')
    const ids = await listViewableMergedSourceIds(CANON_ID, actor())
    expect(ids).toEqual([])
  })

  it('keeps authenticated-audience sources for any signed-in user', async () => {
    mockWhere.mockResolvedValueOnce([{ id: 'post_src_auth', audience: { kind: 'authenticated' } }])
    const { listViewableMergedSourceIds } = await import('../post.public.detail')
    const ids = await listViewableMergedSourceIds(
      CANON_ID,
      actor({ role: 'user', principalType: 'user' })
    )
    expect(ids).toEqual(['post_src_auth'])
  })

  it('drops authenticated-audience sources for anonymous principals', async () => {
    mockWhere.mockResolvedValueOnce([{ id: 'post_src_auth', audience: { kind: 'authenticated' } }])
    const { listViewableMergedSourceIds } = await import('../post.public.detail')
    const ids = await listViewableMergedSourceIds(
      CANON_ID,
      actor({ role: 'user', principalType: 'anonymous' })
    )
    expect(ids).toEqual([])
  })
})
