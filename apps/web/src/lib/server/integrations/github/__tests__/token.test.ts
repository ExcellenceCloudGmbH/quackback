import { beforeEach, describe, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({
  update: vi.fn(),
  updateSet: vi.fn(),
  updateWhere: vi.fn(),
  eq: vi.fn((a: unknown, b: unknown) => ({ a, b })),
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({ strings, values })),
  decryptSecrets: vi.fn(),
  encryptSecrets: vi.fn((secrets: Record<string, unknown>) => JSON.stringify(secrets)),
  getPlatformCredentials: vi.fn(),
  refreshGitHubToken: vi.fn(),
  cacheDel: vi.fn(),
}))

vi.mock('@/lib/server/db', () => ({
  db: { update: m.update },
  integrations: { id: 'integrations.id', errorCount: 'integrations.errorCount' },
  eq: m.eq,
  sql: m.sql,
}))

vi.mock('@/lib/server/redis', () => ({
  CACHE_KEYS: { INTEGRATION_MAPPINGS: 'integration:mappings' },
  cacheDel: m.cacheDel,
}))

vi.mock('@/lib/server/integrations/encryption', () => ({
  decryptSecrets: m.decryptSecrets,
  encryptSecrets: m.encryptSecrets,
}))

vi.mock('@/lib/server/domains/platform-credentials/platform-credential.service', () => ({
  getPlatformCredentials: m.getPlatformCredentials,
}))

vi.mock('../oauth', () => ({
  refreshGitHubToken: m.refreshGitHubToken,
}))

vi.mock('@/lib/server/logger', () => ({
  logger: { child: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }) },
}))

const { getGitHubAccessTokenForIntegration } = await import('../token')

beforeEach(() => {
  vi.clearAllMocks()
  m.updateWhere.mockResolvedValue(undefined)
  m.updateSet.mockReturnValue({ where: m.updateWhere })
  m.update.mockReturnValue({ set: m.updateSet })
  m.getPlatformCredentials.mockResolvedValue({ clientId: 'client', clientSecret: 'secret' })
})

describe('getGitHubAccessTokenForIntegration', () => {
  it('returns the stored access token when it is non-expiring', async () => {
    m.decryptSecrets.mockReturnValue({ accessToken: 'gh_current' })

    await expect(
      getGitHubAccessTokenForIntegration({
        id: 'integration_1',
        secrets: 'cipher',
        config: {},
      })
    ).resolves.toBe('gh_current')

    expect(m.refreshGitHubToken).not.toHaveBeenCalled()
    expect(m.update).not.toHaveBeenCalled()
  })

  it('refreshes and persists an expired GitHub token', async () => {
    m.decryptSecrets.mockReturnValue({ accessToken: 'gh_old', refreshToken: 'refresh_old' })
    m.refreshGitHubToken.mockResolvedValue({
      accessToken: 'gh_new',
      refreshToken: 'refresh_new',
      expiresIn: 3600,
      refreshTokenExpiresIn: 7200,
    })

    await expect(
      getGitHubAccessTokenForIntegration({
        id: 'integration_1',
        secrets: 'cipher',
        config: { tokenExpiresAt: '2026-01-01T00:00:00.000Z', channelId: 'org/repo' },
      })
    ).resolves.toBe('gh_new')

    expect(m.refreshGitHubToken).toHaveBeenCalledWith('refresh_old', {
      clientId: 'client',
      clientSecret: 'secret',
    })
    expect(m.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        secrets: JSON.stringify({ accessToken: 'gh_new', refreshToken: 'refresh_new' }),
        config: expect.objectContaining({
          channelId: 'org/repo',
          tokenExpiresAt: expect.any(String),
          refreshTokenExpiresAt: expect.any(String),
        }),
        lastError: null,
        errorCount: 0,
      })
    )
    expect(m.cacheDel).toHaveBeenCalledWith('integration:mappings')
  })

  it('records a reconnect error when refresh fails', async () => {
    m.decryptSecrets.mockReturnValue({ accessToken: 'gh_old', refreshToken: 'refresh_old' })
    m.refreshGitHubToken.mockRejectedValue(new Error('bad refresh token'))

    await expect(
      getGitHubAccessTokenForIntegration({
        id: 'integration_1',
        secrets: 'cipher',
        config: { tokenExpiresAt: '2026-01-01T00:00:00.000Z' },
      })
    ).rejects.toThrow('bad refresh token')

    expect(m.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        lastError: 'GitHub authorization refresh failed: bad refresh token',
        lastErrorAt: expect.any(Date),
        updatedAt: expect.any(Date),
      })
    )
    expect(m.cacheDel).not.toHaveBeenCalled()
  })
})
