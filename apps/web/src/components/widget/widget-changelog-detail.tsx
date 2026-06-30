import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FormattedMessage } from 'react-intl'
import { ScrollArea } from '@/components/ui/scroll-area'
import { publicChangelogQueries } from '@/lib/client/queries/changelog'
import { RichTextContent, isRichTextContent } from '@/components/ui/rich-text-editor'
import { EmbedHydration } from '@/components/shared/embed-hydration'
import type { ChangelogId } from '@quackback/ids'
import type { JSONContent } from '@tiptap/react'
import { WidgetPortalTitle } from './widget-portal-title'
import { sendToHost } from '@/lib/client/widget-bridge'
import { getWidgetAuthHeaders } from '@/lib/client/widget-auth'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

interface WidgetChangelogDetailProps {
  entryId: string
}

export function WidgetChangelogDetail({ entryId }: WidgetChangelogDetailProps) {
  const { data: entry, isLoading } = useQuery(
    publicChangelogQueries.detail(entryId as ChangelogId, getWidgetAuthHeaders())
  )

  const changelogEntryId = entry?.id
  const handleViewOnPortal = useCallback(() => {
    if (!changelogEntryId) return
    const url = `${window.location.origin}/changelog/${changelogEntryId}`
    sendToHost({ type: 'quackback:navigate', url })
  }, [changelogEntryId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="text-sm text-muted-foreground">
          <FormattedMessage id="widget.changelogDetail.loading" defaultMessage="Loading..." />
        </div>
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="text-sm text-muted-foreground">
          <FormattedMessage id="widget.changelogDetail.notFound" defaultMessage="Entry not found" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* min-w-0 lets the flex child shrink so its content wraps instead of
          forcing the widget wider; overflow-x-hidden is the backstop. */}
      <ScrollArea scrollBarClassName="w-1.5" className="flex-1 min-h-0 w-full">
        <div className="px-4 py-3 min-w-0 max-w-full overflow-x-hidden">
          <time className="text-[11px] text-muted-foreground/60 uppercase tracking-wide">
            {formatDate(entry.publishedAt)}
          </time>
          {(entry.category || entry.product) && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {entry.category && (
                <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: entry.category.color ?? 'var(--muted-foreground)' }}
                  />
                  <span className="truncate">{entry.category.name}</span>
                </span>
              )}
              {entry.product && (
                <span className="inline-flex max-w-full items-center rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground/80">
                  <span className="truncate">{entry.product.name}</span>
                </span>
              )}
            </div>
          )}
          <WidgetPortalTitle title={entry.title} onClick={handleViewOnPortal} />

          <div className="mt-3 min-w-0 max-w-full">
            {entry.contentJson && isRichTextContent(entry.contentJson) ? (
              <EmbedHydration>
                <RichTextContent
                  content={entry.contentJson as JSONContent}
                  className="prose-sm max-w-none break-words [overflow-wrap:anywhere] [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_img]:max-w-full [&_img]:h-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_h1]:text-base [&_h2]:text-[15px] [&_h3]:text-sm [&_h4]:text-sm [&_p]:text-[13px] [&_li]:text-[13px]"
                />
              </EmbedHydration>
            ) : (
              <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[13px] text-muted-foreground">
                {entry.content}
              </p>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
