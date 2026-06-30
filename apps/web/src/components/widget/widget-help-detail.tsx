import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FormattedMessage } from 'react-intl'
import { ScrollArea } from '@/components/ui/scroll-area'
import { publicHelpCenterQueries } from '@/lib/client/queries/help-center'
import { RichTextContent, isRichTextContent } from '@/components/ui/rich-text-editor'
import type { JSONContent } from '@tiptap/react'
import { WidgetPortalTitle } from './widget-portal-title'
import { sendToHost } from '@/lib/client/widget-bridge'
import { getWidgetAuthHeaders } from '@/lib/client/widget-auth'

interface WidgetHelpDetailProps {
  articleSlug: string
}

export function WidgetHelpDetail({ articleSlug }: WidgetHelpDetailProps) {
  const { data: article, isLoading } = useQuery(
    publicHelpCenterQueries.articleBySlug(articleSlug, getWidgetAuthHeaders())
  )

  const handleViewOnPortal = useCallback(() => {
    if (!article) return
    const url = `${window.location.origin}/hc/articles/${article.category.slug}/${article.slug}`
    sendToHost({ type: 'quackback:navigate', url })
  }, [article])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="text-sm text-muted-foreground">
          <FormattedMessage id="widget.helpDetail.loading" defaultMessage="Loading..." />
        </div>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="text-sm text-muted-foreground">
          <FormattedMessage id="widget.helpDetail.notFound" defaultMessage="Article not found" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea scrollBarClassName="w-1.5" className="flex-1 min-h-0 w-full">
        <div className="px-4 py-3 min-w-0 max-w-full overflow-x-hidden">
          <span className="text-[11px] text-muted-foreground/60 uppercase tracking-wide">
            {article.category.name}
          </span>
          <WidgetPortalTitle title={article.title} onClick={handleViewOnPortal} />

          <div className="mt-3 min-w-0 max-w-full">
            {article.contentJson && isRichTextContent(article.contentJson) ? (
              <RichTextContent
                content={article.contentJson as JSONContent}
                className="prose-sm max-w-none break-words [overflow-wrap:anywhere] [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_img]:max-w-full [&_img]:h-auto [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_h1]:text-base [&_h2]:text-[15px] [&_h3]:text-sm [&_h4]:text-sm [&_p]:text-[13px] [&_li]:text-[13px]"
              />
            ) : (
              <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[13px] text-muted-foreground">
                {article.content}
              </p>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
