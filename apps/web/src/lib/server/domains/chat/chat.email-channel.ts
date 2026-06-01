/**
 * Inbound email channel config + plus-address routing, kept pure so it's
 * unit-tested directly. The widget's outbound agent-reply emails set a
 * conversation-specific Reply-To (`reply+<conversationId>@<inbound-domain>`);
 * the inbound webhook reads that plus-address back to route a reply into the
 * right conversation. Both are gated on inbound being configured.
 */

type EnvLike = Record<string, string | undefined>

const INBOUND_DOMAIN_ENV = 'EMAIL_INBOUND_DOMAIN'
const INBOUND_SECRET_ENV = 'EMAIL_INBOUND_SIGNING_SECRET'

/** Inbound email is usable only when both the receiving domain and the webhook
 *  signing secret are configured. When false, the inbound route 404s and no
 *  routable Reply-To is emitted. */
export function isEmailInboundConfigured(env: EnvLike = process.env): boolean {
  return Boolean(env[INBOUND_DOMAIN_ENV] && env[INBOUND_SECRET_ENV])
}

/** `reply+<conversationId>@<inbound-domain>`, or null when no inbound domain is set. */
export function inboundReplyToAddress(
  conversationId: string,
  env: EnvLike = process.env
): string | null {
  const domain = env[INBOUND_DOMAIN_ENV]
  if (!domain) return null
  return `reply+${conversationId}@${domain}`
}

/** Extract the conversation id from a `reply+<id>@domain` recipient, or null. */
export function conversationIdFromInboundAddress(address: string): string | null {
  const match = /reply\+([^@>\s]+)@/i.exec(address)
  return match ? match[1] : null
}
