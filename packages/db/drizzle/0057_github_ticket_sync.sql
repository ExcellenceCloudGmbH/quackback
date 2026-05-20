-- Phase 6: GitHub ↔ Ticket bidirectional sync foundation
--
-- 1. Allow multiple integrations per type (multi-repo GitHub support)
-- 2. Add ticket_external_links table (mirrors post_external_links for tickets)
-- 3. Add integration_user_mappings table (GitHub username → team principal)

ALTER TABLE "integrations" DROP CONSTRAINT IF EXISTS "integration_type_unique";--> statement-breakpoint
ALTER TABLE "integrations" ADD COLUMN IF NOT EXISTS "label" varchar(100);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ticket_external_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ticket_id" uuid NOT NULL,
	"integration_id" uuid,
	"integration_type" varchar(50) NOT NULL,
	"external_id" text NOT NULL,
	"external_display_id" text,
	"external_url" text,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"sync_direction" varchar(20) DEFAULT 'outbound' NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "integration_user_mappings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"integration_id" uuid NOT NULL,
	"external_username" varchar(255) NOT NULL,
	"external_display_name" text,
	"principal_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ticket_external_links" ADD CONSTRAINT "ticket_external_links_ticket_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_external_links" ADD CONSTRAINT "ticket_external_links_integration_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_user_mappings" ADD CONSTRAINT "integration_user_mappings_integration_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_user_mappings" ADD CONSTRAINT "integration_user_mappings_principal_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principal"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ticket_external_links_type_external_ticket_unique" ON "ticket_external_links" USING btree ("integration_type","external_id","ticket_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_external_links_ticket_id_idx" ON "ticket_external_links" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_external_links_type_external_id_idx" ON "ticket_external_links" USING btree ("integration_type","external_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_external_links_ticket_status_idx" ON "ticket_external_links" USING btree ("ticket_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "integration_user_mappings_integration_username_unique" ON "integration_user_mappings" USING btree ("integration_id","external_username");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integration_user_mappings_principal_idx" ON "integration_user_mappings" USING btree ("principal_id");
