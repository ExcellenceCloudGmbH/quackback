ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "changelog_visibility_config" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "changelog_segment_visibility" (
  "id" uuid PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "segment_id" uuid NOT NULL REFERENCES "segments"("id") ON DELETE CASCADE,
  "restrict_categories" boolean DEFAULT false NOT NULL,
  "allowed_category_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "restrict_products" boolean DEFAULT false NOT NULL,
  "allowed_product_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "changelog_segment_visibility_segment_id_unique" UNIQUE("segment_id")
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "changelog_segment_visibility"
    ADD CONSTRAINT "changelog_segment_visibility_segment_id_unique"
    UNIQUE ("segment_id");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "changelog_segment_visibility_segment_id_idx"
  ON "changelog_segment_visibility" USING btree ("segment_id");
