import { useEffect, useState } from 'react'
import { FormattedMessage } from 'react-intl'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import { useWidgetAuth } from './widget-auth-provider'
import { getWidgetAuthHeaders } from '@/lib/client/widget-auth'
import { getMyChatFn } from '@/lib/server/functions/chat'
import type { ConversationDTO } from '@/lib/shared/chat/types'
import { WidgetResumeCard } from './widget-resume-card'

interface WidgetMessagesSectionProps {
  /** Open the full-height chat thread. */
  onOpenChat: () => void
}

/**
 * The "Messages" half of the combined support surface: a resume card for any
 * in-flight conversation plus a primary CTA into the chat thread. Rendered
 * below the help articles when live chat is part of the support surface. Reads
 * only the conversation summary from getMyChatFn (the thread itself loads when
 * the visitor opens chat); re-keyed on sessionVersion like the rest of the
 * widget so it refreshes after identify.
 */
export function WidgetMessagesSection({ onOpenChat }: WidgetMessagesSectionProps) {
  const { sessionVersion } = useWidgetAuth()
  const [conversation, setConversation] = useState<ConversationDTO | null>(null)
  const [teamName, setTeamName] = useState<string | null>(null)
  const [agentsOnline, setAgentsOnline] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await getMyChatFn({ headers: getWidgetAuthHeaders() })
        if (cancelled) return
        setConversation(res.conversation ?? null)
        setTeamName(res.teamName)
        setAgentsOnline(res.agentsOnline)
      } catch {
        /* no conversation / not signed in — show the start CTA only */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sessionVersion])

  return (
    <div className="mt-4 border-t border-border/40 pt-3">
      <p className="px-1 pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">
        <FormattedMessage id="widget.messages.heading" defaultMessage="Messages" />
      </p>

      {conversation && (
        <div className="mb-2">
          <WidgetResumeCard
            conversation={conversation}
            teamName={teamName}
            agentsOnline={agentsOnline}
            onClick={onOpenChat}
          />
        </div>
      )}

      <button
        type="button"
        onClick={onOpenChat}
        className="w-full flex items-center justify-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors"
      >
        <ChatBubbleLeftRightIcon className="w-4 h-4 text-muted-foreground" />
        {conversation ? (
          <FormattedMessage
            id="widget.messages.continue"
            defaultMessage="Continue the conversation"
          />
        ) : (
          <FormattedMessage id="widget.messages.start" defaultMessage="Send us a message" />
        )}
      </button>
    </div>
  )
}
