-- Ticketing — Phase 2: organizations & contacts.
--
-- Adds three tables consumed by Phase 3 ticket intake (`findOrCreateByDomain`,
-- `findOrCreateByEmail`) and the upcoming admin CRM views.
--
-- No data is seeded; tables are populated through the new REST API and the
-- Phase 3 ticket pipeline.

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------

CREATE TABLE "organizations" (
  "id" uuid PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "domain" text,
  "external_id" text,
  "website" text,
  "notes" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_domain_idx"
  ON "organizations" USING btree ("domain")
  WHERE domain IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_external_id_idx"
  ON "organizations" USING btree ("external_id")
  WHERE external_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "organizations_name_idx" ON "organizations" USING btree ("name");
--> statement-breakpoint
CREATE INDEX "organizations_archived_at_idx" ON "organizations" USING btree ("archived_at");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- contacts
-- ---------------------------------------------------------------------------

CREATE TABLE "contacts" (
  "id" uuid PRIMARY KEY NOT NULL,
  "name" text,
  "email" text,
  "phone" text,
  "title" text,
  "external_id" text,
  "organization_id" uuid,
  "avatar_url" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "contacts"
  ADD CONSTRAINT "contacts_organization_id_organizations_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id")
  ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_email_idx"
  ON "contacts" USING btree ("email")
  WHERE email IS NOT NULL AND archived_at IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_external_id_idx"
  ON "contacts" USING btree ("external_id")
  WHERE external_id IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "contacts_organization_idx" ON "contacts" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX "contacts_archived_at_idx" ON "contacts" USING btree ("archived_at");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- contact_user_links (N:M between contacts and portal users)
-- ---------------------------------------------------------------------------

CREATE TABLE "contact_user_links" (
  "id" uuid PRIMARY KEY NOT NULL,
  "contact_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "linked_by_principal_id" uuid,
  "linked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_user_links"
  ADD CONSTRAINT "contact_user_links_contact_id_contacts_id_fk"
  FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contact_user_links"
  ADD CONSTRAINT "contact_user_links_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."user"("id")
  ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "contact_user_links"
  ADD CONSTRAINT "contact_user_links_linked_by_principal_id_principal_id_fk"
  FOREIGN KEY ("linked_by_principal_id") REFERENCES "public"."principal"("id")
  ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "contact_user_links_contact_user_idx"
  ON "contact_user_links" USING btree ("contact_id", "user_id");
--> statement-breakpoint
CREATE INDEX "contact_user_links_user_idx" ON "contact_user_links" USING btree ("user_id");
