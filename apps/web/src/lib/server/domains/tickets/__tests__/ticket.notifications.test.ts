/**
 * ticket.notifications — dispatcher policy: actor suppression, per-recipient
 * visibility filter, audience-aware thread filter, and team expansion for
 * `notifyTicketShared`.
 *
 * The DB chain + permission engine are mocked. The point is to lock the
 * recipient-resolution semantics so a future refactor can't silently leak
 * a notification to a principal who lost view permission or who triggered
 * the action themselves.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const getSubscribersMock = vi.fn()
const loadPermissionSetMock = vi.fn()
const canViewTicketMock = vi.fn()
const createNotificationsBatchMock = vi.fn()

// Captured by db.select(...).from(...).where(...) for shares, and
// db.select(...).from(teamMemberships).where(...) for team expansion.
const sharesRows: Array<{ teamId: string; revokedAt: Date | null }> = []
const teamMembersRows: Array<{ principalId: string }> = []

vi.mock('@/lib/server/db', () => {
  const sharesChain = {
    from: vi.fn((tbl: { _name: string }) => {
      const isShares = tbl?._name === 'ticket_shares'
      return {
        where: vi.fn().mockResolvedValue(isShares ? sharesRows : teamMembersRows),
      }
    }),
  }
  return {
    db: {
      select: vi.fn(() => sharesChain),
    },
    eq: vi.fn(),
    and: vi.fn(),
    inArray: vi.fn(),
    isNull: vi.fn(),
    ticketShares: {
      _name: 'ticket_shares',
      teamId: 'team_id',
      revokedAt: 'revoked_at',
      ticketId: 'ticket_id',
    },
    teamMemberships: { _name: 'team_memberships', principalId: 'principal_id', teamId: 'team_id' },
    ticketSubscriptions: { _name: 'ticket_subscriptions' },
  }
})

vi.mock('../ticket.subscriptions', () => ({
  getSubscribers: (...args: unknown[]) => getSubscribersMock(...args),
}))

vi.mock('../../authz/authz.service', () => ({
  loadPermissionSet: (...args: unknown[]) => loadPermissionSetMock(...args),
}))

vi.mock('../ticket.permissions', () => ({
  canViewTicket: (...args: unknown[]) => canViewTicketMock(...args),
  toResourceScope: (input: unknown) => ({ _scope: input }),
}))

vi.mock('../../notifications/notification.service', () => ({
  createNotificationsBatch: (...args: unknown[]) => createNotificationsBatchMock(...args),
}))

beforeEach(() => {
  vi.clearAllMocks()
  getSubscribersMock.mockReset()
  loadPermissionSetMock.mockReset().mockResolvedValue({ permissions: new Set() })
  canViewTicketMock.mockReset().mockReturnValue(true)
  createNotificationsBatchMock.mockReset().mockResolvedValue(undefined)
  sharesRows.length = 0
  teamMembersRows.length = 0
})

const baseTicket = {
  id: 'ticket_1',
  subject: 'Hello',
  primaryTeamId: 'team_a',
  assigneePrincipalId: null,
  assigneeTeamId: null,
  requesterPrincipalId: null,
} as Record<string, unknown>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const T = (extra: Record<string, unknown> = {}): any => ({ ...baseTicket, ...extra })

describe('notifyTicketAssigned', () => {
  it('suppresses actor and notifies new + previous assignee separately', async () => {
    getSubscribersMock.mockResolvedValue([])
    const { notifyTicketAssigned } = await import('../ticket.notifications')
    await notifyTicketAssigned(
      T({ assigneePrincipalId: 'principal_new' }),
      'principal_prev' as never,
      { actorPrincipalId: 'principal_actor' as never }
    )
    expect(createNotificationsBatchMock).toHaveBeenCalledTimes(2)
    const allRecipients = createNotificationsBatchMock.mock.calls
      .flatMap((c) => c[0])
      .map((row) => row.principalId)
    expect(allRecipients).toContain('principal_new')
    expect(allRecipients).toContain('principal_prev')
    expect(allRecipients).not.toContain('principal_actor')
  })

  it('drops the actor even if they are the new assignee', async () => {
    getSubscribersMock.mockResolvedValue([])
    const { notifyTicketAssigned } = await import('../ticket.notifications')
    await notifyTicketAssigned(T({ assigneePrincipalId: 'principal_self' }), null, {
      actorPrincipalId: 'principal_self' as never,
    })
    // Only the new-assignee dispatch attempt fires; recipient set after
    // suppression is empty so no batch insert happens.
    expect(createNotificationsBatchMock).not.toHaveBeenCalled()
  })
})

describe('notifyThreadAdded', () => {
  it('public audience keeps the requester in the recipient set', async () => {
    getSubscribersMock.mockResolvedValue([])
    const { notifyThreadAdded } = await import('../ticket.notifications')
    await notifyThreadAdded(
      T({ requesterPrincipalId: 'principal_req' }),
      'thread_1',
      'public',
      null,
      { actorPrincipalId: 'principal_agent' as never }
    )
    const recipients = createNotificationsBatchMock.mock.calls
      .flatMap((c) => c[0])
      .map((row) => row.principalId)
    expect(recipients).toContain('principal_req')
  })

  it('internal audience drops the requester', async () => {
    getSubscribersMock.mockResolvedValue([])
    const { notifyThreadAdded } = await import('../ticket.notifications')
    await notifyThreadAdded(
      T({
        requesterPrincipalId: 'principal_req',
        assigneePrincipalId: 'principal_agent',
      }),
      'thread_1',
      'internal',
      null,
      { actorPrincipalId: 'principal_someone_else' as never }
    )
    const recipients = createNotificationsBatchMock.mock.calls
      .flatMap((c) => c[0])
      .map((row) => row.principalId)
    expect(recipients).not.toContain('principal_req')
    expect(recipients).toContain('principal_agent')
  })
})

describe('dispatch visibility filter', () => {
  it('drops principals whose canViewTicket returns false', async () => {
    getSubscribersMock.mockResolvedValue(['principal_a', 'principal_b', 'principal_c'])
    canViewTicketMock.mockImplementation(() => true)
    // The 2nd permission load will yield a "denied" set.
    let call = 0
    canViewTicketMock.mockImplementation(() => {
      call += 1
      return call !== 2 // deny the 2nd recipient
    })
    const { notifyTicketStatusChanged } = await import('../ticket.notifications')
    await notifyTicketStatusChanged(T(), 'open', 'pending', { actorPrincipalId: null })
    const rows = createNotificationsBatchMock.mock.calls.flatMap((c) => c[0])
    expect(rows).toHaveLength(2) // 3 candidates − 1 denied
  })
})

describe('notifyTicketShared', () => {
  it('expands team members + adds them to the recipient set', async () => {
    getSubscribersMock.mockResolvedValue([])
    teamMembersRows.push({ principalId: 'principal_x' }, { principalId: 'principal_y' })
    const { notifyTicketShared } = await import('../ticket.notifications')
    await notifyTicketShared(T(), 'team_b' as never, {
      actorPrincipalId: 'principal_x' as never,
    })
    const recipients = createNotificationsBatchMock.mock.calls
      .flatMap((c) => c[0])
      .map((row) => row.principalId)
    // principal_x is the actor → suppressed; principal_y survives.
    expect(recipients).toEqual(['principal_y'])
  })
})
