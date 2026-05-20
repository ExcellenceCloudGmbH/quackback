/**
 * Widget tickets — list (GET) and create (POST).
 *
 * Auth: requires a Bearer-authenticated widget session (`getWidgetSession`).
 * Anonymous principals are rejected here; the iframe UI must call
 * `Quackback.identify(...)` first so a real `user`/`principal` exists.
 *
 * GET ownership model: reuses the portal-side `listTicketsForPortalUser`
 * helper, which builds the identity-set
 *   `principalId(userId) ∪ linkedContactIds(userId)`
 * from `contact_user_links`. Phase 1 populates that link on verified
 * `identify`; Phase 2 also populates it lazily inside `createTicket` via
 * `resolveRequesterContactId`.
 *
 * POST stamps `channel='widget'` so analytics and routing can distinguish
 * widget-originated tickets. Requester defaults to the session principal —
 * the widget never accepts an inbound `requesterContactId` field.
 */
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { db, eq, inArray, ticketStatuses, type TiptapContent } from '@/lib/server/db'
import { getWidgetSession } from '@/lib/server/functions/widget-auth'
import { createTicket } from '@/lib/server/domains/tickets/ticket.service'
import { listTicketsForPortalUser } from '@/lib/server/domains/tickets/ticket.portal-query'
import {
  mapDomainErrorToResponse,
  widgetCorsHeaders,
  widgetJsonError,
} from '@/lib/server/widget/cors'
import { widgetTicketingGate } from '@/lib/server/widget/ticketing-gate'
import type { TicketId, TicketStatusId, UserId } from '@quackback/ids'

const tiptapDocSchema = z
  .object({ type: z.literal('doc'), content: z.array(z.unknown()).optional() })
  .passthrough()

const statusCategorySchema = z.enum(['open', 'pending', 'on_hold', 'solved', 'closed'])

// `urgent` is intentionally excluded from the widget surface — only staff may
// escalate to it, otherwise end-users would default everything to urgent.
const widgetPrioritySchema = z.enum(['low', 'normal', 'high'])

const createSchema = z.object({
  subject: z.string().min(1).max(500),
  bodyJson: tiptapDocSchema.nullable().optional(),
  bodyText: z.string().max(100_000).nullable().optional(),
  priority: widgetPrioritySchema.optional(),
})

interface SerializedTicketRow {
  id: TicketId
  subject: string
  statusId: TicketStatusId
  statusCategory: 'open' | 'pending' | 'on_hold' | 'solved' | 'closed'
  statusName: string
  statusColor: string | null
  lastActivityAt: string
  createdAt: string
}

async function hydrateStatuses(
  rows: { statusId: TicketStatusId | null }[]
): Promise<Map<TicketStatusId, { name: string; color: string | null; category: string }>> {
  const ids = Array.from(
    new Set(rows.map((r) => r.statusId).filter((id): id is TicketStatusId => !!id))
  )
  if (ids.length === 0) return new Map()
  const statusRows = await db.query.ticketStatuses.findMany({
    where: inArray(ticketStatuses.id, ids),
  })
  return new Map(
    statusRows.map((s) => [
      s.id as TicketStatusId,
      { name: s.name, color: s.color ?? null, category: s.category as string },
    ])
  )
}

