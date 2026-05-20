import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { adminQueries } from '@/lib/client/queries/admin'
import { IntegrationHeader } from '@/components/admin/settings/integrations/integration-header'
import { IntegrationSetupCard } from '@/components/admin/settings/integrations/integration-setup-card'
import { PlatformCredentialsDialog } from '@/components/admin/settings/integrations/platform-credentials-dialog'
import { GitHubConnectionCard } from '@/components/admin/settings/integrations/github/github-connection-card'
import { GitHubAddRepoDialog } from '@/components/admin/settings/integrations/github/github-add-repo-dialog'
import { Button } from '@/components/ui/button'
import { PlusIcon } from '@heroicons/react/24/solid'
import { GitHubIcon } from '@/components/icons/integration-icons'
import { githubCatalog } from '@/lib/shared/integration-catalog'

export const Route = createFileRoute('/admin/settings/integrations/github')({
  loader: async ({ context }) => {
    const { queryClient } = context
    await queryClient.ensureQueryData(adminQueries.githubIntegrations())
    return {}
  },
  component: GitHubIntegrationPage,
})

function GitHubIntegrationPage() {
  const githubQuery = useSuspenseQuery(adminQueries.githubIntegrations())
  const { connections, platformCredentialFields, platformCredentialsConfigured } = githubQuery.data
  const [credentialsOpen, setCredentialsOpen] = useState(false)
  const [addRepoOpen, setAddRepoOpen] = useState(false)

  const hasConnections = connections.length > 0
  const anyActive = connections.some((c) => c.status === 'active')

  return (
    <div className="space-y-6">
      <IntegrationHeader
        catalog={githubCatalog}
        status={anyActive ? 'active' : hasConnections ? 'paused' : null}
        icon={<GitHubIcon className="h-6 w-6 text-white" />}
        actions={
          hasConnections ? (
            <div className="flex items-center gap-2">
              {platformCredentialFields.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setCredentialsOpen(true)}>
                  Configure credentials
                </Button>
              )}
              {platformCredentialsConfigured && (
                <Button size="sm" onClick={() => setAddRepoOpen(true)}>
                  <PlusIcon className="mr-1.5 h-4 w-4" />
                  Add repository
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      {hasConnections && (
        <div className="space-y-4">
          {connections.map((connection) => (
            <GitHubConnectionCard key={connection.id} connection={connection} />
          ))}
        </div>
      )}

      {!hasConnections && (
        <IntegrationSetupCard
          icon={<GitHubIcon className="h-6 w-6 text-muted-foreground" />}
          title="Connect your GitHub repositories"
          description="Connect GitHub to sync tickets with issues bidirectionally. You can add multiple repositories, each with its own sync settings."
          steps={[
            <p key="1">
              Click <span className="font-medium text-foreground">Add repository</span> to authorize
              Quackback and select a repository.
            </p>,
            <p key="2">Configure sync direction, status mappings, and which events to sync.</p>,
            <p key="3">Add more repositories at any time — each with independent settings.</p>,
          ]}
          connectionForm={
            <div className="flex flex-col items-end gap-2">
              {platformCredentialFields.length > 0 && !platformCredentialsConfigured && (
                <Button onClick={() => setCredentialsOpen(true)}>Configure credentials</Button>
              )}
              {platformCredentialsConfigured && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCredentialsOpen(true)}>
                    Configure credentials
                  </Button>
                  <Button onClick={() => setAddRepoOpen(true)}>
                    <PlusIcon className="mr-1.5 h-4 w-4" />
                    Add repository
                  </Button>
                </div>
              )}
            </div>
          }
        />
      )}

      {platformCredentialFields.length > 0 && (
        <PlatformCredentialsDialog
          integrationType="github"
          integrationName="GitHub"
          fields={platformCredentialFields}
          open={credentialsOpen}
          onOpenChange={setCredentialsOpen}
        />
      )}

      <GitHubAddRepoDialog open={addRepoOpen} onOpenChange={setAddRepoOpen} />
    </div>
  )
}
