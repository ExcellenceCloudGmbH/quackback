import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  tiptapJsonToMarkdown: vi.fn(),
}))

vi.mock('@/lib/server/markdown-tiptap', () => ({
  tiptapJsonToMarkdown: h.tiptapJsonToMarkdown,
}))

import { renderTiptapForGitHubMarkdown, resolveGitHubAssetUrl } from '../tiptap-markdown'

beforeEach(() => {
  vi.clearAllMocks()
  h.tiptapJsonToMarkdown.mockReturnValue('Steps to reproduce')
})

describe('renderTiptapForGitHubMarkdown', () => {
  it('appends resizableImage nodes as absolute GitHub-renderable image markdown', () => {
    const markdown = renderTiptapForGitHubMarkdown(
      {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Steps to reproduce' }] },
          {
            type: 'resizableImage',
            attrs: { src: '/api/storage/portal-images/shot.png', alt: 'Failure screenshot' },
          },
        ],
      },
      { rootUrl: 'https://app.example.test' }
    )

    expect(markdown).toContain('Steps to reproduce')
    expect(markdown).toContain(
      '![Failure screenshot](<https://app.example.test/api/storage/portal-images/shot.png>)'
    )
  })

  it('does not duplicate images already emitted by the base markdown serializer', () => {
    h.tiptapJsonToMarkdown.mockReturnValue(
      '![Failure screenshot](https://app.example.test/api/storage/portal-images/shot.png)'
    )

    const markdown = renderTiptapForGitHubMarkdown(
      {
        type: 'doc',
        content: [
          {
            type: 'image',
            attrs: { src: 'https://app.example.test/api/storage/portal-images/shot.png' },
          },
        ],
      },
      { rootUrl: 'https://app.example.test' }
    )

    expect(markdown.match(/portal-images\/shot\.png/g)).toHaveLength(1)
  })
})

describe('resolveGitHubAssetUrl', () => {
  it('resolves app-relative storage URLs against the public root URL', () => {
    expect(resolveGitHubAssetUrl('/api/storage/ticket-attachments/a.png', 'https://app.test')).toBe(
      'https://app.test/api/storage/ticket-attachments/a.png'
    )
  })
})