export async function handleListWidgetTickets({
  request,
}: {
  request: Request
}): Promise<Response> {
  const disabled = await widgetTicketingGate()
  if (disabled) return disabled
  const session = await getWidgetSession(request)
  if (!session) {
    return widgetJsonError('AUTH_REQUIRED', 'Valid widget session required', 401)
  }
  if (session.principal.type === 'anonymous') {
    return widgetJsonError(
      'IDENTITY_REQUIRED',
      'Identify the widget user before listing tickets',
      403
    )
  }

  const url = new URL(request.url)
  const statusCategoryRaw = url.searchParams.get('statusCategory') ?? undefined
  const limitRaw = url.searchParams.get('limit')
  const offsetRaw = url.searchParams.get('offset')

  const parsed = z
    .object({
      statusCategory: statusCategorySchema.optional(),
      limit: z.coerce.number().int().min(1).max(50).optional(),
      offset: z.coerce.number().int().min(0).optional(),
    })
    .safeParse({
      statusCategory: statusCategoryRaw,
      limit: limitRaw ?? undefined,
      offset: offsetRaw ?? undefined,
    })
  if (!parsed.success) {
    return widgetJsonError('VALIDATION_ERROR', 'Invalid query params', 400)
  }

  try {
    const { rows, total } = await listTicketsForPortalUser({
      userId: session.user.id as UserId,
      statusCategory: parsed.data.statusCategory,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    })

    const statusById = await hydrateStatuses(
      rows.map((r) => ({ statusId: r.statusId as TicketStatusId | null }))
    )

    const serialized: SerializedTicketRow[] = rows.map((r) => {
      const s = r.statusId ? statusById.get(r.statusId as TicketStatusId) : undefined
      return {
        id: r.id as TicketId,
        subject: r.subject,
        statusId: r.statusId as TicketStatusId,
        statusCategory: (s?.category ?? 'open') as SerializedTicketRow['statusCategory'],
        statusName: s?.name ?? 'Unknown',
        statusColor: s?.color ?? null,
        lastActivityAt: r.lastActivityAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
      }
    })

    return Response.json({ data: { rows: serialized, total } }, { headers: widgetCorsHeaders() })
  } catch (err) {
    const mapped = mapDomainErrorToResponse(err)
    if (mapped) return mapped
    console.error('[widget:tickets] list error', err)
    return widgetJsonError('SERVER_ERROR', 'Failed to list tickets', 500)
  }
}

export async function handleCreateWidgetTicket({
  request,
}: {
  request: Request
}): Promise<Response> {
  const disabled = await widgetTicketingGate()
  if (disabled) return disabled
  const session = await getWidgetSession(request)
  if (!session) {
    return widgetJsonError('AUTH_REQUIRED', 'Valid widget session required', 401)
  }
  if (session.principal.type === 'anonymous') {
    return widgetJsonError(
      'IDENTITY_REQUIRED',
      'Identify the widget user before creating a ticket',
      403
    )
  }

  let body: z.infer<typeof createSchema>
  try {
    const raw = await request.json()
    body = createSchema.parse(raw)
  } catch {
    return widgetJsonError('VALIDATION_ERROR', 'Invalid request body', 400)
  }

  try {
    const ticket = await createTicket({
      subject: body.subject,
      descriptionJson: (body.bodyJson ?? null) as TiptapContent | null,
      descriptionText: body.bodyText ?? null,
      priority: body.priority,
      channel: 'widget',
      requesterPrincipalId: session.principal.id,
      createdByPrincipalId: session.principal.id,
    })

    const status = ticket.statusId
      ? await db.query.ticketStatuses.findFirst({
          where: eq(ticketStatuses.id, ticket.statusId),
        })
      : undefined

    return Response.json(
      {
        data: {
          id: ticket.id as TicketId,
          subject: ticket.subject,
          statusId: ticket.statusId as TicketStatusId,
          statusCategory: (status?.category ?? 'open') as SerializedTicketRow['statusCategory'],
          statusName: status?.name ?? 'Unknown',
          statusColor: status?.color ?? null,
          createdAt: ticket.createdAt.toISOString(),
          lastActivityAt: ticket.lastActivityAt.toISOString(),
        },
      },
      { headers: widgetCorsHeaders() }
    )
  } catch (err) {
    const mapped = mapDomainErrorToResponse(err)
    if (mapped) return mapped
    console.error('[widget:tickets] create error', err)
    return widgetJsonError('SERVER_ERROR', 'Failed to create ticket', 500)
  }
}

export const Route = createFileRoute('/api/widget/tickets')({
  server: {
    handlers: {
      GET: handleListWidgetTickets,
      POST: handleCreateWidgetTicket,
    },
  },
})
