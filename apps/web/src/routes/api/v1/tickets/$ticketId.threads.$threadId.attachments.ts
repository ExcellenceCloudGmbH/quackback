/**
 * GET  /api/v1/tickets/:ticketId/threads/:threadId/attachments
 * POST /api/v1/tickets/:ticketId/threads/:threadId/attachments
 *
 * Image attachments only — same constraints as the widget upload path
 * (`/api/widget/upload`): allowed image MIME types, 5MB cap. The S3 key
 * prefix is shared (`widget-images`) so we have one storage codepath.
 *
 * POST is multipart/form-data with a `file` field. Returns the created
 * `ticket_attachment` row.
 */
import { createFileRoute } from '@tanstack/react-router'
import { withApiKeyAuth } from '@/lib/server/domains/api/auth'
import {
  successResponse,
  createdResponse,
  forbiddenResponse,
  notFoundResponse,
  badRequestResponse,
  internalErrorResponse,
  handleDomainError,
} from '@/lib/server/domains/api/responses'
import { parseTypeId } from '@/lib/server/domains/api/validation'
import { loadPermissionSet } from '@/lib/server/domains/authz/authz.service'
import {
  getTicket,
  getThread,
  attachToThread,
  listForThread,
  listSharesForTicket,
  toResourceScope,
  canViewTicket,
  canReplyPublic,
  canCommentInternal,
  canShareCrossTeam,
} from '@/lib/server/domains/tickets'
import {
  isS3Configured,
  isAllowedImageType,
  MAX_FILE_SIZE,
  generateStorageKey,
  uploadObject,
} from '@/lib/server/storage/s3'
import type { TicketId, TicketThreadId, TeamId, PrincipalId } from '@quackback/ids'

const STORAGE_PREFIX = 'widget-images'

async function loadTicketScope(ticketId: TicketId) {
  const ticket = await getTicket(ticketId)
  if (!ticket) return null
  const shares = await listSharesForTicket(ticketId)
  return {
    ticket,
    scope: toResourceScope({
      primaryTeamId: ticket.primaryTeamId as TeamId | null,
      assigneePrincipalId: ticket.assigneePrincipalId as PrincipalId | null,
      assigneeTeamId: ticket.assigneeTeamId as TeamId | null,
      shares: shares.map((s) => ({ teamId: s.teamId as TeamId, revokedAt: s.revokedAt })),
    }),
  }
}

function serialize(row: {
  id: string
  threadId: string
  uploadedByPrincipalId: string | null
  filename: string
  mimeType: string
  sizeBytes: number
  storageKey: string
  publicUrl: string | null
  createdAt: Date
}) {
  return {
    id: row.id,
    threadId: row.threadId,
    uploadedByPrincipalId: row.uploadedByPrincipalId,
    filename: row.filename,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    storageKey: row.storageKey,
    publicUrl: row.publicUrl,
    createdAt: row.createdAt.toISOString(),
  }
}

export const Route = createFileRoute('/api/v1/tickets/$ticketId/threads/$threadId/attachments')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const auth = await withApiKeyAuth(request, { role: 'team' })
          const set = await loadPermissionSet(auth.principalId)
          const ticketId = parseTypeId<TicketId>(params.ticketId, 'ticket', 'ticket ID')
          const threadId = parseTypeId<TicketThreadId>(
            params.threadId,
            'ticket_thread',
            'thread ID'
          )

          const loaded = await loadTicketScope(ticketId)
          if (!loaded) return notFoundResponse('Ticket')
          if (!canViewTicket(set, loaded.scope)) {
            return forbiddenResponse('Cannot view this ticket')
          }
          const thread = await getThread(threadId)
          if (!thread || thread.ticketId !== ticketId) return notFoundResponse('Thread')

          const rows = await listForThread(threadId)
          return successResponse(rows.map(serialize))
        } catch (error) {
          return handleDomainError(error)
        }
      },
      POST: async ({ request, params }) => {
        try {
          const auth = await withApiKeyAuth(request, { role: 'team' })
          const set = await loadPermissionSet(auth.principalId)
          const ticketId = parseTypeId<TicketId>(params.ticketId, 'ticket', 'ticket ID')
          const threadId = parseTypeId<TicketThreadId>(
            params.threadId,
            'ticket_thread',
            'thread ID'
          )

          const loaded = await loadTicketScope(ticketId)
          if (!loaded) return notFoundResponse('Ticket')
          if (!canViewTicket(set, loaded.scope)) {
            return forbiddenResponse('Cannot view this ticket')
          }
          const thread = await getThread(threadId)
          if (!thread || thread.deletedAt || thread.ticketId !== ticketId) {
            return notFoundResponse('Thread')
          }

          // Audience-aware reply permission gate matches the create-thread
          // route at $ticketId.threads.ts.
          if (thread.audience === 'public' && !canReplyPublic(set, loaded.scope)) {
            return forbiddenResponse('ticket.reply_public required')
          }
          if (thread.audience === 'internal' && !canCommentInternal(set, loaded.scope)) {
            return forbiddenResponse('ticket.comment_internal required')
          }
          if (thread.audience === 'shared_team' && !canShareCrossTeam(set, loaded.scope)) {
            return forbiddenResponse('ticket.share_cross_team required')
          }

          if (!isS3Configured()) {
            return internalErrorResponse('Storage not configured')
          }

          let formData: FormData
          try {
            formData = await request.formData()
          } catch {
            return badRequestResponse('expected multipart/form-data')
          }
          const file = formData.get('file')
          if (!(file instanceof File)) {
            return badRequestResponse('missing "file" field')
          }
          if (!isAllowedImageType(file.type)) {
            return badRequestResponse(`unsupported mime type: ${file.type}`)
          }
          if (file.size === 0) {
            return badRequestResponse('file is empty')
          }
          if (file.size > MAX_FILE_SIZE) {
            return badRequestResponse(`file exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB`)
          }

          const ext = file.type.split('/')[1] || 'bin'
          const filename = file.name || `upload-${Date.now()}.${ext}`
          const key = generateStorageKey(STORAGE_PREFIX, filename)
          const buffer = Buffer.from(await file.arrayBuffer())
          const publicUrl = await uploadObject(key, buffer, file.type)

          const created = await attachToThread({
            threadId,
            uploadedByPrincipalId: auth.principalId,
            filename,
            mimeType: file.type,
            sizeBytes: file.size,
            storageKey: key,
            publicUrl,
          })
          return createdResponse(serialize(created))
        } catch (error) {
          return handleDomainError(error)
        }
      },
    },
  },
})
