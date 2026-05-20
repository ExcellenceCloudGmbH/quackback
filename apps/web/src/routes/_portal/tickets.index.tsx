import { createFileRoute, redirect } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { useIntl, FormattedMessage } from 'react-intl'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import { EmptyState } from '@/components/shared/empty-state'
import { portalTicketQueries, type PortalStatusCategory } from '@/lib/client/queries/portal-tickets'
import { PortalTicketRowItem } from '@/components/public/tickets/portal-ticket-row'
import {
  PortalTicketStatusFilter,
  type StatusFilterValue,
} from '@/components/public/tickets/portal-ticket-status-filter'

const searchSchema = z.object({
  status: z.enum(['open', 'pending', 'solved', 'closed', 'all']).optional().default('open'),
})

function statusToCategory(s: StatusFilterValue): PortalStatusCategory | undefined {
  return s === 'all' ? undefined : s
}

export const Route = createFileRoute('/_portal/tickets/')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ status: search.status }),
  loader: async ({ context, deps }) => {
    if (!context.session?.user) {
      throw redirect({ to: '/auth/login', search: { next: '/tickets' } as never })
    }
    await context.queryClient.ensureQueryData(
      portalTicketQueries.list({ statusCategory: statusToCategory(deps.status) })
    )
    return { workspaceName: context.settings?.name ?? '' }
  },
  head: ({ loaderData }) => {
    const title = loaderData?.workspaceName
      ? `My tickets · ${loaderData.workspaceName}`
      : 'My tickets'
    return { meta: [{ title }] }
  },
  component: TicketsListPage,
})

function TicketsListPage() {
  const search = Route.useSearch()
  const intl = useIntl()
  const { data } = useSuspenseQuery(
    portalTicketQueries.list({ statusCategory: statusToCategory(search.status) })
  )

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          <FormattedMessage id="portal.tickets.title" defaultMessage="My tickets" />
        </h1>
        <p className="text-sm text-muted-foreground">
          <FormattedMessage
            id="portal.tickets.subtitle"
            defaultMessage="Tickets you opened or were added to."
          />
        </p>
      </div>

      <PortalTicketStatusFilter value={search.status} />

      {data.rows.length === 0 ? (
        <EmptyState
          icon={ChatBubbleLeftRightIcon}
          title={intl.formatMessage({
            id: 'portal.tickets.empty.title',
            defaultMessage: 'No tickets yet',
          })}
          description={intl.formatMessage({
            id: 'portal.tickets.empty.description',
            defaultMessage: "When our team handles a request from you, it'll appear here.",
          })}
        />
      ) : (
        <ul className="space-y-2">
          {data.rows.map((row) => (
            <li key={row.id}>
              <PortalTicketRowItem ticket={row} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
