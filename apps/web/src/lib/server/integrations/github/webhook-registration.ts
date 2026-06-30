/**
 * GitHub webhook registration.
 *
 * Uses GitHub REST API to create/delete webhooks for issue status sync.
 */

import { db, integrations, eq } from '@/lib/server/db'
import {
  buildWebhookCallbackUrl,
  generateWebhookSecret,
} from '@/lib/server/integrations/webhook-registration'
import type { IntegrationId } from '@quackback/ids'
import { getGitHubAccessTokenForIntegration } from './token'

const GITHUB_API = 'https://api.github.com'
export const GITHUB_WEBHOOK_EVENTS = ['issues', 'issue_comment'] as const
export const GITHUB_WEBHOOK_EVENTS_VERSION = 2

interface GitHubWebhookResult {
  webhookId: string
}

function githubWebhookHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'quackback',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

/**
 * Register a webhook with GitHub to receive issue events.
 */
export async function registerGitHubWebhook(
  accessToken: string,
  ownerRepo: string,
  callbackUrl: string,
  secret: string
): Promise<GitHubWebhookResult> {
  const response = await fetch(`${GITHUB_API}/repos/${ownerRepo}/hooks`, {
    method: 'POST',
    headers: githubWebhookHeaders(accessToken),
    body: JSON.stringify({
      name: 'web',
      active: true,
      events: [...GITHUB_WEBHOOK_EVENTS],
      config: {
        url: callbackUrl,
        content_type: 'json',
        secret,
        insecure_ssl: '0',
      },
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`GitHub API error ${response.status}: ${body}`)
  }

  const hook = (await response.json()) as { id: number }
  return { webhookId: String(hook.id) }
}

/**
 * Ensure an existing GitHub webhook is subscribed to every event required for
 * ticket sync. This repairs hooks created before issue-comment sync existed.
 */
export async function ensureGitHubWebhookEvents(
  accessToken: string,
  ownerRepo: string,
  webhookId: string,
  options: { callbackUrl?: string; secret?: string } = {}
): Promise<void> {
  const response = await fetch(`${GITHUB_API}/repos/${ownerRepo}/hooks/${webhookId}`, {
    method: 'PATCH',
    headers: githubWebhookHeaders(accessToken),
    body: JSON.stringify({
      active: true,
      add_events: [...GITHUB_WEBHOOK_EVENTS],
      ...(options.callbackUrl || options.secret
        ? {
            config: {
              ...(options.callbackUrl ? { url: options.callbackUrl } : {}),
              ...(options.secret ? { secret: options.secret } : {}),
              content_type: 'json',
              insecure_ssl: '0',
            },
          }
        : {}),
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`GitHub API error ${response.status}: ${body}`)
  }
}

/**
 * Delete a webhook from GitHub.
 */
export async function deleteGitHubWebhook(
  accessToken: string,
  ownerRepo: string,
  webhookId: string
): Promise<void> {
  await fetch(`${GITHUB_API}/repos/${ownerRepo}/hooks/${webhookId}`, {
    method: 'DELETE',
    headers: githubWebhookHeaders(accessToken),
  })
}

export async function deleteConfiguredGitHubWebhook(args: {
  integrationId: IntegrationId
  secrets: string | null
  config: Record<string, unknown>
}): Promise<void> {
  const ownerRepo = typeof args.config.channelId === 'string' ? args.config.channelId : ''
  const webhookId =
    typeof args.config.externalWebhookId === 'string' ? args.config.externalWebhookId : ''
  if (!args.secrets || !ownerRepo || !webhookId) return

  const accessToken = await getGitHubAccessTokenForIntegration({
    id: args.integrationId,
    secrets: args.secrets,
    config: args.config,
  })
  if (!accessToken) return

  await deleteGitHubWebhook(accessToken, ownerRepo, webhookId)
}

export async function ensureGitHubWebhookForIntegration(args: {
  integrationId: IntegrationId
  requestHeaders?: Headers
}): Promise<void> {
  const integration = await db.query.integrations.findFirst({
    where: eq(integrations.id, args.integrationId),
  })
  if (!integration || integration.status !== 'active') return

  const config = (integration.config ?? {}) as Record<string, unknown>
  const ownerRepo = typeof config.channelId === 'string' ? config.channelId : ''
  if (!ownerRepo || !integration.secrets) return

  const accessToken = await getGitHubAccessTokenForIntegration(integration)
  if (!accessToken) return

  const existingWebhookId =
    typeof config.externalWebhookId === 'string' ? config.externalWebhookId : ''
  const existingSecret = typeof config.webhookSecret === 'string' ? config.webhookSecret : ''
  const webhookSecret = existingSecret || generateWebhookSecret()
  const callbackUrl = buildWebhookCallbackUrl('github', { requestHeaders: args.requestHeaders })

  if (existingWebhookId && existingSecret) {
    let shouldRegisterReplacement = false
    try {
      await ensureGitHubWebhookEvents(accessToken, ownerRepo, existingWebhookId, {
        callbackUrl,
        secret: webhookSecret,
      })
    } catch (error) {
      if (!isGitHubNotFound(error)) throw error
      shouldRegisterReplacement = true
    }
    if (!shouldRegisterReplacement) {
      await db
        .update(integrations)
        .set({
          config: {
            ...config,
            webhookSecret,
            githubWebhookEventsVersion: GITHUB_WEBHOOK_EVENTS_VERSION,
          },
          updatedAt: new Date(),
        })
        .where(eq(integrations.id, args.integrationId))
      return
    }
  }

  if (existingWebhookId && existingSecret) {
    const result = await registerGitHubWebhook(accessToken, ownerRepo, callbackUrl, webhookSecret)
    await db
      .update(integrations)
      .set({
        config: {
          ...config,
          webhookSecret,
          externalWebhookId: result.webhookId,
          githubWebhookEventsVersion: GITHUB_WEBHOOK_EVENTS_VERSION,
        },
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, args.integrationId))
    return
  }

  const result = await registerGitHubWebhook(accessToken, ownerRepo, callbackUrl, webhookSecret)

  await db
    .update(integrations)
    .set({
      config: {
        ...config,
        webhookSecret,
        externalWebhookId: result.webhookId,
        githubWebhookEventsVersion: GITHUB_WEBHOOK_EVENTS_VERSION,
      },
      updatedAt: new Date(),
    })
    .where(eq(integrations.id, args.integrationId))
}

function isGitHubNotFound(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith('GitHub API error 404:')
}
