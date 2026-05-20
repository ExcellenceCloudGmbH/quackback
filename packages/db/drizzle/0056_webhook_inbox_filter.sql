-- Phase 4 (per-inbox webhook filtering): add an optional inbox filter to
-- the webhooks table mirroring the existing board_ids filter for posts.
--
-- Semantics:
--   inbox_ids IS NULL  OR  cardinality(inbox_ids) = 0  → match all inboxes
--   non-empty array                                    → only match ticket
--                                                       events whose
--                                                       data.ticket.inboxId
--                                                       is in the array.
--
-- Existing webhooks transparently match-all because the column is nullable.

ALTER TABLE "webhooks" ADD COLUMN IF NOT EXISTS "inbox_ids" text[];
