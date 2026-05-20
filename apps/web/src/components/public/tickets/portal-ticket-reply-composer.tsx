import { useState, useMemo } from 'react'
import type { JSONContent } from '@tiptap/react'
import { FormattedMessage, useIntl } from 'react-intl'
import { Button } from '@/components/ui/button'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { useReplyToMyTicket } from '@/lib/client/queries/portal-tickets'
import type { TicketId } from '@quackback/ids'

export interface PortalTicketReplyComposerProps {
  ticketId: TicketId
  /** When true, the composer is rendered in a disabled "ticket closed" state. */
  isClosed: boolean
}

function plainTextFromJson(json: JSONContent | null): string {
  if (!json) return ''
  let out = ''
  const walk = (node: JSONContent) => {
    if (node.type === 'text' && typeof node.text === 'string') out += node.text
    if (node.content) node.content.forEach(walk)
    if (node.type === 'paragraph' || node.type === 'heading') out += '\n'
  }
  walk(json)
  return out.trim()
}

export function PortalTicketReplyComposer({ ticketId, isClosed }: PortalTicketReplyComposerProps) {
  const intl = useIntl()
  const [body, setBody] = useState<JSONContent | null>(null)
  const reply = useReplyToMyTicket(ticketId)

  const placeholder = intl.formatMessage({
    id: 'portal.tickets.composer.placeholder',
    defaultMessage: 'Type your reply…',
  })

  const text = useMemo(() => plainTextFromJson(body), [body])
  const isEmpty = text.length === 0

  if (isClosed) {
    return (
      <div className="rounded-md border border-dashed border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
        <FormattedMessage
          id="portal.tickets.composer.closed"
          defaultMessage="This ticket is closed. Open a new one to follow up."
        />
      </div>
    )
  }

  return (
    <div className="space-y-2 rounded-md border border-border/60 bg-background p-3">
      <RichTextEditor
        value={body ?? undefined}
        onChange={(json) => setBody(json)}
        placeholder={placeholder}
        minHeight="100px"
      />
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={isEmpty || reply.isPending}
          onClick={() =>
            reply.mutate(
              { bodyJson: body, bodyText: text },
              {
                onSuccess: () => setBody(null),
              }
            )
          }
          aria-busy={reply.isPending}
        >
          {reply.isPending ? (
            <FormattedMessage id="portal.tickets.composer.sending" defaultMessage="Sending…" />
          ) : (
            <FormattedMessage id="portal.tickets.composer.send" defaultMessage="Send reply" />
          )}
        </Button>
      </div>
    </div>
  )
}
