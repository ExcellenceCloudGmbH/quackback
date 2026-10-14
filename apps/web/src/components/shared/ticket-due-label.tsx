/**
 * The customer-facing due date of a ticket: "Due Oct 21, 2026". Shown on the
 * portal and widget ticket rows and in the thread's ticket header, so the
 * customer sees the same date the team works to (their own "Needed by" pick,
 * or the date a teammate set).
 *
 * Neutral on purpose: no overdue or due-soon alarm for customers, since the
 * date is the team's commitment to chase, not the customer's. Renders nothing
 * without a due date or once the ticket is closed.
 */
import { FormattedMessage } from 'react-intl'
import { CalendarIcon } from '@heroicons/react/24/outline'
import { LocalDate } from '@/components/ui/local-date'
import { cn } from '@/lib/shared/utils'

const DUE_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
}

export function TicketDueLabel({
  dueAt,
  closed,
  className,
}: {
  /** The ticket's due date (ISO), null or absent when none is set. */
  dueAt: string | null | undefined
  /** Whether the ticket's stage is closed (`stage.closed`); a closed ticket shows no due date. */
  closed?: boolean
  className?: string
}) {
  if (!dueAt || closed || Number.isNaN(new Date(dueAt).getTime())) return null
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground',
        className
      )}
    >
      <CalendarIcon className="size-3 shrink-0" aria-hidden />
      <span>
        <FormattedMessage
          id="widget.tickets.due"
          defaultMessage="Due {date}"
          values={{ date: <LocalDate date={dueAt} options={DUE_DATE_FORMAT} /> }}
        />
      </span>
    </span>
  )
}
