/**
 * Pre-check redirect surfacing for the better-auth client.
 *
 * When `handleSignInPreCheck` blocks a sign-in (rate-limited,
 * verified-domain hard-bound, the method is disabled for the
 * principal's audience), it returns a 302 to /admin/login or
 * /auth/login with `?error=<code>`. fetch follows the redirect by
 * default, the auth client parses the (HTML) body as null JSON, and
 * the awaiting form sees `{ data: null, error: null }` — interpreted
 * as success. The form fires its `onSuccess` path and the popover
 * silently closes with no session and no message.
 *
 * `detectAuthBlockRedirect` lets the client's `onResponse` hook turn
 * those redirects into a thrown error so the form's existing
 * try/catch surfaces a friendly message.
 */

/** Map known pre-check error codes to user-facing copy. Unknown
 *  codes fall back to a generic message. */
const FRIENDLY_MESSAGES: Record<string, string> = {
  password_method_not_allowed:
    "Password sign-in isn't enabled for this workspace. Try magic-link or SSO instead.",
  magic_link_method_not_allowed: "Magic-link sign-in isn't enabled for this workspace.",
  oauth_method_not_allowed: "That sign-in provider isn't enabled for this workspace.",
  auth_method_blocked: "That sign-in method isn't allowed for your account.",
  rate_limited: 'Too many sign-in attempts. Please wait a moment and try again.',
  verified_domain_requires_sso:
    'Your email is on a domain that requires single sign-on. Use the SSO option to continue.',
  require_two_factor: 'Two-factor authentication is required. Please verify your second factor.',
}

const LOGIN_PATHS = new Set(['/admin/login', '/auth/login'])

export class AuthBlockedError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'AuthBlockedError'
    this.code = code
  }
}

/**
 * Inspect a Response to see if it was redirected to a login error
 * page. Returns the corresponding error to throw, or null if this
 * was a normal response.
 *
 * Exported so the onResponse hook stays a one-liner and the
 * detection logic is unit-testable without a real Response.
 */
export function detectAuthBlockRedirect(response: {
  redirected: boolean
  url: string
}): AuthBlockedError | null {
  if (!response.redirected) return null
  let parsed: URL
  try {
    parsed = new URL(response.url)
  } catch {
    return null
  }
  if (!LOGIN_PATHS.has(parsed.pathname)) return null
  const code = parsed.searchParams.get('error')
  if (!code) return null
  const message = FRIENDLY_MESSAGES[code] ?? "Sign-in isn't allowed right now. Please try again."
  return new AuthBlockedError(code, message)
}
