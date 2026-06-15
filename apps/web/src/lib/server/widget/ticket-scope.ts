import type { Ticket, WidgetProfileSupportCategory } from '@/lib/server/db'
import { NotFoundError } from '@/lib/shared/errors'
import type { WidgetRequestContext } from './context'
import type { InboxId, WidgetProfileId } from '@quackback/ids'

export function visibleWidgetSupportCategories(
  context: WidgetRequestContext
): WidgetProfileSupportCategory[] {
  return (context.supportConfig.categories ?? []).filter((category) => category.visible !== false)
}

export function allowedWidgetSupportInboxIds(context: WidgetRequestContext): InboxId[] {
  return Array.from(
    new Set(visibleWidgetSupportCategories(context).map((category) => category.inboxId))
  ) as InboxId[]
}

export function widgetTicketListScope(context: WidgetRequestContext) {
  return context.supportConfig.ticketListScope ?? 'same_profile_allowed_inboxes'
}

export function widgetTicketListFilters(context: WidgetRequestContext): {
  sourceWidgetProfileId: WidgetProfileId | null
  allowedInboxIds: InboxId[] | null
} {
  if (!context.profileId) {
    return { sourceWidgetProfileId: null, allowedInboxIds: null }
  }

  const scope = widgetTicketListScope(context)
  return {
    sourceWidgetProfileId:
      scope === 'same_profile_allowed_inboxes' ? (context.profileId as WidgetProfileId) : null,
    allowedInboxIds: scope === 'requester_owned' ? null : allowedWidgetSupportInboxIds(context),
  }
}

export function assertTicketMatchesWidgetContext(
  ticket: Ticket,
  context: WidgetRequestContext
): void {
  if (!context.profileId) return

  const scope = widgetTicketListScope(context)
  if (scope === 'requester_owned') return

  if (
    scope === 'same_profile_allowed_inboxes' &&
    ticket.sourceWidgetProfileId !== context.profileId
  ) {
    throw new NotFoundError('TICKET_NOT_FOUND', `ticket ${ticket.id} not found`)
  }

  const inboxIds = allowedWidgetSupportInboxIds(context)
  if (inboxIds.length === 0 || !ticket.inboxId || !inboxIds.includes(ticket.inboxId as InboxId)) {
    throw new NotFoundError('TICKET_NOT_FOUND', `ticket ${ticket.id} not found`)
  }
}
