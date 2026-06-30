import type { IntegrationId } from '@quackback/ids'
import { db, integrations, eq, sql } from '@/lib/server/db'
import { cacheDel, CACHE_KEYS } from '@/lib/server/redis'
import { toIsoString } from '@/lib/shared/utils'
import { decryptSecrets, encryptSecrets } from '../encryption'
import { refreshGitHubToken } from './oauth'
import { logger } from '@/lib/server/logger'

const log = logger.child({ component: 'github-token' })
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000

export interface GitHubTokenIntegration {
  id: string
  secrets: string | null
  config: unknown
}

interface GitHubTokenSecrets {
  accessToken?: string
  refreshToken?: string
}

interface GitHubTokenConfig {
  tokenExpiresAt?: string
  refreshTokenExpiresAt?: string
}

function objectConfig(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function shouldRefresh(config: GitHubTokenConfig, secrets: GitHubTokenSecrets): boolean {
  if (!secrets.refreshToken || !config.tokenExpiresAt) return false
  const expiresAt = new Date(config.tokenExpiresAt).getTime()
  if (Number.isNaN(expiresAt)) return true
  return Date.now() >= expiresAt - TOKEN_REFRESH_BUFFER_MS
}

/**
 * Return a usable GitHub access token for an integration, refreshing and
 * persisting it first when the OAuth app issued an expiring user token.
 */
export async function getGitHubAccessTokenForIntegration(
  integration: GitHubTokenIntegration
): Promise<string | null> {
  if (!integration.secrets) return null

  const secrets = decryptSecrets<GitHubTokenSecrets>(integration.secrets)
  if (!secrets.accessToken) return null

  const config = objectConfig(integration.config)
  if (!shouldRefresh(config as GitHubTokenConfig, secrets)) {
    return secrets.accessToken
  }

  const refreshToken = secrets.refreshToken
  if (!refreshToken) return secrets.accessToken

  log.info({ integration_id: integration.id }, 'refreshing GitHub access token')
  const { getPlatformCredentials } =
    await import('@/lib/server/domains/platform-credentials/platform-credential.service')
  const credentials = await getPlatformCredentials('github')
  let refreshed: Awaited<ReturnType<typeof refreshGitHubToken>>
  try {
    refreshed = await refreshGitHubToken(refreshToken, credentials ?? undefined)
  } catch (error) {
    const message =
      error instanceof Error
        ? `GitHub authorization refresh failed: ${error.message}`
        : 'GitHub authorization refresh failed. Reconnect GitHub.'
    await db
      .update(integrations)
      .set({
        lastError: message,
        lastErrorAt: new Date(),
        errorCount: sql`${integrations.errorCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, integration.id as IntegrationId))
    throw error
  }
  const refreshedConfig: Record<string, unknown> = {
    ...config,
    tokenExpiresAt: toIsoString(new Date(Date.now() + refreshed.expiresIn * 1000)),
  }
  if (refreshed.refreshTokenExpiresIn) {
    refreshedConfig.refreshTokenExpiresAt = toIsoString(
      new Date(Date.now() + refreshed.refreshTokenExpiresIn * 1000)
    )
  }

  await db
    .update(integrations)
    .set({
      secrets: encryptSecrets({
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken ?? refreshToken,
      }),
      config: refreshedConfig,
      lastError: null,
      lastErrorAt: null,
      errorCount: 0,
      updatedAt: new Date(),
    })
    .where(eq(integrations.id, integration.id as IntegrationId))

  await cacheDel(CACHE_KEYS.INTEGRATION_MAPPINGS)

  return refreshed.accessToken
}
