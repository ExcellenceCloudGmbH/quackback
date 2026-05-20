/**
 * ticket.threads — verifies first-response timestamp behaviour and audience
 * filtering in `listThreads`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const ticketFindFirstMock = vi.fn()
const sharesFindFirstMock = vi.fn()
const insertThreadsReturningMock = vi.fn()
const insertActivityReturningMock = vi.fn()
const updateChainSetMock = vi.fn().mockReturnThis()
const updateTicketChainWhereMock = vi.fn().mockResolvedValue(undefined)

vi.mock('@/lib/server/db', () => {
  const insertChain = (which: 'threads' | 'activity') => ({
    values: vi.fn().mockReturnThis(),
    returning: which === 'threads' ? insertThreadsReturningMock : insertActivityReturningMock,
  })
  return {
    db: {
      query: {
        tickets: { findFirst: ticketFindFirstMock },
        ticketShares: { findFirst: sharesFindFirstMock },
        ticketThreads: { findFirst: vi.fn() },
      },
      insert: vi.fn((tbl: { _name: string }) => {
        if (tbl._name === 'ticket_activity') return insertChain('activity')
        return insertChain('threads')
      }),
      update: vi.fn(() => ({
        set: updateChainSetMock,
        where: updateTicketChainWhereMock,
      })),
      select: vi.fn(),
    },
    eq: vi.fn(),
    and: vi.fn(),
    or: vi.fn(),
    isNull: vi.fn(),
    asc: vi.fn(),
    inArray: vi.fn(),
    tickets: { _name: 'tickets', id: 'tickets.id' },
    ticketThreads: { _name: 'ticket_threads' },
    ticketShares: { _name: 'ticket_shares' },
    TICKET_THREAD_AUDIENCES: ['public', 'internal', 'shared_team'] as const,
  }
})

vi.mock('@/lib/server/sanitize-tiptap', () => ({
  sanitizeTiptapContent: (c: unknown) => c,
}))

vi.mock('../../audit', () => ({
  recordEvent: vi.fn(),
}))

vi.mock('../ticket.service', () => ({
  writeActivity: vi.fn().mockResolvedValue({ id: 'ticket_act_x' }),
  bumpLastActivity: vi.fn(),
}))

vi.mock('@/lib/shared/errors', () => {
  class E extends Error {
    code: string
    constructor(c: string, m: string) {
      super(m)
      this.code = c
    }
  }
  return { ConflictError: E, NotFoundError: E, ValidationError: E, ForbiddenError: E }
})

beforeEach(() => {
  vi.clearAllMocks()
  ticketFindFirstMock.mockReset()
  sharesFindFirstMock.mockReset()
  insertThreadsReturningMock.mockReset()
  insertActivityReturningMock.mockReset()
  insertActivityReturningMock.mockResolvedValue([{ id: 'act' }])
  updateChainSetMock.mockReset()
  updateChainSetMock.mockReturnThis()
  updateTicketChainWhereMock.mockReset()
  updateTicketChainWhereMock.mockResolvedValue(undefined)
})

describe('addThread — firstResponseAt', () => {
  it('sets firstResponseAt when first PUBLIC thread is from a non-requester', async () => {
    ticketFindFirstMock.mockResolvedValueOnce({
      id: 'ticket_1',
      requesterPrincipalId: 'user_requester',
      firstResponseAt: null,
      deletedAt: null,
    })
    insertThreadsReturningMock.mockResolvedValueOnce([{ id: 'thread_1', audience: 'public' }])
    const { addThread } = await import('../ticket.threads')
    await addThread({
      ticketId: 'ticket_1' as never,
      principalId: 'user_agent' as never,
      audience: 'public',
      bodyText: 'hello',
    })
    // The header-update call must include firstResponseAt
    expect(updateChainSetMock).toHaveBeenCalled()
    const patch = updateChainSetMock.mock.calls[0][0] as Record<string, unknown>
    expect(patch.firstResponseAt).toBeInstanceOf(Date)
  })

  it('does NOT set firstResponseAt when the author is the requester', async () => {
    ticketFindFirstMock.mockResolvedValueOnce({
      id: 'ticket_1',
      requesterPrincipalId: 'user_requester',
      firstResponseAt: null,
      deletedAt: null,
    })
    insertThreadsReturningMock.mockResolvedValueOnce([{ id: 'thread_1', audience: 'public' }])
    const { addThread } = await import('../ticket.threads')
    await addThread({
      ticketId: 'ticket_1' as never,
      principalId: 'user_requester' as never,
      audience: 'public',
      bodyText: 'follow up',
    })
    const patch = updateChainSetMock.mock.calls[0][0] as Record<string, unknown>
    expect(patch.firstResponseAt).toBeUndefined()
  })

  it('does NOT set firstResponseAt for internal-only threads', async () => {
    ticketFindFirstMock.mockResolvedValueOnce({
      id: 'ticket_1',
      requesterPrincipalId: 'user_requester',
      firstResponseAt: null,
      deletedAt: null,
    })
    insertThreadsReturningMock.mockResolvedValueOnce([{ id: 'thread_1', audience: 'internal' }])
    const { addThread } = await import('../ticket.threads')
    await addThread({
      ticketId: 'ticket_1' as never,
      principalId: 'user_agent' as never,
      audience: 'internal',
      bodyText: 'note to self',
    })
    const patch = updateChainSetMock.mock.calls[0][0] as Record<string, unknown>
    expect(patch.firstResponseAt).toBeUndefined()
  })

  it('refuses shared_team thread when no active share grant exists', async () => {
    ticketFindFirstMock.mockResolvedValueOnce({
      id: 'ticket_1',
      requesterPrincipalId: 'user_requester',
      firstResponseAt: null,
      deletedAt: null,
    })
    sharesFindFirstMock.mockResolvedValueOnce(undefined)
    const { addThread } = await import('../ticket.threads')
    await expect(
      addThread({
        ticketId: 'ticket_1' as never,
        principalId: 'user_agent' as never,
        audience: 'shared_team',
        sharedWithTeamId: 'team_y' as never,
        bodyText: 'fyi',
      })
    ).rejects.toThrow(/share grant/i)
  })

  it('rejects empty bodies', async () => {
    ticketFindFirstMock.mockResolvedValueOnce({
      id: 'ticket_1',
      requesterPrincipalId: null,
      firstResponseAt: null,
      deletedAt: null,
    })
    const { addThread } = await import('../ticket.threads')
    await expect(
      addThread({
        ticketId: 'ticket_1' as never,
        principalId: null,
        audience: 'public',
        bodyText: '   ',
      })
    ).rejects.toThrow(/empty/i)
  })
})
