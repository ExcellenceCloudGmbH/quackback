import { z } from 'zod'
import type { PortalTabConfig } from '@/lib/shared/portal-tabs'

// NOTE: the pure tab model + helpers live in `@/lib/shared/portal-tabs` (zod-
// free, client-safe). This module is the zod layer only (schema + JSON
// (de)serialization). We intentionally do NOT `export *` the shared runtime
// values here — a runtime star re-export next to a top-level `z.object(...)`
// trips a zod-v4/vitest module-init ordering bug. Import pure helpers from the
// shared module (or via the `index`/`index.server` barrels). A type-only
// re-export is erased at runtime, so it is safe and keeps `PortalTab*` types
// importable from this path for existing consumers.
export type { PortalTab, PortalTabConfig } from '@/lib/shared/portal-tabs'

/**
 * Zod schema for parsing and validating portal tab config from JSON
 */
export const portalTabConfigSchema = z.object({
  feedback: z.boolean().optional(),
  roadmap: z.boolean().optional(),
  changelog: z.boolean().optional(),
  myTickets: z.boolean().optional(),
  helpCenter: z.boolean().optional(),
  support: z.boolean().optional(),
  defaultTab: z
    .enum(['feedback', 'roadmap', 'changelog', 'myTickets', 'helpCenter', 'support'])
    .optional(),
})

/**
 * Parse portal tab config from JSON string (lenient).
 * Returns normalized config with explicit booleans, or {} on bad input.
 */
export function parsePortalTabConfig(json: string | null | undefined): PortalTabConfig {
  if (!json) return {}
  try {
    return portalTabConfigSchema.parse(JSON.parse(json))
  } catch {
    return {}
  }
}

/**
 * Serialize portal tab config to JSON string.
 */
export function serializePortalTabConfig(config: PortalTabConfig): string {
  return JSON.stringify(config)
}
