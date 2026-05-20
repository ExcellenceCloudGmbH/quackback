-- Integration sync log: append-only audit trail for GitHub ↔ ticket sync operations.
-- One row per sync attempt (outbound or inbound). Provides observability
-- into what synced, what failed, and when.
-- 30-day retention recommended (can add pg_cron cleanup later).

CREATE TABLE IF NOT EXISTS "integration_sync_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "integration_id" uuid NOT NULL REFERENCES "integrations"("id") ON DELETE CASCADE,
  "ticket_id" uuid REFERENCES "tickets"("id") ON DELETE SET NULL,
  "external_id" text,
  "event_type" text NOT NULL,
  "direction" varchar(20) NOT NULL,
  "status" varchar(20) NOT NULL,
  "error_message" text,
  "duration_ms" integer,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-->statement-breakpoint

CREATE INDEX "integration_sync_log_integration_created_idx" ON "integration_sync_log" ("integration_id", "created_at" DESC);

-->statement-breakpoint

CREATE INDEX "integration_sync_log_ticket_created_idx" ON "integration_sync_log" ("ticket_id", "created_at" DESC);

-->statement-breakpoint

CREATE INDEX "integration_sync_log_status_idx" ON "integration_sync_log" ("status", "created_at" DESC) WHERE status = 'failed';
