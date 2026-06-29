import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ChangelogId, PrincipalId } from '@quackback/ids'

const mockEntryFindFirst = vi.fn()
const mockUpdateSet = vi.fn()
const mockInsertValues = vi.fn()
const mockChangelogEntryPostsFindMany = vi.fn()

vi.mock('@/lib/server/db', () => ({
  db: {
    query: {
      changelogEntries: {
        findFirst: (...args: unknown[]) => mockEntryFindFirst(...args),
      },
      changelogEntryPosts: {
        findMany: (...args: unknown[]) => mockChangelogEntryPostsFindMany(...args),
      },
      principal: { findFirst: vi.fn().mockResolvedValue(null) },
      postStatuses: { findFirst: vi.fn().mockResolvedValue(null) },
    },
    insert: () => ({
      values: (values: unknown) => {
        mockInsertValues(values)
        return {
          returning: () => Promise.resolve([{ id: ENTRY_ID, title: 'Release', content: 'Body' }]),
        }
      },
    }),
    update: () => ({
      set: (values: unknown) => {
        mockUpdateSet(values)
        return { where: vi.fn().mockResolvedValue(undefined) }
      },
    }),
    delete: () => ({ where: vi.fn().mockResolvedValue(undefined) }),
  },
  changelogEntries: { id: 'id', publishedAt: 'published_at', deletedAt: 'deleted_at' },
  changelogEntryPosts: { changelogEntryId: 'changelog_entry_id', postId: 'post_id' },
  posts: { id: 'posts.id' },
  principal: { id: 'principal.id' },
  postStatuses: { id: 'postStatuses.id' },
  eq: vi.fn(),
  and: vi.fn(),
  isNull: vi.fn(),
  inArray: vi.fn(),
}))

vi.mock('@/lib/server/content/rehost-images', () => ({
  rehostExternalImages: vi.fn(async (json: unknown) => json),
}))
vi.mock('@/lib/server/events/dispatch', () => ({
  buildEventActor: vi.fn(() => ({ type: 'user' })),
  dispatchChangelogPublished: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/server/events/scheduler', () => ({
  scheduleDispatch: vi.fn().mockResolvedValue(undefined),
  cancelScheduledDispatch: vi.fn().mockResolvedValue(undefined),
}))

const ENTRY_ID = 'changelog_01test' as ChangelogId
const AUTHOR = { principalId: 'principal_01author' as PrincipalId, name: 'Author' }

function baseEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: ENTRY_ID,
    title: 'Release',
    content: 'Body',
    contentJson: null,
    principalId: null,
    publishedAt: new Date('2025-06-01T12:00:00Z'),
    displayDate: null,
    notifiedAt: null,
    createdAt: new Date('2025-06-01T10:00:00Z'),
    updatedAt: new Date('2025-06-01T10:00:00Z'),
    deletedAt: null,
    viewCount: 0,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockChangelogEntryPostsFindMany.mockResolvedValue([])
  mockEntryFindFirst.mockResolvedValue(baseEntry())
})

describe('notifiedAt - createChangelog', () => {
  it('stamps notifiedAt and dispatches when published immediately', async () => {
    const { createChangelog } = await import('../changelog.service')
    const { dispatchChangelogPublished } = await import('@/lib/server/events/dispatch')

    await createChangelog({ title: 'X', content: 'Y', publishState: { type: 'published' } }, AUTHOR)

    const inserted = mockInsertValues.mock.calls[0]![0] as Record<string, unknown>
    expect(inserted.notifiedAt).toBeInstanceOf(Date)
    expect(dispatchChangelogPublished).toHaveBeenCalledTimes(1)
  })

  it('leaves notifiedAt unset and does not dispatch when scheduled', async () => {
    const { createChangelog } = await import('../changelog.service')
    const { dispatchChangelogPublished } = await import('@/lib/server/events/dispatch')
    const { scheduleDispatch } = await import('@/lib/server/events/scheduler')

    await createChangelog(
      {
        title: 'X',
        content: 'Y',
        publishState: { type: 'scheduled', publishAt: new Date(Date.now() + 86_400_000) },
      },
      AUTHOR
    )

    const inserted = mockInsertValues.mock.calls[0]![0] as Record<string, unknown>
    expect(inserted.notifiedAt).toBeUndefined()
    expect(dispatchChangelogPublished).not.toHaveBeenCalled()
    expect(scheduleDispatch).toHaveBeenCalledTimes(1)
  })

  it('leaves notifiedAt unset and does not dispatch when draft', async () => {
    const { createChangelog } = await import('../changelog.service')
    const { dispatchChangelogPublished } = await import('@/lib/server/events/dispatch')

    await createChangelog({ title: 'X', content: 'Y', publishState: { type: 'draft' } }, AUTHOR)

    const inserted = mockInsertValues.mock.calls[0]![0] as Record<string, unknown>
    expect(inserted.notifiedAt).toBeUndefined()
    expect(dispatchChangelogPublished).not.toHaveBeenCalled()
  })
})

describe('notifiedAt - updateChangelog', () => {
  it('stamps notifiedAt and dispatches on first publish', async () => {
    const { updateChangelog } = await import('../changelog.service')
    const { dispatchChangelogPublished } = await import('@/lib/server/events/dispatch')

    // Existing entry is a draft that has never been notified.
    mockEntryFindFirst.mockResolvedValue(baseEntry({ publishedAt: null, notifiedAt: null }))

    await updateChangelog(ENTRY_ID, { publishState: { type: 'published' } })

    const updatePayload = mockUpdateSet.mock.calls[0]![0] as Record<string, unknown>
    expect(updatePayload.notifiedAt).toBeInstanceOf(Date)
    expect(dispatchChangelogPublished).toHaveBeenCalledTimes(1)
  })

  it('does not re-notify an already-notified entry', async () => {
    const { updateChangelog } = await import('../changelog.service')
    const { dispatchChangelogPublished } = await import('@/lib/server/events/dispatch')

    // Already published and announced previously.
    mockEntryFindFirst.mockResolvedValue(
      baseEntry({ notifiedAt: new Date('2025-06-01T12:00:00Z') })
    )

    await updateChangelog(ENTRY_ID, { publishState: { type: 'published' } })

    const updatePayload = mockUpdateSet.mock.calls[0]![0] as Record<string, unknown>
    expect(updatePayload).not.toHaveProperty('notifiedAt')
    expect(dispatchChangelogPublished).not.toHaveBeenCalled()
  })
})
