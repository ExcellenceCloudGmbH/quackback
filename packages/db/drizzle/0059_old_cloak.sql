CREATE TABLE "integration_sync_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL,
	"ticket_id" uuid,
	"external_id" text,
	"event_type" text NOT NULL,
	"direction" varchar(20) NOT NULL,
	"status" varchar(20) NOT NULL,
	"error_message" text,
	"duration_ms" integer,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "integration_sync_log_integration_created_idx" ON "integration_sync_log" USING btree ("integration_id","created_at");--> statement-breakpoint
CREATE INDEX "integration_sync_log_ticket_created_idx" ON "integration_sync_log" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "integration_sync_log_status_idx" ON "integration_sync_log" USING btree ("status","created_at") WHERE status = 'failed';