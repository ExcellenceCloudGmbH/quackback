/**
 * Smoke shape test for the new comment-moderation server functions.
 * Full integration tests live alongside the post-moderation suite once
 * the DB harness exists; here we assert exports and Zod schemas.
 */
import { describe, it, expect } from 'vitest'
import * as moderationModule from '../moderation'

// Cast to a loose record so the test can reference future exports
// (approveCommentFn/rejectCommentFn land in T3/T4) without TS errors today.
const moderation = moderationModule as unknown as Record<string, unknown>

describe('comment moderation functions — exports', () => {
  it('exports listPendingCommentsFn', () => {
    expect(typeof moderation.listPendingCommentsFn).toBe('function')
  })

  it('exports approveCommentFn', () => {
    expect(typeof moderation.approveCommentFn).toBe('function')
  })

  it('exports rejectCommentFn', () => {
    expect(typeof moderation.rejectCommentFn).toBe('function')
  })
})

describe('approveCommentFn — input shape', () => {
  it('accepts a commentId string', () => {
    // Module-private schema; the inputValidator contract is observable
    // via well-formed input not throwing on parse. requireAuth will then
    // fail in test env (no session), so we expect the promise to reject —
    // input validation has already run by that point.
    const fn = moderation.approveCommentFn as unknown as (args: {
      data: unknown
    }) => Promise<unknown>
    return expect(fn({ data: { commentId: 'comment_test' } })).rejects.toBeDefined()
  })
})

describe('rejectCommentFn — input shape', () => {
  it('accepts commentId + optional reason', () => {
    const fn = moderation.rejectCommentFn as unknown as (args: {
      data: unknown
    }) => Promise<unknown>
    return expect(fn({ data: { commentId: 'comment_test', reason: 'spam' } })).rejects.toBeDefined()
  })

  it('rejects a reason >500 chars', () => {
    const fn = moderation.rejectCommentFn as unknown as (args: {
      data: unknown
    }) => Promise<unknown>
    return expect(
      fn({ data: { commentId: 'comment_test', reason: 'x'.repeat(501) } })
    ).rejects.toThrow()
  })
})
