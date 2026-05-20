-- Phase 5: SLA + escalations.
-- Adds tables: business_hours, sla_policies, sla_targets, ticket_sla_clocks,
-- escalation_rules, sla_escalation_log.
-- Converts tickets.sla_policy_id from text to uuid + FK -> sla_policies(id).
-- Seeds 2 new permissions; SLA_VIEW/SLA_MANAGE were seeded in Phase 1 already
-- but we re-grant them here to be safe.

-- ---------------------------------------------------------------------------
-- business_hours
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "business_hours" (
  "id" uuid PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "timezone" text DEFAULT 'UTC' NOT NULL,
  "schedule" jsonb NOT NULL,
  "holidays" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "archived_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "business_hours_archived_at_idx"
  ON "business_hours" USING btree ("archived_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "business_hours_active_name_idx"
  ON "business_hours" USING btree (lower("name"))
  WHERE archived_at IS NULL;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- sla_policies
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "sla_policies" (
  "id" uuid PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "priority" integer DEFAULT 100 NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "scope" text NOT NULL,
  "scope_team_id" uuid,
  "scope_inbox_id" uuid,
  "applies_to_priorities" text[] DEFAULT '{}'::text[] NOT NULL,
  "business_hours_id" uuid,
  "pause_on_pending" boolean DEFAULT true NOT NULL,
  "pause_on_on_hold" boolean DEFAULT true NOT NULL,
  "archived_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "sla_policies_scope_check"
    CHECK ("scope" IN ('workspace', 'team', 'inbox')),
  CONSTRAINT "sla_policies_scope_team_required"
    CHECK ((scope <> 'team') OR (scope_team_id IS NOT NULL)),
  CONSTRAINT "sla_policies_scope_inbox_required"
    CHECK ((scope <> 'inbox') OR (scope_inbox_id IS NOT NULL)),
  CONSTRAINT "sla_policies_workspace_no_scope"
    CHECK ((scope <> 'workspace') OR (scope_team_id IS NULL AND scope_inbox_id IS NULL))
);
--> statement-breakpoint
ALTER TABLE "sla_policies" ADD CONSTRAINT "sla_policies_scope_team_id_teams_id_fk"
  FOREIGN KEY ("scope_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sla_policies" ADD CONSTRAINT "sla_policies_scope_inbox_id_inboxes_id_fk"
  FOREIGN KEY ("scope_inbox_id") REFERENCES "public"."inboxes"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sla_policies" ADD CONSTRAINT "sla_policies_business_hours_id_business_hours_id_fk"
  FOREIGN KEY ("business_hours_id") REFERENCES "public"."business_hours"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sla_policies_enabled_priority_idx"
  ON "sla_policies" USING btree ("enabled", "priority");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sla_policies_scope_team_idx"
  ON "sla_policies" USING btree ("scope_team_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sla_policies_scope_inbox_idx"
  ON "sla_policies" USING btree ("scope_inbox_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sla_policies_archived_at_idx"
  ON "sla_policies" USING btree ("archived_at");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- sla_targets
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "sla_targets" (
  "id" uuid PRIMARY KEY NOT NULL,
  "policy_id" uuid NOT NULL,
  "kind" text NOT NULL,
  "minutes" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "sla_targets_kind_check"
    CHECK ("kind" IN ('first_response', 'next_response', 'resolution')),
  CONSTRAINT "sla_targets_minutes_positive" CHECK (minutes > 0)
);
--> statement-breakpoint
ALTER TABLE "sla_targets" ADD CONSTRAINT "sla_targets_policy_id_sla_policies_id_fk"
  FOREIGN KEY ("policy_id") REFERENCES "public"."sla_policies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sla_targets_policy_kind_idx"
  ON "sla_targets" USING btree ("policy_id", "kind");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sla_targets_policy_idx"
  ON "sla_targets" USING btree ("policy_id");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- ticket_sla_clocks
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "ticket_sla_clocks" (
  "id" uuid PRIMARY KEY NOT NULL,
  "ticket_id" uuid NOT NULL,
  "policy_id" uuid,
  "target_id" uuid,
  "kind" text NOT NULL,
  "state" text DEFAULT 'running' NOT NULL,
  "target_minutes" integer NOT NULL,
  "started_at" timestamp with time zone NOT NULL,
  "due_at" timestamp with time zone NOT NULL,
  "paused_at" timestamp with time zone,
  "accumulated_paused_ms" bigint DEFAULT 0 NOT NULL,
  "breached_at" timestamp with time zone,
  "met_at" timestamp with time zone,
  "last_escalated_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ticket_sla_clocks_kind_check"
    CHECK ("kind" IN ('first_response', 'next_response', 'resolution')),
  CONSTRAINT "ticket_sla_clocks_state_check"
    CHECK ("state" IN ('running', 'paused', 'met', 'breached', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "ticket_sla_clocks" ADD CONSTRAINT "ticket_sla_clocks_ticket_id_tickets_id_fk"
  FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ticket_sla_clocks" ADD CONSTRAINT "ticket_sla_clocks_policy_id_sla_policies_id_fk"
  FOREIGN KEY ("policy_id") REFERENCES "public"."sla_policies"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ticket_sla_clocks" ADD CONSTRAINT "ticket_sla_clocks_target_id_sla_targets_id_fk"
  FOREIGN KEY ("target_id") REFERENCES "public"."sla_targets"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_sla_clocks_ticket_idx"
  ON "ticket_sla_clocks" USING btree ("ticket_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_sla_clocks_policy_idx"
  ON "ticket_sla_clocks" USING btree ("policy_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_sla_clocks_state_due_idx"
  ON "ticket_sla_clocks" USING btree ("state", "due_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ticket_sla_clocks_active_kind_idx"
  ON "ticket_sla_clocks" USING btree ("ticket_id", "kind")
  WHERE state IN ('running', 'paused');
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- escalation_rules
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "escalation_rules" (
  "id" uuid PRIMARY KEY NOT NULL,
  "policy_id" uuid NOT NULL,
  "name" text NOT NULL,
  "lead_minutes" integer NOT NULL,
  "target_kind" text NOT NULL,
  "recipient_type" text NOT NULL,
  "recipient_team_id" uuid,
  "recipient_principal_ids" text[] DEFAULT '{}'::text[] NOT NULL,
  "channels" text[] DEFAULT '{in_app}'::text[] NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "escalation_rules_target_kind_check"
    CHECK ("target_kind" IN ('first_response', 'next_response', 'resolution')),
  CONSTRAINT "escalation_rules_recipient_type_check"
    CHECK ("recipient_type" IN ('assignee', 'team', 'principals', 'inbox_members')),
  CONSTRAINT "escalation_rules_team_required"
    CHECK ((recipient_type <> 'team') OR (recipient_team_id IS NOT NULL)),
  CONSTRAINT "escalation_rules_principals_required"
    CHECK ((recipient_type <> 'principals') OR (array_length(recipient_principal_ids, 1) >= 1))
);
--> statement-breakpoint
ALTER TABLE "escalation_rules" ADD CONSTRAINT "escalation_rules_policy_id_sla_policies_id_fk"
  FOREIGN KEY ("policy_id") REFERENCES "public"."sla_policies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "escalation_rules" ADD CONSTRAINT "escalation_rules_recipient_team_id_teams_id_fk"
  FOREIGN KEY ("recipient_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "escalation_rules_policy_lead_idx"
  ON "escalation_rules" USING btree ("policy_id", "lead_minutes");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "escalation_rules_enabled_kind_idx"
  ON "escalation_rules" USING btree ("enabled", "target_kind");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- sla_escalation_log
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "sla_escalation_log" (
  "id" uuid PRIMARY KEY NOT NULL,
  "clock_id" uuid NOT NULL,
  "rule_id" uuid,
  "fired_at" timestamp with time zone DEFAULT now() NOT NULL,
  "recipient_principal_ids" text[] DEFAULT '{}'::text[] NOT NULL,
  "channels" text[] DEFAULT '{}'::text[] NOT NULL,
  "context" jsonb
);
--> statement-breakpoint
ALTER TABLE "sla_escalation_log" ADD CONSTRAINT "sla_escalation_log_clock_id_ticket_sla_clocks_id_fk"
  FOREIGN KEY ("clock_id") REFERENCES "public"."ticket_sla_clocks"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "sla_escalation_log" ADD CONSTRAINT "sla_escalation_log_rule_id_escalation_rules_id_fk"
  FOREIGN KEY ("rule_id") REFERENCES "public"."escalation_rules"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sla_escalation_log_clock_fired_idx"
  ON "sla_escalation_log" USING btree ("clock_id", "fired_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sla_escalation_log_rule_idx"
  ON "sla_escalation_log" USING btree ("rule_id");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Backfill tickets.sla_policy_id: was text (Phase 3 reservation); now uuid + FK.
-- Safe: column has no real values yet.
-- ---------------------------------------------------------------------------

ALTER TABLE "tickets" ALTER COLUMN "sla_policy_id" TYPE uuid
  USING (NULLIF("sla_policy_id"::text, '')::uuid);
--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_sla_policy_id_sla_policies_id_fk"
  FOREIGN KEY ("sla_policy_id") REFERENCES "public"."sla_policies"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tickets_sla_policy_idx" ON "tickets" USING btree ("sla_policy_id");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Seed Phase 5 permissions (SLA_VIEW/SLA_MANAGE already seeded in Phase 1).
-- ---------------------------------------------------------------------------

INSERT INTO "permissions" ("id", "key", "category", "description", "is_system") VALUES
  (gen_random_uuid(), 'business_hours.manage', 'sla', 'Create and edit business hours calendars.', true),
  (gen_random_uuid(), 'escalation.rule_manage', 'sla', 'Create and edit SLA escalation rules.', true)
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint

-- Owner = all permissions (re-grant to cover the new keys).
INSERT INTO "role_permissions" ("id", "role_id", "permission_id")
SELECT gen_random_uuid(), r.id, p.id
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r.key = 'owner'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
--> statement-breakpoint

-- Supervisor gains the new SLA management perms (already had sla.view, sla.manage).
INSERT INTO "role_permissions" ("id", "role_id", "permission_id")
SELECT gen_random_uuid(), r.id, p.id
FROM "roles" r
JOIN "permissions" p ON p.key IN ('business_hours.manage', 'escalation.rule_manage')
WHERE r.key = 'supervisor'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
