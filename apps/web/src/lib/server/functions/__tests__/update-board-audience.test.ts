/**
 * G2 regression: updateBoardFn must return the board with the NEW audience
 * when isPublic is toggled, not the stale pre-audience-write result.
 *
 * Three defects addressed (all three verified here):
 * (a) Stale return — returned board had old audience
 * (b) Missing updatedAt — audience write omitted updatedAt
 * (c) No deletedAt guard — audience write could touch soft-deleted boards
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

type AnyHandler = (args: { data: Record<string, unknown> }) => Promise<unknown>
const hoisted = vi.hoisted(() => ({ handlers: [] as AnyHandler[] }))

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    const chain = {
      inputValidator() {
        return chain
      },
      handler(fn: AnyHandler) {
        hoisted.handlers.push(fn)
        return chain
      },
    }
    return chain
  },
}))

const mockRequireAuth = vi.fn()
vi.mock('./auth-helpers', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))
vi.mock('@/lib/server/functions/auth-helpers', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
}))

vi.mock('./workspace', () => ({ getSettings: vi.fn() }))

// --- Board service mock ---
// updateBoard returns the board WITHOUT the new audience (simulating the
// pre-audience-write state). The test asserts the FINAL return uses the
// audience-write row, not this stale result.
const mockUpdateBoard = vi.fn()
vi.mock('@/lib/server/domains/boards/board.service', () => ({
  listBoards: vi.fn(),
  getBoardById: vi.fn(),
  createBoard: vi.fn(),
  updateBoard: (...args: unknown[]) => mockUpdateBoard(...args),
  deleteBoard: vi.fn(),
}))

vi.mock('@/lib/server/domains/settings/settings.helpers', () => ({
  invalidateSettingsCache: vi.fn(),
}))

// --- DB mock ---
// Captures the set() payload and condition so tests can assert on them.
// Returns the audience-written row from .returning() to mirror the fix.

type BoardAudience = { kind: string; segmentIds?: string[] }
type BoardRow = {
  id: string
  name: string
  slug: string
  description: string | null
  audience: BoardAudience
  settings: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

const state: {
  boards: BoardRow[]
  dbSetPayloads: Array<Record<string, unknown>>
  dbWhereConds: Array<unknown>
} = {
  boards: [],
  dbSetPayloads: [],
  dbWhereConds: [],
}

vi.mock('@/lib/server/db', () => ({
  db: {
    update: vi.fn(() => ({
      set: vi.fn((patch: Record<string, unknown>) => {
        state.dbSetPayloads.push(patch)
        return {
          where: vi.fn((cond: unknown) => {
            state.dbWhereConds.push(cond)
            // Apply the patch to matching boards and return updated rows (.returning())
            const updated = state.boards
              .filter((b) => b.deletedAt === null)
              .map((b) => ({ ...b, ...patch }))
            state.boards = state.boards.map((b) => (b.deletedAt === null ? { ...b, ...patch } : b))
            return { returning: vi.fn(() => Promise.resolve(updated)) }
          }),
        }
      }),
    })),
    query: {
      boards: { findFirst: vi.fn() },
    },
  },
  settings: {},
  boards: {
    id: { __col: 'id' },
    deletedAt: { __col: 'deletedAt' },
  },
  eq: vi.fn((col: { __col: string }, val: unknown) => ({ kind: 'eq', col: col.__col, val })),
  and: vi.fn((...conds: unknown[]) => ({ kind: 'and', conds })),
  isNull: vi.fn((col: { __col: string }) => ({ kind: 'isNull', col: col.__col })),
}))

vi.mock('@/lib/shared/roles', () => ({
  isAdmin: vi.fn((role: string) => role === 'admin'),
}))

vi.mock('@/lib/server/audit/log', () => ({
  recordAuditEvent: vi.fn(),
  actorFromAuth: vi.fn(),
}))

// Import after mocks — updateBoardFn is handler #3 (0-indexed) in boards.ts
// (fetchBoardsFn, fetchBoardFn, createBoardFn, updateBoardFn …)
import * as boardsModule from '../boards'

function getUpdateBoardFn(): AnyHandler {
  expect(boardsModule).toHaveProperty('updateBoardFn')
  // updateBoardFn is at index 6: workspace.ts adds 3 handlers (0-2) before
  // boards.ts adds its own 7 (3=fetchBoardsFn, 4=fetchBoardFn, 5=createBoardFn,
  // 6=updateBoardFn, 7=deleteBoardFn, 8=createBoardsBatchFn, 9=updateBoardAccessFn)
  return hoisted.handlers[6]
}

const BOARD_ID = 'board_test_1'
const BASE_DATE = new Date('2025-01-01T00:00:00Z')

const BOARD_ROW: BoardRow = {
  id: BOARD_ID,
  name: 'My Board',
  slug: 'my-board',
  description: null,
  audience: { kind: 'public' },
  settings: {},
  createdAt: BASE_DATE,
  updatedAt: BASE_DATE,
  deletedAt: null,
}

// What updateBoard (service) returns — does NOT include the new audience
const STALE_BOARD_RESULT: BoardRow = { ...BOARD_ROW, name: 'My Board' }

const AUTH = {
  user: { id: 'u_1', email: 'user@x', name: 'User', image: null },
  principal: { id: 'p_1', role: 'admin' as const, type: 'user' },
  settings: { id: 'ws_1', slug: 'x', name: 'X', logoKey: null },
}

beforeEach(() => {
  state.boards = [{ ...BOARD_ROW }]
  state.dbSetPayloads = []
  state.dbWhereConds = []
  mockUpdateBoard.mockReset()
  mockRequireAuth.mockReset()
  mockRequireAuth.mockResolvedValue(AUTH)
  mockUpdateBoard.mockResolvedValue(STALE_BOARD_RESULT)
})

describe('updateBoardFn — audience write (G2 regression)', () => {
  it('(a) returns the NEW audience when isPublic is toggled to false', async () => {
    const result = (await getUpdateBoardFn()({
      data: { id: BOARD_ID, isPublic: false },
    })) as { audience: BoardAudience }

    // The returned board must have the new team audience, not the stale public one
    expect(result.audience).toEqual({ kind: 'team' })
  })

  it('(a) returns the NEW audience when isPublic is toggled to true', async () => {
    // Start with team audience
    state.boards = [{ ...BOARD_ROW, audience: { kind: 'team' } }]
    mockUpdateBoard.mockResolvedValue({ ...STALE_BOARD_RESULT, audience: { kind: 'team' } })

    const result = (await getUpdateBoardFn()({
      data: { id: BOARD_ID, isPublic: true },
    })) as { audience: BoardAudience }

    expect(result.audience).toEqual({ kind: 'public' })
  })

  it('(b) the audience db.update includes updatedAt', async () => {
    const before = Date.now()
    await getUpdateBoardFn()({ data: { id: BOARD_ID, isPublic: false } })
    const after = Date.now()

    expect(state.dbSetPayloads).toHaveLength(1)
    const payload = state.dbSetPayloads[0]
    expect(payload).toHaveProperty('updatedAt')
    const updatedAt = payload.updatedAt as Date
    expect(updatedAt).toBeInstanceOf(Date)
    expect(updatedAt.getTime()).toBeGreaterThanOrEqual(before)
    expect(updatedAt.getTime()).toBeLessThanOrEqual(after)
  })

  it('(c) the audience db.update uses an and() condition (deletedAt guard)', async () => {
    await getUpdateBoardFn()({ data: { id: BOARD_ID, isPublic: false } })

    // The where condition must be a compound and() — not a bare eq()
    expect(state.dbWhereConds).toHaveLength(1)
    const cond = state.dbWhereConds[0] as { kind: string }
    expect(cond.kind).toBe('and')
  })

  it('does NOT touch the audience write when isPublic is not provided', async () => {
    await getUpdateBoardFn()({ data: { id: BOARD_ID, name: 'Renamed' } })

    // No direct db.update for audience — updateBoard handles the name change
    expect(state.dbSetPayloads).toHaveLength(0)
  })

  it('returns updateBoard result directly when isPublic is not provided', async () => {
    const result = (await getUpdateBoardFn()({
      data: { id: BOARD_ID, name: 'Renamed' },
    })) as { audience: BoardAudience }

    // Falls back to the updateBoard service result (stale mock is fine here)
    expect(result.audience).toEqual({ kind: 'public' })
  })
})
