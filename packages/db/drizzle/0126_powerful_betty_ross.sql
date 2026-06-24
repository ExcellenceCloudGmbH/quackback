CREATE TABLE "sso_verified_domain" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"verification_token" text NOT NULL,
	"verified_at" timestamp (3) with time zone,
	"enforced" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "two_factor" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"verified" boolean DEFAULT true NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "widget_identified_session" (
	"session_id" text PRIMARY KEY NOT NULL,
	"hmac_verified" boolean NOT NULL,
	"identified_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "widget_origin_session" (
	"session_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"marked_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_mentions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"post_id" uuid NOT NULL,
	"principal_id" uuid NOT NULL,
	"notified_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "changelog_categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"color" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "changelog_products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "changelog_segment_visibility" (
	"id" uuid PRIMARY KEY NOT NULL,
	"segment_id" uuid NOT NULL,
	"restrict_categories" boolean DEFAULT false NOT NULL,
	"allowed_category_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"restrict_products" boolean DEFAULT false NOT NULL,
	"allowed_product_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "changelog_segment_visibility_segment_id_unique" UNIQUE("segment_id")
);
--> statement-breakpoint
CREATE TABLE "chat_message_flags" (
	"chat_message_id" uuid NOT NULL,
	"principal_id" uuid NOT NULL,
	"flagged_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_message_flags_chat_message_id_principal_id_pk" PRIMARY KEY("chat_message_id","principal_id")
);
--> statement-breakpoint
CREATE TABLE "chat_message_mentions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"chat_message_id" uuid NOT NULL,
	"principal_id" uuid NOT NULL,
	"notified_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_message_reactions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"chat_message_id" uuid NOT NULL,
	"principal_id" uuid NOT NULL,
	"emoji" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"conversation_id" uuid NOT NULL,
	"principal_id" uuid,
	"sender_type" text NOT NULL,
	"content" text NOT NULL,
	"content_json" jsonb,
	"is_internal" boolean DEFAULT false NOT NULL,
	"attachments" jsonb,
	"metadata" jsonb,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone,
	"deleted_at" timestamp (3) with time zone,
	"deleted_by_principal_id" uuid
);
--> statement-breakpoint
CREATE TABLE "chat_tags" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#6b7280' NOT NULL,
	"description" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp (3) with time zone,
	CONSTRAINT "chat_tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "conversation_tags" (
	"conversation_id" uuid NOT NULL,
	"chat_tag_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"visitor_principal_id" uuid NOT NULL,
	"assigned_agent_principal_id" uuid,
	"status" text DEFAULT 'open' NOT NULL,
	"channel" text DEFAULT 'live_chat' NOT NULL,
	"priority" text DEFAULT 'none' NOT NULL,
	"subject" text,
	"last_message_preview" text,
	"last_message_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"visitor_last_read_at" timestamp (3) with time zone,
	"agent_last_read_at" timestamp (3) with time zone,
	"csat_rating" integer,
	"csat_comment" text,
	"csat_submitted_at" timestamp (3) with time zone,
	"resolved_at" timestamp (3) with time zone,
	"end_reason" text,
	"end_note" text,
	"visitor_email" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone
);
--> statement-breakpoint
CREATE TABLE "portal_tab_segment_overrides" (
	"id" uuid PRIMARY KEY NOT NULL,
	"segment_id" uuid NOT NULL,
	"overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portal_tab_segment_overrides_segment_id_unique" UNIQUE("segment_id")
);
--> statement-breakpoint
CREATE TABLE "hook_deliveries" (
	"job_id" text PRIMARY KEY NOT NULL,
	"hook_type" text NOT NULL,
	"processed_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY NOT NULL,
	"occurred_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"actor_user_id" uuid,
	"actor_email" text,
	"actor_role" text,
	"actor_ip" text,
	"actor_user_agent" text,
	"request_id" text,
	"actor_type" text,
	"auth_method" text,
	"event_type" text NOT NULL,
	"event_outcome" text DEFAULT 'success' NOT NULL,
	"target_type" text,
	"target_id" text,
	"before_value" jsonb,
	"after_value" jsonb,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "sso_recovery_code" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"used_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_devices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"principal_id" uuid NOT NULL,
	"token" text NOT NULL,
	"platform" text NOT NULL,
	"last_seen_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "widget_applications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"archived_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "widget_environment_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL,
	"environment" text NOT NULL,
	"display_name" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"allowed_origins" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"config_overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"content_filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"support_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"archived_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_memberships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"team_id" uuid NOT NULL,
	"principal_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"short_label" text,
	"color" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp (3) with time zone
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT true NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "principal_role_assignments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"principal_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"team_id" uuid,
	"granted_by_principal_id" uuid,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
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
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_user_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"contact_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"linked_by_principal_id" uuid,
	"linked_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp (3) with time zone
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"domain" text,
	"external_id" text,
	"website" text,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp (3) with time zone
);
--> statement-breakpoint
CREATE TABLE "ticket_statuses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"color" text DEFAULT '#6b7280' NOT NULL,
	"category" text DEFAULT 'open' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp (3) with time zone,
	CONSTRAINT "ticket_statuses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "ticket_activity" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ticket_id" uuid NOT NULL,
	"principal_id" uuid,
	"type" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_attachments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"thread_id" uuid NOT NULL,
	"uploaded_by_principal_id" uuid,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_key" text NOT NULL,
	"public_url" text,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_participants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ticket_id" uuid NOT NULL,
	"principal_id" uuid,
	"contact_id" uuid,
	"role" text NOT NULL,
	"added_by_principal_id" uuid,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_participants_one_subject" CHECK ((principal_id IS NOT NULL)::int + (contact_id IS NOT NULL)::int = 1)
);
--> statement-breakpoint
CREATE TABLE "ticket_shares" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ticket_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"access_level" text DEFAULT 'read' NOT NULL,
	"granted_by_principal_id" uuid,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp (3) with time zone,
	"revoked_by_principal_id" uuid
);
--> statement-breakpoint
CREATE TABLE "ticket_threads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ticket_id" uuid NOT NULL,
	"principal_id" uuid,
	"audience" text NOT NULL,
	"body_json" jsonb,
	"body_text" text NOT NULL,
	"shared_with_team_id" uuid,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp (3) with time zone,
	"edited_by_principal_id" uuid,
	"deleted_at" timestamp (3) with time zone,
	CONSTRAINT "ticket_threads_shared_team_required" CHECK ((audience <> 'shared_team') OR (shared_with_team_id IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"description_json" jsonb,
	"description_text" text,
	"priority" text DEFAULT 'normal' NOT NULL,
	"channel" text DEFAULT 'api' NOT NULL,
	"source_widget_profile_id" uuid,
	"visibility_scope" text DEFAULT 'team' NOT NULL,
	"status_id" uuid,
	"requester_principal_id" uuid,
	"requester_contact_id" uuid,
	"organization_id" uuid,
	"assignee_principal_id" uuid,
	"assignee_team_id" uuid,
	"primary_team_id" uuid,
	"inbox_id" uuid,
	"sla_policy_id" uuid,
	"first_response_at" timestamp (3) with time zone,
	"resolved_at" timestamp (3) with time zone,
	"reopened_at" timestamp (3) with time zone,
	"closed_at" timestamp (3) with time zone,
	"created_by_principal_id" uuid,
	"last_activity_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp (3) with time zone,
	"deleted_by_principal_id" uuid
);
--> statement-breakpoint
CREATE TABLE "inbox_channels" (
	"id" uuid PRIMARY KEY NOT NULL,
	"inbox_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"external_id" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"archived_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbox_memberships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"inbox_id" uuid NOT NULL,
	"principal_id" uuid NOT NULL,
	"role" text DEFAULT 'agent' NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inboxes" (
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
	"archived_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routing_rules" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"priority" integer DEFAULT 100 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"conditions" jsonb NOT NULL,
	"actions" jsonb NOT NULL,
	"inbox_id_scope" uuid,
	"last_matched_at" timestamp (3) with time zone,
	"match_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "business_hours" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"schedule" jsonb NOT NULL,
	"holidays" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"archived_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escalation_rules" (
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
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "escalation_rules_team_required" CHECK ((recipient_type <> 'team') OR (recipient_team_id IS NOT NULL)),
	CONSTRAINT "escalation_rules_principals_required" CHECK ((recipient_type <> 'principals') OR (array_length(recipient_principal_ids, 1) >= 1))
);
--> statement-breakpoint
CREATE TABLE "sla_escalation_log" (
	"id" uuid PRIMARY KEY NOT NULL,
	"clock_id" uuid NOT NULL,
	"rule_id" uuid,
	"fired_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"recipient_principal_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"channels" text[] DEFAULT '{}'::text[] NOT NULL,
	"context" jsonb
);
--> statement-breakpoint
CREATE TABLE "sla_policies" (
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
	"archived_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sla_policies_scope_team_required" CHECK ((scope <> 'team') OR (scope_team_id IS NOT NULL)),
	CONSTRAINT "sla_policies_scope_inbox_required" CHECK ((scope <> 'inbox') OR (scope_inbox_id IS NOT NULL)),
	CONSTRAINT "sla_policies_workspace_no_scope" CHECK ((scope <> 'workspace') OR (scope_team_id IS NULL AND scope_inbox_id IS NULL))
);
--> statement-breakpoint
CREATE TABLE "sla_targets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"policy_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"minutes" integer NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sla_targets_minutes_positive" CHECK (minutes > 0)
);
--> statement-breakpoint
CREATE TABLE "ticket_sla_clocks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ticket_id" uuid NOT NULL,
	"policy_id" uuid,
	"target_id" uuid,
	"kind" text NOT NULL,
	"state" text DEFAULT 'running' NOT NULL,
	"target_minutes" integer NOT NULL,
	"started_at" timestamp (3) with time zone NOT NULL,
	"due_at" timestamp (3) with time zone NOT NULL,
	"paused_at" timestamp (3) with time zone,
	"accumulated_paused_ms" bigint DEFAULT 0 NOT NULL,
	"breached_at" timestamp (3) with time zone,
	"met_at" timestamp (3) with time zone,
	"last_escalated_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_subscriptions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ticket_id" uuid NOT NULL,
	"principal_id" uuid NOT NULL,
	"notify_threads" boolean DEFAULT true NOT NULL,
	"notify_properties" boolean DEFAULT true NOT NULL,
	"notify_status" boolean DEFAULT true NOT NULL,
	"notify_assignment" boolean DEFAULT true NOT NULL,
	"notify_participants" boolean DEFAULT false NOT NULL,
	"notify_shares" boolean DEFAULT false NOT NULL,
	"notify_sla" boolean DEFAULT true NOT NULL,
	"muted_until" timestamp (3) with time zone,
	"source" text NOT NULL,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
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
	"request_payload_json" jsonb,
	"request_payload_truncated" boolean DEFAULT false NOT NULL,
	"response_body_snippet" text,
	"latency_ms" integer,
	"signature_timestamp" bigint NOT NULL,
	"attempted_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"next_retry_at" timestamp (3) with time zone
);
--> statement-breakpoint
CREATE TABLE "ticket_external_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ticket_id" uuid NOT NULL,
	"integration_id" uuid,
	"integration_type" varchar(50) NOT NULL,
	"external_id" text NOT NULL,
	"external_display_id" text,
	"external_url" text,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"sync_direction" varchar(20) DEFAULT 'outbound' NOT NULL,
	"last_synced_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_external_links_type_external_ticket_unique" UNIQUE("integration_type","external_id","ticket_id")
);
--> statement-breakpoint
CREATE TABLE "ticket_thread_external_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ticket_id" uuid NOT NULL,
	"thread_id" uuid NOT NULL,
	"integration_id" uuid NOT NULL,
	"integration_type" varchar(50) NOT NULL,
	"external_issue_id" text NOT NULL,
	"external_comment_id" text NOT NULL,
	"external_url" text,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"sync_direction" varchar(20) DEFAULT 'outbound' NOT NULL,
	"last_synced_at" timestamp (3) with time zone,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_thread_external_links_integration_comment_unique" UNIQUE("integration_id","external_comment_id"),
	CONSTRAINT "ticket_thread_external_links_integration_thread_unique" UNIQUE("integration_id","thread_id")
);
--> statement-breakpoint
CREATE TABLE "integration_user_mappings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"integration_id" uuid NOT NULL,
	"external_username" varchar(255) NOT NULL,
	"external_display_name" text,
	"principal_id" uuid,
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "integration_user_mappings_integration_username_unique" UNIQUE("integration_id","external_username")
);
--> statement-breakpoint
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
	"created_at" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "integrations" DROP CONSTRAINT "integration_type_unique";--> statement-breakpoint
