/**
 * Daily sweep for stale portal invitations.
 *
 * Finds pending portal invites that have passed their `expiresAt`, emits one
 * `portal.invite.expired` audit event per invite (actor: system), then bulk-
 * updates their status to `'expired'` so they are not re-swept on the next
 * run.
 *
 * Design properties:
 *  - Idempotent: the status update ensures a swept invite is never re-emitted.
 *  - Bounded: single SELECT + single UPDATE per run regardless of count.
 *  - Best-effort audit: emit failures are logged but don't abort the status
 *    update — the status update is the more important correctness property.
 *  - Returns the number of invites swept so callers can log / monitor.
 */
import { db, invitation, and, eq, lt, inArray } from '@/lib/server/db'
import { recordAuditEvent } from './log'

export async function sweepExpiredPortalInvites(): Promise<number> {
  const now = new Date()

  const stale = await db.query.invitation.findMany({
    where: and(
      eq(invitation.kind, 'portal'),
      eq(invitation.status, 'pending'),
      lt(invitation.expiresAt, now)
    ),
  })

  if (stale.length === 0) return 0

  // Emit one audit row per invite. Best-effort — failures are logged but
  // don't prevent the subsequent status update.
  for (const inv of stale) {
    await recordAuditEvent({
      event: 'portal.invite.expired',
      outcome: 'success',
      actor: { type: 'system' },
      target: { type: 'invitation', id: inv.id },
      metadata: {
        email: inv.email,
        sentAt: inv.createdAt.toISOString(),
        neverAccepted: true,
      },
    }).catch((err) => console.warn('[invite-sweep] audit emit failed:', err))
  }

  // Single bulk UPDATE — idempotent, never re-sweeps the same row.
  //
  // The WHERE pins `status='pending'` (in addition to the id-list) to close
  // the TOCTOU window between the SELECT above and this UPDATE: if an
  // invitee accepts their link in that gap, the row flips to 'accepted'
  // and must not be silently overwritten to 'expired'. Every sister write
  // (cancelPortalInviteFn, resendPortalInviteFn, acceptPortalInviteFn)
  // pins the same predicate for the same reason.
  await db
    .update(invitation)
    .set({ status: 'expired' })
    .where(
      and(
        inArray(
          invitation.id,
          stale.map((i) => i.id)
        ),
        eq(invitation.status, 'pending')
      )
    )

  console.log(`[invite-sweep] marked ${stale.length} portal invites as expired`)
  return stale.length
}
