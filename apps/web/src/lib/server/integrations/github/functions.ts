/**
 * GitHub-specific server functions.
 */
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { PrincipalId, IntegrationId } from '@quackback/ids'

export interface GitHubOAuthState {
  type: 'github_oauth'
  workspaceId: string
  returnDomain: string
  principalId: PrincipalId
  nonce: string
  ts: number
  /** 'new' = create new integration, 'reconnect' = update existing */
  intent?: 'new' | 'reconnect'
  /** Integration ID to reconnect (when intent === 'reconnect') */
  integrationId?: string
  /** Pre-auth fields (e.g., selected repo) */
  preAuthFields?: Record<string, string>
}

export interface GitHubRepo {
  id: number
  fullName: string
  private: boolean
}

export const getGitHubConnectUrl = createServerFn({ method: 'GET' })
  .inputValidator(
    z
      .object({
        intent: z.enum(['new', 'reconnect']).optional(),
        integrationId: z.string().optional(),
        repoFullName: z.string().optional(),
      })
      .optional()
  )
  .handler(async ({ data }): Promise<string> => {
    const { randomBytes } = await import('crypto')
    const { requireAuth } = await import('../../functions/auth-helpers')
    const { signOAuthState } = await import('@/lib/server/auth/oauth-state')
    const { config } = await import('@/lib/server/config')

    const auth = await requireAuth({ roles: ['admin'] })
    const { hasPlatformCredentials } =
      await import('@/lib/server/domains/platform-credentials/platform-credential.service')
    if (!(await hasPlatformCredentials('github'))) {
      throw new Error(
        'GitHub platform credentials not configured. Configure them in integration settings first.'
      )
    }
    const returnDomain = new URL(config.baseUrl).host

    const state = signOAuthState({
      type: 'github_oauth',
      workspaceId: auth.settings.id,
      returnDomain,
      principalId: auth.principal.id,
      nonce: randomBytes(16).toString('base64url'),
      ts: Date.now(),
      intent: data?.intent,
      integrationId: data?.integrationId,
      preAuthFields: data?.repoFullName ? { repoFullName: data.repoFullName } : undefined,
    } satisfies GitHubOAuthState)

    return `/oauth/github/connect?state=${encodeURIComponent(state)}`
  })

export const fetchGitHubReposFn = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ integrationId: z.string().optional() }).optional())
  .handler(async ({ data }): Promise<GitHubRepo[]> => {
    const { requireAuth } = await import('../../functions/auth-helpers')
    const { db, integrations, eq, and } = await import('@/lib/server/db')
    const { decryptSecrets } = await import('../encryption')
    const { listGitHubRepos } = await import('./repos')

    await requireAuth({ roles: ['admin'] })

    let integration
    if (data?.integrationId) {
      integration = await db.query.integrations.findFirst({
        where: and(
          eq(integrations.id, data.integrationId as IntegrationId),
          eq(integrations.integrationType, 'github')
        ),
      })
    } else {
      // Fall back to any active GitHub integration
      integration = await db.query.integrations.findFirst({
        where: and(eq(integrations.integrationType, 'github'), eq(integrations.status, 'active')),
      })
    }

    if (!integration?.secrets || integration.status !== 'active') {
      throw new Error('GitHub not connected')
    }

    const secrets = decryptSecrets<{ accessToken: string }>(integration.secrets)
    return listGitHubRepos(secrets.accessToken)
  })

/**
 * Fetch all GitHub integrations with configs and event mappings.
 */
export const fetchGitHubIntegrationsFn = createServerFn({ method: 'GET' }).handler(async () => {
  const { requireAuth } = await import('../../functions/auth-helpers')
  const { db, integrations, eq } = await import('@/lib/server/db')

  await requireAuth({ roles: ['admin'] })

  const { hasPlatformCredentials } =
    await import('@/lib/server/domains/platform-credentials/platform-credential.service')
  const { getIntegration } = await import('@/lib/server/integrations')
  const definition = getIntegration('github')
  const platformCredentialFields = definition?.platformCredentials ?? []
  const platformCredentialsConfigured =
    platformCredentialFields.length === 0 || (await hasPlatformCredentials('github'))

  const allGithub = await db.query.integrations.findMany({
    where: eq(integrations.integrationType, 'github'),
    with: { eventMappings: true },
    orderBy: (int, { desc }) => [desc(int.connectedAt)],
  })

  const connections = allGithub.map((int) => {
    const config = (int.config ?? {}) as Record<string, string | number | boolean | null>
    return {
      id: int.id,
      status: int.status,
      label: int.label,
      config,
      lastError: int.lastError ?? null,
      eventMappings: int.eventMappings.map((m) => ({
        id: m.id,
        eventType: m.eventType,
        enabled: m.enabled,
        filters: m.filters as Record<string, string | number | boolean | null> | null,
      })),
    }
  })

  return { connections, platformCredentialFields, platformCredentialsConfigured }
})
