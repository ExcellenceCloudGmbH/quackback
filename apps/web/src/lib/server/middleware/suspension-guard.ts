/**
 * Suspension guard — chokepoint helper for declarative tenant
 * suspension.
 *
 * `settings.state` carries the trinary 'active' | 'suspended' |
 * 'deleting'. Cloud's control-plane flips it via the file reconciler
 * when a subscription goes past-due ('suspended') or the Quackback is
 * scheduled for deletion ('deleting'). Self-hosters never set this:
 * with no config file there's nothing to reconcile, so the column
 * keeps its 'active' DB default.
 *
 * This module exposes:
 * - `ensureNotSuspended()` — call from a request chokepoint to throw
 *   402 / 410 for non-active tenants.
 * - `isSuspensionExempt(path)` — for HTML page-load guards (used by
 *   `__root.tsx`'s `beforeLoad`) so login/auth/health endpoints stay
 *   reachable on a suspended workspace.
 *
 * The `_internal` form takes an injected `readState` so unit tests
 * stay free of DB / cache imports.
 */
import { DomainException } from '@/lib/shared/errors'

/** HTTP 402 — Payment Required. Subscription is past-due; the
 *  workspace stays read-blocked until CP clears `suspendedAt`. */
export class SuspendedError extends DomainException {
  readonly statusCode = 402
  constructor() {
    super('WORKSPACE_SUSPENDED', 'Workspace is suspended for non-payment.')
  }
}

/** HTTP 410 — Gone. The workspace is being deleted; data may be
 *  partially purged and no further writes are accepted. */
export class DeletingError extends DomainException {
  readonly statusCode = 410
  constructor() {
    super('WORKSPACE_DELETING', 'Workspace is being deleted.')
  }
}

/**
 * Path prefixes that stay reachable while the workspace is suspended
 * or deleting. The list is intentionally small: only what users need
 * to get back in (login, OAuth completion) and what platform health
 * checks need (health, .well-known).
 *
 * Whole-path equality OR prefix-match. `/api/auth/` blocks itself but
 * also lets `/api/auth/sign-in/email` through.
 */
export const SUSPENSION_EXEMPT_PATHS = [
  '/suspended',
  '/admin/login',
  '/admin/signup',
  '/auth/',
  '/api/auth/',
  '/api/health',
  '/oauth/',
  '/.well-known/',
  '/complete-signup/',
] as const

export function isSuspensionExempt(p: string): boolean {
  return SUSPENSION_EXEMPT_PATHS.some((prefix) => p === prefix || p.startsWith(prefix))
}

/**
 * Block the current request when the workspace isn't active.
 *
 * Lazy-imports `getTenantSettings` to keep this module out of the
 * client bundle and so call-sites in cold paths don't pay the cost
 * unless they actually invoke the guard.
 */
export async function ensureNotSuspended(): Promise<void> {
  const { getTenantSettings } = await import('@/lib/server/domains/settings/settings.service')
  await _internalEnsureNotSuspended(async () => {
    const s = await getTenantSettings()
    return (s?.state ?? 'active') as 'active' | 'suspended' | 'deleting'
  })
}

/** Test seam — accepts an injected reader so the unit tests stay
 *  free of DB / Redis imports. */
export async function _internalEnsureNotSuspended(
  readState: () => Promise<'active' | 'suspended' | 'deleting'>
): Promise<void> {
  const state = await readState()
  if (state === 'suspended') throw new SuspendedError()
  if (state === 'deleting') throw new DeletingError()
}
