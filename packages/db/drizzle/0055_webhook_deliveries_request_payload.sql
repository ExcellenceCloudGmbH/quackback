-- Phase 5 (webhook operator surface): persist the request payload alongside
-- each webhook_deliveries row so the operator-facing redeliver action can
-- replay the exact payload that was originally POSTed.
--
-- `request_payload_json` holds the full event envelope as it appears on the
-- wire (`{id,type,createdAt,data}`). The writer caps stored payloads at
-- ~32 KB; oversized payloads are stored as NULL with the truncated flag set
-- and become non-redeliverable (rare for ticketing payloads).

ALTER TABLE "webhook_deliveries"
  ADD COLUMN IF NOT EXISTS "request_payload_json" jsonb;

ALTER TABLE "webhook_deliveries"
  ADD COLUMN IF NOT EXISTS "request_payload_truncated" boolean NOT NULL DEFAULT false;
