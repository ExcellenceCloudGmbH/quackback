import { describe, it, expect } from 'vitest'
import {
  parsePortalTabConfig,
  serializePortalTabConfig,
  getDefaultPortalTabConfig,
  mergeTabConfigs,
  intersectTabConfigs,
  resolvePortalLandingTab,
  PORTAL_TAB_PATHS,
  type PortalTabConfig,
} from '../types'

describe('PortalTabConfig utilities', () => {
  describe('parsePortalTabConfig', () => {
    it('parses valid JSON config', () => {
      const json = '{"feedback": true, "roadmap": false, "changelog": true}'
      const result = parsePortalTabConfig(json)
      expect(result).toEqual({
        feedback: true,
        roadmap: false,
        changelog: true,
      })
    })

    it('returns empty object for null/undefined', () => {
      expect(parsePortalTabConfig(null)).toEqual({})
      expect(parsePortalTabConfig(undefined)).toEqual({})
    })

    it('handles invalid JSON gracefully', () => {
      const result = parsePortalTabConfig('{ invalid json }')
      expect(result).toEqual({})
    })

    it('strips unknown fields', () => {
      const json = '{"feedback": true, "unknownField": "value"}'
      const result = parsePortalTabConfig(json)
      expect(result).toEqual({ feedback: true })
      expect('unknownField' in result).toBe(false)
    })
  })

  describe('serializePortalTabConfig', () => {
    it('serializes config to JSON string', () => {
      const config: PortalTabConfig = {
        feedback: true,
        roadmap: false,
        changelog: true,
      }
      const result = serializePortalTabConfig(config)
      expect(result).toEqual('{"feedback":true,"roadmap":false,"changelog":true}')
    })

    it('handles empty config', () => {
      const result = serializePortalTabConfig({})
      expect(result).toEqual('{}')
    })
  })

  describe('getDefaultPortalTabConfig', () => {
    it('returns all tabs enabled', () => {
      const result = getDefaultPortalTabConfig()
      expect(result).toEqual({
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

  describe('mergeTabConfigs (union logic)', () => {
    it('enables a tab if any config enables it', () => {
      const config1: PortalTabConfig = { feedback: true, roadmap: false }
      const config2: PortalTabConfig = { roadmap: true, changelog: false }
      const result = mergeTabConfigs(config1, config2)

      expect(result.feedback).toBe(true)
      expect(result.roadmap).toBe(true) // enabled in config2
      // Union semantics: config1 omits `changelog` (= default true), so even
      // though config2 sets it false the tab stays enabled — matches the
      // `configs.some(c => c[tab] !== false)` rule and the default-true sibling
      // test below. (The previous `toBe(false)` was an intersection-style slip.)
      expect(result.changelog).toBe(true)
    })

    it('treats missing fields as enabled (default true)', () => {
      const config1: PortalTabConfig = { feedback: true }
      const config2: PortalTabConfig = { roadmap: false }
      const result = mergeTabConfigs(config1, config2)

      // feedback: true (from config1), true (default) = true
      // roadmap: default true (from config1), false (from config2) = true (union)
      expect(result.feedback).toBe(true)
      expect(result.roadmap).toBe(true)
    })

    it('returns all tabs as defined for single config', () => {
      const config: PortalTabConfig = { feedback: true, roadmap: false, changelog: true }
      const result = mergeTabConfigs(config)

      expect(result).toEqual({
        feedback: true,
        roadmap: false,
        changelog: true,
        myTickets: true, // default
        helpCenter: true, // default
        support: true, // default
      })
    })
  })

  describe('intersectTabConfigs (intersection logic)', () => {
    it('disables a tab if any config disables it', () => {
      const config1: PortalTabConfig = { feedback: true, roadmap: true }
      const config2: PortalTabConfig = { feedback: true, roadmap: false }
      const result = intersectTabConfigs(config1, config2)

      expect(result.feedback).toBe(true)
      expect(result.roadmap).toBe(false) // disabled in config2
    })

    it('treats missing fields as enabled (default true)', () => {
      const config1: PortalTabConfig = { feedback: true }
      const config2: PortalTabConfig = { roadmap: false }
      const result = intersectTabConfigs(config1, config2)

      // feedback: true (from config1), true (default) = true
      // roadmap: true (default from config1), false (from config2) = false
      expect(result.feedback).toBe(true)
      expect(result.roadmap).toBe(false)
    })

    it('returns defaults when no configs provided', () => {
      const result = intersectTabConfigs()
      expect(result).toEqual(getDefaultPortalTabConfig())
    })
  })

  describe('round-trip serialization', () => {
    it('preserves config through serialize/parse cycle', () => {
      const original: PortalTabConfig = {
        feedback: true,
        roadmap: false,
        changelog: true,
        myTickets: false,
      }
      const serialized = serializePortalTabConfig(original)
      const parsed = parsePortalTabConfig(serialized)

      expect(parsed).toEqual(original)
    })
  })
})

describe('default landing tab', () => {
  it('getDefaultPortalTabConfig defaults the landing tab to feedback', () => {
    expect(getDefaultPortalTabConfig().defaultTab).toBe('feedback')
  })

  it('parses and round-trips a defaultTab field', () => {
    const parsed = parsePortalTabConfig('{"feedback": false, "defaultTab": "helpCenter"}')
    expect(parsed.defaultTab).toBe('helpCenter')
    expect(parsePortalTabConfig(serializePortalTabConfig(parsed)).defaultTab).toBe('helpCenter')
  })

  it('drops an invalid defaultTab value (lenient parse)', () => {
    expect(parsePortalTabConfig('{"defaultTab": "bogus"}')).toEqual({})
  })

  describe('mergeTabConfigs carries defaultTab', () => {
    it('keeps the org-level (first) defaultTab through the per-user merge', () => {
      const org: PortalTabConfig = { feedback: false, defaultTab: 'helpCenter' }
      const segment: PortalTabConfig = { feedback: true }
      expect(mergeTabConfigs(org, segment).defaultTab).toBe('helpCenter')
    })

    it('is undefined when no config sets it', () => {
      expect(mergeTabConfigs({ feedback: true }).defaultTab).toBeUndefined()
    })
  })

  describe('resolvePortalLandingTab', () => {
    it('honors an explicit, enabled default tab', () => {
      expect(resolvePortalLandingTab({ defaultTab: 'helpCenter' })).toEqual({
        tab: 'helpCenter',
        path: PORTAL_TAB_PATHS.helpCenter,
      })
    })

    it('defaults to feedback (root) when nothing is configured', () => {
      expect(resolvePortalLandingTab({})).toEqual({ tab: 'feedback', path: '/' })
    })

    it('falls back to the first enabled public tab when feedback is disabled', () => {
      // The reported scenario: admin disabled feedback → must NOT land on the
      // feedback "Coming Soon" empty state.
      const result = resolvePortalLandingTab({ feedback: false })
      expect(result.tab).toBe('helpCenter')
      expect(result.path).toBe('/hc')
    })

    it('falls back past a disabled default tab to the next enabled tab', () => {
      const result = resolvePortalLandingTab({
        feedback: false,
        helpCenter: false,
        defaultTab: 'feedback',
      })
      expect(result.tab).toBe('roadmap')
      expect(result.path).toBe('/roadmap')
    })
  })
})
