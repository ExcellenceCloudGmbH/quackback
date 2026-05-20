/**
 * Pure helpers for the portal header's top-level nav.
 * Kept in its own module so tests can import without dragging in React.
 */

const NAV_ITEMS_BASE = [
  { to: '/', messageId: 'portal.header.nav.feedback', defaultMessage: 'Feedback' },
  { to: '/roadmap', messageId: 'portal.header.nav.roadmap', defaultMessage: 'Roadmap' },
  { to: '/changelog', messageId: 'portal.header.nav.changelog', defaultMessage: 'Changelog' },
] as const

const NAV_ITEM_TICKETS = {
  to: '/tickets',
  messageId: 'portal.header.nav.tickets',
  defaultMessage: 'My tickets',
} as const

const NAV_ITEM_HELP = {
  to: '/hc',
  messageId: 'portal.header.nav.help',
  defaultMessage: 'Help Center',
} as const

export type PortalNavItem =
  | (typeof NAV_ITEMS_BASE)[number]
  | typeof NAV_ITEM_TICKETS
  | typeof NAV_ITEM_HELP

/**
 * Returns the nav items shown in the portal header.
 * - Feedback / Roadmap / Changelog are always shown.
 * - "My tickets" is appended for signed-in users (between base + help).
 * - Help Center is appended last when the workspace has the feature on.
 */
export function buildNavItems({
  helpCenterEnabled,
  isSignedIn = false,
}: {
  helpCenterEnabled: boolean
  isSignedIn?: boolean
}): readonly PortalNavItem[] {
  const items: PortalNavItem[] = [...NAV_ITEMS_BASE]
  if (isSignedIn) items.push(NAV_ITEM_TICKETS)
  if (helpCenterEnabled) items.push(NAV_ITEM_HELP)
  return items
}
