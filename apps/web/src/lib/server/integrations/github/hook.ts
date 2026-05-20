/**
 * GitHub hook handler.
 * Creates GitHub issues from feedback posts and syncs ticket events bidirectionally.
 */

import type { HookHandler, HookResult } from '../../events/hook-types'
import type { EventData } from '../../events/types'
import { isRetryableError } from '../../events/hook-utils'
import { buildGitHubIssueBody } from './message'
import { buildTicketIssueBody, buildTicketUpdateBody } from './ticket-message'
import { DEFAULT_GITHUB_STATUS_MAPPINGS, type GitHubStatusMapping } from './types'
import type { TicketStatusCategory } from '@/lib/server/db'

const GITHUB_API = 'https://api.github.com'

// ============================================================================
// Sync logging helper
// ============================================================================

interface SyncLogEntry {
  integrationId: string
  ticketId?: string
  externalId?: string
  eventType: string
  direction: 'outbound' | 'inbound'
  status: 'success' | 'failed' | 'skipped'
  errorMessage?: string
  durationMs?: number
}

async function logSyncAttempt(entry: SyncLogEntry): Promise<void> {
  try {
    const { db, integrationSyncLog } = await import('@/lib/server/db')
    await db.insert(integrationSyncLog).values({
      integrationId: entry.integrationId,
      ticketId: entry.ticketId ?? null,
      externalId: entry.externalId ?? null,
      eventType: entry.eventType,
      direction: entry.direction,
      status: entry.status,
      errorMessage: entry.errorMessage ?? null,
      durationMs: entry.durationMs ?? null,
    })
  } catch (err) {
    console.error('[GitHub] Failed to write sync log:', err)
  }
}

async function updateIntegrationError(integrationId: string, error: string): Promise<void> {
  try {
    const { db, integrations, eq, sql } = await import('@/lib/server/db')
    await db
      .update(integrations)
      .set({
        lastError: error,
        lastErrorAt: new Date(),
        errorCount: sql`${integrations.errorCount} + 1`,
      })
      .where(eq(integrations.id, integrationId as import('@quackback/ids').IntegrationId))
  } catch (err) {
    console.error('[GitHub] Failed to update integration error:', err)
  }
}

async function clearIntegrationError(integrationId: string): Promise<void> {
  try {
    const { db, integrations, eq } = await import('@/lib/server/db')
    await db
      .update(integrations)
      .set({ lastError: null, lastErrorAt: null, errorCount: 0 })
      .where(eq(integrations.id, integrationId as import('@quackback/ids').IntegrationId))
  } catch (err) {
    console.error('[GitHub] Failed to clear integration error:', err)
  }
}

async function touchExternalLinkSyncedAt(ticketId: string, integrationId: string): Promise<void> {
  try {
    const { db, ticketExternalLinks, eq, and } = await import('@/lib/server/db')
    await db
      .update(ticketExternalLinks)
      .set({ lastSyncedAt: new Date() })
      .where(
        and(
          eq(ticketExternalLinks.ticketId, ticketId as import('@quackback/ids').TicketId),
          eq(
            ticketExternalLinks.integrationId,
            integrationId as import('@quackback/ids').IntegrationId
          )
        )
      )
  } catch (err) {
    console.error('[GitHub] Failed to update lastSyncedAt:', err)
  }
}

// ============================================================================
// Types
// ============================================================================

export interface GitHubTarget {
  channelId: string // "owner/repo" stored as channelId for consistency
}

export interface GitHubConfig {
  accessToken: string
  rootUrl: string
  integrationId?: string
  statusMappings?: Partial<Record<TicketStatusCategory, GitHubStatusMapping>>
  assigneeSync?: boolean
}

/** Standard GitHub API headers */
function githubHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'quackback',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

/** Map HTTP error statuses to HookResult */
function handleGitHubError(
  status: number,
  errorBody: string,
  ownerRepo: string
): HookResult | null {
  if (status === 401) {
    return {
      success: false,
      error: 'Authentication failed. Please reconnect GitHub.',
      shouldRetry: false,
    }
  }
  if (status === 404) {
    return {
      success: false,
      error: `Repository "${ownerRepo}" not found or not accessible.`,
      shouldRetry: false,
    }
  }
  if (status === 422) {
    return { success: false, error: `Validation error: ${errorBody}`, shouldRetry: false }
  }
  if (status === 429) {
    return { success: false, error: 'Rate limited by GitHub API.', shouldRetry: true }
  }
  return null
}

