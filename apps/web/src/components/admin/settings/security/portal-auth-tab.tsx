import { useState, useTransition } from 'react'
import { useRouter } from '@tanstack/react-router'
import {
  ArrowPathIcon,
  EnvelopeIcon,
  KeyIcon,
  ShieldCheckIcon,
  LockClosedIcon,
} from '@heroicons/react/24/solid'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { MethodRow } from '@/components/admin/settings/auth-shared/method-row'
import { OAuthProviderGrid } from '@/components/admin/settings/auth-shared/oauth-provider-grid'
import { AuthProviderCredentialsDialog } from '@/components/admin/settings/portal-auth/auth-provider-credentials-dialog'
import { AUTH_PROVIDERS, getAuthProvider } from '@/lib/shared/auth-providers'
import { updatePortalConfigFn } from '@/lib/server/functions/settings'
import { isPathManagedFromBootstrap } from '@/lib/client/config-file'
import { useRouteContext } from '@tanstack/react-router'
import type { PortalAuthMethods } from '@/lib/shared/types'

interface PortalAuthTabProps {
  initialOauth: PortalAuthMethods
  credentialStatus: Record<string, boolean> & { _emailConfigured?: boolean }
  customOidcProviderTier: boolean
}

/**
 * Portal sign-in tab inside the unified Authentication page.
 *
 * Mirrors the previous standalone /admin/settings/portal-auth page but
 * inlined here so admins don't have to navigate to two separate places
 * to compare team vs portal config. Uses the same `<OAuthProviderGrid>`
 * the Team tab does — clicking "Configure" on any provider opens the
 * shared `AuthProviderCredentialsDialog` (one row in
 * `platform_credentials` powers both surfaces).
 *
 * Differences from the Team tab:
 *  - No SSO card (SSO is admin-only by design — IdPs typically issue
 *    one client secret per Quackback deployment, scoped to team admins
 *    rather than end users).
 *  - Magic Link defaults to off; password defaults to on.
 *  - No enforcement / bootstrap guard — portal is opt-in self-service.
 *
 * The `Sign-in Methods` card includes an explicit info row pointing
 * users to the Team tab for SSO so the absence isn't silent.
 */
export function PortalAuthTab({
  initialOauth,
  credentialStatus,
  customOidcProviderTier,
}: PortalAuthTabProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)
  const [oauthState, setOauthState] = useState<Record<string, boolean | undefined>>(initialOauth)

  const { managedFieldPaths = [] } =
    (useRouteContext({ from: '__root__' }) as { managedFieldPaths?: string[] }) ?? {}
  const isManaged = (path: string) => isPathManagedFromBootstrap(path, managedFieldPaths)

  const emailConfigured = credentialStatus._emailConfigured !== false
  const passwordEnabled = oauthState.password ?? true
  const magicLinkEnabled = oauthState.magicLink ?? false

  // Last-enabled-method guard. Portal has no locked-on method, so we
  // refuse to disable the only remaining one. Legacy `email` flag is
  // excluded — migration 0049 retired it in favour of magicLink.
  const enabledMethodCount = Object.entries(oauthState).filter(
    ([k, v]) => v && k !== 'email'
  ).length
  const isLastMethod = (id: string) => !!oauthState[id] && enabledMethodCount === 1

  const save = async (patch: Record<string, boolean | undefined>) => {
    setSaving(true)
    try {
      await updatePortalConfigFn({ data: { oauth: patch } })
      startTransition(() => router.invalidate())
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = (id: string, checked: boolean) => {
    setOauthState((prev) => ({ ...prev, [id]: checked }))
    void save({ [id]: checked })
  }

  const [configDialog, setConfigDialog] = useState<{
    credentialType: string
    providerId: string
    providerName: string
    helpUrl?: string
    fields: (typeof AUTH_PROVIDERS)[number]['platformCredentials']
  } | null>(null)

  const openConfigDialog = (provider: (typeof AUTH_PROVIDERS)[number]) => {
    const helpUrl = provider.platformCredentials.find((f) => f.helpUrl)?.helpUrl
    setConfigDialog({
      credentialType: provider.credentialType,
      providerId: provider.id,
      providerName: provider.name,
      helpUrl,
      fields: provider.platformCredentials,
    })
  }

  return (
    <div className="space-y-8">
      {/* Card — Sign-in Methods */}
      <div className="rounded-xl border border-border/50 bg-card shadow-sm">
        <div className="px-6 py-4 border-b border-border/50">
          <h2 className="text-base font-semibold">Sign-in methods</h2>
          <p className="text-xs text-muted-foreground mt-1">
            How visitors sign in to your public feedback portal.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <MethodRow
            icon={KeyIcon}
            label="Password"
            description="Sign in with email and password."
            checked={passwordEnabled}
            onCheckedChange={(v) => handleToggle('password', v)}
            disabled={
              saving ||
              isPending ||
              isManaged('portalConfig.oauth.password') ||
              (passwordEnabled && enabledMethodCount === 1)
            }
            badge={isManaged('portalConfig.oauth.password') ? 'Managed' : undefined}
            badgeTooltip={
              isManaged('portalConfig.oauth.password')
                ? 'Managed by your configuration file.'
                : undefined
            }
          />
          <MethodRow
            icon={EnvelopeIcon}
            label="Email magic link"
            description={
              emailConfigured
                ? 'One-click link or 6-digit code by email. No password needed.'
                : 'Configure SMTP or Resend to enable email delivery.'
            }
            checked={magicLinkEnabled}
            onCheckedChange={(v) => handleToggle('magicLink', v)}
            disabled={
              saving ||
              isPending ||
              !emailConfigured ||
              isManaged('portalConfig.oauth.magicLink') ||
              (magicLinkEnabled && enabledMethodCount === 1)
            }
          />
        </div>
      </div>

      {/* Card — OAuth Providers (portal-side toggles) */}
      <div className="rounded-xl border border-border/50 bg-card shadow-sm">
        <div className="px-6 py-4 border-b border-border/50">
          <h2 className="text-base font-semibold">Social sign-in</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Let visitors sign in with Google, GitHub, and more. Configure each provider once and
            enable it for the Team or Portal.
          </p>
        </div>
        <div className="p-6">
          <OAuthProviderGrid
            enabled={oauthState}
            credentialStatus={credentialStatus}
            isLastMethod={isLastMethod}
            isManaged={(id) => isManaged(`portalConfig.oauth.${id}`)}
            saving={saving || isPending}
            onToggle={handleToggle}
            onConfigure={openConfigDialog}
            excludeProviderIds={['custom-oidc']}
          />
        </div>
      </div>

      {/* Card — Custom OIDC (own surface; not in the social grid) */}
      <CustomOidcCard
        configured={!!credentialStatus['custom-oidc']}
        enabled={!!oauthState['custom-oidc']}
        managed={isManaged('portalConfig.oauth.custom-oidc')}
        lastMethod={isLastMethod('custom-oidc')}
        tierEnabled={customOidcProviderTier}
        saving={saving || isPending}
        onToggle={(v) => handleToggle('custom-oidc', v)}
        onConfigure={() => {
          const provider = getAuthProvider('custom-oidc')
          if (provider) openConfigDialog(provider)
        }}
      />

      {(saving || isPending) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowPathIcon className="h-4 w-4 animate-spin" />
          <span>Saving…</span>
        </div>
      )}

      {configDialog && (
        <AuthProviderCredentialsDialog
          credentialType={configDialog.credentialType}
          providerId={configDialog.providerId}
          providerName={configDialog.providerName}
          helpUrl={configDialog.helpUrl}
          fields={configDialog.fields}
          open={!!configDialog}
          onOpenChange={(open) => !open && setConfigDialog(null)}
        />
      )}
    </div>
  )
}

