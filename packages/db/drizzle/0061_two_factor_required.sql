-- Backfill authConfig.twoFactor.required = false for existing tenants
-- so the new workspace-wide Require 2FA toggle has a defined off state.
--
-- The hook treats missing `twoFactor` as off, so this migration is
-- behaviour-preserving — its purpose is to make the toggle's stored
-- shape explicit in DB dumps and to keep the admin UI rendering the
-- switch reliably without having to fall back on `undefined`.
--
-- Bump auth_config_version so cached Better-Auth instances rebuild on
-- their next request and the new field is observable everywhere.

UPDATE settings
SET
  auth_config = jsonb_set(
    auth_config::jsonb,
    '{twoFactor}',
    '{"required":false}'::jsonb,
    true
  )::text,
  auth_config_version = auth_config_version + 1
WHERE auth_config IS NOT NULL
  AND NOT (auth_config::jsonb ? 'twoFactor');