/**
 * Look up the GitHub issue number for a ticket via ticket_external_links.
 * Returns null if no link exists (ticket wasn't synced to this integration).
 */
async function findTicketIssueNumber(
  ticketId: string,
  integrationId: string
): Promise<string | null> {
  const { db, ticketExternalLinks, eq, and } = await import('@/lib/server/db')
  const link = await db.query.ticketExternalLinks.findFirst({
    where: and(
      eq(ticketExternalLinks.ticketId, ticketId as import('@quackback/ids').TicketId),
      eq(
        ticketExternalLinks.integrationId,
        integrationId as import('@quackback/ids').IntegrationId
      ),
      eq(ticketExternalLinks.status, 'active')
    ),
    columns: { externalId: true },
  })
  return link?.externalId ?? null
}

/**
 * Look up the GitHub username for a principal via integration_user_mappings.
 */
async function findGitHubUsername(
  principalId: string,
  integrationId: string
): Promise<string | null> {
  const { db, integrationUserMappings, eq, and } = await import('@/lib/server/db')
  const mapping = await db.query.integrationUserMappings.findFirst({
    where: and(
      eq(
        integrationUserMappings.integrationId,
        integrationId as import('@quackback/ids').IntegrationId
      ),
      eq(integrationUserMappings.principalId, principalId as import('@quackback/ids').PrincipalId)
    ),
    columns: { externalUsername: true },
  })
  return mapping?.externalUsername ?? null
}

/**
 * Wraps a ticket sync handler with timing, audit logging, error tracking, and lastSyncedAt updates.
 */
async function withSyncLog(
  event: EventData,
  ownerRepo: string,
  config: GitHubConfig,
  handler: () => Promise<HookResult>
): Promise<HookResult> {
  const ticketId = (event.data as { ticket?: { id: string } }).ticket?.id
  const integrationId = config.integrationId
  if (!integrationId) return handler() // No integration ID → skip logging

  const start = Date.now()
  let result: HookResult
  try {
    result = await handler()
  } catch (error) {
    const durationMs = Date.now() - start
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await logSyncAttempt({
      integrationId,
      ticketId,
      eventType: event.type,
      direction: 'outbound',
      status: 'failed',
      errorMessage,
      durationMs,
    })
    await updateIntegrationError(integrationId, errorMessage)
    throw error
  }

  const durationMs = Date.now() - start

  if (result.success) {
    await logSyncAttempt({
      integrationId,
      ticketId,
      externalId: result.externalId,
      eventType: event.type,
      direction: 'outbound',
      status: 'success',
      durationMs,
    })
    if (ticketId) await touchExternalLinkSyncedAt(ticketId, integrationId)
    await clearIntegrationError(integrationId)
  } else {
    await logSyncAttempt({
      integrationId,
      ticketId,
      eventType: event.type,
      direction: 'outbound',
      status: 'failed',
      errorMessage: result.error,
      durationMs,
    })
    if (result.error) await updateIntegrationError(integrationId, result.error)
  }

  return result
}

export const githubHook: HookHandler = {
  async run(event: EventData, target: unknown, config: unknown): Promise<HookResult> {
    const { channelId: ownerRepo } = target as GitHubTarget
    const ghConfig = config as GitHubConfig
    const { accessToken: _accessToken } = ghConfig

    // Route to appropriate handler based on event type
    switch (event.type) {
      case 'post.created':
        return handlePostCreated(event, ownerRepo, ghConfig)
      case 'ticket.created':
        return withSyncLog(event, ownerRepo, ghConfig, () =>
          handleTicketCreated(event, ownerRepo, ghConfig)
        )
      case 'ticket.status_changed':
        return withSyncLog(event, ownerRepo, ghConfig, () =>
          handleTicketStatusChanged(event, ownerRepo, ghConfig)
        )
      case 'ticket.assigned':
        return withSyncLog(event, ownerRepo, ghConfig, () =>
          handleTicketAssigned(event, ownerRepo, ghConfig)
        )
      case 'ticket.updated':
        return withSyncLog(event, ownerRepo, ghConfig, () =>
          handleTicketUpdated(event, ownerRepo, ghConfig)
        )
      default:
        return { success: true }
    }
  },
}

// ============================================================================
// Post Handlers (existing functionality)
// ============================================================================

