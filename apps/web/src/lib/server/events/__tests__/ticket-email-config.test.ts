import { describe, expect, it } from 'vitest'
import { buildTicketEmailEventConfig } from '../ticket-targets'
import type { EventData, EventTicketRef } from '../types'

const ticket: EventTicketRef = {
  id: 'ticket_123',
  subject: 'Billing question',
  statusId: 'status_1',
  statusCategory: 'open',
  priority: 'high',
  channel: 'email',
  visibility: 'public',
  inboxId: 'inbox_1',
  primaryTeamId: 'team_1',
  assigneePrincipalId: null,
  assigneeTeamId: null,
  requesterPrincipalId: 'principal_requester',
  requesterContactId: 'contact_1',
  statusName: 'Open',
  inboxName: 'Support',
  primaryTeamName: 'Customer Success',
  requesterName: 'Jamie',
  requesterEmail: 'jamie@example.com',
  descriptionText:
    'My invoice is missing the annual discount. Please check the latest billing run.',
}

function contentSections(config: Record<string, unknown>) {
  return config.contentSections as Array<{
    title: string
    body?: string
    rows?: Array<{ label: string; value: string }>
  }>
}

function event(type: string, data: Record<string, unknown>): EventData {
  return {
    id: 'event_1',
    type,
    timestamp: '2026-06-16T10:15:00.000Z',
    actor: { type: 'user', displayName: 'Alex Morgan', email: 'alex@example.com' },
    data: { ticket, ...data },
  } as EventData
}

describe('buildTicketEmailEventConfig', () => {
  it('describes status changes with previous and new status', () => {
    const config = buildTicketEmailEventConfig(
      event('ticket.status_changed', {
        previousStatusCategory: 'pending',
        newStatusCategory: 'closed',
      }),
      'https://example.com',
      ticket.subject,
      ticket.statusName ?? null
    )

    expect(config.title).toBe('Status: Billing question')
    expect(config.summary).toBe('This ticket moved from Pending to Closed.')
    expect(contentSections(config)[0]).toEqual({
      title: 'Status change',
      rows: [
        { label: 'Previous status', value: 'Pending' },
        { label: 'New status', value: 'Closed' },
      ],
    })
    expect(config.ticketUrl).toBe('https://example.com/tickets/ticket_123')
  })

  it('includes the initial ticket description as action content', () => {
    const config = buildTicketEmailEventConfig(
      event('ticket.created', {}),
      'https://example.com',
      ticket.subject,
      ticket.statusName ?? null
    )

    expect(contentSections(config)[0]).toMatchObject({
      title: 'Initial ticket content',
      body: ticket.descriptionText,
    })
  })

  it('includes full reply body as action content', () => {
    const config = buildTicketEmailEventConfig(
      event('ticket.thread_added', {
        audience: 'public',
        sharedWithTeamId: null,
        thread: {
          id: 'thread_1',
          audience: 'public',
          bodyTextPreview: 'Can you check the latest invoice?',
          bodyText:
            'Can you check the latest invoice? The customer says the annual discount is missing from the final total.',
          bodyTextTruncated: true,
          authorPrincipalId: 'principal_requester',
          isFromRequester: true,
          sharedWithTeamId: null,
          createdAt: '2026-06-16T10:10:00.000Z',
        },
      }),
      'https://example.com',
      ticket.subject,
      ticket.statusName ?? null
    )

    expect(config.eventLabel).toBe('New reply')
    expect(config.summary).toBe('The requester replied to this ticket.')
    expect(contentSections(config)[0]).toMatchObject({
      title: 'Requester reply',
      body: 'Can you check the latest invoice? The customer says the annual discount is missing from the final total.',
    })
    expect(config.details).toContainEqual({ label: 'Audience', value: 'Public' })
  })

  it('clips and humanizes ticket update diffs', () => {
    const config = buildTicketEmailEventConfig(
      event('ticket.updated', {
        changedFields: ['priority', 'descriptionText'],
        diff: {
          priority: { from: 'low', to: 'urgent' },
          descriptionText: {
            from: 'Old short description',
            to: 'A'.repeat(500),
          },
        },
      }),
      'https://example.com',
      ticket.subject,
      ticket.statusName ?? null
    )

    expect(config.title).toBe('Ticket details updated: Billing question')
    expect(contentSections(config)[0]?.rows).toContainEqual({
      label: 'Priority',
      value: 'Low -> Urgent',
    })
    expect(
      (contentSections(config)[0]?.rows ?? []).some((detail) =>
        detail.value.includes('Content truncated in email.')
      )
    ).toBe(true)
  })

  it('describes SLA warnings and attachment additions', () => {
    const slaConfig = buildTicketEmailEventConfig(
      event('ticket.sla_warning', { kind: 'first_response', ruleName: 'Gold support' }),
      'https://example.com',
      ticket.subject,
      ticket.statusName ?? null
    )
    expect(slaConfig.summary).toBe('Gold support is approaching its First Response target.')
    expect(contentSections(slaConfig)[0]?.rows).toContainEqual({
      label: 'SLA rule',
      value: 'Gold support',
    })

    const attachmentConfig = buildTicketEmailEventConfig(
      event('ticket.attachment_added', {
        attachment: {
          id: 'attachment_1',
          threadId: 'thread_1',
          filename: 'invoice.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1536,
          uploadedByPrincipalId: 'principal_1',
          publicUrl: null,
        },
      }),
      'https://example.com',
      ticket.subject,
      ticket.statusName ?? null
    )
    expect(attachmentConfig.summary).toBe('invoice.pdf was attached to this ticket.')
    expect(contentSections(attachmentConfig)[0]?.rows).toContainEqual({
      label: 'Size',
      value: '1.5 KB',
    })
  })
})
