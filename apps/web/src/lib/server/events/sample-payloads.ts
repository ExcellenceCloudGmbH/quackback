/**
 * Canonical sample event payloads — one per `EventType`.
 *
 * Used by:
 *   - the test-fire endpoint (`POST /api/v1/webhooks/:id/test`) to send a
 *     well-formed, deterministic event to a webhook endpoint without waiting
 *     for real activity, and
 *   - the create/edit dialog payload-preview accordion so operators can see
 *     exactly what each event subscription will look like on the wire.
 *
 * IDs in samples are static placeholders (`*_sample`) — they do NOT exist
 * in the database. Receivers should not look these up; the actor is always
 * marked as a `service` so production logic can short-circuit on test events.
 */
import type { EventData, EventType, EventActor } from './types'

const SAMPLE_TIMESTAMP = '2026-01-01T12:00:00.000Z'
const SAMPLE_ACTOR: EventActor = {
  type: 'service',
  service: 'quackback-test-fire',
  displayName: 'Quackback Test Fire',
}

function envelope<T extends EventType>(type: T, eventId: string) {
  return { id: eventId, type, timestamp: SAMPLE_TIMESTAMP, actor: SAMPLE_ACTOR }
}

const SAMPLE_POST_REF = {
  id: 'post_sample',
  title: 'Sample feedback post',
  boardId: 'board_sample',
  boardSlug: 'feature-requests',
}

const SAMPLE_TICKET_REF = {
  id: 'ticket_sample',
  subject: 'Sample ticket — please ignore',
  descriptionText: null,
  statusId: 'tstatus_sample_open',
  statusCategory: 'open',
  priority: 'normal',
  channel: 'portal',
  visibility: 'team',
  inboxId: 'inbox_sample',
  primaryTeamId: 'team_sample',
  assigneePrincipalId: null,
  assigneeTeamId: null,
  requesterPrincipalId: 'principal_sample_requester',
  requesterContactId: 'contact_sample',
  statusName: 'Open',
  inboxName: 'Support',
  inboxSlug: 'support',
  primaryTeamName: 'CX Team',
  assigneeTeamName: null,
  requesterEmail: '[email protected]',
  requesterName: 'Sample Requester',
  organizationName: 'Sample Org',
  organizationDomain: 'sample.test',
  createdAt: SAMPLE_TIMESTAMP,
  firstResponseAt: null,
  resolvedAt: null,
  reopenedAt: null,
  closedAt: null,
  ticketUrl: 'https://app.example.test/admin/tickets/ticket_sample',
}

const SAMPLE_INBOX_REF = {
  id: 'inbox_sample',
  slug: 'support',
  name: 'Support',
  description: 'Sample inbox for testing',
  primaryTeamId: 'team_sample',
  defaultVisibilityScope: 'team',
  defaultPriority: 'normal',
  defaultStatusId: 'tstatus_sample_open',
  color: '#6366f1',
  icon: 'inbox',
  archivedAt: null,
}

const SAMPLE_TEAM_REF = {
  id: 'team_sample',
  slug: 'cx',
  name: 'CX Team',
  description: 'Sample team for testing',
  shortLabel: 'CX',
  color: '#10b981',
  archivedAt: null,
}

const SAMPLE_TICKET_STATUS_REF = {
  id: 'tstatus_sample_open',
  slug: 'open',
  name: 'Open',
  color: '#3b82f6',
  category: 'open',
  position: 0,
  isDefault: true,
  isSystem: false,
  deletedAt: null,
}

const SAMPLE_CONTACT_REF = {
  id: 'contact_sample',
  name: 'Sample Requester',
  email: '[email protected]',
  phone: null,
  title: 'Customer',
  externalId: null,
  organizationId: 'org_sample',
  archivedAt: null,
  createdAt: SAMPLE_TIMESTAMP,
  updatedAt: SAMPLE_TIMESTAMP,
}

const SAMPLE_ORG_REF = {
  id: 'org_sample',
  name: 'Sample Org',
  domain: 'sample.test',
  website: 'https://sample.test',
  externalId: null,
  archivedAt: null,
  createdAt: SAMPLE_TIMESTAMP,
  updatedAt: SAMPLE_TIMESTAMP,
}

