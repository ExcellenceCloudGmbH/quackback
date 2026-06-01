/**
 * Cross-device chat resume (P2.6). An agent-reply email links here with a
 * signed resume token. We verify it server-side (the token is the capability),
 * then redirect to the standalone widget opened on live chat (`/widget/?c=<id>`,
 * P2.6b), where the visitor's session surfaces the thread.
 *
 * A forged/expired link just lands on the widget with no hint — we never reveal
 * token validity beyond the destination, and never establish a session from an
 * unverified link. Minting an anonymous session from the token for a brand-new
 * device (vs an existing same-origin session) is a pending, browser-verified
 * follow-up.
 */
import { getBaseUrl } from '@/lib/server/config'
import { verifyConversationResumeToken } from '@/lib/server/realtime/chat-resume-token'

export function handleChatResume(request: Request): Response {
  const token = new URL(request.url).searchParams.get('token')
  const claims = verifyConversationResumeToken(token)
  const base = getBaseUrl().replace(/\/$/, '')
  const dest = claims
    ? `${base}/widget/?c=${encodeURIComponent(claims.conversationId)}`
    : `${base}/widget/`
  return new Response(null, { status: 302, headers: { Location: dest } })
}
