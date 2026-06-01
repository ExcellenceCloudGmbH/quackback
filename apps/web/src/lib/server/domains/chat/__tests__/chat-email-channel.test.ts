import { describe, it, expect } from 'vitest'
import {
  isEmailInboundConfigured,
  inboundReplyToAddress,
  conversationIdFromInboundAddress,
} from '../chat.email-channel'

describe('isEmailInboundConfigured', () => {
  it('is true only when both the inbound domain and signing secret are set', () => {
    expect(isEmailInboundConfigured({})).toBe(false)
    expect(isEmailInboundConfigured({ EMAIL_INBOUND_DOMAIN: 'x.resend.app' })).toBe(false)
    expect(isEmailInboundConfigured({ EMAIL_INBOUND_SIGNING_SECRET: 'whsec_1' })).toBe(false)
    expect(
      isEmailInboundConfigured({
        EMAIL_INBOUND_DOMAIN: 'x.resend.app',
        EMAIL_INBOUND_SIGNING_SECRET: 'whsec_1',
      })
    ).toBe(true)
  })
})

describe('inboundReplyToAddress', () => {
  it('builds a plus-addressed reply address from the inbound domain', () => {
    expect(
      inboundReplyToAddress('conversation_abc', { EMAIL_INBOUND_DOMAIN: 'tenaevexeo.resend.app' })
    ).toBe('reply+conversation_abc@tenaevexeo.resend.app')
  })

  it('returns null when no inbound domain is configured', () => {
    expect(inboundReplyToAddress('conversation_abc', {})).toBeNull()
  })
})

describe('conversationIdFromInboundAddress', () => {
  it('extracts the conversation id from a plus-addressed recipient', () => {
    expect(conversationIdFromInboundAddress('reply+conversation_abc@tenaevexeo.resend.app')).toBe(
      'conversation_abc'
    )
    expect(
      conversationIdFromInboundAddress('Support <reply+conversation_xyz@tenaevexeo.resend.app>')
    ).toBe('conversation_xyz')
  })

  it('returns null for a non-plus-addressed recipient', () => {
    expect(conversationIdFromInboundAddress('bob@example.com')).toBeNull()
    expect(conversationIdFromInboundAddress('support@tenaevexeo.resend.app')).toBeNull()
  })
})