const SAMPLES: { [K in EventType]: EventData } = {
  'post.created': {
    ...envelope('post.created', 'evt_sample_post_created'),
    data: {
      post: {
        ...SAMPLE_POST_REF,
        content: 'This is a sample post body.',
        authorEmail: '[email protected]',
        authorName: 'Sample User',
        voteCount: 0,
      },
    },
  },
  'post.status_changed': {
    ...envelope('post.status_changed', 'evt_sample_post_status_changed'),
    data: { post: SAMPLE_POST_REF, previousStatus: 'open', newStatus: 'planned' },
  },
  'post.updated': {
    ...envelope('post.updated', 'evt_sample_post_updated'),
    data: { post: SAMPLE_POST_REF, changedFields: ['title'] },
  },
  'post.deleted': {
    ...envelope('post.deleted', 'evt_sample_post_deleted'),
    data: { post: SAMPLE_POST_REF, deletedBy: 'admin@example.test' },
  },
  'post.restored': {
    ...envelope('post.restored', 'evt_sample_post_restored'),
    data: { post: SAMPLE_POST_REF },
  },
  'post.merged': {
    ...envelope('post.merged', 'evt_sample_post_merged'),
    data: {
      duplicatePost: SAMPLE_POST_REF,
      canonicalPost: { ...SAMPLE_POST_REF, id: 'post_sample_canonical' },
    },
  },
  'post.unmerged': {
    ...envelope('post.unmerged', 'evt_sample_post_unmerged'),
    data: {
      post: SAMPLE_POST_REF,
      formerCanonicalPost: { ...SAMPLE_POST_REF, id: 'post_sample_canonical' },
    },
  },
  'comment.created': {
    ...envelope('comment.created', 'evt_sample_comment_created'),
    data: {
      comment: {
        id: 'comment_sample',
        content: 'Sample comment body.',
        authorEmail: '[email protected]',
        authorName: 'Sample User',
        isPrivate: false,
      },
      post: SAMPLE_POST_REF,
    },
  },
  'comment.updated': {
    ...envelope('comment.updated', 'evt_sample_comment_updated'),
    data: {
      comment: { id: 'comment_sample', content: 'Updated sample comment body.' },
      post: SAMPLE_POST_REF,
    },
  },
  'comment.deleted': {
    ...envelope('comment.deleted', 'evt_sample_comment_deleted'),
    data: { comment: { id: 'comment_sample', isPrivate: false }, post: SAMPLE_POST_REF },
  },
  'changelog.published': {
    ...envelope('changelog.published', 'evt_sample_changelog_published'),
    data: {
      changelog: {
        id: 'changelog_sample',
        title: 'Sample release',
        contentPreview: 'New things shipped this week.',
        publishedAt: SAMPLE_TIMESTAMP,
        linkedPostCount: 3,
      },
    },
  },
  'ticket.created': {
    ...envelope('ticket.created', 'evt_sample_ticket_created'),
    data: { ticket: SAMPLE_TICKET_REF },
  },
  'ticket.updated': {
    ...envelope('ticket.updated', 'evt_sample_ticket_updated'),
    data: {
      ticket: SAMPLE_TICKET_REF,
      changedFields: ['priority'],
      diff: { priority: { from: 'normal', to: 'high' } },
    },
  },
  'ticket.deleted': {
    ...envelope('ticket.deleted', 'evt_sample_ticket_deleted'),
    data: { ticket: SAMPLE_TICKET_REF, deletedByPrincipalId: 'principal_sample_admin' },
  },
  'ticket.restored': {
    ...envelope('ticket.restored', 'evt_sample_ticket_restored'),
    data: { ticket: SAMPLE_TICKET_REF, restoredByPrincipalId: 'principal_sample_admin' },
  },
  'ticket.assigned': {
    ...envelope('ticket.assigned', 'evt_sample_ticket_assigned'),
    data: {
      ticket: SAMPLE_TICKET_REF,
      previousAssigneePrincipalId: null,
      newAssigneePrincipalId: 'principal_sample_agent',
    },
  },
  'ticket.unassigned': {
    ...envelope('ticket.unassigned', 'evt_sample_ticket_unassigned'),
    data: {
      ticket: SAMPLE_TICKET_REF,
      previousAssigneePrincipalId: 'principal_sample_agent',
    },
  },
  'ticket.status_changed': {
    ...envelope('ticket.status_changed', 'evt_sample_ticket_status_changed'),
    data: {
      ticket: SAMPLE_TICKET_REF,
      previousStatusCategory: 'open',
      newStatusCategory: 'pending',
    },
  },
  'ticket.first_response': {
    ...envelope('ticket.first_response', 'evt_sample_ticket_first_response'),
    data: {
      ticket: SAMPLE_TICKET_REF,
      threadId: 'thread_sample',
      firstResponseAt: SAMPLE_TIMESTAMP,
    },
  },
  'ticket.thread_added': {
    ...envelope('ticket.thread_added', 'evt_sample_ticket_thread_added'),
    data: {
      ticket: SAMPLE_TICKET_REF,
      threadId: 'thread_sample',
      audience: 'public',
      sharedWithTeamId: null,
      thread: {
        id: 'thread_sample',
        audience: 'public',
        bodyTextPreview: 'Sample reply body.',
        bodyTextTruncated: false,
        authorPrincipalId: 'principal_sample_agent',
        isFromRequester: false,
        sharedWithTeamId: null,
        createdAt: SAMPLE_TIMESTAMP,
      },
    },
  },
  'ticket.participant_added': {
    ...envelope('ticket.participant_added', 'evt_sample_ticket_participant_added'),
    data: {
      ticket: SAMPLE_TICKET_REF,
      addedPrincipalId: 'principal_sample_observer',
      role: 'cc',
    },
  },
  'ticket.participant_removed': {
    ...envelope('ticket.participant_removed', 'evt_sample_ticket_participant_removed'),
    data: {
      ticket: SAMPLE_TICKET_REF,
      removedPrincipalId: 'principal_sample_observer',
    },
  },
  'ticket.shared': {
    ...envelope('ticket.shared', 'evt_sample_ticket_shared'),
    data: { ticket: SAMPLE_TICKET_REF, teamId: 'team_sample_partner', accessLevel: 'read' },
  },
  'ticket.unshared': {
    ...envelope('ticket.unshared', 'evt_sample_ticket_unshared'),
    data: { ticket: SAMPLE_TICKET_REF, teamId: 'team_sample_partner' },
  },
  'ticket.sla_warning': {
    ...envelope('ticket.sla_warning', 'evt_sample_ticket_sla_warning'),
    data: {
      ticket: SAMPLE_TICKET_REF,
      kind: 'first_response',
      ruleName: 'Default first-response SLA',
    },
  },
  'ticket.sla_breach': {
    ...envelope('ticket.sla_breach', 'evt_sample_ticket_sla_breach'),
    data: { ticket: SAMPLE_TICKET_REF, kind: 'first_response' },
  },
  'ticket.attachment_added': {
    ...envelope('ticket.attachment_added', 'evt_sample_ticket_attachment_added'),
    data: {
      ticket: SAMPLE_TICKET_REF,
      attachment: {
        id: 'tatt_sample',
        threadId: 'thread_sample',
        filename: 'screenshot.png',
        mimeType: 'image/png',
        sizeBytes: 12345,
        uploadedByPrincipalId: 'principal_sample_agent',
        publicUrl: 'https://cdn.example.test/sample.png',
      },
    },
  },
  'ticket.attachment_removed': {
    ...envelope('ticket.attachment_removed', 'evt_sample_ticket_attachment_removed'),
    data: {
      ticket: SAMPLE_TICKET_REF,
      attachment: {
        id: 'tatt_sample',
        threadId: 'thread_sample',
        filename: 'screenshot.png',
      },
      removedByPrincipalId: 'principal_sample_agent',
    },
  },
  'inbox.created': {
    ...envelope('inbox.created', 'evt_sample_inbox_created'),
    data: { inbox: SAMPLE_INBOX_REF },
  },
  'inbox.updated': {
    ...envelope('inbox.updated', 'evt_sample_inbox_updated'),
    data: {
      inbox: { ...SAMPLE_INBOX_REF, name: 'Support (renamed)' },
      changedFields: ['name'],
    },
  },
  'inbox.archived': {
    ...envelope('inbox.archived', 'evt_sample_inbox_archived'),
    data: {
      inbox: { ...SAMPLE_INBOX_REF, archivedAt: SAMPLE_TIMESTAMP },
    },
  },
  'inbox.unarchived': {
    ...envelope('inbox.unarchived', 'evt_sample_inbox_unarchived'),
    data: { inbox: SAMPLE_INBOX_REF },
  },
  'team.created': {
    ...envelope('team.created', 'evt_sample_team_created'),
    data: { team: SAMPLE_TEAM_REF },
  },
  'team.updated': {
    ...envelope('team.updated', 'evt_sample_team_updated'),
    data: {
      team: { ...SAMPLE_TEAM_REF, color: '#0ea5e9' },
      changedFields: ['color'],
    },
  },
  'team.archived': {
    ...envelope('team.archived', 'evt_sample_team_archived'),
    data: {
      team: { ...SAMPLE_TEAM_REF, archivedAt: SAMPLE_TIMESTAMP },
    },
  },
  'ticket_status.created': {
    ...envelope('ticket_status.created', 'evt_sample_ticket_status_created'),
    data: { status: SAMPLE_TICKET_STATUS_REF },
  },
  'ticket_status.updated': {
    ...envelope('ticket_status.updated', 'evt_sample_ticket_status_updated'),
    data: {
      status: { ...SAMPLE_TICKET_STATUS_REF, name: 'Open (renamed)' },
      changedFields: ['name'],
    },
  },
  'contact.created': {
    ...envelope('contact.created', 'evt_sample_contact_created'),
    data: { contact: SAMPLE_CONTACT_REF },
  },
  'contact.updated': {
    ...envelope('contact.updated', 'evt_sample_contact_updated'),
    data: {
      contact: { ...SAMPLE_CONTACT_REF, title: 'Senior Customer' },
      changedFields: ['title'],
    },
  },
  'contact.archived': {
    ...envelope('contact.archived', 'evt_sample_contact_archived'),
    data: {
      contact: { ...SAMPLE_CONTACT_REF, archivedAt: SAMPLE_TIMESTAMP },
    },
  },
  'contact.linked': {
    ...envelope('contact.linked', 'evt_sample_contact_linked'),
    data: {
      contact: SAMPLE_CONTACT_REF,
      userId: 'user_sample_portal',
      linkedByPrincipalId: 'principal_sample_agent',
    },
  },
  'contact.unlinked': {
    ...envelope('contact.unlinked', 'evt_sample_contact_unlinked'),
    data: {
      contact: SAMPLE_CONTACT_REF,
      userId: 'user_sample_portal',
    },
  },
  'organization.created': {
    ...envelope('organization.created', 'evt_sample_organization_created'),
    data: { organization: SAMPLE_ORG_REF },
  },
  'organization.updated': {
    ...envelope('organization.updated', 'evt_sample_organization_updated'),
    data: {
      organization: { ...SAMPLE_ORG_REF, name: 'Sample Org (renamed)' },
      changedFields: ['name'],
    },
  },
  'organization.archived': {
    ...envelope('organization.archived', 'evt_sample_organization_archived'),
    data: {
      organization: { ...SAMPLE_ORG_REF, archivedAt: SAMPLE_TIMESTAMP },
    },
  },
  'organization.unarchived': {
    ...envelope('organization.unarchived', 'evt_sample_organization_unarchived'),
    data: { organization: SAMPLE_ORG_REF },
  },
}

/**
 * Returns the canonical sample event payload for a given event type. Returned
 * objects are shared, deeply-frozen at module init — callers must NOT mutate
 * (use structuredClone if you need to tweak fields like `id` for a test fire).
 */
export function getSampleEventPayload(type: EventType): EventData {
  return SAMPLES[type]
}

/** All samples keyed by event type (for the GET preview endpoint). */
export function getAllSampleEventPayloads(): Record<EventType, EventData> {
  return SAMPLES
}

/** Stable prefix every test-fire / sample event id starts with. */
export const SAMPLE_EVENT_ID_PREFIX = 'evt_sample_'
/** Prefix for event ids generated by the test-fire endpoint at runtime. */
export const TEST_FIRE_EVENT_ID_PREFIX = 'evt_test_'
