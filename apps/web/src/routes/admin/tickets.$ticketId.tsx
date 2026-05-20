/**
 * Ticket detail page.
 *
 * Layout: full-width, no queue sidebar (handled at parent route). Top row =
 * <TicketDetailHeader>. Below: left column = thread feed + composer; right
 * column = tabs (Properties / Participants / Shares / SLA / Activity). All
 * mutations live inside the per-tab components.
 */
import { Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { createRouteErrorComponent } from '@/components/admin/shared'
import { useSuspenseQuery } from '@tanstack/react-query'
import type { TicketId } from '@quackback/ids'
import { ticketQueries } from '@/lib/client/queries/tickets'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useMyPermissions } from '@/lib/client/hooks/use-authz-queries'
import { TicketDetailHeader } from '@/components/admin/tickets/ticket-detail-header'
import { TicketThreadFeed } from '@/components/admin/tickets/ticket-thread-feed'
import { TicketThreadComposer } from '@/components/admin/tickets/ticket-thread-composer'
import { TicketPropertiesPanel } from '@/components/admin/tickets/ticket-properties-panel'
import { TicketParticipantsList } from '@/components/admin/tickets/ticket-participants-list'
import { TicketSharesPanel } from '@/components/admin/tickets/ticket-shares-panel'
import { TicketSlaPanel } from '@/components/admin/tickets/ticket-sla-panel'
import { TicketActivityTimeline } from '@/components/admin/tickets/ticket-activity-timeline'

export const Route = createFileRoute('/admin/tickets/$ticketId')({
  loader: async ({ params, context }) => {
    const { queryClient } = context as {
      queryClient: import('@tanstack/react-query').QueryClient
    }
    const ticketId = params.ticketId as TicketId
    await Promise.all([
      queryClient.ensureQueryData(ticketQueries.detail(ticketId)),
      queryClient.ensureQueryData(ticketQueries.threads(ticketId)),
      queryClient.ensureQueryData(ticketQueries.participants(ticketId)),
      queryClient.ensureQueryData(ticketQueries.shares(ticketId)),
      queryClient.ensureQueryData(ticketQueries.statuses()),
    ])
  },
  errorComponent: createRouteErrorComponent('Failed to load ticket'),
  component: TicketDetailPage,
})

function hasAnyPermission(
  perms: ReturnType<typeof useMyPermissions>['data'] | undefined,
  key: string
): boolean {
  if (!perms) return false
  if (perms.workspacePermissions.includes(key as never)) return true
  return perms.teamPermissions.some((tp) => tp.permissions.includes(key as never))
}

function TicketDetailPage() {
  const { ticketId: rawId } = Route.useParams()
  const ticketId = rawId as TicketId

  const { data: ticket } = useSuspenseQuery(ticketQueries.detail(ticketId))
  const { data: threads } = useSuspenseQuery(ticketQueries.threads(ticketId))
  const { data: participants } = useSuspenseQuery(ticketQueries.participants(ticketId))
  const { data: shares } = useSuspenseQuery(ticketQueries.shares(ticketId))
  const perms = useMyPermissions()

  const currentPrincipalId = perms.data?.principalId ?? ticket.assigneePrincipalId ?? ticket.id
  const canPublic = hasAnyPermission(perms.data, 'ticket.reply_public')
  const canInternal = hasAnyPermission(perms.data, 'ticket.comment_internal')
  const canShared = hasAnyPermission(perms.data, 'ticket.share_cross_team')

  return (
    <div className="flex h-full flex-col">
      <TicketDetailHeader
        ticket={{
          id: ticket.id,
          subject: ticket.subject,
          channel: ticket.channel,
          priority: ticket.priority,
          visibilityScope: ticket.visibilityScope,
          updatedAt: ticket.updatedAt,
          assigneePrincipalId: ticket.assigneePrincipalId,
        }}
        currentPrincipalId={currentPrincipalId as never}
      />

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-w-0 border-r border-border/50">
          <div className="flex-1 overflow-auto p-4">
            <TicketThreadFeed
              threads={threads.map((t) => ({
                id: t.id,
                ticketId: t.ticketId,
                principalId: t.principalId,
                audience: t.audience as 'public' | 'internal' | 'shared_team',
                bodyJson: t.bodyJson,
                bodyText: t.bodyText,
                sharedWithTeamId: t.sharedWithTeamId,
                createdAt: t.createdAt,
                editedAt: t.editedAt,
              }))}
              description={
                ticket.descriptionText || ticket.descriptionJson
                  ? { text: ticket.descriptionText, json: ticket.descriptionJson }
                  : null
              }
            />
          </div>
          <TicketThreadComposer
            ticketId={ticketId}
            canPublic={canPublic}
            canInternal={canInternal}
            canShared={canShared}
          />
        </div>

        <aside className="w-80 shrink-0 overflow-auto">
          <Tabs defaultValue="properties" className="h-full">
            <TabsList className="w-full justify-start rounded-none border-b border-border/50 bg-transparent px-2">
              <TabsTrigger value="properties">Properties</TabsTrigger>
              <TabsTrigger value="participants">People</TabsTrigger>
              <TabsTrigger value="shares">Shares</TabsTrigger>
              <TabsTrigger value="sla">SLA</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="properties" className="p-3">
              <TicketPropertiesPanel
                ticket={{
                  id: ticket.id,
                  subject: ticket.subject,
                  statusId: ticket.statusId,
                  priority: ticket.priority,
                  visibilityScope: ticket.visibilityScope,
                  primaryTeamId: ticket.primaryTeamId,
                  inboxId: ticket.inboxId,
                  organizationId: ticket.organizationId,
                  requesterContactId: ticket.requesterContactId,
                  assigneePrincipalId: ticket.assigneePrincipalId,
                  updatedAt: ticket.updatedAt,
                }}
              />
            </TabsContent>
            <TabsContent value="participants" className="p-3">
              <TicketParticipantsList
                ticketId={ticketId}
                participants={participants.map((p) => ({
                  id: p.id,
                  ticketId: p.ticketId,
                  principalId: p.principalId,
                  contactId: p.contactId,
                  role: p.role,
                }))}
              />
            </TabsContent>
            <TabsContent value="shares" className="p-3">
              <TicketSharesPanel
                ticketId={ticketId}
                shares={shares.map((s) => ({
                  id: s.id,
                  ticketId: s.ticketId,
                  teamId: s.teamId,
                  accessLevel: s.accessLevel,
                }))}
                canShare={canShared}
              />
            </TabsContent>
            <TabsContent value="sla" className="p-3">
              <Suspense fallback={<Skeleton className="h-24 w-full" />}>
                <TicketSlaPanel ticketId={ticketId} />
              </Suspense>
            </TabsContent>
            <TabsContent value="activity" className="p-3">
              <Suspense fallback={<Skeleton className="h-24 w-full" />}>
                <TicketActivityTimeline ticketId={ticketId} />
              </Suspense>
            </TabsContent>
          </Tabs>
        </aside>
      </div>
    </div>
  )
}
