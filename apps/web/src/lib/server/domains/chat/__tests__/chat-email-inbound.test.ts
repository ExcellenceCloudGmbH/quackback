/**
 * Inbound email parsing: normalize Resend's `email.received` payload into the
 * fields the ingest path needs, and strip quoted reply history so the ingested
 * message is just what the visitor actually wrote.
 */
import { describe, it, expect } from 'vitest'
import { parseInboundEmail, extractReplyText } from '../chat.email-inbound'

describe('parseInboundEmail', () => {
  it('normalizes an array `to`, reads `from`/`subject`/`text`, and the Message-ID header', () => {
    const parsed = parseInboundEmail({
      to: ['reply+conversation_abc@tenaevexeo.resend.app'],
      from: 'Jane Visitor <jane@example.com>',
      subject: 'Re: Your ticket',
      text: 'Thanks, that worked!',
      headers: [
        { name: 'Message-ID', value: '<msg-123@mail.example.com>' },
        { name: 'X-Other', value: 'ignored' },
      ],
    })
    expect(parsed.toAddresses).toEqual(['reply+conversation_abc@tenaevexeo.resend.app'])
    expect(parsed.from).toBe('Jane Visitor <jane@example.com>')
    expect(parsed.subject).toBe('Re: Your ticket')
    expect(parsed.text).toBe('Thanks, that worked!')
    expect(parsed.messageId).toBe('<msg-123@mail.example.com>')
  })

  it('accepts a string `to` and an object-shaped headers map (case-insensitive)', () => {
    const parsed = parseInboundEmail({
      to: 'reply+conversation_xyz@tenaevexeo.resend.app',
      from: 'bob@example.com',
      headers: { 'message-id': '<abc@x>' },
    })
    expect(parsed.toAddresses).toEqual(['reply+conversation_xyz@tenaevexeo.resend.app'])
    expect(parsed.messageId).toBe('<abc@x>')
  })

  it('falls back to the top-level email id when no Message-ID header is present', () => {
    const parsed = parseInboundEmail({
      to: ['x@y.com'],
      from: 'a@b.com',
      email_id: 'email_fallback_1',
    })
    expect(parsed.messageId).toBe('email_fallback_1')
  })

  it('returns empty/null fields for a junk payload rather than throwing', () => {
    const parsed = parseInboundEmail(null)
    expect(parsed.toAddresses).toEqual([])
    expect(parsed.from).toBeNull()
    expect(parsed.messageId).toBeNull()
  })
})

describe('extractReplyText', () => {
  it('drops a Gmail-style quoted history below "On … wrote:"', () => {
    const raw = [
      'This is my reply.',
      '',
      'On Mon, Jun 1, 2026 at 9:00 AM Support <reply+x@d> wrote:',
      '> previous agent message',
      '> more quoted text',
    ].join('\n')
    expect(extractReplyText(raw)).toBe('This is my reply.')
  })

  it('drops a leading-`>` quoted block with no separator line', () => {
    const raw = ['My answer is here.', '> quoted', '> quoted 2'].join('\n')
    expect(extractReplyText(raw)).toBe('My answer is here.')
  })

  it('strips a trailing signature after the "-- " delimiter', () => {
    const raw = ['Sounds good.', '', '-- ', 'Jane Visitor', 'Acme Inc'].join('\n')
    expect(extractReplyText(raw)).toBe('Sounds good.')
  })

  it('leaves a plain reply untouched (trimmed)', () => {
    expect(extractReplyText('  just a normal reply  ')).toBe('just a normal reply')
  })
})
