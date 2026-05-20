-- Ticketing — Phase 1: RBAC + teams + audit foundation.
--
-- Adds three new domains alongside the existing schema:
--   1. teams + team_memberships (first-class grouping for principals)
--   2. roles + permissions + role_permissions + principal_role_assignments
--      (generic RBAC engine; the legacy principal.role column is kept as a
--      denormalised cache)
--   3. audit_events (append-only workspace-wide admin/security log)
--
-- The migration also seeds the five system roles described in
-- apps/web/src/lib/server/domains/authz/authz.permissions.ts and backfills
-- existing principals into the role-assignment table so requireAuth() and
-- requirePermission() agree on day one.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE "teams" (
  "id" uuid PRIMARY KEY NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "short_label" text,
  "color" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "teams_slug_idx" ON "teams" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "teams_archived_at_idx" ON "teams" USING btree ("archived_at");
--> statement-breakpoint

CREATE TABLE "team_memberships" (
  "id" uuid PRIMARY KEY NOT NULL,
  "team_id" uuid NOT NULL,
  "principal_id" uuid NOT NULL,
  "role" text DEFAULT 'member' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "team_memberships"
  ADD CONSTRAINT "team_memberships_team_id_teams_id_fk"
  FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "team_memberships"
  ADD CONSTRAINT "team_memberships_principal_id_principal_id_fk"
  FOREIGN KEY ("principal_id") REFERENCES "public"."principal"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "team_memberships_team_principal_idx"
  ON "team_memberships" USING btree ("team_id", "principal_id");
--> statement-breakpoint
CREATE INDEX "team_memberships_principal_idx"
  ON "team_memberships" USING btree ("principal_id");
--> statement-breakpoint

CREATE TABLE "roles" (
  "id" uuid PRIMARY KEY NOT NULL,
  "key" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "is_system" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "roles_key_idx" ON "roles" USING btree ("key");
--> statement-breakpoint

CREATE TABLE "permissions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "key" text NOT NULL,
  "category" text NOT NULL,
  "description" text,
  "is_system" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "permissions_key_idx" ON "permissions" USING btree ("key");
--> statement-breakpoint
CREATE INDEX "permissions_category_idx" ON "permissions" USING btree ("category");
--> statement-breakpoint

CREATE TABLE "role_permissions" (
  "id" uuid PRIMARY KEY NOT NULL,
  "role_id" uuid NOT NULL,
  "permission_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "role_permissions"
  ADD CONSTRAINT "role_permissions_role_id_roles_id_fk"
  FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "role_permissions"
  ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk"
  FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "role_permissions_role_permission_idx"
  ON "role_permissions" USING btree ("role_id", "permission_id");
--> statement-breakpoint
CREATE INDEX "role_permissions_permission_idx"
  ON "role_permissions" USING btree ("permission_id");
--> statement-breakpoint

CREATE TABLE "principal_role_assignments" (
  "id" uuid PRIMARY KEY NOT NULL,
  "principal_id" uuid NOT NULL,
  "role_id" uuid NOT NULL,
  "team_id" uuid,
  "granted_by_principal_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "principal_role_assignments"
  ADD CONSTRAINT "principal_role_assignments_principal_id_principal_id_fk"
  FOREIGN KEY ("principal_id") REFERENCES "public"."principal"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "principal_role_assignments"
  ADD CONSTRAINT "principal_role_assignments_role_id_roles_id_fk"
  FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "principal_role_assignments"
  ADD CONSTRAINT "principal_role_assignments_team_id_teams_id_fk"
  FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "principal_role_assignments"
  ADD CONSTRAINT "principal_role_assignments_granted_by_principal_id_principal_id_fk"
  FOREIGN KEY ("granted_by_principal_id") REFERENCES "public"."principal"("id")
  ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "principal_role_assignments_principal_role_team_idx"
  ON "principal_role_assignments" USING btree ("principal_id", "role_id", "team_id")
  WHERE team_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "principal_role_assignments_principal_role_workspace_idx"
  ON "principal_role_assignments" USING btree ("principal_id", "role_id")
  WHERE team_id IS NULL;
--> statement-breakpoint
CREATE INDEX "principal_role_assignments_principal_idx"
  ON "principal_role_assignments" USING btree ("principal_id");
--> statement-breakpoint
CREATE INDEX "principal_role_assignments_team_idx"
  ON "principal_role_assignments" USING btree ("team_id");
--> statement-breakpoint

CREATE TABLE "audit_events" (
  "id" uuid PRIMARY KEY NOT NULL,
  "principal_id" uuid,
  "action" text NOT NULL,
  "target_type" text NOT NULL,
  "target_id" text,
  "diff" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "source" text DEFAULT 'web' NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_events"
  ADD CONSTRAINT "audit_events_principal_id_principal_id_fk"
  FOREIGN KEY ("principal_id") REFERENCES "public"."principal"("id")
  ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "audit_events_created_at_idx"
  ON "audit_events" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "audit_events_principal_idx"
  ON "audit_events" USING btree ("principal_id", "created_at");
--> statement-breakpoint
CREATE INDEX "audit_events_action_idx"
  ON "audit_events" USING btree ("action", "created_at");
--> statement-breakpoint
CREATE INDEX "audit_events_target_idx"
  ON "audit_events" USING btree ("target_type", "target_id");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Seed system permissions
-- ---------------------------------------------------------------------------
-- Inserts every permission listed in authz.permissions.ts. Re-runnable: ON
-- CONFLICT (key) DO NOTHING so deploys with partial state recover cleanly.

INSERT INTO "permissions" ("id", "key", "category", "description", "is_system") VALUES
  (gen_random_uuid(), 'ticket.view_all',            'ticket', 'View every ticket in the workspace.', true),
  (gen_random_uuid(), 'ticket.view_team',           'ticket', 'View tickets owned by, assigned to, or shared with one of the actor''s teams.', true),
  (gen_random_uuid(), 'ticket.view_assigned',       'ticket', 'View tickets assigned to the actor.', true),
  (gen_random_uuid(), 'ticket.view_shared',         'ticket', 'View tickets shared with one of the actor''s teams.', true),
  (gen_random_uuid(), 'ticket.reply_public',        'ticket', 'Post a customer-visible reply.', true),
  (gen_random_uuid(), 'ticket.comment_internal',    'ticket', 'Post an internal note.', true),
  (gen_random_uuid(), 'ticket.edit_fields',         'ticket', 'Edit ticket fields (status, priority, assignee, etc.).', true),
  (gen_random_uuid(), 'ticket.assign_self',         'ticket', 'Assign tickets to oneself.', true),
  (gen_random_uuid(), 'ticket.assign_any',          'ticket', 'Assign tickets to any principal.', true),
  (gen_random_uuid(), 'ticket.share_cross_team',    'ticket', 'Share a ticket with another team.', true),
  (gen_random_uuid(), 'ticket.manage_participants', 'ticket', 'Add or remove ticket participants.', true),
  (gen_random_uuid(), 'org.view',                   'org',    'View organizations and contacts.', true),
  (gen_random_uuid(), 'org.manage',                 'org',    'Create and edit organizations and contacts.', true),
  (gen_random_uuid(), 'sla.view',                   'sla',    'View SLA policies and clocks.', true),
  (gen_random_uuid(), 'sla.manage',                 'sla',    'Create and edit SLA policies.', true),
  (gen_random_uuid(), 'audit.view',                 'audit',  'Read the workspace audit log.', true),
  (gen_random_uuid(), 'admin.manage_users',         'admin',  'Invite, remove, and update team members and teams.', true),
  (gen_random_uuid(), 'admin.manage_roles',         'admin',  'Edit role bundles and grant/revoke roles.', true),
  (gen_random_uuid(), 'admin.manage_api_keys',      'admin',  'Create, rotate, and revoke API keys.', true),
  (gen_random_uuid(), 'admin.manage_settings',      'admin',  'Edit workspace-wide settings.', true)
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Seed system roles
-- ---------------------------------------------------------------------------

INSERT INTO "roles" ("id", "key", "name", "description", "is_system") VALUES
  (gen_random_uuid(), 'owner',        'Owner',        'Full administrative access.', true),
  (gen_random_uuid(), 'supervisor',   'Supervisor',   'Team operations: assignment, sharing, audit visibility.', true),
  (gen_random_uuid(), 'agent',        'Agent',        'Default support agent: handles tickets within allowed scopes.', true),
  (gen_random_uuid(), 'collaborator', 'Collaborator', 'Internal collaborator: notes and read access on shared tickets.', true),
  (gen_random_uuid(), 'customer',     'Customer',     'Portal user role; no internal-side permissions.', true)
ON CONFLICT ("key") DO NOTHING;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Seed role_permissions
-- ---------------------------------------------------------------------------
-- Owner: every permission.
INSERT INTO "role_permissions" ("id", "role_id", "permission_id")
SELECT gen_random_uuid(), r.id, p.id
FROM "roles" r
CROSS JOIN "permissions" p
WHERE r.key = 'owner'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
--> statement-breakpoint

-- Supervisor.
INSERT INTO "role_permissions" ("id", "role_id", "permission_id")
SELECT gen_random_uuid(), r.id, p.id
FROM "roles" r
JOIN "permissions" p ON p.key IN (
  'ticket.view_all', 'ticket.view_team', 'ticket.view_assigned', 'ticket.view_shared',
  'ticket.reply_public', 'ticket.comment_internal', 'ticket.edit_fields',
  'ticket.assign_self', 'ticket.assign_any', 'ticket.share_cross_team',
  'ticket.manage_participants',
  'org.view', 'org.manage',
  'sla.view',
  'audit.view'
)
WHERE r.key = 'supervisor'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
--> statement-breakpoint

-- Agent.
INSERT INTO "role_permissions" ("id", "role_id", "permission_id")
SELECT gen_random_uuid(), r.id, p.id
FROM "roles" r
JOIN "permissions" p ON p.key IN (
  'ticket.view_team', 'ticket.view_assigned', 'ticket.view_shared',
  'ticket.reply_public', 'ticket.comment_internal', 'ticket.edit_fields',
  'ticket.assign_self',
  'org.view',
  'sla.view'
)
WHERE r.key = 'agent'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
--> statement-breakpoint

-- Collaborator.
INSERT INTO "role_permissions" ("id", "role_id", "permission_id")
SELECT gen_random_uuid(), r.id, p.id
FROM "roles" r
JOIN "permissions" p ON p.key IN (
  'ticket.view_shared', 'ticket.view_assigned', 'ticket.comment_internal',
  'org.view'
)
WHERE r.key = 'collaborator'
ON CONFLICT ("role_id", "permission_id") DO NOTHING;
--> statement-breakpoint

-- Customer: no internal-side permissions on purpose.

-- ---------------------------------------------------------------------------
-- Backfill existing principals → role assignments
-- ---------------------------------------------------------------------------
-- principal.role 'admin'  → owner
-- principal.role 'member' → agent (admins can promote to supervisor afterwards)
-- principal.role 'user'   → customer
--
-- Workspace-wide grants only (team_id IS NULL).

INSERT INTO "principal_role_assignments" ("id", "principal_id", "role_id", "team_id")
SELECT gen_random_uuid(), pr.id, r.id, NULL
FROM "principal" pr
JOIN "roles" r ON r.key = CASE pr.role
  WHEN 'admin'  THEN 'owner'
  WHEN 'member' THEN 'agent'
  WHEN 'user'   THEN 'customer'
  ELSE 'agent'
END
ON CONFLICT DO NOTHING;
