import { describe, expect, it } from 'vitest'
import { shouldRequire2FA } from '../two-factor-policy'

describe('shouldRequire2FA', () => {
  it('returns false when the workspace toggle is off', () => {
    expect(
      shouldRequire2FA({
        role: 'admin',
        userHas2FA: false,
        workspaceRequired: false,
      })
    ).toBe(false)
  })

  it('returns false for portal users (role=user) regardless of toggle', () => {
    expect(
      shouldRequire2FA({
        role: 'user',
        userHas2FA: false,
        workspaceRequired: true,
      })
    ).toBe(false)
  })

  it('returns true for team-role user without 2FA when required', () => {
    expect(
      shouldRequire2FA({
        role: 'admin',
        userHas2FA: false,
        workspaceRequired: true,
      })
    ).toBe(true)
    expect(
      shouldRequire2FA({
        role: 'member',
        userHas2FA: false,
        workspaceRequired: true,
      })
    ).toBe(true)
  })

  it('returns false when user already has 2FA enrolled', () => {
    expect(
      shouldRequire2FA({
        role: 'admin',
        userHas2FA: true,
        workspaceRequired: true,
      })
    ).toBe(false)
    expect(
      shouldRequire2FA({
        role: 'member',
        userHas2FA: true,
        workspaceRequired: true,
      })
    ).toBe(false)
  })
})
