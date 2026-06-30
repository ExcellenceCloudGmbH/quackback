import { describe, it, expect } from 'vitest'
import {
  getDefaultPortalTabConfig,
  isPortalTabEnabled,
  resolvePortalLandingTab,
  mergeTabConfigs,
  intersectTabConfigs,
  PORTAL_TAB_PATHS,
  type PortalTabConfig,
} from '../portal-tabs'

describe('portal-tabs (pure helpers)', () => {
  describe('getDefaultPortalTabConfig', () => {
    it('enables every tab and defaults the landing tab to feedback', () => {
      expect(getDefaultPortalTabConfig()).toEqual({
        feedback: true,
        roadmap: true,
        changelog: true,
        myTickets: true,
        helpCenter: true,
        support: true,
        defaultTab: 'feedback',
      })
    })
  })

  describe('isPortalTabEnabled', () => {
    it('treats undefined as enabled and only false as disabled', () => {
      expect(isPortalTabEnabled({}, 'roadmap')).toBe(true)
      expect(isPortalTabEnabled({ roadmap: true }, 'roadmap')).toBe(true)
      expect(isPortalTabEnabled({ roadmap: false }, 'roadmap')).toBe(false)
    })
  })

  describe('resolvePortalLandingTab', () => {
    it('honors an explicit, enabled default tab', () => {
      expect(resolvePortalLandingTab({ defaultTab: 'helpCenter' })).toEqual({
        tab: 'helpCenter',
        path: '/hc',
      })
    })

    it('defaults to feedback (root) when nothing is configured', () => {
      expect(resolvePortalLandingTab({})).toEqual({ tab: 'feedback', path: '/' })
    })

    it('falls back to the first enabled public tab when feedback is disabled', () => {
      // Reported scenario: feedback disabled must NOT strand visitors on the
      // "Coming Soon" empty state — land them on the next enabled tab.
      expect(resolvePortalLandingTab({ feedback: false })).toEqual({
        tab: 'helpCenter',
        path: '/hc',
      })
    })

    it('falls back past a disabled default tab to the next enabled tab', () => {
      expect(
        resolvePortalLandingTab({ feedback: false, helpCenter: false, defaultTab: 'feedback' })
      ).toEqual({ tab: 'roadmap', path: '/roadmap' })
    })

    it('every tab has a route path', () => {
      expect(Object.keys(PORTAL_TAB_PATHS).sort()).toEqual(
        ['changelog', 'feedback', 'helpCenter', 'myTickets', 'roadmap', 'support'].sort()
      )
    })
  })

  describe('mergeTabConfigs (union) carries defaultTab', () => {
    it('enables a tab if any config enables it', () => {
      const result = mergeTabConfigs({ roadmap: false }, { roadmap: true })
      expect(result.roadmap).toBe(true)
    })

    it('keeps the org-level (first) defaultTab through the per-user merge', () => {
      const org: PortalTabConfig = { feedback: false, defaultTab: 'helpCenter' }
      const segment: PortalTabConfig = { feedback: true }
      expect(mergeTabConfigs(org, segment).defaultTab).toBe('helpCenter')
    })

    it('leaves defaultTab undefined when no config sets it', () => {
      expect(mergeTabConfigs({ feedback: true }).defaultTab).toBeUndefined()
    })
  })

  describe('intersectTabConfigs', () => {
    it('disables a tab if any config disables it', () => {
      expect(intersectTabConfigs({ roadmap: true }, { roadmap: false }).roadmap).toBe(false)
    })

    it('returns defaults when no configs provided', () => {
      expect(intersectTabConfigs()).toEqual(getDefaultPortalTabConfig())
    })
  })
})
