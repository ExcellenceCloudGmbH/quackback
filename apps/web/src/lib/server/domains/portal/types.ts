import { z } from 'zod'

/**
 * All available portal tabs that can be configured
 */
export type PortalTab =
  | 'feedback'
  | 'roadmap'
  | 'changelog'
  | 'myTickets'
  | 'helpCenter'
  | 'support'

/**
 * Portal tab visibility configuration
 * Each field represents whether that tab is visible to the user
 */
export interface PortalTabConfig {
  feedback?: boolean
  roadmap?: boolean
  changelog?: boolean
  myTickets?: boolean
  helpCenter?: boolean
  support?: boolean
  /**
   * Which tab the portal opens on when a visitor lands on the root (`/`).
   * Defaults to `feedback`. When the chosen tab is disabled (or unset) the
   * portal falls back to the first enabled public tab — so disabling feedback
   * no longer strands visitors on the "Coming Soon" empty state.
   */
  defaultTab?: PortalTab
}

/**
 * Zod schema for parsing and validating portal tab config from JSON
 */
export const portalTabConfigSchema = z.object({
  feedback: z.boolean().optional(),
  roadmap: z.boolean().optional(),
  changelog: z.boolean().optional(),
  myTickets: z.boolean().optional(),
  helpCenter: z.boolean().optional(),
  support: z.boolean().optional(),
  defaultTab: z
    .enum(['feedback', 'roadmap', 'changelog', 'myTickets', 'helpCenter', 'support'])
    .optional(),
})

/**
 * Parse portal tab config from JSON string (lenient)
 * Returns normalized config with explicit booleans or defaults
 */
export function parsePortalTabConfig(json: string | null | undefined): PortalTabConfig {
  if (!json) return {}
  try {
    const parsed = JSON.parse(json)
    return portalTabConfigSchema.parse(parsed)
  } catch {
    return {}
  }
}

/**
 * Serialize portal tab config to JSON string
 */
export function serializePortalTabConfig(config: PortalTabConfig): string {
  return JSON.stringify(config)
}

/**
 * Get the default portal tab config (all tabs enabled)
 */
export function getDefaultPortalTabConfig(): PortalTabConfig {
  return {
    feedback: true,
    roadmap: true,
    changelog: true,
    myTickets: true,
    helpCenter: true,
    support: true,
    defaultTab: 'feedback',
  }
}

/**
 * Route path each portal tab lands on. `feedback` is the portal root.
 */
export const PORTAL_TAB_PATHS: Record<PortalTab, string> = {
  feedback: '/',
  roadmap: '/roadmap',
  changelog: '/changelog',
  myTickets: '/tickets',
  helpCenter: '/hc',
  support: '/support',
}

// Fallback order when the configured default tab is disabled/unset. Restricted
// to public tabs (myTickets/support require auth, so they make poor automatic
// landing targets — but are still honored when explicitly chosen as defaultTab).
const LANDING_FALLBACK_ORDER: PortalTab[] = ['feedback', 'helpCenter', 'roadmap', 'changelog']

/**
 * Resolve which tab the portal should open on for a given (effective) tab
 * config. Honors an explicit, enabled `defaultTab`; otherwise falls back to the
 * first enabled public tab (feedback first). A tab is "enabled" unless set to
 * `false` (undefined = enabled, matching the nav/merge semantics).
 */
export function resolvePortalLandingTab(config: PortalTabConfig): {
  tab: PortalTab
  path: string
} {
  const isEnabled = (tab: PortalTab): boolean => config[tab] !== false
  if (config.defaultTab && isEnabled(config.defaultTab)) {
    return { tab: config.defaultTab, path: PORTAL_TAB_PATHS[config.defaultTab] }
  }
  const fallback = LANDING_FALLBACK_ORDER.find(isEnabled) ?? 'feedback'
  return { tab: fallback, path: PORTAL_TAB_PATHS[fallback] }
}

/**
 * Merge multiple tab configs using union logic
 * If any config enables a tab, it's enabled in the result
 * @param configs - Array of configs to merge
 * @returns Merged config with union of enabled tabs
 */
export function mergeTabConfigs(...configs: PortalTabConfig[]): PortalTabConfig {
  const result: PortalTabConfig = {}
  const tabs: PortalTab[] = [
    'feedback',
    'roadmap',
    'changelog',
    'myTickets',
    'helpCenter',
    'support',
  ]

  for (const tab of tabs) {
    // If any config enables this tab (or doesn't mention it = default true), enable it
    const enabled = configs.some((config) => config[tab] !== false)
    result[tab] = enabled
  }

  // defaultTab is an org-level (not segment) choice — carry the first defined
  // value (org config is passed first) so it survives the per-user merge.
  result.defaultTab = configs.map((c) => c.defaultTab).find((v): v is PortalTab => Boolean(v))

  return result
}

/**
 * Intersect multiple tab configs
 * Only tabs enabled in ALL configs are enabled in the result
 * @param configs - Array of configs to intersect
 * @returns Intersected config with only common enabled tabs
 */
export function intersectTabConfigs(...configs: PortalTabConfig[]): PortalTabConfig {
  if (configs.length === 0) return getDefaultPortalTabConfig()

  const result: PortalTabConfig = {}
  const tabs: PortalTab[] = [
    'feedback',
    'roadmap',
    'changelog',
    'myTickets',
    'helpCenter',
    'support',
  ]

  for (const tab of tabs) {
    // Tab is enabled only if enabled in all configs
    const enabled = configs.every((config) => config[tab] !== false)
    result[tab] = enabled
  }

  result.defaultTab = configs.map((c) => c.defaultTab).find((v): v is PortalTab => Boolean(v))

  return result
}
