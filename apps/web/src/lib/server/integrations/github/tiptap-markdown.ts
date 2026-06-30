import type { JSONContent } from '@tiptap/core'
import type { TiptapContent } from '@/lib/server/db'
import { tiptapJsonToMarkdown } from '@/lib/server/markdown-tiptap'
import { sanitizeImageUrl } from '@/lib/shared/utils/sanitize'

interface GitHubImageRef {
  url: string
  alt: string
}

interface TiptapLikeNode {
  type?: string
  attrs?: Record<string, unknown>
  content?: TiptapLikeNode[]
}

const IMAGE_NODE_TYPES = new Set(['image', 'resizableImage', 'chatImage'])

export function resolveGitHubAssetUrl(
  rawUrl: string | null | undefined,
  rootUrl?: string
): string | null {
  const sanitized = sanitizeImageUrl(String(rawUrl ?? '').trim())
  if (!sanitized || sanitized.startsWith('data:')) return null

  if (/^https?:\/\//i.test(sanitized)) {
    return sanitized
  }

  if (sanitized.startsWith('//')) {
    return `https:${sanitized}`
  }

  if (rootUrl) {
    try {
      return new URL(sanitized, rootUrl).toString()
    } catch {
      return null
    }
  }

  return sanitized
}

export function renderTiptapForGitHubMarkdown(
  content: unknown,
  opts: { rootUrl?: string; fallback?: string | null } = {}
): string {
  const fallback = opts.fallback?.trim() ?? ''
  let markdown = ''

  if (isTiptapDoc(content)) {
    try {
      markdown = tiptapJsonToMarkdown(content as TiptapContent | JSONContent).trim()
    } catch {
      markdown = ''
    }
  }

  if (!markdown) {
    markdown = fallback
  }

  const missingImages = collectGitHubImageRefs(content, opts.rootUrl).filter(
    (image) => !markdown.includes(image.url)
  )

  if (missingImages.length === 0) {
    return markdown
  }

  return [markdown, missingImages.map(formatGitHubImageMarkdown).join('\n\n')]
    .filter(Boolean)
    .join('\n\n')
    .trim()
}

function isTiptapDoc(content: unknown): content is TiptapLikeNode {
  return Boolean(
    content && typeof content === 'object' && (content as TiptapLikeNode).type === 'doc'
  )
}

function collectGitHubImageRefs(content: unknown, rootUrl?: string): GitHubImageRef[] {
  const refs: GitHubImageRef[] = []
  const seen = new Set<string>()

  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    const typed = node as TiptapLikeNode

    if (typed.type && IMAGE_NODE_TYPES.has(typed.type)) {
      const url = resolveGitHubAssetUrl(String(typed.attrs?.src ?? ''), rootUrl)
      if (url && !seen.has(url)) {
        seen.add(url)
        refs.push({
          url,
          alt: String(typed.attrs?.alt ?? '').trim() || 'Image',
        })
      }
    }

    if (Array.isArray(typed.content)) {
      for (const child of typed.content) visit(child)
    }
  }

  visit(content)
  return refs
}

function formatGitHubImageMarkdown(image: GitHubImageRef): string {
  const alt = image.alt.replace(/[\]\n\r]/g, ' ').trim() || 'Image'
  const url = image.url.replace(/>/g, '%3E').replace(/\s/g, '%20')
  return `![${alt}](<${url}>)`
}
