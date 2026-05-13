import { SsoConnectionSection } from './sso-connection-section'
import { VerifiedDomainsSection } from './verified-domains-section'
import { AttributeMappingSection } from './attribute-mapping-section'
import { RecoveryCodesSection } from './recovery-codes-section'
import type { AuthConfig } from '@/lib/shared/types/settings'
import type { SsoStatus } from '@/lib/server/functions/sso'

interface SsoPageProps {
  authConfig: AuthConfig
  ssoStatus: SsoStatus
  customOidcProviderTier: boolean
}

/**
 * The /admin/settings/security/sso page body. Renders four sections:
 *
 *   1. <SsoConnectionSection> — IdP picker / OIDC form / test sign-in.
 *   2. <VerifiedDomainsSection> — add / verify / per-row enforce.
 *   3. <AttributeMappingSection> — claim path + role rules.
 *   4. <RecoveryCodesSection> — SSO break-glass codes.
 *
 * The connection section owns the tier banner; recovery codes are not
 * tier-gated and remain visible/usable when customOidcProviderTier=false.
 */
export function SsoPage({ authConfig, ssoStatus, customOidcProviderTier }: SsoPageProps) {
  return (
    <div className="space-y-10">
      <SsoConnectionSection
        initialConfig={authConfig}
        customOidcProviderTier={customOidcProviderTier}
        ssoStatus={ssoStatus}
      />
      <VerifiedDomainsSection />
      <AttributeMappingSection currentMapping={authConfig.ssoOidc?.attributeMapping} />
      <RecoveryCodesSection />
    </div>
  )
}
