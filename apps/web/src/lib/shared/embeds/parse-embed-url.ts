import { isValidTypeId } from '@quackback/ids'

/**
 * A parsed reference to an embeddable Quackback entity. Produced by
 * {@link parseEmbedUrl} when a pasted/typed URL points at a feedback post
 * or a published changelog entry; consumed by the embed resolver/card.
 */
export type EmbedRef = { kind: 'post' | 'changelog'; id: string }

// Path shapes we recognise. The captured segment is the candidate TypeID,
// which `isValidTypeId` then verifies for real (charset + round-trip), so a
// structurally-bogus id on a matching path is rejected, not embedded.
//   - post:      /b/<board-slug>/posts/<post-id>
//   - changelog: /changelog/<changelog-id>
// Note the changelog prefix is `changelog_` (per @quackback/ids), not `clog_`.
const POST_PATH = /^\/b\/[^/]+\/posts\/(post_[0-9a-z]+)$/i
const CHANGELOG_PATH = /^\/changelog\/(changelog_[0-9a-z]+)$/i

/**
 * Parse a Quackback URL into a typed embed reference, or `null` when the URL
 * is malformed, points elsewhere, or carries an id that isn't a valid TypeID
 * of the expected kind. Never throws — an unparseable string is just `null`.
 */
export function parseEmbedUrl(raw: string): EmbedRef | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }

  const postMatch = url.pathname.match(POST_PATH)
  if (postMatch && isValidTypeId(postMatch[1], 'post')) {
    return { kind: 'post', id: postMatch[1] }
  }

  const changelogMatch = url.pathname.match(CHANGELOG_PATH)
  if (changelogMatch && isValidTypeId(changelogMatch[1], 'changelog')) {
    return { kind: 'changelog', id: changelogMatch[1] }
  }

  return null
}
