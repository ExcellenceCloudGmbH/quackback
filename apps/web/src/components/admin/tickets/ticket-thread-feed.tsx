/**
 * Thread feed for the ticket-detail page. Renders threads in chronological
 * order with audience-aware bubble styling: public = neutral card, internal =
 * yellow tinted, shared_team = purple tinted with the team label.
 */
import type { TicketId, TeamId, PrincipalId } from '@quackback/ids'
import { cn } from '@/lib/shared/utils'
import { TimeAgo } from '@/components/ui/time-ago'
import { RichTextContent, isRichTextContent } from '@/components/ui/rich-text-editor'

export interface ThreadRow {
  id: string
  ticketId: TicketId
  principalId: PrincipalId | null
  audience: 'public' | 'internal' | 'shared_team'
  bodyJson: unknown
  bodyText: string
  sharedWithTeamId: TeamId | null
  createdAt: Date | string
  editedAt: Date | string | null
}

export interface TicketThreadFeedProps {
  threads: ThreadRow[]
  /** Optional map of teamId → teamName for nicer "Shared with X" labels. */
  teamNames?: Record<string, string>
  /** Optional map of principalId → display name for author labels. */
  principalNames?: Record<string, string>
  /** Optional initial-description block (rendered before first thread). */
  description?: { text: string | null; json: unknown } | null
}

const audienceStyles: Record<ThreadRow['audience'], string> = {
  public: 'border-border/50 bg-background',
  internal: 'border-amber-300/60 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/20',
  shared_team:
    'border-purple-300/60 bg-purple-50/60 dark:border-purple-900/40 dark:bg-purple-950/20',
}

const audienceLabels: Record<ThreadRow['audience'], string> = {
  public: 'Public',
  internal: 'Internal note',
  shared_team: 'Shared with team',
}

export function TicketThreadFeed({
  threads,
  teamNames,
  principalNames,
  description,
}: TicketThreadFeedProps) {
  const hasDesc = description && (description.text || isRichTextContent(description.json))
  if (threads.length === 0 && !hasDesc) {
    return <div className="text-sm text-muted-foreground py-6 text-center">No replies yet.</div>
  }
  return (
    <div className="space-y-3">
      {hasDesc && (
        <div className="rounded-md border border-border/50 bg-muted/20 p-3">
          <div className="text-xs font-medium text-muted-foreground mb-1">Description</div>
          {isRichTextContent(description!.json) ? (
            <RichTextContent content={description!.json} className="prose-sm" />
          ) : (
            <div className="text-sm whitespace-pre-wrap">{description!.text}</div>
          )}
        </div>
      )}
      {threads.map((th) => {
        const teamLabel =
          th.audience === 'shared_team' && th.sharedWithTeamId
            ? (teamNames?.[th.sharedWithTeamId] ?? th.sharedWithTeamId)
            : null
        const author = th.principalId
          ? (principalNames?.[th.principalId] ?? th.principalId)
          : 'System'
        return (
          <article key={th.id} className={cn('rounded-md border p-3', audienceStyles[th.audience])}>
            <header className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">{author}</span>
                <span className="text-muted-foreground">
                  · <TimeAgo date={th.createdAt} />
                  {th.editedAt && <span className="ml-1 italic">(edited)</span>}
                </span>
              </div>
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {audienceLabels[th.audience]}
                {teamLabel && <span className="ml-1 normal-case">· {teamLabel}</span>}
              </span>
            </header>
            {isRichTextContent(th.bodyJson) ? (
              <RichTextContent content={th.bodyJson} className="prose-sm" />
            ) : (
              <div className="text-sm whitespace-pre-wrap">{th.bodyText}</div>
            )}
          </article>
        )
      })}
    </div>
  )
}
