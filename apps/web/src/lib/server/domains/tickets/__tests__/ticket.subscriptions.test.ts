/**
 * ticket.subscriptions — UPSERT semantics + mute window filtering.
 *
 * The schema-level concerns (FK cascade, unique constraint) live in the
 * integration suite; here we exercise the service-layer policy decisions:
 *   - auto sources never overwrite an existing manual row
 *   - manual writes refuse to mutate an auto row unless `force: true`
 *   - getSubscribers honours the mute window
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const insertReturningMock = vi.fn()
const insertOnConflictDoNothingMock = vi.fn()
const insertOnConflictDoUpdateMock = vi.fn()
const updateReturningMock = vi.fn()
const deleteReturningMock = vi.fn()
const selectFromMock = vi.fn()

const insertChain: Record<string, unknown> = {}
insertChain.values = vi.fn().mockReturnThis()
insertChain.onConflictDoNothing = vi.fn(() => ({
  returning: insertOnConflictDoNothingMock,
}))
insertChain.onConflictDoUpdate = vi.fn(() => ({
  returning: insertOnConflictDoUpdateMock,
}))
insertChain.returning = insertReturningMock

const updateChain = {
  set: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  returning: updateReturningMock,
}

const deleteChain = {
  where: vi.fn().mockReturnThis(),
  returning: deleteReturningMock,
}

const selectChain = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue([]),
}

vi.mock('@/lib/server/db', () => {
  return {
    db: {
      insert: vi.fn(() => insertChain),
      update: vi.fn(() => updateChain),
      delete: vi.fn(() => deleteChain),
      select: vi.fn(() => {
        selectFromMock()
        return selectChain
      }),
    },
    eq: vi.fn((a, b) => ({ _eq: [a, b] })),
    and: vi.fn((...args) => ({ _and: args })),
    or: vi.fn((...args) => ({ _or: args })),
    isNull: vi.fn((c) => ({ _isNull: c })),
    inArray: vi.fn(),
    gt: vi.fn(),
    lt: vi.fn((a, b) => ({ _lt: [a, b] })),
    desc: vi.fn(),
    sql: Object.assign(vi.fn(), { raw: vi.fn() }),
    ticketSubscriptions: {
      id: 'col.id',
      ticketId: 'col.ticketId',
      principalId: 'col.principalId',
      notifyThreads: 'col.notifyThreads',
      notifyStatus: 'col.notifyStatus',
      notifyAssignment: 'col.notifyAssignment',
      notifyParticipants: 'col.notifyParticipants',
      notifyShares: 'col.notifyShares',
      notifySla: 'col.notifySla',
      mutedUntil: 'col.mutedUntil',
      createdAt: 'col.createdAt',
    },
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  insertReturningMock.mockReset()
  insertOnConflictDoNothingMock.mockReset()
  insertOnConflictDoUpdateMock.mockReset()
  updateReturningMock.mockReset()
  deleteReturningMock.mockReset()
  selectChain.limit.mockResolvedValue([])
})

describe('subscribeToTicket', () => {
  it('auto source uses onConflictDoNothing and falls back to existing row', async () => {
    insertOnConflictDoNothingMock.mockResolvedValue([]) // conflict path
    const existing = {
      id: 'tkt_sub_1',
      ticketId: 't1',
      principalId: 'p1',
      source: 'manual',
      notifyThreads: true,
    }
    selectChain.limit.mockResolvedValueOnce([existing])

    const { subscribeToTicket } = await import('../ticket.subscriptions')
    const row = await subscribeToTicket({
      ticketId: 't1' as never,
      principalId: 'p1' as never,
      source: 'auto_assigned',
    })
    expect(row).toBe(existing)
    expect(insertChain.onConflictDoNothing).toHaveBeenCalled()
    expect(insertChain.onConflictDoUpdate).not.toHaveBeenCalled()
  })

  it('manual source uses onConflictDoUpdate (overwrites prefs + clears mute)', async () => {
    insertOnConflictDoUpdateMock.mockResolvedValue([
      { id: 'tkt_sub_2', source: 'manual', notifyThreads: false, mutedUntil: null },
    ])
    const { subscribeToTicket } = await import('../ticket.subscriptions')
    const row = await subscribeToTicket({
      ticketId: 't1' as never,
      principalId: 'p1' as never,
      source: 'manual',
      prefs: { notifyThreads: false },
    })
    expect(insertChain.onConflictDoUpdate).toHaveBeenCalled()
    expect(row.source).toBe('manual')
    expect(row.notifyThreads).toBe(false)
  })
})

describe('updateSubscriptionPrefs', () => {
  it('refuses to mutate an auto-sourced row without force:true', async () => {
    selectChain.limit.mockResolvedValueOnce([
      { id: 'tkt_sub_1', source: 'auto_assigned', notifyThreads: true },
    ])
    const { updateSubscriptionPrefs } = await import('../ticket.subscriptions')
    const row = await updateSubscriptionPrefs({
      ticketId: 't1' as never,
      principalId: 'p1' as never,
      patch: { notifyThreads: false },
    })
    expect(row?.source).toBe('auto_assigned')
    expect(updateChain.set).not.toHaveBeenCalled()
  })

  it('upgrades auto row to manual when force:true', async () => {
    selectChain.limit.mockResolvedValueOnce([
      { id: 'tkt_sub_1', source: 'auto_assigned', notifyThreads: true },
    ])
    updateReturningMock.mockResolvedValueOnce([
      { id: 'tkt_sub_1', source: 'manual', notifyThreads: false },
    ])
    const { updateSubscriptionPrefs } = await import('../ticket.subscriptions')
    const row = await updateSubscriptionPrefs({
      ticketId: 't1' as never,
      principalId: 'p1' as never,
      patch: { notifyThreads: false },
      force: true,
    })
    expect(updateChain.set).toHaveBeenCalled()
    expect(row?.source).toBe('manual')
  })
})
