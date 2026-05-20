/**
 * Right-panel "Activity" tab. Renders the ticket's audit timeline pulled via
 * `ticketQueries.activity()`. Each row shows the activity type, optional
 * principal name, timestamp, and a compact dump of the metadata diff.
 */
import { useSuspenseQuery } from '@tanstack/react-query'
import type { TicketId } from '@quackback/ids'
import { ticketQueries } from '@/lib/client/queries/tickets'
import { TimeAgo } from '@/components/ui/time-ago'

export interface TicketActivityTimelineProps {
  ticketId: TicketId
  principalNames?: Record<string, string>
}

const TYPE_LABELS: Record<string, string> = {
  created: 'Created ticket',
  status_changed: 'Status changed',
  priority_changed: 'Priority changed',
  assignee_changed: 'Assignee changed',
  reopened: 'Reopened',
  closed: 'Closed',
  participant_added: 'Participant added',
  participant_removed: 'Participant removed',
  share_added: 'Share added',
  share_revoked: 'Share revoked',
  inbox_changed: 'Inbox changed',
  visibility_changed: 'Visibility changed',
  team_changed: 'Primary team changed',
  organization_changed: 'Organization changed',
  contact_changed: 'Contact changed',
  subject_changed: 'Subject changed',
  thread_added: 'Reply posted',
  soft_deleted: 'Ticket deleted',
}

function formatMetadata(meta: unknown): string | null {
  if (meta == null || typeof meta !== 'object') return null
  const entries = Object.entries(meta as Record<string, unknown>)
  if (entries.length === 0) return null
  return entries
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(' · ')
}

export function TicketActivityTimeline({ ticketId, principalNames }: TicketActivityTimelineProps) {
  const { data } = useSuspenseQuery(ticketQueries.activity(ticketId, { limit: 100 }))

  if (data.length === 0) {
    return <div className="text-xs text-muted-foreground py-2">No activity yet.</div>
  }

  return (
    <ol className="space-y-2 text-xs">
      {data.map((row) => {
        const who = row.principalId
          ? (principalNames?.[row.principalId] ?? row.principalId)
          : 'System'
        const label = TYPE_LABELS[row.type] ?? row.type
        const meta = formatMetadata(row.metadata)
        return (
          <li key={row.id} className="border-l-2 border-border pl-2 space-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <span>
                <span className="font-medium">{who}</span> · {label}
              </span>
              <span className="text-muted-foreground">
                <TimeAgo date={row.createdAt} />
              </span>
            </div>
            {meta && <div className="text-muted-foreground truncate">{meta}</div>}
          </li>
        )
      })}
    </ol>
  )
}
