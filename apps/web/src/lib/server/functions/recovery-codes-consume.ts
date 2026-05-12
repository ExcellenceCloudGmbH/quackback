/**
 * Public recovery-code sign-in path.
 *
 * Email + code → verify → mark used → mint magic-link verify URL the
 * caller can redirect to. Constant-time across all failure modes
 * (unknown email, wrong code, no active codes) — we always perform at
 * least one scrypt compare so timing-side-channel email enumeration
 * doesn't work.
 *
 * Audit log entries:
 *  - sso.recovery_codes.used (success)
 *  - auth.method.blocked (failure, with metadata.reason)
 *
 * Rate-limiting happens at the route layer (B.6) where the IP is
 * available without re-reading headers.
 */

import { createServerFn } from '@tanstack/react-start'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { z } from 'zod'
import type { SsoRecoveryCodeId } from '@quackback/ids'
import { and, db, eq, isNull, ssoRecoveryCode, user } from '@/lib/server/db'
import { recordAuditEvent } from '@/lib/server/audit/log'
import { hashRecoveryCode, verifyRecoveryCode } from '@/lib/server/auth/recovery-codes'
import { mintMagicLinkUrl } from '@/lib/server/auth/magic-link-mint'
import { config } from '@/lib/server/config'

const consumeRecoveryCodeInput = z.object({
  email: z.string().email(),
  code: z.string().min(1).max(64),
})

type ConsumeResult = { ok: true; redirectUrl: string } | { ok: false; error: string }

/**
 * Compute a fake hash once so the unknown-email branch spends the same
 * scrypt cost as the matching branch — avoids a measurable timing
 * difference between "email exists" and "email doesn't exist".
 */
let fakeHashPromise: Promise<string> | null = null
function getFakeHash(): Promise<string> {
  if (!fakeHashPromise) {
    fakeHashPromise = hashRecoveryCode('FAKE-FAKE-FAKE')
  }
  return fakeHashPromise
}

export const consumeRecoveryCodeFn = createServerFn({ method: 'POST' })
  .inputValidator(consumeRecoveryCodeInput)
  .handler(async ({ data }): Promise<ConsumeResult> => {
    const headers = getRequestHeaders()
    const actor = { email: data.email }

    const userRow = await db.query.user.findFirst({
      where: eq(user.email, data.email),
      columns: { id: true, email: true },
    })

    if (!userRow) {
      // Constant-time: still do one verify so the response time matches
      // the "user exists but code doesn't" branch.
      await verifyRecoveryCode(data.code, await getFakeHash())
      await recordAuditEvent({
        event: 'auth.method.blocked',
        outcome: 'failure',
        actor,
        headers,
        metadata: { method: 'recovery_code', reason: 'unknown_email' },
      })
      return { ok: false, error: 'invalid_credentials' }
    }

    const activeCodes = await db.query.ssoRecoveryCode.findMany({
      where: and(eq(ssoRecoveryCode.userId, userRow.id), isNull(ssoRecoveryCode.usedAt)),
      columns: { id: true, codeHash: true },
    })

    let matchedId: string | null = null
    for (const row of activeCodes) {
      // Run every verify (even after a match) so timing doesn't reveal
      // which code matched.
      const ok = await verifyRecoveryCode(data.code, row.codeHash)
      if (ok && !matchedId) matchedId = row.id
    }

    // If no codes existed at all, still spend one scrypt so the "user
    // exists but has no active codes" branch matches the "user exists
    // with codes but none match" branch in cost.
    if (activeCodes.length === 0) {
      await verifyRecoveryCode(data.code, await getFakeHash())
    }

    if (!matchedId) {
      await recordAuditEvent({
        event: 'auth.method.blocked',
        outcome: 'failure',
        actor: { userId: userRow.id, email: userRow.email },
        headers,
        metadata: { method: 'recovery_code', reason: 'invalid_code' },
      })
      return { ok: false, error: 'invalid_credentials' }
    }

    await db
      .update(ssoRecoveryCode)
      .set({ usedAt: new Date() })
      .where(eq(ssoRecoveryCode.id, matchedId as SsoRecoveryCodeId))

    const redirectUrl = await mintMagicLinkUrl({
      email: data.email,
      callbackPath: '/admin',
      errorCallbackPath: '/admin/login',
      portalUrl: config.baseUrl,
    })

    await recordAuditEvent({
      event: 'sso.recovery_codes.used',
      outcome: 'success',
      actor: { userId: userRow.id, email: userRow.email },
      headers,
      target: { type: 'sso_recovery_code', id: matchedId },
    })

    return { ok: true, redirectUrl }
  })
