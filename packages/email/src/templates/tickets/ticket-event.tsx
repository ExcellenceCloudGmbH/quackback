/**
 * Generic ticket-event email template.
 *
 * One template covers all 8 ticket events + 2 SLA events. The caller is
 * responsible for the title/body copy — this component handles layout,
 * branding, the CTA and the unsubscribe footer.
 */

import { Button, Heading, Section, Text } from '@react-email/components'
import { EmailLayout, NotificationFooter } from '../email-layout'
import { typography, button, colors } from '../shared-styles'

export interface TicketEventEmailProps {
  /** Headline shown at the top of the email body. */
  title: string
  /** Optional body paragraph rendered between the headline and the CTA. */
  body?: string
  /** Ticket subject. Surfaced as a labelled card below the headline. */
  ticketSubject: string
  /** Direct link to the ticket in the agent UI. */
  ticketUrl: string
  /** Workspace label for branding + the footer. */
  organizationName: string
  /** Per-recipient unsubscribe / preferences link. */
  unsubscribeUrl: string
  logoUrl?: string
  /** Status label (e.g. "open", "solved") shown next to the ticket subject. */
  statusLabel?: string
  /** Priority label (e.g. "high", "urgent"). */
  priorityLabel?: string
}

export function TicketEventEmail({
  title,
  body,
  ticketSubject,
  ticketUrl,
  organizationName,
  unsubscribeUrl,
  logoUrl,
  statusLabel,
  priorityLabel,
}: TicketEventEmailProps) {
  const meta = [statusLabel, priorityLabel].filter(Boolean).join(' · ')

  return (
    <EmailLayout preview={title} logoUrl={logoUrl} logoAlt={organizationName}>
      <Heading style={typography.h1}>{title}</Heading>
      {body ? <Text style={typography.text}>{body}</Text> : null}

      <Section
        style={{
          backgroundColor: colors.surfaceMuted,
          borderRadius: '8px',
          padding: '16px 20px',
          marginBottom: '16px',
        }}
      >
        <Text
          style={{
            ...typography.textSmall,
            marginTop: '0',
            marginBottom: '4px',
            color: colors.textMuted,
          }}
        >
          Ticket
        </Text>
        <Text style={{ ...typography.text, marginTop: '0', marginBottom: '0', fontWeight: '600' }}>
          {ticketSubject}
        </Text>
        {meta ? (
          <Text
            style={{
              ...typography.textSmall,
              marginTop: '4px',
              marginBottom: '0',
              color: colors.textMuted,
            }}
          >
            {meta}
          </Text>
        ) : null}
      </Section>

      <Section style={{ textAlign: 'center', marginTop: '32px', marginBottom: '32px' }}>
        <Button style={button.primary} href={ticketUrl}>
          View Ticket
        </Button>
      </Section>

      <NotificationFooter
        reason="You received this email because you are subscribed to this ticket."
        unsubscribeUrl={unsubscribeUrl}
      />
    </EmailLayout>
  )
}
