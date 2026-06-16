import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ensureGitHubWebhookEvents,
  registerGitHubWebhook,
  GITHUB_WEBHOOK_EVENTS,
} from '../webhook-registration'

function mockFetch(status: number, body: unknown = {}) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  })
}

describe('GitHub webhook registration', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('registers repository hooks for issues and issue comments', async () => {
    const fetchMock = mockFetch(201, { id: 123 })
    vi.stubGlobal('fetch', fetchMock)

    const result = await registerGitHubWebhook(
      'gh_token',
      'org/repo',
      'https://app.example.com/api/integrations/github/webhook',
      'secret'
    )

    expect(result).toEqual({ webhookId: '123' })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/repos/org/repo/hooks',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(String),
      })
    )
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toMatchObject({
      active: true,
      events: [...GITHUB_WEBHOOK_EVENTS],
    })
  })

  it('repairs existing repository hooks by adding required events', async () => {
    const fetchMock = mockFetch(200, {})
    vi.stubGlobal('fetch', fetchMock)

    await ensureGitHubWebhookEvents('gh_token', 'org/repo', '123')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/repos/org/repo/hooks/123',
      expect.objectContaining({
        method: 'PATCH',
        body: expect.any(String),
      })
    )
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toMatchObject({
      active: true,
      add_events: [...GITHUB_WEBHOOK_EVENTS],
    })
  })
})