async function handlePostCreated(
  event: EventData,
  ownerRepo: string,
  config: GitHubConfig
): Promise<HookResult> {
  if (event.type !== 'post.created') return { success: true }

  console.log(`[GitHub] Creating issue for ${event.type} -> repo ${ownerRepo}`)
  const { title, body } = buildGitHubIssueBody(event, config.rootUrl)

  try {
    const response = await fetch(`${GITHUB_API}/repos/${ownerRepo}/issues`, {
      method: 'POST',
      headers: githubHeaders(config.accessToken),
      body: JSON.stringify({ title, body }),
    })

    if (!response.ok) {
      const errorResult = handleGitHubError(response.status, await response.text(), ownerRepo)
      if (errorResult) return errorResult
      throw Object.assign(new Error(`HTTP ${response.status}`), { status: response.status })
    }

    const issue = (await response.json()) as { number: number; html_url: string }
    console.log(`[GitHub] Created issue #${issue.number} in ${ownerRepo}`)
    return { success: true, externalId: String(issue.number), externalUrl: issue.html_url }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      shouldRetry: isRetryableError(error),
    }
  }
}

// ============================================================================
// Ticket Handlers (new)
// ============================================================================

async function handleTicketCreated(
  event: EventData,
  ownerRepo: string,
  config: GitHubConfig
): Promise<HookResult> {
  if (event.type !== 'ticket.created') return { success: true }

  console.log(`[GitHub] Creating issue for ticket -> repo ${ownerRepo}`)
  const { title, body, labels } = buildTicketIssueBody(event)

  try {
    const response = await fetch(`${GITHUB_API}/repos/${ownerRepo}/issues`, {
      method: 'POST',
      headers: githubHeaders(config.accessToken),
      body: JSON.stringify({ title, body, labels }),
    })

    if (!response.ok) {
      const errorResult = handleGitHubError(response.status, await response.text(), ownerRepo)
      if (errorResult) return errorResult
      throw Object.assign(new Error(`HTTP ${response.status}`), { status: response.status })
    }

    const issue = (await response.json()) as { number: number; html_url: string }
    console.log(`[GitHub] Created issue #${issue.number} for ticket in ${ownerRepo}`)
    return {
      success: true,
      externalId: String(issue.number),
      externalDisplayId: `#${issue.number}`,
      externalUrl: issue.html_url,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      shouldRetry: isRetryableError(error),
    }
  }
}

async function handleTicketStatusChanged(
  event: EventData,
  ownerRepo: string,
  config: GitHubConfig
): Promise<HookResult> {
  if (event.type !== 'ticket.status_changed') return { success: true }
  if (!config.integrationId) return { success: true }

  const { ticket, newStatusCategory } = event.data
  const issueNumber = await findTicketIssueNumber(ticket.id, config.integrationId)
  if (!issueNumber) return { success: true } // No synced issue to update

  // Resolve status mapping
  const mappings = { ...DEFAULT_GITHUB_STATUS_MAPPINGS, ...config.statusMappings }
  const mapping = mappings[newStatusCategory as TicketStatusCategory]
  if (!mapping) return { success: true }

  console.log(`[GitHub] Updating issue #${issueNumber} state -> ${mapping.state} in ${ownerRepo}`)

  try {
    const patchBody: Record<string, unknown> = { state: mapping.state }
    if (mapping.state === 'closed') {
      patchBody.state_reason = 'completed'
    }

    const response = await fetch(`${GITHUB_API}/repos/${ownerRepo}/issues/${issueNumber}`, {
      method: 'PATCH',
      headers: githubHeaders(config.accessToken),
      body: JSON.stringify(patchBody),
    })

    if (!response.ok) {
      const errorResult = handleGitHubError(response.status, await response.text(), ownerRepo)
      if (errorResult) return errorResult
      throw Object.assign(new Error(`HTTP ${response.status}`), { status: response.status })
    }

    // If the mapping includes a label, add it (best-effort)
    if (mapping.label) {
      await addLabel(ownerRepo, issueNumber, mapping.label, config.accessToken).catch((err) =>
        console.warn(`[GitHub] Failed to add label "${mapping.label}":`, err)
      )
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      shouldRetry: isRetryableError(error),
    }
  }
}

