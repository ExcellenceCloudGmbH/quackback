import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/server/db', () => ({
  and: vi.fn(),
  auditEvents: {},
  auditLog: {},
  db: {},
  desc: vi.fn(),
  eq: vi.fn(),
  gte: vi.fn(),
  ilike: vi.fn(),
  like: vi.fn(),
  lt: vi.fn(),
  lte: vi.fn(),
  notInArray: vi.fn(),
  or: vi.fn(),
  principal: {},
  user: {},
}))

import {
  encodeUnifiedAuditCursor,
  pageUnifiedAuditRows,
  type UnifiedAuditEventRow,
} from '../audit.unified'

function row(overrides: Partial<UnifiedAuditEventRow>): UnifiedAuditEventRow {
  return {
    id: 'audit_default',
    origin: 'workspace',
    occurredAt: new Date('2026-06-01T12:00:00.000Z'),
    principalId: null,
    actorUserId: null,
    actorEmail: null,
    actorDisplayName: null,
    actorRole: null,
    actorType: null,
    authMethod: null,
    action: 'ticket.created',
    outcome: null,
    source: 'web',
    targetType: 'ticket',
    targetId: 'ticket_1',
    requestId: null,
    ipAddress: null,
    userAgent: null,
    diff: {},
    metadata: null,
    ...overrides,
  }
}

describe('pageUnifiedAuditRows', () => {
  it('sorts mixed workspace and security rows by timestamp, origin, then id', () => {
    const page = pageUnifiedAuditRows(
      [
        row({
          id: 'audit_a',
          origin: 'security',
          occurredAt: new Date('2026-06-01T12:00:00.000Z'),
          action: 'auth.signin.success',
        }),
        row({
          id: 'audit_b',
          origin: 'workspace',
          occurredAt: new Date('2026-06-01T12:00:00.000Z'),
          action: 'ticket.updated',
        }),
        row({
          id: 'audit_c',
          origin: 'workspace',
          occurredAt: new Date('2026-06-01T12:01:00.000Z'),
          action: 'role.granted',
        }),
      ],
      { limit: 10 }
    )

    expect(page.items.map((item) => `${item.origin}:${item.id}`)).toEqual([
      'workspace:audit_c',
      'workspace:audit_b',
      'security:audit_a',
    ])
  })

  it('paginates without duplicates when the cursor lands between origins at the same timestamp', () => {
    const rows = [
      row({
        id: 'audit_c',
        origin: 'workspace',
        occurredAt: new Date('2026-06-01T12:00:00.000Z'),
      }),
      row({
        id: 'audit_b',
        origin: 'workspace',
        occurredAt: new Date('2026-06-01T12:00:00.000Z'),
      }),
      row({
        id: 'audit_z',
        origin: 'security',
        occurredAt: new Date('2026-06-01T12:00:00.000Z'),
      }),
    ]

    const first = pageUnifiedAuditRows(rows, { limit: 2 })
    const second = pageUnifiedAuditRows(rows, { limit: 2, cursor: first.nextCursor ?? undefined })

    expect(first.items.map((item) => `${item.origin}:${item.id}`)).toEqual([
      'workspace:audit_c',
      'workspace:audit_b',
    ])
    expect(second.items.map((item) => `${item.origin}:${item.id}`)).toEqual(['security:audit_z'])
  })

  it('preserves security observability fields in paged rows', () => {
    const security = row({
      id: 'audit_security',
      origin: 'security',
      action: 'auth.signin.success',
      outcome: 'success',
      requestId: 'req_abc123',
      actorType: 'user',
      authMethod: 'sso',
      metadata: { method: 'sso' },
    })

    const page = pageUnifiedAuditRows([security], {
      cursor: encodeUnifiedAuditCursor(
        row({
          id: 'audit_newer',
          origin: 'workspace',
          occurredAt: new Date('2026-06-01T12:01:00.000Z'),
        })
      ),
    })

    expect(page.items[0]).toMatchObject({
      requestId: 'req_abc123',
      actorType: 'user',
      authMethod: 'sso',
      metadata: { method: 'sso' },
    })
  })
})
