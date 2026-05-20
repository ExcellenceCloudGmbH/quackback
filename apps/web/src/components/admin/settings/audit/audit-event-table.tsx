/**
 * Audit event table — cursor-paged via `useSuspenseInfiniteQuery`. Resolves
 * actor displayNames in a single batched lookup. Each row is expandable to
 * show the structured diff + request metadata.
 */
import { useMemo, useState, Fragment } from 'react'
import { useSuspenseInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { PrincipalId } from '@quackback/ids'
import { auditQueries, type AuditFilters } from '@/lib/client/queries/audit'
import { getPrincipalsByIdsFn } from '@/lib/server/functions/principals'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { AuditDiffViewer } from './audit-diff-viewer'

interface Props {
  filters: AuditFilters
}

export function AuditEventTable({ filters }: Props) {
  const query = useSuspenseInfiniteQuery(auditQueries.list(filters))
  const items = useMemo(() => query.data.pages.flatMap((p) => p.items), [query.data])

  const principalIds = useMemo(() => {
    const set = new Set<string>()
    for (const r of items) if (r.principalId) set.add(r.principalId)
    return Array.from(set)
  }, [items])

  const principalsQuery = useQuery({
    queryKey: ['principals', 'byIds', principalIds] as const,
    queryFn: () => getPrincipalsByIdsFn({ data: { ids: principalIds as PrincipalId[] } }),
    enabled: principalIds.length > 0,
    staleTime: 60_000,
  })

  const principalMap = useMemo(() => {
    const m = new Map<string, { displayName: string | null; email: string | null }>()
    for (const p of principalsQuery.data ?? []) {
      m.set(p.id, { displayName: p.displayName, email: p.email })
    }
    return m
  }, [principalsQuery.data])

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border/50">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead className="w-44">When</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead className="w-24">Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                  No audit events match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              items.map((row) => {
                const isOpen = expanded.has(row.id)
                const actor = row.principalId ? principalMap.get(row.principalId) : null
                const actorLabel = actor?.displayName ?? actor?.email ?? row.principalId ?? null
                return (
                  <Fragment key={row.id}>
                    <TableRow className="hover:bg-muted/50">
                      <TableCell>
                        <button
                          type="button"
                          aria-label={isOpen ? 'Collapse row' : 'Expand row'}
                          onClick={() => toggle(row.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {isOpen ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : (
                            <ChevronRightIcon className="h-4 w-4" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell
                        className="text-xs text-muted-foreground"
                        title={
                          row.createdAt instanceof Date
                            ? row.createdAt.toISOString()
                            : String(row.createdAt)
                        }
                      >
                        {new Date(row.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {row.principalId ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 text-[10px]">
                              {(actorLabel ?? '?').slice(0, 2).toUpperCase()}
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-sm">{actorLabel}</span>
                              {actor?.email && actor?.displayName && (
                                <span className="text-[11px] text-muted-foreground">
                                  {actor.email}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            System
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-[11px] bg-muted/40 px-1.5 py-0.5 rounded">
                          {row.action}
                        </code>
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="font-mono text-muted-foreground">{row.targetType}</span>
                        {row.targetId && (
                          <>
                            {' · '}
                            <span
                              className="font-mono text-[11px] truncate inline-block max-w-[180px] align-bottom"
                              title={row.targetId}
                            >
                              {row.targetId}
                            </span>
                          </>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {row.source}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell />
                        <TableCell colSpan={5} className="py-3">
                          <AuditDiffViewer
                            diff={row.diff}
                            ipAddress={row.ipAddress}
                            userAgent={row.userAgent}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{items.length} events shown</span>
        {query.hasNextPage && (
          <Button
            variant="outline"
            size="sm"
            disabled={query.isFetchingNextPage}
            onClick={() => query.fetchNextPage()}
          >
            {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        )}
      </div>
    </div>
  )
}
