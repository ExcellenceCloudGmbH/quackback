/**
 * Serialized, viewer-safe previews for live Quackback link embeds.
 *
 * Produced by the embed resolver (`getEmbedPreviewFn`) and consumed by the
 * shared embed card. Only fields that are safe for any granted viewer to see
 * are projected here — gated data never reaches these shapes, and an embed the
 * viewer can't see degrades to {@link EmbedUnavailable} rather than leaking
 * existence.
 */

/** A resolved feedback-post embed. */
export interface EmbedPostPreview {
  kind: 'post'
  postId: string
  title: string
  voteCount: number
  statusName: string | null
  statusColor: string | null
  boardName: string
  boardSlug: string
}

/** A resolved (published) changelog-entry embed. */
export interface EmbedChangelogPreview {
  kind: 'changelog'
  entryId: string
  title: string
  publishedAt: string | null
}

/** A broken, deleted, or unauthorized embed — renders as a muted placeholder. */
export interface EmbedUnavailable {
  unavailable: true
}

export type EmbedPreview = EmbedPostPreview | EmbedChangelogPreview | EmbedUnavailable
