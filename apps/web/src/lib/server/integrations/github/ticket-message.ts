/**
 * GitHub issue formatting utilities for ticket events.
 */

import type { EventData, EventTicketRef } from '../../events/types'
import { truncate } from '../../events/hook-utils'

const PRIORITY_EMOJI: Record<string, string> = {
  urgent: '🔴',
  high: '🟠',
  normal: '🟡',
  low: '🟢',
}

/**
 * Build a GitHub issue title and body from a ticket event.
 */
export function buildTicketIssueBody(event: EventData): {
  title: string
  body: string
  labels: string[]
} {
  if (event.type !== 'ticket.created') {
    return { title: 'Ticket', body: '', labels: [] }
  }

  const { ticket } = event.data
  const title = ticket.subject || 'Untitled ticket'
  const body = formatTicketBody(ticket)
  const labels = buildTicketLabels(ticket)

  return { title, body, labels }
}

function formatTicketBody(ticket: EventTicketRef): string {
  const sections: string[] = []

  // Description
  if (ticket.descriptionText) {
    sections.push(ticket.descriptionText)
    sections.push('')
    sections.push('---')
    sections.push('')
  }

  // Metadata table
  const meta: string[] = []
  if (ticket.priority) {
    const emoji = PRIORITY_EMOJI[ticket.priority] ?? ''
    meta.push(`**Priority:** ${emoji} ${ticket.priority}`)
  }
  if (ticket.channel) {
    meta.push(`**Channel:** ${ticket.channel}`)
  }
  if (ticket.statusName) {
    meta.push(`**Status:** ${ticket.statusName}`)
  }
  if (ticket.requesterName || ticket.requesterEmail) {
    const requester = ticket.requesterName || ticket.requesterEmail
    meta.push(`**Requester:** ${requester}`)
  }
  if (ticket.organizationName) {
    meta.push(`**Organization:** ${ticket.organizationName}`)
  }
  if (ticket.inboxName) {
    meta.push(`**Inbox:** ${ticket.inboxName}`)
  }

  if (meta.length > 0) {
    sections.push(...meta)
    sections.push('')
  }

  // Link back to Quackback
  if (ticket.ticketUrl) {
    sections.push(`[View in Quackback](${ticket.ticketUrl})`)
  }

  return truncate(sections.join('\n'), 65000)
}

function buildTicketLabels(ticket: EventTicketRef): string[] {
  const labels: string[] = []
  if (ticket.priority && ticket.priority !== 'normal') {
    labels.push(`priority:${ticket.priority}`)
  }
  return labels
}

/**
 * Build an updated issue body for ticket.updated events.
 * Only called when subject or description changed.
 */
export function buildTicketUpdateBody(ticket: EventTicketRef): {
  title?: string
  body?: string
} {
  return {
    title: ticket.subject || undefined,
    body: formatTicketBody(ticket),
  }
}
