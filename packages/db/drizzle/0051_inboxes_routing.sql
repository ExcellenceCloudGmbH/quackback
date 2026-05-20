-- Phase 4: inboxes, channels, memberships, routing rules.
-- Adds tables: inboxes, inbox_channels, inbox_memberships, routing_rules.
-- Backfills FK from existing tickets.inbox_id (was text → now uuid) → inboxes(id).
-- Seeds 5 new permissions and grants them into the existing system roles.

-- ---------------------------------------------------------------------------
-- inboxes
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "inboxes" (
  "id" uuid PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "description" text,
  "primary_team_id" uuid,
  "default_visibility_scope" text DEFAULT 'team' NOT NULL,
  "default_priority" text DEFAULT 'normal' NOT NULL,
  "default_status_id" uuid,
  "color" text,
  "icon" text,
  "archived_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inboxes" ADD CONSTRAINT "inboxes_primary_team_id_teams_id_fk"
  FOREIGN KEY ("primary_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inboxes" ADD CONSTRAINT "inboxes_default_status_id_ticket_statuses_id_fk"
  FOREIGN KEY ("default_status_id") REFERENCES "public"."ticket_statuses"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inboxes_slug_idx" ON "inboxes" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inboxes_primary_team_idx" ON "inboxes" USING btree ("primary_team_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inboxes_archived_at_idx" ON "inboxes" USING btree ("archived_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inboxes_active_name_idx"
  ON "inboxes" USING btree (lower("name"))
  WHERE archived_at IS NULL;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- inbox_channels
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "inbox_channels" (
  "id" uuid PRIMARY KEY NOT NULL,
  "inbox_id" uuid NOT NULL,
  "kind" text NOT NULL,
  "label" text NOT NULL,
  "config" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "external_id" text,
  "enabled" boolean DEFAULT true NOT NULL,
  "archived_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "inbox_channels_kind_check"
    CHECK ("kind" IN ('portal', 'email', 'api', 'widget', 'webhook'))
);
--> statement-breakpoint
ALTER TABLE "inbox_channels" ADD CONSTRAINT "inbox_channels_inbox_id_inboxes_id_fk"
  FOREIGN KEY ("inbox_id") REFERENCES "public"."inboxes"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbox_channels_inbox_idx" ON "inbox_channels" USING btree ("inbox_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inbox_channels_kind_external_id_idx"
  ON "inbox_channels" USING btree ("kind", "external_id")
  WHERE external_id IS NOT NULL AND archived_at IS NULL;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- inbox_memberships
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "inbox_memberships" (
  "id" uuid PRIMARY KEY NOT NULL,
  "inbox_id" uuid NOT NULL,
  "principal_id" uuid NOT NULL,
  "role" text DEFAULT 'agent' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "inbox_memberships_role_check"
    CHECK ("role" IN ('owner', 'agent', 'viewer'))
);
--> statement-breakpoint
ALTER TABLE "inbox_memberships" ADD CONSTRAINT "inbox_memberships_inbox_id_inboxes_id_fk"
  FOREIGN KEY ("inbox_id") REFERENCES "public"."inboxes"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "inbox_memberships" ADD CONSTRAINT "inbox_memberships_principal_id_principal_id_fk"
  FOREIGN KEY ("principal_id") REFERENCES "public"."principal"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "inbox_memberships_inbox_principal_idx"
  ON "inbox_memberships" USING btree ("inbox_id", "principal_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inbox_memberships_principal_idx"
  ON "inbox_memberships" USING btree ("principal_id");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- routing_rules
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "routing_rules" (
  "id" uuid PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "priority" integer DEFAULT 100 NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "conditions" jsonb NOT NULL,
  "actions" jsonb NOT NULL,
  "inbox_id_scope" uuid,
  "last_matched_at" timestamp with time zone,
  "match_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "routing_rules" ADD CONSTRAINT "routing_rules_inbox_id_scope_inboxes_id_fk"
  FOREIGN KEY ("inbox_id_scope") REFERENCES "public"."inboxes"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "routing_rules_priority_idx" ON "routing_rules" USING btree ("priority");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "routing_rules_inbox_scope_idx" ON "routing_rules" USING btree ("inbox_id_scope");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "routing_rules_enabled_idx" ON "routing_rules" USING btree ("enabled");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Backfill tickets.inbox_id: was text (Phase 3 reservation); now uuid + FK.
-- Safe: column has no real values yet (Phase 3 stored nothing here).
-- ---------------------------------------------------------------------------

ALTER TABLE "tickets" ALTER COLUMN "inbox_id" TYPE uuid USING (NULLIF("inbox_id", '')::uuid);
--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_inbox_id_inboxes_id_fk"
  FOREIGN KEY ("inbox_id") REFERENCES "public"."inboxes"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tickets_inbox_idx" ON "tickets" USING btree ("inbox_id");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Seed Phase 4 permissions
-- ---------------------------------------------------------------------------

INSERT INTO "permissions" ("id", "key", "category", "description", "is_system") VALUES
  (gen_random_uuid(), 'inbox.view',           'inbox', 'View inboxes and their queues.', true),
  (gen_random_uuid(), 'inbox.manage',         'inbox', 'Create, update, and archive inboxes and memberships.', true),
  (gen_random_uuid(), 'inbox.channel_manage', 'inbox', 'Configure inbox channels (portal/email/api/widget/webhook).', true),
  (gen_random_uuid(), 'routing.rule_manage',  'inbox', 'Create and edit routing rules.', true),
  (gen_random_uuid(), 'ticket.bulk_operate',  'ticket', 'Perform bulk ticket operations (assign / transition / change inbox).', true)
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint

-- Re-grant owner = all permissions (covers the new keys).
INSERT INTO "role_permissions" ("id", "role_id", "permission_id")
SELECT gen_random_uuid(), r.id, p.id
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r.key = 'owner'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
--> statement-breakpoint

-- Supervisor gains all Phase 4 perms.
INSERT INTO "role_permissions" ("id", "role_id", "permission_id")
SELECT gen_random_uuid(), r.id, p.id
FROM "roles" r
JOIN "permissions" p ON p.key IN (
  'inbox.view', 'inbox.manage', 'inbox.channel_manage',
  'routing.rule_manage', 'ticket.bulk_operate'
)
WHERE r.key = 'supervisor'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
--> statement-breakpoint

-- Agent gains inbox.view + ticket.bulk_operate.
INSERT INTO "role_permissions" ("id", "role_id", "permission_id")
SELECT gen_random_uuid(), r.id, p.id
FROM "roles" r
JOIN "permissions" p ON p.key IN ('inbox.view', 'ticket.bulk_operate')
WHERE r.key = 'agent'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
