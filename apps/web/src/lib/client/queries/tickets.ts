/**
 * TanStack Query factory for ticket-related reads.
 *
 * Mirrors the pattern in `queries/admin.ts`: queries return
 * `queryOptions(...)` objects so callers can pass them directly into
 * `useQuery` / `useSuspenseQuery` and `queryClient.ensureQueryData(...)`.
 */
import { queryOptions } from '@tanstack/react-query'
import type { TicketId } from '@quackback/ids'
import {
  listTicketsFn,
  getTicketFn,
  listThreadsFn,
  listParticipantsFn,
  listSharesFn,
  listTicketStatusesFn,
  listTicketActivityFn,
} from '@/lib/server/functions/tickets'
import { getTicketSlaClocksFn } from '@/lib/server/functions/sla'
import { listMyInboxesFn } from '@/lib/server/functions/inboxes'

export type QueueScope =
  | 'all'
  | 'my_assigned'
  | 'my_team'
  | 'shared_with_me'
  | 'unassigned'
  | 'my_inbox'
  | 'inbox'

export type StatusCategory = 'open' | 'pending' | 'on_hold' | 'solved' | 'closed'

export interface TicketQueueParams {
  scope: QueueScope
  statusCategory?: StatusCategory
  search?: string
  inboxId?: string | null
  limit?: number
  offset?: number
  sort?: 'last_activity_desc' | 'created_desc' | 'created_asc'
}

export const ticketQueries = {
  list: (params: TicketQueueParams) =>
    queryOptions({
      queryKey: ['tickets', 'list', params] as const,
      queryFn: () => listTicketsFn({ data: params }),
      staleTime: 10_000,
    }),
  detail: (ticketId: TicketId) =>
    queryOptions({
      queryKey: ['tickets', 'detail', ticketId] as const,
      queryFn: () => getTicketFn({ data: { ticketId } }),
      staleTime: 5_000,
    }),
  threads: (ticketId: TicketId) =>
    queryOptions({
      queryKey: ['tickets', 'threads', ticketId] as const,
      queryFn: () => listThreadsFn({ data: { ticketId } }),
      staleTime: 5_000,
    }),
  participants: (ticketId: TicketId) =>
    queryOptions({
      queryKey: ['tickets', 'participants', ticketId] as const,
      queryFn: () => listParticipantsFn({ data: { ticketId } }),
      staleTime: 30_000,
    }),
  shares: (ticketId: TicketId) =>
    queryOptions({
      queryKey: ['tickets', 'shares', ticketId] as const,
      queryFn: () => listSharesFn({ data: { ticketId } }),
      staleTime: 30_000,
    }),
  statuses: () =>
    queryOptions({
      queryKey: ['tickets', 'statuses'] as const,
      queryFn: () => listTicketStatusesFn(),
      staleTime: 5 * 60_000,
    }),
  slaClocks: (ticketId: TicketId, includeAll = false) =>
    queryOptions({
      queryKey: ['tickets', 'slaClocks', ticketId, includeAll] as const,
      queryFn: () => getTicketSlaClocksFn({ data: { ticketId, includeAll } }),
      staleTime: 15_000,
      refetchInterval: 30_000,
    }),
  activity: (ticketId: TicketId, opts: { limit?: number; before?: string } = {}) =>
    queryOptions({
      queryKey: ['tickets', 'activity', ticketId, opts] as const,
      queryFn: () => listTicketActivityFn({ data: { ticketId, ...opts } }),
      staleTime: 10_000,
    }),
  myInboxes: () =>
    queryOptions({
      queryKey: ['tickets', 'myInboxes'] as const,
      queryFn: () => listMyInboxesFn(),
      staleTime: 60_000,
    }),
  /** External links (GitHub issues etc.) for a ticket. TODO: wire to server function in Phase 8. */
  externalLinks: (ticketId: TicketId) =>
    queryOptions({
      queryKey: ['tickets', 'externalLinks', ticketId] as const,
      queryFn: () =>
        Promise.resolve(
          [] as Array<{
            id: string
            integrationId: string | null
            integrationType: string
            externalId: string
            externalDisplayId: string | null
            externalUrl: string | null
            syncDirection: string
          }>
        ),
      staleTime: 30_000,
    }),
}
