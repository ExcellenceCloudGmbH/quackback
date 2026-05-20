-- Phase 7: ticket subscriptions + webhook delivery audit log.
-- Adds per-(ticket, principal) subscription rows mirroring post_subscriptions
-- with richer flags and a `mutedUntil` window. Adds an append-only audit
-- table for webhook delivery attempts (every dispatch outcome is logged).
-- Adds a nullable `ticket_id` to in_app_notifications for ticket events.

-- ---------------------------------------------------------------------------
-- ticket_subscriptions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "ticket_subscriptions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "ticket_id" uuid NOT NULL,
  "principal_id" uuid NOT NULL,
  "notify_threads" boolean DEFAULT true NOT NULL,
  "notify_status" boolean DEFAULT true NOT NULL,
  "notify_assignment" boolean DEFAULT true NOT NULL,
  "notify_participants" boolean DEFAULT false NOT NULL,
  "notify_shares" boolean DEFAULT false NOT NULL,
  "notify_sla" boolean DEFAULT true NOT NULL,
  "muted_until" timestamp with time zone,
  "source" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ticket_subscriptions_source_check"
    CHECK ("source" IN ('auto_assigned', 'auto_participant', 'auto_team_member', 'manual'))
);
--> statement-breakpoint

ALTER TABLE "ticket_subscriptions"
  ADD CONSTRAINT "ticket_subscriptions_ticket_id_fk"
  FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE "ticket_subscriptions"
  ADD CONSTRAINT "ticket_subscriptions_principal_id_fk"
  FOREIGN KEY ("principal_id") REFERENCES "principal"("id") ON DELETE CASCADE;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "ticket_subscriptions_unique"
  ON "ticket_subscriptions" ("ticket_id", "principal_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_subscriptions_principal_idx"
  ON "ticket_subscriptions" ("principal_id", "ticket_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_subscriptions_ticket_threads_idx"
  ON "ticket_subscriptions" ("ticket_id") WHERE notify_threads = true;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_subscriptions_ticket_status_idx"
  ON "ticket_subscriptions" ("ticket_id") WHERE notify_status = true;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_subscriptions_ticket_assignment_idx"
  ON "ticket_subscriptions" ("ticket_id") WHERE notify_assignment = true;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_subscriptions_ticket_sla_idx"
  ON "ticket_subscriptions" ("ticket_id") WHERE notify_sla = true;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- webhook_deliveries
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
  "id" uuid PRIMARY KEY NOT NULL,
  "webhook_id" uuid NOT NULL,
  "event_id" text NOT NULL,
  "event_type" text NOT NULL,
  "attempt_number" integer NOT NULL,
  "status" text NOT NULL,
  "http_status" integer,
  "error_message" text,
  "request_url" text NOT NULL,
  "request_payload_bytes" integer NOT NULL,
  "response_body_snippet" text,
  "latency_ms" integer,
  "signature_timestamp" bigint NOT NULL,
  "attempted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "next_retry_at" timestamp with time zone,
  CONSTRAINT "webhook_deliveries_status_check"
    CHECK ("status" IN ('queued', 'success', 'failed_retryable', 'failed_terminal', 'blocked_ssrf'))
);
--> statement-breakpoint

ALTER TABLE "webhook_deliveries"
  ADD CONSTRAINT "webhook_deliveries_webhook_id_fk"
  FOREIGN KEY ("webhook_id") REFERENCES "webhooks"("id") ON DELETE CASCADE;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "webhook_deliveries_webhook_attempted_idx"
  ON "webhook_deliveries" ("webhook_id", "attempted_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_deliveries_event_idx"
  ON "webhook_deliveries" ("event_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_deliveries_failed_idx"
  ON "webhook_deliveries" ("status", "attempted_at")
  WHERE status IN ('failed_retryable', 'failed_terminal');
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- in_app_notifications: add nullable ticket_id for ticket-related events
-- ---------------------------------------------------------------------------

ALTER TABLE "in_app_notifications"
  ADD COLUMN IF NOT EXISTS "ticket_id" uuid;
--> statement-breakpoint

ALTER TABLE "in_app_notifications"
  ADD CONSTRAINT "in_app_notifications_ticket_id_fk"
  FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "in_app_notifications_ticket_idx"
  ON "in_app_notifications" ("ticket_id", "created_at");
