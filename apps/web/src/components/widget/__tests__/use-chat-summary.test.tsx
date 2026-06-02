import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

// The hook only reads `sessionVersion` off the auth context.
vi.mock('../widget-auth-provider', () => ({
  useWidgetAuth: () => ({ sessionVersion: 0 }),
}))
vi.mock('@/lib/client/widget-auth', () => ({
  getWidgetAuthHeaders: () => ({}),
}))
// Keep both fetches pending so the only value under test is the initial seed
// (the client load would otherwise overwrite it once it resolves).
vi.mock('@/lib/server/functions/chat', () => ({
  getMyChatFn: () => new Promise(() => {}),
  getChatPresenceFn: () => new Promise(() => {}),
}))

import { useChatSummary } from '../use-chat-summary'

describe('useChatSummary SSR presence seed', () => {
  it('reports the seeded verdict on first paint (no "away" flash)', () => {
    const { result } = renderHook(() =>
      useChatSummary(true, { agentsOnline: true, withinOfficeHours: null, nextOpenAt: null })
    )
    expect(result.current.agentsOnline).toBe(true)
  })

  it('carries the seeded office-hours verdict through', () => {
    const { result } = renderHook(() =>
      useChatSummary(true, { agentsOnline: false, withinOfficeHours: true, nextOpenAt: null })
    )
    expect(result.current.withinOfficeHours).toBe(true)
  })

  it('falls back to offline when no seed is provided', () => {
    const { result } = renderHook(() => useChatSummary(true))
    expect(result.current.agentsOnline).toBe(false)
    expect(result.current.withinOfficeHours).toBe(null)
  })
})
