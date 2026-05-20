/**
 * Audit log queries — cursor-paged event feed + distinct-actions list.
 */
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query'
import type { PrincipalId } from '@quackback/ids'
import { listAuditEventsPagedFn, getAuditActionsFn } from '@/lib/server/functions/audit'

export type AuditSourceFilter = 'web' | 'api' | 'integration' | 'system' | 'mcp'

export interface AuditFilters {
  principalId?: PrincipalId | null
  /** When set, exact match on `audit_events.action`. Mutually exclusive with `actionPrefix`. */
  action?: string
  /** When set, prefix match (`like 'foo%'`) on `audit_events.action`. */
  actionPrefix?: string
  targetType?: string
  source?: AuditSourceFilter
  /** ISO datetime — inclusive lower bound. */
  fromIso?: string
  /** ISO datetime — inclusive upper bound. */
  toIso?: string
}

const STALE = 15_000
const ACTIONS_STALE = 5 * 60_000

export const auditQueries = {
  all: ['audit'] as const,
  list: (filters: AuditFilters = {}) =>
    infiniteQueryOptions({
      queryKey: ['audit', 'list', filters] as const,
      queryFn: ({ pageParam }) =>
        listAuditEventsPagedFn({
          data: {
            principalId: filters.principalId ?? undefined,
            action: filters.action,
            actionPrefix: filters.actionPrefix,
            targetType: filters.targetType,
            source: filters.source,
            from: filters.fromIso,
            to: filters.toIso,
            cursor: (pageParam as string | undefined) ?? undefined,
            limit: 50,
          },
        }),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (last) => last.nextCursor ?? undefined,
      staleTime: STALE,
    }),
  actions: () =>
    queryOptions({
      queryKey: ['audit', 'actions'] as const,
      queryFn: () => getAuditActionsFn(),
      staleTime: ACTIONS_STALE,
    }),
}