async function handleTicketAssigned(
  event: EventData,
  ownerRepo: string,
  config: GitHubConfig
): Promise<HookResult> {
  if (event.type !== 'ticket.assigned') return { success: true }
  if (!config.integrationId || !config.assigneeSync) return { success: true }

  const { ticket, newAssigneePrincipalId } = event.data
  const issueNumber = await findTicketIssueNumber(ticket.id, config.integrationId)
  if (!issueNumber) return { success: true }

  // Resolve principal → GitHub username
  const assignees: string[] = []
  if (newAssigneePrincipalId) {
    const username = await findGitHubUsername(newAssigneePrincipalId, config.integrationId)
    if (username) assignees.push(username)
  }

  console.log(
    `[GitHub] Updating issue #${issueNumber} assignees -> [${assignees.join(', ')}] in ${ownerRepo}`
  )

  try {
    const response = await fetch(`${GITHUB_API}/repos/${ownerRepo}/issues/${issueNumber}`, {
      method: 'PATCH',
      headers: githubHeaders(config.accessToken),
      body: JSON.stringify({ assignees }),
    })

    if (!response.ok) {
      const errorResult = handleGitHubError(response.status, await response.text(), ownerRepo)
      if (errorResult) return errorResult
      throw Object.assign(new Error(`HTTP ${response.status}`), { status: response.status })
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      shouldRetry: isRetryableError(error),
    }
  }
}

async function handleTicketUpdated(
  event: EventData,
  ownerRepo: string,
  config: GitHubConfig
): Promise<HookResult> {
  if (event.type !== 'ticket.updated') return { success: true }
  if (!config.integrationId) return { success: true }

  const { ticket, changedFields, diff } = event.data
  const contentFields = ['subject', 'descriptionJson', 'descriptionText']
  const hasContentChange = changedFields.some((f) => contentFields.includes(f))
  const hasPriorityChange = changedFields.includes('priority')

  if (!hasContentChange && !hasPriorityChange) {
    return { success: true }
  }

  const issueNumber = await findTicketIssueNumber(ticket.id, config.integrationId)
  if (!issueNumber) return { success: true }

  try {
    // Sync subject/description if changed
    if (hasContentChange) {
      console.log(`[GitHub] Updating issue #${issueNumber} content in ${ownerRepo}`)
      const update = buildTicketUpdateBody(ticket)
      const patchBody: Record<string, unknown> = {}
      if (update.title) patchBody.title = update.title
      if (update.body) patchBody.body = update.body

      const response = await fetch(`${GITHUB_API}/repos/${ownerRepo}/issues/${issueNumber}`, {
        method: 'PATCH',
        headers: githubHeaders(config.accessToken),
        body: JSON.stringify(patchBody),
      })

      if (!response.ok) {
        const errorResult = handleGitHubError(response.status, await response.text(), ownerRepo)
        if (errorResult) return errorResult
        throw Object.assign(new Error(`HTTP ${response.status}`), { status: response.status })
      }
    }

    // Sync priority label if changed
    if (hasPriorityChange && diff.priority) {
      const oldPriority = diff.priority.from as string | null
      const newPriority = diff.priority.to as string | null
      console.log(
        `[GitHub] Updating issue #${issueNumber} priority ${oldPriority} -> ${newPriority} in ${ownerRepo}`
      )

      // Remove the old priority label (best-effort)
      if (oldPriority && oldPriority !== 'normal') {
        await removeLabel(
          ownerRepo,
          issueNumber,
          `priority:${oldPriority}`,
          config.accessToken
        ).catch((err) =>
          console.warn(`[GitHub] Failed to remove label "priority:${oldPriority}":`, err)
        )
      }

      // Add the new priority label (best-effort, skip 'normal' to keep it clean)
      if (newPriority && newPriority !== 'normal') {
        await addLabel(ownerRepo, issueNumber, `priority:${newPriority}`, config.accessToken).catch(
          (err) => console.warn(`[GitHub] Failed to add label "priority:${newPriority}":`, err)
        )
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      shouldRetry: isRetryableError(error),
    }
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Add a label to a GitHub issue. Creates the label if it doesn't exist.
 * Best-effort — errors are not fatal.
 */
async function addLabel(
  ownerRepo: string,
  issueNumber: string,
  label: string,
  accessToken: string
): Promise<void> {
  await fetch(`${GITHUB_API}/repos/${ownerRepo}/issues/${issueNumber}/labels`, {
    method: 'POST',
    headers: githubHeaders(accessToken),
    body: JSON.stringify({ labels: [label] }),
  })
}

/**
 * Remove a label from a GitHub issue.
 * Best-effort — errors are not fatal (e.g. label may not exist).
 */
async function removeLabel(
  ownerRepo: string,
  issueNumber: string,
  label: string,
  accessToken: string
): Promise<void> {
  await fetch(
    `${GITHUB_API}/repos/${ownerRepo}/issues/${issueNumber}/labels/${encodeURIComponent(label)}`,
    {
      method: 'DELETE',
      headers: githubHeaders(accessToken),
    }
  )
}
