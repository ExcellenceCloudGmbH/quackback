/**
 * Tests for the admin-only SSO test sign-in server functions:
 *
 *  - startSsoTestFn returns a typed error union when SSO is not yet
 *    configured or the client secret is missing, and otherwise builds
 *    an OIDC authorize URL (no PKCE — mirrors prod genericOAuth) and
 *    persists a TestSession to Redis.
 *  - getSsoTestResultFn gates on admin auth, polls the result key, and
 *    returns null until the callback writes its diagnostic payload.
 *  - runSsoTestCallbackFn loads the one-time session, deletes it before
 *    running the handshake (replay defense), and persists a wire-safe
 *    diagnostic (stripping `raw`) for the polling path.
 *
 * Uses the same `createServerFn` capture pattern as the other
 * `functions/__tests__` suites — the registered handler is the second
 * arg passed to `.handler()` post-AST-transform, but in tests (no
 * transform) it's the first arg. We mock the builder to capture it.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

type AnyHandler = (args: { data: Record<string, unknown> }) => Promise<unknown>

const handlers: AnyHandler[] = []

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    const chain = {
      inputValidator() {
        return chain
      },
      handler(fn: AnyHandler) {
        handlers.push(fn)
        return chain
      },
    }
    return chain
  },
}))

const hoisted = vi.hoisted(() => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  cacheDel: vi.fn(),
  requireAuth: vi.fn(),
  getTenantSettings: vi.fn(),
  getSsoClientSecret: vi.fn(),
  checkUrlSafety: vi.fn(),
  runHandshake: vi.fn(),
}))

vi.mock('@/lib/server/redis', () => ({
  cacheGet: hoisted.cacheGet,
  cacheSet: hoisted.cacheSet,
  cacheDel: hoisted.cacheDel,
  CACHE_KEYS: {},
}))

vi.mock('@/lib/server/functions/auth-helpers', () => ({
  requireAuth: hoisted.requireAuth,
}))

vi.mock('@/lib/server/domains/settings/settings.service', () => ({
  getTenantSettings: hoisted.getTenantSettings,
}))

vi.mock('@/lib/server/auth/sso-secret', () => ({
  getSsoClientSecret: hoisted.getSsoClientSecret,
}))

vi.mock('@/lib/server/content/ssrf-guard', () => ({
  checkUrlSafety: hoisted.checkUrlSafety,
}))

vi.mock('@/lib/server/config', () => ({
  config: { baseUrl: 'https://qb.test' },
}))

vi.mock('@/lib/server/auth/sso-test-handshake', () => ({
  runHandshake: hoisted.runHandshake,
}))

beforeEach(() => {
  vi.clearAllMocks()
  hoisted.requireAuth.mockResolvedValue({ user: { id: 'user_admin' } })
  hoisted.checkUrlSafety.mockResolvedValue({ safe: true })
})

// Load the module ONCE — handler order mirrors the export sequence:
//   0: startSsoTestFn
//   1: getSsoTestResultFn
//   2: runSsoTestCallbackFn
await import('../sso-test')
const startSsoTest = handlers[0]
const getSsoTestResult = handlers[1]
const runSsoTestCallback = handlers[2]

describe('startSsoTestFn', () => {
  it('returns no-config error when ssoOidc is missing', async () => {
    hoisted.getTenantSettings.mockResolvedValue({ authConfig: {} })

    const result = await startSsoTest({ data: {} })
    expect(result).toMatchObject({ error: 'sso-not-configured' })
  })

  it('returns no-secret error when secret is missing', async () => {
    hoisted.getTenantSettings.mockResolvedValue({
      authConfig: {
        ssoOidc: {
          enabled: true,
          discoveryUrl: 'https://idp',
          clientId: 'c',
          autoCreateUsers: false,
        },
      },
    })
    hoisted.getSsoClientSecret.mockResolvedValue(null)

    const result = await startSsoTest({ data: {} })
    expect(result).toMatchObject({ error: 'no-secret' })
  })

  it('returns testId + authorizeUrl when preconditions met', async () => {
    hoisted.getTenantSettings.mockResolvedValue({
      authConfig: {
        ssoOidc: {
          enabled: true,
          discoveryUrl: 'https://idp/.well-known',
          clientId: 'c',
          autoCreateUsers: false,
        },
      },
    })
    hoisted.getSsoClientSecret.mockResolvedValue('secret')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          issuer: 'https://idp',
          authorization_endpoint: 'https://idp/auth',
          token_endpoint: 'https://idp/token',
          jwks_uri: 'https://idp/jwks',
        }),
        { status: 200 }
      )
    )
    hoisted.cacheSet.mockResolvedValue(undefined)

    const result = (await startSsoTest({ data: {} })) as {
      testId: string
      authorizeUrl: string
    }

    expect(result.testId).toMatch(/^ssotest_/)
    expect(result.authorizeUrl).toMatch(/^https:\/\/idp\/auth\?/)
    expect(result.authorizeUrl).toMatch(
      /redirect_uri=https%3A%2F%2Fqb\.test%2Fadmin%2Fsso%2Ftest%2Fcallback/
    )
    expect(result.authorizeUrl).not.toMatch(/code_challenge/)
    expect(hoisted.cacheSet).toHaveBeenCalledTimes(1)
  })
})

describe('runSsoTestCallbackFn', () => {
  const validSession = {
    testId: 'ssotest_abc',
    state: 'state-xyz',
    nonce: 'nonce-xyz',
    discoveryUrl: 'https://idp/.well-known',
    tokenEndpoint: 'https://idp/token',
    jwksUri: 'https://idp/jwks',
    authorizationEndpoint: 'https://idp/auth',
    issuer: 'https://idp',
    clientId: 'cid',
    clientSecret: 'csecret',
    redirectUri: 'https://qb.test/admin/sso/test/callback',
    adminUserId: 'user_admin',
    startedAt: 1700000000,
  }

  it('returns state-validation failure when no state param is present', async () => {
    const result = (await runSsoTestCallback({ data: {} })) as {
      result: { ok: false; stage: string; hint: string; steps: unknown[] }
      testId: string | null
    }

    expect(result.testId).toBeNull()
    expect(result.result.ok).toBe(false)
    expect(result.result.stage).toBe('state-validation')
    expect(result.result.hint).toMatch(/state parameter/i)
    expect(result.result.steps).toEqual([])
    expect(hoisted.cacheGet).not.toHaveBeenCalled()
  })

  it('returns state-validation failure when session missing in Redis', async () => {
    hoisted.cacheGet.mockResolvedValueOnce(null)

    const result = (await runSsoTestCallback({
      data: { state: 'unknown-state' },
    })) as {
      result: { ok: false; stage: string; hint: string; steps: unknown[] }
      testId: string | null
    }

    expect(result.testId).toBeNull()
    expect(result.result.ok).toBe(false)
    expect(result.result.stage).toBe('state-validation')
    expect(result.result.hint).toMatch(/expired or invalid/i)
    expect(result.result.steps).toEqual([])
    expect(hoisted.cacheGet).toHaveBeenCalledWith('sso-test:unknown-state')
    expect(hoisted.cacheDel).not.toHaveBeenCalled()
    expect(hoisted.runHandshake).not.toHaveBeenCalled()
  })

  it('deletes session before running handshake (one-time-use replay defense) and persists wire-safe ok result', async () => {
    hoisted.cacheGet.mockResolvedValueOnce(validSession)
    const okResult = {
      ok: true,
      steps: [{ ok: true, stage: 'state-validation', label: 'state' }],
      claims: { iss: 'https://idp', sub: 'u1', aud: 'cid', email: 'a@b' },
      tokenInfo: { idTokenAlg: 'RS256', hasAccessToken: true, hasRefreshToken: false },
    }
    hoisted.runHandshake.mockResolvedValueOnce(okResult)

    const result = (await runSsoTestCallback({
      data: { state: 'state-xyz', code: 'authcode' },
    })) as { result: typeof okResult; testId: string | null }

    // Replay defense: cacheDel ran before runHandshake.
    expect(hoisted.cacheDel).toHaveBeenCalledWith('sso-test:state-xyz')
    expect(hoisted.runHandshake).toHaveBeenCalledTimes(1)
    expect(hoisted.cacheDel.mock.invocationCallOrder[0]).toBeLessThan(
      hoisted.runHandshake.mock.invocationCallOrder[0]
    )

    expect(hoisted.runHandshake).toHaveBeenCalledWith({
      state: 'state-xyz',
      code: 'authcode',
      idpError: null,
      idpErrorDescription: null,
      expectedState: 'state-xyz',
      expectedNonce: 'nonce-xyz',
      discoveryUrl: 'https://idp/.well-known',
      clientId: 'cid',
      clientSecret: 'csecret',
      redirectUri: 'https://qb.test/admin/sso/test/callback',
    })

    // Persisted wire-safe result lives at sso-test:result:<testId> with 600s TTL.
    expect(hoisted.cacheSet).toHaveBeenCalledWith(
      'sso-test:result:ssotest_abc',
      { result: okResult },
      600
    )

    expect(result.testId).toBe('ssotest_abc')
    expect(result.result).toEqual(okResult)
    // ok-branch has no `raw` field on the type at all — just sanity:
    expect((result.result as Record<string, unknown>).raw).toBeUndefined()
  })

  it('strips raw from both returned and persisted result on handshake failure', async () => {
    hoisted.cacheGet.mockResolvedValueOnce(validSession)
    const failResult = {
      ok: false,
      stage: 'token-exchange',
      errorCode: 'invalid_grant',
      hint: 'bad code',
      steps: [{ ok: false, stage: 'token-exchange', label: 'token' }],
      raw: { secret: 'leaky-internal-payload' },
    }
    hoisted.runHandshake.mockResolvedValueOnce(failResult)

    const result = (await runSsoTestCallback({
      data: { state: 'state-xyz', code: 'authcode' },
    })) as {
      result: { ok: false; stage: string; errorCode: string; hint: string; steps: unknown[] }
      testId: string | null
    }

    // Returned result has no raw field.
    expect(result.result).toEqual({
      ok: false,
      stage: 'token-exchange',
      errorCode: 'invalid_grant',
      hint: 'bad code',
      steps: failResult.steps,
    })
    expect((result.result as Record<string, unknown>).raw).toBeUndefined()

    // Persisted result also has no raw field.
    expect(hoisted.cacheSet).toHaveBeenCalledTimes(1)
    const [, persistedValue] = hoisted.cacheSet.mock.calls[0]
    expect(persistedValue).toEqual({
      result: {
        ok: false,
        stage: 'token-exchange',
        errorCode: 'invalid_grant',
        hint: 'bad code',
        steps: failResult.steps,
      },
    })
    expect((persistedValue as { result: Record<string, unknown> }).result.raw).toBeUndefined()
  })
})

describe('getSsoTestResultFn', () => {
  it('requires admin auth (rejects when requireAuth throws)', async () => {
    hoisted.requireAuth.mockRejectedValueOnce(new Error('unauthenticated'))

    await expect(getSsoTestResult({ data: { testId: 'ssotest_abc' } })).rejects.toThrow(
      /unauthenticated/i
    )
    expect(hoisted.cacheGet).not.toHaveBeenCalled()
  })

  it('returns null when no diagnostic has been written yet', async () => {
    hoisted.cacheGet.mockResolvedValueOnce(null)

    const result = await getSsoTestResult({ data: { testId: 'ssotest_abc' } })
    expect(result).toBeNull()
    expect(hoisted.cacheGet).toHaveBeenCalledWith('sso-test:result:ssotest_abc')
  })

  it('returns the diagnostic payload verbatim when present', async () => {
    const diagnostic = {
      result: {
        ok: true as const,
        steps: [{ ok: true, stage: 'state-validation' as const, label: 'state' }],
        claims: { iss: 'https://idp', sub: 'u1', aud: 'cid' },
        tokenInfo: {
          idTokenAlg: 'RS256',
          hasAccessToken: true,
          hasRefreshToken: false,
        },
      },
    }
    hoisted.cacheGet.mockResolvedValueOnce(diagnostic)

    const result = await getSsoTestResult({ data: { testId: 'ssotest_xyz' } })
    expect(result).toBe(diagnostic)
    expect(hoisted.cacheGet).toHaveBeenCalledWith('sso-test:result:ssotest_xyz')
  })
})
