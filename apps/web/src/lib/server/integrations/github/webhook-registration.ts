/**
 * GitHub webhook registration.
 *
 * Uses GitHub REST API to create/delete webhooks for issue status sync.
 */

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
  webhookId: string
): Promise<void> {
  const response = await fetch(`${GITHUB_API}/repos/${ownerRepo}/hooks/${webhookId}`, {
    method: 'PATCH',
    headers: githubWebhookHeaders(accessToken),
    body: JSON.stringify({
      active: true,
      add_events: [...GITHUB_WEBHOOK_EVENTS],
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
