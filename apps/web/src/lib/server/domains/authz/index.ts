/**
 * Authz domain — public exports.
 *
 * Service functions are server-only; types and the permission catalogue are
 * safe to import from client code (e.g. for UI capability checks).
 */

export {
  PERMISSIONS,
  PERMISSION_CATEGORIES,
  ALL_PERMISSIONS,
  SYSTEM_ROLES,
  SYSTEM_ROLE_PERMISSIONS,
  type PermissionKey,
  type SystemRoleKey,
} from './authz.permissions'

export type { ActorScope, ResourceScope, ScopeMatch } from './authz.scopes'
