import { pgTable, text, timestamp, varchar, integer, jsonb, index, uuid } from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { integrations } from './integrations'
import { tickets } from './tickets'

/**
 * Append-only audit log for integration sync operations (outbound & inbound).
 * One row per sync attempt. Tracks success, failure, timing, and error details.
 *
 * `direction` ∈ ('outbound', 'inbound')
 * `status` ∈ ('success', 'failed', 'skipped')
 *
 * 30-day retention recommended.
 */
export const integrationSyncLog = pgTable(
  'integration_sync_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    integrationId: uuid('integration_id').notNull(),
    ticketId: uuid('ticket_id'),
    externalId: text('external_id'),
    eventType: text('event_type').notNull(),
    direction: varchar('direction', { length: 20 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    errorMessage: text('error_message'),
    durationMs: integer('duration_ms'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('integration_sync_log_integration_created_idx').on(table.integrationId, table.createdAt),
    index('integration_sync_log_ticket_created_idx').on(table.ticketId, table.createdAt),
    index('integration_sync_log_status_idx')
      .on(table.status, table.createdAt)
      .where(sql`status = 'failed'`),
  ]
)

export const integrationSyncLogRelations = relations(integrationSyncLog, ({ one }) => ({
  integration: one(integrations, {
    fields: [integrationSyncLog.integrationId],
    references: [integrations.id],
  }),
  ticket: one(tickets, {
    fields: [integrationSyncLog.ticketId],
    references: [tickets.id],
  }),
}))

export type SyncLogStatus = 'success' | 'failed' | 'skipped'
export type SyncLogDirection = 'outbound' | 'inbound'