interface CustomOidcCardProps {
  configured: boolean
  enabled: boolean
  managed: boolean
  lastMethod: boolean
  tierEnabled: boolean
  saving: boolean
  onToggle: (next: boolean) => void
  onConfigure: () => void
}

/**
 * Dedicated card for custom OIDC — separated from the alphabetical social
 * grid because it's a meaningfully different setup (bring-your-own IdP for
 * end users) and the industry convention (Linear, Notion, Auth0, Clerk,
 * WorkOS) is to break Social vs Enterprise SSO into distinct sections.
 */
function CustomOidcCard({
  configured,
  enabled,
  managed,
  lastMethod,
  tierEnabled,
  saving,
  onToggle,
  onConfigure,
}: CustomOidcCardProps) {
  const toggleDisabled = saving || managed || lastMethod || !configured || !tierEnabled
  return (
    <div className="rounded-xl border border-border/50 bg-card shadow-sm">
      <div className="flex items-start gap-4 p-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-600/10">
          <ShieldCheckIcon className="h-5 w-5 text-violet-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-semibold">Bring your own identity provider</h2>
            {!tierEnabled && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                <LockClosedIcon className="mr-1 h-2.5 w-2.5" />
                Higher tier
              </Badge>
            )}
            {configured && enabled && tierEnabled && (
              <Badge
                variant="outline"
                className="border-green-500/30 text-green-600 text-[10px] px-1.5 py-0"
              >
                Enabled
              </Badge>
            )}
            {configured && !enabled && tierEnabled && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                Configured
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect a custom OpenID Connect provider so your portal users sign in via their own IdP
            (Okta, Auth0, Azure AD, Keycloak, ...). One discovery URL + client credentials and
            you&apos;re done.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Button
              type="button"
              variant={configured ? 'outline' : 'default'}
              size="sm"
              onClick={onConfigure}
              disabled={managed || !tierEnabled}
            >
              {configured ? 'Update credentials' : 'Configure'}
            </Button>
            {!tierEnabled && (
              <span className="text-xs text-muted-foreground">
                Available on plans with the custom OIDC feature.
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0">
          <Switch
            id="custom-oidc-toggle"
            checked={enabled}
            onCheckedChange={onToggle}
            disabled={toggleDisabled}
            aria-label="Enable custom OIDC for the portal"
          />
        </div>
      </div>
    </div>
  )
}
