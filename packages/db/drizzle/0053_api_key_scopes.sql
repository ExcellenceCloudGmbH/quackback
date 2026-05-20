-- Phase 6: Scoped API keys + audit hardening.
-- Adds scope columns, last IP/UA tracking, rotation/legacy compat fields
-- to api_keys. GIN indexes enable fast lookups on array columns.
-- Backfill: existing keys keep legacy "all permissions" behavior so they
-- continue to work; admins can opt in to scoping per key.

-- ---------------------------------------------------------------------------
-- api_keys: new columns
-- ---------------------------------------------------------------------------

ALTER TABLE "api_keys"
  ADD COLUMN IF NOT EXISTS "scopes" text[] DEFAULT '{}'::text[] NOT NULL,
  ADD COLUMN IF NOT EXISTS "allowed_team_ids" text[] DEFAULT '{}'::text[] NOT NULL,
  ADD COLUMN IF NOT EXISTS "allowed_inbox_ids" text[] DEFAULT '{}'::text[] NOT NULL,
  ADD COLUMN IF NOT EXISTS "last_ip" text,
  ADD COLUMN IF NOT EXISTS "last_user_agent" text,
  ADD COLUMN IF NOT EXISTS "rotated_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "compat_legacy_full_access" boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS "compat_acknowledged_at" timestamp with time zone;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- GIN indexes for array containment lookups
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS "api_keys_scopes_idx"
  ON "api_keys" USING gin ("scopes");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_keys_allowed_team_ids_idx"
  ON "api_keys" USING gin ("allowed_team_ids");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "api_keys_allowed_inbox_ids_idx"
  ON "api_keys" USING gin ("allowed_inbox_ids");
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Backfill: pre-existing keys retain "all permissions" semantics
-- ---------------------------------------------------------------------------

UPDATE "api_keys"
SET "compat_legacy_full_access" = true
WHERE "scopes" = '{}'::text[]
  AND "allowed_team_ids" = '{}'::text[]
  AND "allowed_inbox_ids" = '{}'::text[]
  AND "compat_acknowledged_at" IS NULL;
--> statement-breakpoint
