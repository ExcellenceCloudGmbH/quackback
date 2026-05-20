-- Ticketing — Phase 3: ticket core.
--
-- Seven new tables forming the heart of the ticketing module:
--   * ticket_statuses        configurable workflow states (5 seeded)
--   * tickets                header / state / assignment / visibility
--   * ticket_threads         messages (public / internal / shared_team)
--   * ticket_attachments     metadata for files attached to a thread
--   * ticket_participants    watchers / collaborators / cc'd contacts
--   * ticket_shares          cross-team grants
--   * ticket_activity        per-ticket timeline mirror
--
-- `tickets.inbox_id` and `tickets.sla_policy_id` are intentionally plain TEXT
-- (no FKs) — Phases 4 and 5 will add the foreign keys without rewriting rows.

-- ---------------------------------------------------------------------------
-- ticket_statuses
-- ---------------------------------------------------------------------------

CREATE TABLE "ticket_statuses" (
  "id" uuid PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "color" text DEFAULT '#6b7280' NOT NULL,
  "category" text DEFAULT 'open' NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "is_system" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  CONSTRAINT "ticket_statuses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "ticket_statuses_position_idx" ON "ticket_statuses" USING btree ("category", "position");
--> statement-breakpoint
CREATE INDEX "ticket_statuses_deleted_at_idx" ON "ticket_statuses" USING btree ("deleted_at");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- tickets
-- ---------------------------------------------------------------------------

CREATE TABLE "tickets" (
  "id" uuid PRIMARY KEY NOT NULL,
  "subject" text NOT NULL,
  "description_json" jsonb,
  "description_text" text,
  "priority" text DEFAULT 'normal' NOT NULL,
  "channel" text DEFAULT 'api' NOT NULL,
  "visibility_scope" text DEFAULT 'team' NOT NULL,
  "status_id" uuid,
  "requester_principal_id" uuid,
  "requester_contact_id" uuid,
  "organization_id" uuid,
  "assignee_principal_id" uuid,
  "assignee_team_id" uuid,
  "primary_team_id" uuid,
  "inbox_id" text,
  "sla_policy_id" text,
  "first_response_at" timestamp with time zone,
  "resolved_at" timestamp with time zone,
  "reopened_at" timestamp with time zone,
  "closed_at" timestamp with time zone,
  "created_by_principal_id" uuid,
  "last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "deleted_at" timestamp with time zone,
  "deleted_by_principal_id" uuid
);
--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_status_id_ticket_statuses_id_fk"
  FOREIGN KEY ("status_id") REFERENCES "public"."ticket_statuses"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_requester_principal_id_principal_id_fk"
  FOREIGN KEY ("requester_principal_id") REFERENCES "public"."principal"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_requester_contact_id_contacts_id_fk"
  FOREIGN KEY ("requester_contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_organization_id_organizations_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignee_principal_id_principal_id_fk"
  FOREIGN KEY ("assignee_principal_id") REFERENCES "public"."principal"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignee_team_id_teams_id_fk"
  FOREIGN KEY ("assignee_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_primary_team_id_teams_id_fk"
  FOREIGN KEY ("primary_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_created_by_principal_id_principal_id_fk"
  FOREIGN KEY ("created_by_principal_id") REFERENCES "public"."principal"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_deleted_by_principal_id_principal_id_fk"
  FOREIGN KEY ("deleted_by_principal_id") REFERENCES "public"."principal"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "tickets_status_id_idx" ON "tickets" USING btree ("status_id");
--> statement-breakpoint
CREATE INDEX "tickets_assignee_principal_idx" ON "tickets" USING btree ("assignee_principal_id");
--> statement-breakpoint
CREATE INDEX "tickets_primary_team_idx" ON "tickets" USING btree ("primary_team_id");
--> statement-breakpoint
CREATE INDEX "tickets_organization_idx" ON "tickets" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "tickets_requester_contact_idx" ON "tickets" USING btree ("requester_contact_id");
--> statement-breakpoint
CREATE INDEX "tickets_created_at_idx" ON "tickets" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX "tickets_last_activity_at_idx" ON "tickets" USING btree ("last_activity_at");
--> statement-breakpoint
CREATE INDEX "tickets_deleted_at_idx" ON "tickets" USING btree ("deleted_at");
--> statement-breakpoint
CREATE INDEX "tickets_team_status_idx" ON "tickets" USING btree ("primary_team_id", "status_id");
--> statement-breakpoint
CREATE INDEX "tickets_active_last_activity_idx"
  ON "tickets" USING btree ("last_activity_at")
  WHERE deleted_at IS NULL;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- ticket_threads
-- ---------------------------------------------------------------------------

CREATE TABLE "ticket_threads" (
  "id" uuid PRIMARY KEY NOT NULL,
  "ticket_id" uuid NOT NULL,
  "principal_id" uuid,
  "audience" text NOT NULL,
  "body_json" jsonb,
  "body_text" text NOT NULL,
  "shared_with_team_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "edited_at" timestamp with time zone,
  "edited_by_principal_id" uuid,
  "deleted_at" timestamp with time zone,
  CONSTRAINT "ticket_threads_shared_team_required"
    CHECK ((audience <> 'shared_team') OR (shared_with_team_id IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "ticket_threads" ADD CONSTRAINT "ticket_threads_ticket_id_tickets_id_fk"
  FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ticket_threads" ADD CONSTRAINT "ticket_threads_principal_id_principal_id_fk"
  FOREIGN KEY ("principal_id") REFERENCES "public"."principal"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ticket_threads" ADD CONSTRAINT "ticket_threads_shared_with_team_id_teams_id_fk"
  FOREIGN KEY ("shared_with_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ticket_threads" ADD CONSTRAINT "ticket_threads_edited_by_principal_id_principal_id_fk"
  FOREIGN KEY ("edited_by_principal_id") REFERENCES "public"."principal"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "ticket_threads_ticket_id_created_at_idx"
  ON "ticket_threads" USING btree ("ticket_id", "created_at");
--> statement-breakpoint
CREATE INDEX "ticket_threads_audience_idx" ON "ticket_threads" USING btree ("audience");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- ticket_attachments
-- ---------------------------------------------------------------------------

CREATE TABLE "ticket_attachments" (
  "id" uuid PRIMARY KEY NOT NULL,
  "thread_id" uuid NOT NULL,
  "uploaded_by_principal_id" uuid,
  "filename" text NOT NULL,
  "mime_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "storage_key" text NOT NULL,
  "public_url" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_thread_id_ticket_threads_id_fk"
  FOREIGN KEY ("thread_id") REFERENCES "public"."ticket_threads"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_uploaded_by_principal_id_principal_id_fk"
  FOREIGN KEY ("uploaded_by_principal_id") REFERENCES "public"."principal"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "ticket_attachments_thread_idx" ON "ticket_attachments" USING btree ("thread_id");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- ticket_participants
-- ---------------------------------------------------------------------------

CREATE TABLE "ticket_participants" (
  "id" uuid PRIMARY KEY NOT NULL,
  "ticket_id" uuid NOT NULL,
  "principal_id" uuid,
  "contact_id" uuid,
  "role" text NOT NULL,
  "added_by_principal_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ticket_participants_one_subject"
    CHECK ((principal_id IS NOT NULL)::int + (contact_id IS NOT NULL)::int = 1)
);
--> statement-breakpoint
ALTER TABLE "ticket_participants" ADD CONSTRAINT "ticket_participants_ticket_id_tickets_id_fk"
  FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ticket_participants" ADD CONSTRAINT "ticket_participants_principal_id_principal_id_fk"
  FOREIGN KEY ("principal_id") REFERENCES "public"."principal"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ticket_participants" ADD CONSTRAINT "ticket_participants_contact_id_contacts_id_fk"
  FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ticket_participants" ADD CONSTRAINT "ticket_participants_added_by_principal_id_principal_id_fk"
  FOREIGN KEY ("added_by_principal_id") REFERENCES "public"."principal"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_participants_ticket_principal_idx"
  ON "ticket_participants" USING btree ("ticket_id", "principal_id")
  WHERE principal_id IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_participants_ticket_contact_idx"
  ON "ticket_participants" USING btree ("ticket_id", "contact_id")
  WHERE contact_id IS NOT NULL;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- ticket_shares
-- ---------------------------------------------------------------------------

CREATE TABLE "ticket_shares" (
  "id" uuid PRIMARY KEY NOT NULL,
  "ticket_id" uuid NOT NULL,
  "team_id" uuid NOT NULL,
  "access_level" text DEFAULT 'read' NOT NULL,
  "granted_by_principal_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revoked_at" timestamp with time zone,
  "revoked_by_principal_id" uuid
);
--> statement-breakpoint
ALTER TABLE "ticket_shares" ADD CONSTRAINT "ticket_shares_ticket_id_tickets_id_fk"
  FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ticket_shares" ADD CONSTRAINT "ticket_shares_team_id_teams_id_fk"
  FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ticket_shares" ADD CONSTRAINT "ticket_shares_granted_by_principal_id_principal_id_fk"
  FOREIGN KEY ("granted_by_principal_id") REFERENCES "public"."principal"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ticket_shares" ADD CONSTRAINT "ticket_shares_revoked_by_principal_id_principal_id_fk"
  FOREIGN KEY ("revoked_by_principal_id") REFERENCES "public"."principal"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_shares_ticket_team_active_idx"
  ON "ticket_shares" USING btree ("ticket_id", "team_id")
  WHERE revoked_at IS NULL;
--> statement-breakpoint
CREATE INDEX "ticket_shares_team_idx" ON "ticket_shares" USING btree ("team_id");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- ticket_activity
-- ---------------------------------------------------------------------------

CREATE TABLE "ticket_activity" (
  "id" uuid PRIMARY KEY NOT NULL,
  "ticket_id" uuid NOT NULL,
  "principal_id" uuid,
  "type" text NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ticket_activity" ADD CONSTRAINT "ticket_activity_ticket_id_tickets_id_fk"
  FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ticket_activity" ADD CONSTRAINT "ticket_activity_principal_id_principal_id_fk"
  FOREIGN KEY ("principal_id") REFERENCES "public"."principal"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "ticket_activity_ticket_id_created_idx"
  ON "ticket_activity" USING btree ("ticket_id", "created_at");
--> statement-breakpoint
CREATE INDEX "ticket_activity_type_idx" ON "ticket_activity" USING btree ("type");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Seed default ticket statuses (idempotent — safe on re-run)
-- ---------------------------------------------------------------------------

INSERT INTO "ticket_statuses" ("id", "name", "slug", "color", "category", "position", "is_default", "is_system")
VALUES
  (gen_random_uuid(), 'Open',    'open',    '#3b82f6', 'open',    0, true,  true),
  (gen_random_uuid(), 'Pending', 'pending', '#eab308', 'pending', 1, false, true),
  (gen_random_uuid(), 'On hold', 'on_hold', '#a855f7', 'on_hold', 2, false, true),
  (gen_random_uuid(), 'Solved',  'solved',  '#22c55e', 'solved',  3, false, true),
  (gen_random_uuid(), 'Closed',  'closed',  '#6b7280', 'closed',  4, false, true)
ON CONFLICT ("slug") DO NOTHING;