DROP INDEX "boards_is_public_idx";--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "access_token_expires_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "refresh_token_expires_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "invitation" ALTER COLUMN "expires_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "invitation" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "invitation" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "invitation" ALTER COLUMN "last_sent_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "jwks" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "jwks" ALTER COLUMN "expires_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "oauth_access_token" ALTER COLUMN "expires_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "oauth_access_token" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "oauth_client" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "oauth_client" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "oauth_consent" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "oauth_consent" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" ALTER COLUMN "expires_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" ALTER COLUMN "revoked" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" ALTER COLUMN "auth_time" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "one_time_token" ALTER COLUMN "expires_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "one_time_token" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "one_time_token" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "principal" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "expires_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "session" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "expires_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "verification" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "boards" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "boards" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "boards" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "boards" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "boards" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "roadmaps" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "roadmaps" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "roadmaps" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "roadmaps" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "roadmaps" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "tags" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "tags" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "tags" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "post_statuses" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "post_statuses" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "post_statuses" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "comment_edit_history" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "comment_edit_history" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "comment_reactions" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "comment_reactions" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "comments" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "post_edit_history" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "post_edit_history" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "post_notes" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "post_notes" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "merged_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "embedding_updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "summary_updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "posts" ALTER COLUMN "merge_checked_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "votes" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "votes" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "votes" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "votes" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "integration_event_mappings" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "integration_event_mappings" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "integration_event_mappings" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "integration_event_mappings" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "integration_platform_credentials" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "integration_platform_credentials" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "integration_platform_credentials" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "integration_platform_credentials" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "integrations" ALTER COLUMN "connected_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "integrations" ALTER COLUMN "last_sync_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "integrations" ALTER COLUMN "last_error_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "integrations" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "integrations" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "integrations" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "integrations" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "slack_channel_monitors" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "slack_channel_monitors" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "slack_channel_monitors" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "slack_channel_monitors" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "changelog_entries" ALTER COLUMN "published_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "changelog_entries" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "changelog_entries" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "changelog_entries" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "changelog_entries" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "changelog_entries" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "changelog_entry_posts" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "changelog_entry_posts" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "in_app_notifications" ALTER COLUMN "read_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "in_app_notifications" ALTER COLUMN "archived_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "in_app_notifications" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "in_app_notifications" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "notification_preferences" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "notification_preferences" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "notification_preferences" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "notification_preferences" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "post_subscriptions" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "post_subscriptions" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "post_subscriptions" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "post_subscriptions" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "unsubscribe_tokens" ALTER COLUMN "expires_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "unsubscribe_tokens" ALTER COLUMN "used_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "unsubscribe_tokens" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "unsubscribe_tokens" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "post_sentiment" ALTER COLUMN "processed_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "post_sentiment" ALTER COLUMN "processed_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "last_used_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "expires_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "revoked_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "scopes" SET DATA TYPE text[];--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "scopes" SET DEFAULT '{}'::text[];--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "scopes" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "webhooks" ALTER COLUMN "last_triggered_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "webhooks" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "webhooks" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "webhooks" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "webhooks" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "webhooks" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "post_external_links" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "post_external_links" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "segments" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "segments" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "segments" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "segments" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "segments" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "user_segments" ALTER COLUMN "added_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "user_segments" ALTER COLUMN "added_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_attribute_definitions" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "user_attribute_definitions" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "user_attribute_definitions" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "user_attribute_definitions" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "external_user_mappings" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "external_user_mappings" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "external_user_mappings" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "external_user_mappings" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "feedback_signals" ALTER COLUMN "embedding_updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "feedback_signals" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "feedback_signals" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "feedback_signals" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "feedback_signals" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "feedback_sources" ALTER COLUMN "last_synced_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "feedback_sources" ALTER COLUMN "last_success_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "feedback_sources" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "feedback_sources" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "feedback_sources" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "feedback_sources" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "feedback_suggestions" ALTER COLUMN "resolved_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "feedback_suggestions" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "feedback_suggestions" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "feedback_suggestions" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "feedback_suggestions" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "raw_feedback_items" ALTER COLUMN "source_created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "raw_feedback_items" ALTER COLUMN "state_changed_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "raw_feedback_items" ALTER COLUMN "state_changed_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "raw_feedback_items" ALTER COLUMN "processed_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "raw_feedback_items" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "raw_feedback_items" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "raw_feedback_items" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "raw_feedback_items" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "merge_suggestions" ALTER COLUMN "resolved_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "merge_suggestions" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "merge_suggestions" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "merge_suggestions" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "merge_suggestions" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "post_activity" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "post_activity" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "ai_usage_log" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "ai_usage_log" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "pipeline_log" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "pipeline_log" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "kb_article_feedback" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "kb_article_feedback" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "kb_articles" ALTER COLUMN "published_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "kb_articles" ALTER COLUMN "embedding_updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "kb_articles" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "kb_articles" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "kb_articles" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "kb_articles" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "kb_articles" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "kb_categories" ALTER COLUMN "created_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "kb_categories" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "kb_categories" ALTER COLUMN "updated_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "kb_categories" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "kb_categories" ALTER COLUMN "deleted_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "analytics_daily_stats" ALTER COLUMN "computed_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "analytics_daily_stats" ALTER COLUMN "computed_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "analytics_top_posts" ALTER COLUMN "computed_at" SET DATA TYPE timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "analytics_top_posts" ALTER COLUMN "computed_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN "kind" text DEFAULT 'team' NOT NULL;--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN "magic_link_tokens" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "principal" ADD COLUMN "last_sso_sign_in_at" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "principal" ADD COLUMN "contact_email" text;--> statement-breakpoint
ALTER TABLE "principal" ADD COLUMN "chat_availability" text DEFAULT 'online' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "managed_field_paths" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "state" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "auth_config_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "portal_tab_config" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "changelog_visibility_config" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "locale" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "two_factor_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "boards" ADD COLUMN "access" jsonb DEFAULT '{"view":"anonymous","vote":"anonymous","comment":"anonymous","submit":"anonymous","segments":{"view":[],"vote":[],"comment":[],"submit":[]},"moderation":{"anonPosts":"inherit","signedPosts":"inherit","comments":"inherit"}}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "comment_edit_history" ADD COLUMN "previous_content_json" jsonb;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "content_json" jsonb;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "moderation_state" text DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "tracked_by_principal_id" uuid;--> statement-breakpoint
ALTER TABLE "integrations" ADD COLUMN "label" varchar(100);--> statement-breakpoint
ALTER TABLE "changelog_entries" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "changelog_entries" ADD COLUMN "product_id" uuid;--> statement-breakpoint
ALTER TABLE "in_app_notifications" ADD COLUMN "ticket_id" uuid;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN "email_ticket_threads" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN "email_ticket_properties" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN "email_ticket_status" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN "email_ticket_assignment" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN "email_ticket_participants" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN "email_ticket_shares" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN "email_ticket_sla" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "allowed_team_ids" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "allowed_inbox_ids" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "last_ip" text;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "last_user_agent" text;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "rotated_at" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "compat_legacy_full_access" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "compat_acknowledged_at" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "webhooks" ADD COLUMN "inbox_ids" text[];--> statement-breakpoint
ALTER TABLE "segments" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "kb_categories" ADD COLUMN "visibility" text DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "kb_categories" ADD COLUMN "allowed_segment_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "kb_categories" ADD COLUMN "allowed_principal_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_mentions" ADD CONSTRAINT "post_mentions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_mentions" ADD CONSTRAINT "post_mentions_principal_id_principal_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_segment_visibility" ADD CONSTRAINT "changelog_segment_visibility_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message_flags" ADD CONSTRAINT "chat_message_flags_chat_message_id_chat_messages_id_fk" FOREIGN KEY ("chat_message_id") REFERENCES "public"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message_flags" ADD CONSTRAINT "chat_message_flags_principal_id_principal_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message_mentions" ADD CONSTRAINT "chat_message_mentions_chat_message_id_chat_messages_id_fk" FOREIGN KEY ("chat_message_id") REFERENCES "public"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message_mentions" ADD CONSTRAINT "chat_message_mentions_principal_id_principal_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message_reactions" ADD CONSTRAINT "chat_message_reactions_chat_message_id_chat_messages_id_fk" FOREIGN KEY ("chat_message_id") REFERENCES "public"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message_reactions" ADD CONSTRAINT "chat_message_reactions_principal_id_principal_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_principal_id_principal_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principal"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_deleted_by_principal_id_principal_id_fk" FOREIGN KEY ("deleted_by_principal_id") REFERENCES "public"."principal"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_tags" ADD CONSTRAINT "conversation_tags_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_tags" ADD CONSTRAINT "conversation_tags_chat_tag_id_chat_tags_id_fk" FOREIGN KEY ("chat_tag_id") REFERENCES "public"."chat_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_visitor_principal_id_principal_id_fk" FOREIGN KEY ("visitor_principal_id") REFERENCES "public"."principal"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_assigned_agent_principal_id_principal_id_fk" FOREIGN KEY ("assigned_agent_principal_id") REFERENCES "public"."principal"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_tab_segment_overrides" ADD CONSTRAINT "portal_tab_segment_overrides_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sso_recovery_code" ADD CONSTRAINT "sso_recovery_code_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_devices" ADD CONSTRAINT "push_devices_principal_id_principal_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "widget_environment_profiles" ADD CONSTRAINT "widget_environment_profiles_application_id_widget_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."widget_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_principal_id_principal_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principal_role_assignments" ADD CONSTRAINT "principal_role_assignments_principal_id_principal_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principal_role_assignments" ADD CONSTRAINT "principal_role_assignments_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principal_role_assignments" ADD CONSTRAINT "principal_role_assignments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "principal_role_assignments" ADD CONSTRAINT "principal_role_assignments_granted_by_principal_id_principal_id_fk" FOREIGN KEY ("granted_by_principal_id") REFERENCES "public"."principal"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_principal_id_principal_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principal"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_user_links" ADD CONSTRAINT "contact_user_links_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_user_links" ADD CONSTRAINT "contact_user_links_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_user_links" ADD CONSTRAINT "contact_user_links_linked_by_principal_id_principal_id_fk" FOREIGN KEY ("linked_by_principal_id") REFERENCES "public"."principal"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_activity" ADD CONSTRAINT "ticket_activity_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_activity" ADD CONSTRAINT "ticket_activity_principal_id_principal_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principal"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_thread_id_ticket_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."ticket_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_uploaded_by_principal_id_principal_id_fk" FOREIGN KEY ("uploaded_by_principal_id") REFERENCES "public"."principal"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_participants" ADD CONSTRAINT "ticket_participants_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_participants" ADD CONSTRAINT "ticket_participants_principal_id_principal_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_participants" ADD CONSTRAINT "ticket_participants_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_participants" ADD CONSTRAINT "ticket_participants_added_by_principal_id_principal_id_fk" FOREIGN KEY ("added_by_principal_id") REFERENCES "public"."principal"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_shares" ADD CONSTRAINT "ticket_shares_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_shares" ADD CONSTRAINT "ticket_shares_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_shares" ADD CONSTRAINT "ticket_shares_granted_by_principal_id_principal_id_fk" FOREIGN KEY ("granted_by_principal_id") REFERENCES "public"."principal"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_shares" ADD CONSTRAINT "ticket_shares_revoked_by_principal_id_principal_id_fk" FOREIGN KEY ("revoked_by_principal_id") REFERENCES "public"."principal"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_threads" ADD CONSTRAINT "ticket_threads_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_threads" ADD CONSTRAINT "ticket_threads_principal_id_principal_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principal"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_threads" ADD CONSTRAINT "ticket_threads_shared_with_team_id_teams_id_fk" FOREIGN KEY ("shared_with_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_threads" ADD CONSTRAINT "ticket_threads_edited_by_principal_id_principal_id_fk" FOREIGN KEY ("edited_by_principal_id") REFERENCES "public"."principal"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_source_widget_profile_id_widget_environment_profiles_id_fk" FOREIGN KEY ("source_widget_profile_id") REFERENCES "public"."widget_environment_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_status_id_ticket_statuses_id_fk" FOREIGN KEY ("status_id") REFERENCES "public"."ticket_statuses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_requester_principal_id_principal_id_fk" FOREIGN KEY ("requester_principal_id") REFERENCES "public"."principal"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_requester_contact_id_contacts_id_fk" FOREIGN KEY ("requester_contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignee_principal_id_principal_id_fk" FOREIGN KEY ("assignee_principal_id") REFERENCES "public"."principal"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignee_team_id_teams_id_fk" FOREIGN KEY ("assignee_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_primary_team_id_teams_id_fk" FOREIGN KEY ("primary_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_created_by_principal_id_principal_id_fk" FOREIGN KEY ("created_by_principal_id") REFERENCES "public"."principal"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_deleted_by_principal_id_principal_id_fk" FOREIGN KEY ("deleted_by_principal_id") REFERENCES "public"."principal"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_channels" ADD CONSTRAINT "inbox_channels_inbox_id_inboxes_id_fk" FOREIGN KEY ("inbox_id") REFERENCES "public"."inboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_memberships" ADD CONSTRAINT "inbox_memberships_inbox_id_inboxes_id_fk" FOREIGN KEY ("inbox_id") REFERENCES "public"."inboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_memberships" ADD CONSTRAINT "inbox_memberships_principal_id_principal_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inboxes" ADD CONSTRAINT "inboxes_primary_team_id_teams_id_fk" FOREIGN KEY ("primary_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inboxes" ADD CONSTRAINT "inboxes_default_status_id_ticket_statuses_id_fk" FOREIGN KEY ("default_status_id") REFERENCES "public"."ticket_statuses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_rules" ADD CONSTRAINT "routing_rules_inbox_id_scope_inboxes_id_fk" FOREIGN KEY ("inbox_id_scope") REFERENCES "public"."inboxes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalation_rules" ADD CONSTRAINT "escalation_rules_policy_id_sla_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."sla_policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escalation_rules" ADD CONSTRAINT "escalation_rules_recipient_team_id_teams_id_fk" FOREIGN KEY ("recipient_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sla_escalation_log" ADD CONSTRAINT "sla_escalation_log_clock_id_ticket_sla_clocks_id_fk" FOREIGN KEY ("clock_id") REFERENCES "public"."ticket_sla_clocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sla_escalation_log" ADD CONSTRAINT "sla_escalation_log_rule_id_escalation_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."escalation_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sla_policies" ADD CONSTRAINT "sla_policies_scope_team_id_teams_id_fk" FOREIGN KEY ("scope_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sla_policies" ADD CONSTRAINT "sla_policies_scope_inbox_id_inboxes_id_fk" FOREIGN KEY ("scope_inbox_id") REFERENCES "public"."inboxes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sla_policies" ADD CONSTRAINT "sla_policies_business_hours_id_business_hours_id_fk" FOREIGN KEY ("business_hours_id") REFERENCES "public"."business_hours"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sla_targets" ADD CONSTRAINT "sla_targets_policy_id_sla_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."sla_policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_sla_clocks" ADD CONSTRAINT "ticket_sla_clocks_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_sla_clocks" ADD CONSTRAINT "ticket_sla_clocks_policy_id_sla_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."sla_policies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_sla_clocks" ADD CONSTRAINT "ticket_sla_clocks_target_id_sla_targets_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."sla_targets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_subscriptions" ADD CONSTRAINT "ticket_subscriptions_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_subscriptions" ADD CONSTRAINT "ticket_subscriptions_principal_id_principal_id_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principal"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_id_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_external_links" ADD CONSTRAINT "ticket_external_links_ticket_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_external_links" ADD CONSTRAINT "ticket_external_links_integration_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_thread_external_links" ADD CONSTRAINT "ticket_thread_external_links_ticket_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_thread_external_links" ADD CONSTRAINT "ticket_thread_external_links_thread_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."ticket_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_thread_external_links" ADD CONSTRAINT "ticket_thread_external_links_integration_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_user_mappings" ADD CONSTRAINT "integration_user_mappings_integration_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_user_mappings" ADD CONSTRAINT "integration_user_mappings_principal_fk" FOREIGN KEY ("principal_id") REFERENCES "public"."principal"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_sync_log" ADD CONSTRAINT "integration_sync_log_integration_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_sync_log" ADD CONSTRAINT "integration_sync_log_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "sso_verified_domain_name_unique" ON "sso_verified_domain" USING btree ("name");--> statement-breakpoint
CREATE INDEX "widget_origin_session_user_id_idx" ON "widget_origin_session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "post_mentions_post_principal_uq" ON "post_mentions" USING btree ("post_id","principal_id");--> statement-breakpoint
CREATE INDEX "post_mentions_principal_idx" ON "post_mentions" USING btree ("principal_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "changelog_categories_slug_idx" ON "changelog_categories" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "changelog_products_slug_idx" ON "changelog_products" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "changelog_segment_visibility_segment_id_idx" ON "changelog_segment_visibility" USING btree ("segment_id");--> statement-breakpoint
CREATE INDEX "chat_message_flags_principal_idx" ON "chat_message_flags" USING btree ("principal_id","flagged_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "chat_message_mentions_message_principal_uq" ON "chat_message_mentions" USING btree ("chat_message_id","principal_id");--> statement-breakpoint
CREATE INDEX "chat_message_mentions_principal_idx" ON "chat_message_mentions" USING btree ("principal_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "chat_message_reactions_message_idx" ON "chat_message_reactions" USING btree ("chat_message_id");--> statement-breakpoint
CREATE INDEX "chat_message_reactions_principal_idx" ON "chat_message_reactions" USING btree ("principal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_message_reactions_unique_idx" ON "chat_message_reactions" USING btree ("chat_message_id","principal_id","emoji");--> statement-breakpoint
CREATE INDEX "chat_messages_conversation_created_idx" ON "chat_messages" USING btree ("conversation_id","created_at","id");--> statement-breakpoint
CREATE INDEX "chat_messages_principal_idx" ON "chat_messages" USING btree ("principal_id");--> statement-breakpoint
CREATE INDEX "chat_messages_created_at_idx" ON "chat_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "chat_tags_deleted_at_idx" ON "chat_tags" USING btree ("deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_tags_pk" ON "conversation_tags" USING btree ("conversation_id","chat_tag_id");--> statement-breakpoint
CREATE INDEX "conversation_tags_chat_tag_idx" ON "conversation_tags" USING btree ("chat_tag_id");--> statement-breakpoint
CREATE INDEX "conversations_status_last_message_idx" ON "conversations" USING btree ("status","last_message_at");--> statement-breakpoint
CREATE INDEX "conversations_visitor_principal_idx" ON "conversations" USING btree ("visitor_principal_id");--> statement-breakpoint
CREATE INDEX "conversations_assigned_agent_idx" ON "conversations" USING btree ("assigned_agent_principal_id");--> statement-breakpoint
CREATE INDEX "portal_tab_segment_overrides_segment_id_idx" ON "portal_tab_segment_overrides" USING btree ("segment_id");--> statement-breakpoint
CREATE INDEX "hook_deliveries_processed_at_idx" ON "hook_deliveries" USING btree ("processed_at");--> statement-breakpoint
CREATE INDEX "audit_log_occurred_at_idx" ON "audit_log" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "audit_log_actor_user_id_occurred_at_idx" ON "audit_log" USING btree ("actor_user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_log_event_type_occurred_at_idx" ON "audit_log" USING btree ("event_type","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_log_request_id_idx" ON "audit_log" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "sso_recovery_code_user_id_idx" ON "sso_recovery_code" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sso_recovery_code_active_hash_unique" ON "sso_recovery_code" USING btree ("user_id","code_hash") WHERE used_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "push_devices_token_idx" ON "push_devices" USING btree ("token");--> statement-breakpoint
CREATE INDEX "push_devices_principal_idx" ON "push_devices" USING btree ("principal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "widget_applications_key_idx" ON "widget_applications" USING btree ("key");--> statement-breakpoint
CREATE INDEX "widget_applications_archived_at_idx" ON "widget_applications" USING btree ("archived_at");--> statement-breakpoint
CREATE INDEX "widget_profiles_application_idx" ON "widget_environment_profiles" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX "widget_profiles_environment_idx" ON "widget_environment_profiles" USING btree ("environment");--> statement-breakpoint
CREATE INDEX "widget_profiles_enabled_idx" ON "widget_environment_profiles" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "widget_profiles_archived_at_idx" ON "widget_environment_profiles" USING btree ("archived_at");--> statement-breakpoint
CREATE UNIQUE INDEX "widget_profiles_application_environment_active_idx" ON "widget_environment_profiles" USING btree ("application_id","environment") WHERE archived_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "team_memberships_team_principal_idx" ON "team_memberships" USING btree ("team_id","principal_id");--> statement-breakpoint
CREATE INDEX "team_memberships_principal_idx" ON "team_memberships" USING btree ("principal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_slug_idx" ON "teams" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "teams_archived_at_idx" ON "teams" USING btree ("archived_at");--> statement-breakpoint
CREATE UNIQUE INDEX "permissions_key_idx" ON "permissions" USING btree ("key");--> statement-breakpoint
CREATE INDEX "permissions_category_idx" ON "permissions" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "principal_role_assignments_principal_role_team_idx" ON "principal_role_assignments" USING btree ("principal_id","role_id","team_id") WHERE team_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "principal_role_assignments_principal_role_workspace_idx" ON "principal_role_assignments" USING btree ("principal_id","role_id") WHERE team_id IS NULL;--> statement-breakpoint
CREATE INDEX "principal_role_assignments_principal_idx" ON "principal_role_assignments" USING btree ("principal_id");--> statement-breakpoint
CREATE INDEX "principal_role_assignments_team_idx" ON "principal_role_assignments" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "role_permissions_role_permission_idx" ON "role_permissions" USING btree ("role_id","permission_id");--> statement-breakpoint
CREATE INDEX "role_permissions_permission_idx" ON "role_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_key_idx" ON "roles" USING btree ("key");--> statement-breakpoint
CREATE INDEX "audit_events_created_at_idx" ON "audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_events_principal_idx" ON "audit_events" USING btree ("principal_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_action_idx" ON "audit_events" USING btree ("action","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_target_idx" ON "audit_events" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_user_links_contact_user_idx" ON "contact_user_links" USING btree ("contact_id","user_id");--> statement-breakpoint
CREATE INDEX "contact_user_links_user_idx" ON "contact_user_links" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_email_idx" ON "contacts" USING btree ("email") WHERE email IS NOT NULL AND archived_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_external_id_idx" ON "contacts" USING btree ("external_id") WHERE external_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "contacts_organization_idx" ON "contacts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "contacts_archived_at_idx" ON "contacts" USING btree ("archived_at");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_domain_idx" ON "organizations" USING btree ("domain") WHERE domain IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_external_id_idx" ON "organizations" USING btree ("external_id") WHERE external_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "organizations_name_idx" ON "organizations" USING btree ("name");--> statement-breakpoint
CREATE INDEX "organizations_archived_at_idx" ON "organizations" USING btree ("archived_at");--> statement-breakpoint
CREATE INDEX "ticket_statuses_position_idx" ON "ticket_statuses" USING btree ("category","position");--> statement-breakpoint
CREATE INDEX "ticket_statuses_deleted_at_idx" ON "ticket_statuses" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "ticket_activity_ticket_id_created_idx" ON "ticket_activity" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "ticket_activity_type_idx" ON "ticket_activity" USING btree ("type");--> statement-breakpoint
CREATE INDEX "ticket_attachments_thread_idx" ON "ticket_attachments" USING btree ("thread_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_participants_ticket_principal_idx" ON "ticket_participants" USING btree ("ticket_id","principal_id") WHERE principal_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_participants_ticket_contact_idx" ON "ticket_participants" USING btree ("ticket_id","contact_id") WHERE contact_id IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_shares_ticket_team_active_idx" ON "ticket_shares" USING btree ("ticket_id","team_id") WHERE revoked_at IS NULL;--> statement-breakpoint
CREATE INDEX "ticket_shares_team_idx" ON "ticket_shares" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "ticket_threads_ticket_id_created_at_idx" ON "ticket_threads" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "ticket_threads_audience_idx" ON "ticket_threads" USING btree ("audience");--> statement-breakpoint
CREATE INDEX "tickets_status_id_idx" ON "tickets" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "tickets_assignee_principal_idx" ON "tickets" USING btree ("assignee_principal_id");--> statement-breakpoint
CREATE INDEX "tickets_primary_team_idx" ON "tickets" USING btree ("primary_team_id");--> statement-breakpoint
CREATE INDEX "tickets_organization_idx" ON "tickets" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tickets_requester_contact_idx" ON "tickets" USING btree ("requester_contact_id");--> statement-breakpoint
CREATE INDEX "tickets_source_widget_profile_idx" ON "tickets" USING btree ("source_widget_profile_id");--> statement-breakpoint
CREATE INDEX "tickets_created_at_idx" ON "tickets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "tickets_last_activity_at_idx" ON "tickets" USING btree ("last_activity_at");--> statement-breakpoint
CREATE INDEX "tickets_deleted_at_idx" ON "tickets" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "tickets_team_status_idx" ON "tickets" USING btree ("primary_team_id","status_id");--> statement-breakpoint
CREATE INDEX "tickets_active_last_activity_idx" ON "tickets" USING btree ("last_activity_at") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "tickets_sla_policy_idx" ON "tickets" USING btree ("sla_policy_id");--> statement-breakpoint
CREATE INDEX "inbox_channels_inbox_idx" ON "inbox_channels" USING btree ("inbox_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inbox_channels_kind_external_id_idx" ON "inbox_channels" USING btree ("kind","external_id") WHERE external_id IS NOT NULL AND archived_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "inbox_memberships_inbox_principal_idx" ON "inbox_memberships" USING btree ("inbox_id","principal_id");--> statement-breakpoint
CREATE INDEX "inbox_memberships_principal_idx" ON "inbox_memberships" USING btree ("principal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inboxes_slug_idx" ON "inboxes" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "inboxes_primary_team_idx" ON "inboxes" USING btree ("primary_team_id");--> statement-breakpoint
CREATE INDEX "inboxes_archived_at_idx" ON "inboxes" USING btree ("archived_at");--> statement-breakpoint
CREATE UNIQUE INDEX "inboxes_active_name_idx" ON "inboxes" USING btree (lower("name")) WHERE archived_at IS NULL;--> statement-breakpoint
CREATE INDEX "routing_rules_priority_idx" ON "routing_rules" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "routing_rules_inbox_scope_idx" ON "routing_rules" USING btree ("inbox_id_scope");--> statement-breakpoint
CREATE INDEX "routing_rules_enabled_idx" ON "routing_rules" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "business_hours_archived_at_idx" ON "business_hours" USING btree ("archived_at");--> statement-breakpoint
CREATE UNIQUE INDEX "business_hours_active_name_idx" ON "business_hours" USING btree (lower("name")) WHERE archived_at IS NULL;--> statement-breakpoint
CREATE INDEX "escalation_rules_policy_lead_idx" ON "escalation_rules" USING btree ("policy_id","lead_minutes");--> statement-breakpoint
CREATE INDEX "escalation_rules_enabled_kind_idx" ON "escalation_rules" USING btree ("enabled","target_kind");--> statement-breakpoint
CREATE INDEX "sla_escalation_log_clock_fired_idx" ON "sla_escalation_log" USING btree ("clock_id","fired_at");--> statement-breakpoint
CREATE INDEX "sla_escalation_log_rule_idx" ON "sla_escalation_log" USING btree ("rule_id");--> statement-breakpoint
CREATE INDEX "sla_policies_enabled_priority_idx" ON "sla_policies" USING btree ("enabled","priority");--> statement-breakpoint
CREATE INDEX "sla_policies_scope_team_idx" ON "sla_policies" USING btree ("scope_team_id");--> statement-breakpoint
CREATE INDEX "sla_policies_scope_inbox_idx" ON "sla_policies" USING btree ("scope_inbox_id");--> statement-breakpoint
CREATE INDEX "sla_policies_archived_at_idx" ON "sla_policies" USING btree ("archived_at");--> statement-breakpoint
CREATE UNIQUE INDEX "sla_targets_policy_kind_idx" ON "sla_targets" USING btree ("policy_id","kind");--> statement-breakpoint
CREATE INDEX "sla_targets_policy_idx" ON "sla_targets" USING btree ("policy_id");--> statement-breakpoint
CREATE INDEX "ticket_sla_clocks_ticket_idx" ON "ticket_sla_clocks" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "ticket_sla_clocks_policy_idx" ON "ticket_sla_clocks" USING btree ("policy_id");--> statement-breakpoint
CREATE INDEX "ticket_sla_clocks_state_due_idx" ON "ticket_sla_clocks" USING btree ("state","due_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_sla_clocks_active_kind_idx" ON "ticket_sla_clocks" USING btree ("ticket_id","kind") WHERE state IN ('running', 'paused');--> statement-breakpoint
CREATE UNIQUE INDEX "ticket_subscriptions_unique" ON "ticket_subscriptions" USING btree ("ticket_id","principal_id");--> statement-breakpoint
CREATE INDEX "ticket_subscriptions_principal_idx" ON "ticket_subscriptions" USING btree ("principal_id","ticket_id");--> statement-breakpoint
CREATE INDEX "ticket_subscriptions_ticket_threads_idx" ON "ticket_subscriptions" USING btree ("ticket_id") WHERE notify_threads = true;--> statement-breakpoint
CREATE INDEX "ticket_subscriptions_ticket_status_idx" ON "ticket_subscriptions" USING btree ("ticket_id") WHERE notify_status = true;--> statement-breakpoint
CREATE INDEX "ticket_subscriptions_ticket_assignment_idx" ON "ticket_subscriptions" USING btree ("ticket_id") WHERE notify_assignment = true;--> statement-breakpoint
CREATE INDEX "ticket_subscriptions_ticket_sla_idx" ON "ticket_subscriptions" USING btree ("ticket_id") WHERE notify_sla = true;--> statement-breakpoint
CREATE INDEX "webhook_deliveries_webhook_attempted_idx" ON "webhook_deliveries" USING btree ("webhook_id","attempted_at");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_event_idx" ON "webhook_deliveries" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_failed_idx" ON "webhook_deliveries" USING btree ("status","attempted_at") WHERE status IN ('failed_retryable', 'failed_terminal');--> statement-breakpoint
CREATE INDEX "ticket_external_links_ticket_id_idx" ON "ticket_external_links" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "ticket_external_links_type_external_id_idx" ON "ticket_external_links" USING btree ("integration_type","external_id");--> statement-breakpoint
CREATE INDEX "ticket_external_links_ticket_status_idx" ON "ticket_external_links" USING btree ("ticket_id","status");--> statement-breakpoint
CREATE INDEX "ticket_thread_external_links_ticket_idx" ON "ticket_thread_external_links" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "ticket_thread_external_links_issue_idx" ON "ticket_thread_external_links" USING btree ("integration_id","external_issue_id");--> statement-breakpoint
CREATE INDEX "ticket_thread_external_links_thread_status_idx" ON "ticket_thread_external_links" USING btree ("thread_id","status");--> statement-breakpoint
CREATE INDEX "integration_user_mappings_principal_idx" ON "integration_user_mappings" USING btree ("principal_id");--> statement-breakpoint
CREATE INDEX "integration_sync_log_integration_created_idx" ON "integration_sync_log" USING btree ("integration_id","created_at");--> statement-breakpoint
CREATE INDEX "integration_sync_log_ticket_created_idx" ON "integration_sync_log" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "integration_sync_log_status_idx" ON "integration_sync_log" USING btree ("status","created_at") WHERE status = 'failed';--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_tracked_by_principal_id_principal_id_fk" FOREIGN KEY ("tracked_by_principal_id") REFERENCES "public"."principal"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_entries" ADD CONSTRAINT "changelog_entries_category_id_changelog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."changelog_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "changelog_entries" ADD CONSTRAINT "changelog_entries_product_id_changelog_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."changelog_products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_createdAt_idx" ON "account" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "invitation_email_kind_status_idx" ON "invitation" USING btree ("email","kind","status");--> statement-breakpoint
CREATE INDEX "invitation_pending_expires_idx" ON "invitation" USING btree ("kind","expires_at") WHERE status = 'pending';--> statement-breakpoint
CREATE INDEX "oauth_refresh_token_client_user_created_idx" ON "oauth_refresh_token" USING btree ("client_id","user_id","created_at");--> statement-breakpoint
CREATE INDEX "principal_contact_email_idx" ON "principal" USING btree ("contact_email") WHERE contact_email IS NOT NULL;--> statement-breakpoint
CREATE INDEX "session_userId_createdAt_idx" ON "session" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "session_updatedAt_idx" ON "session" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "user_email_lower_idx" ON "user" USING btree (LOWER("email")) WHERE email IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "user_external_id_idx" ON "user" USING btree ("external_id") WHERE external_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "user_country_idx" ON "user" USING btree ("country") WHERE country IS NOT NULL;--> statement-breakpoint
CREATE INDEX "user_locale_idx" ON "user" USING btree ("locale") WHERE locale IS NOT NULL;--> statement-breakpoint
CREATE INDEX "comments_moderation_state_idx" ON "comments" USING btree ("moderation_state");--> statement-breakpoint
CREATE INDEX "comments_status_change_to_id_idx" ON "comments" USING btree ("status_change_to_id") WHERE status_change_to_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "posts_tracked_by_principal_id_idx" ON "posts" USING btree ("tracked_by_principal_id");--> statement-breakpoint
CREATE INDEX "changelog_category_id_idx" ON "changelog_entries" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "changelog_product_id_idx" ON "changelog_entries" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "in_app_notifications_ticket_idx" ON "in_app_notifications" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "api_keys_scopes_idx" ON "api_keys" USING gin ("scopes");--> statement-breakpoint
CREATE INDEX "api_keys_allowed_team_ids_idx" ON "api_keys" USING gin ("allowed_team_ids");--> statement-breakpoint
CREATE INDEX "api_keys_allowed_inbox_ids_idx" ON "api_keys" USING gin ("allowed_inbox_ids");--> statement-breakpoint
CREATE UNIQUE INDEX "segments_slug_unique" ON "segments" USING btree ("slug") WHERE deleted_at IS NULL;--> statement-breakpoint
ALTER TABLE "boards" DROP COLUMN "is_public";--> statement-breakpoint
ALTER TABLE "oauth_refresh_token" ADD CONSTRAINT "oauth_refresh_token_token_unique" UNIQUE("token");