/**
 * Portal tab model + pure helpers shared by client (route guards, nav) and
 * server. Deliberately zod-free and dependency-free so it is safe to import
 * from client route files without pulling in server-only or schema code.
 *
 * The zod schema + parse/serialize live in
 * `@/lib/server/domains/portal/types`, which re-exports everything here.
 */

/**
 * All available portal tabs that can be configured.
 */
export type PortalTab =
  | 'feedback'
  | 'roadmap'
  | 'changelog'
  | 'myTickets'
  | 'helpCenter'
  | 'support'

/**
 * Portal tab visibility configuration. Each field represents whether that tab
 * is visible; `undefined` means "enabled" (default true).
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

/** Ordered list of every tab (used by the merge helpers). */
export const PORTAL_TABS: readonly PortalTab[] = [
  'feedback',
  'roadmap',
  'changelog',
  'myTickets',
  'helpCenter',
  'support',
]

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

/**
 * A tab is enabled unless explicitly set to `false` (undefined = enabled).
 * Single source of truth for the nav, the route guards, and landing resolution.
 */
export function isPortalTabEnabled(config: PortalTabConfig, tab: PortalTab): boolean {
  return config[tab] !== false
}

/**
 * Get the default portal tab config (all tabs enabled, feedback as landing).
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

// Fallback order when the configured default tab is disabled/unset. Restricted
// to public tabs (myTickets/support require auth, so they make poor automatic
// landing targets — but are still honored when explicitly chosen as defaultTab).
const LANDING_FALLBACK_ORDER: PortalTab[] = ['feedback', 'helpCenter', 'roadmap', 'changelog']

/**
 * Resolve which tab the portal should open on for a given (effective) tab
 * config. Honors an explicit, enabled `defaultTab`; otherwise falls back to the
 * first enabled public tab (feedback first).
 */
export function resolvePortalLandingTab(config: PortalTabConfig): {
  tab: PortalTab
  path: string
} {
  if (config.defaultTab && isPortalTabEnabled(config, config.defaultTab)) {
    return { tab: config.defaultTab, path: PORTAL_TAB_PATHS[config.defaultTab] }
  }
  const fallback =
    LANDING_FALLBACK_ORDER.find((tab) => isPortalTabEnabled(config, tab)) ?? 'feedback'
  return { tab: fallback, path: PORTAL_TAB_PATHS[fallback] }
}

/**
 * Merge multiple tab configs using union logic: if any config enables a tab,
 * it's enabled in the result. `defaultTab` is carried from the first config
 * that sets it (org config is passed first) so it survives the per-user merge.
 */
export function mergeTabConfigs(...configs: PortalTabConfig[]): PortalTabConfig {
  const result: PortalTabConfig = {}
  for (const tab of PORTAL_TABS) {
    result[tab] = configs.some((config) => config[tab] !== false)
  }
  result.defaultTab = configs.map((c) => c.defaultTab).find((v): v is PortalTab => Boolean(v))
  return result
}

/**
 * Intersect multiple tab configs: a tab is enabled only if enabled in ALL
 * configs.
 */
export function intersectTabConfigs(...configs: PortalTabConfig[]): PortalTabConfig {
  if (configs.length === 0) return getDefaultPortalTabConfig()
  const result: PortalTabConfig = {}
  for (const tab of PORTAL_TABS) {
    result[tab] = configs.every((config) => config[tab] !== false)
  }
  result.defaultTab = configs.map((c) => c.defaultTab).find((v): v is PortalTab => Boolean(v))
  return result
}
