import { useState } from 'react'
import { ArrowPathIcon } from '@heroicons/react/24/solid'
import { Button } from '@/components/ui/button'
import { OAuthConnectionActions } from '../oauth-connection-actions'
import { getGitHubConnectUrl } from '@/lib/server/integrations/github/functions'

interface GitHubConnectionActionsProps {
  integrationId?: string
  isConnected: boolean
}

export function GitHubConnectionActions({
  integrationId,
  isConnected,
}: GitHubConnectionActionsProps) {
  const [reconnecting, setReconnecting] = useState(false)

  const handleReconnect = async () => {
    if (!integrationId) return
    setReconnecting(true)
    try {
      const url = await getGitHubConnectUrl({
        data: { intent: 'reconnect', integrationId },
      })
      window.location.href = url
    } catch (err) {
      console.error('Failed to get reconnect URL:', err)
      setReconnecting(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {isConnected && integrationId && (
        <Button variant="outline" size="sm" onClick={handleReconnect} disabled={reconnecting}>
          {reconnecting ? (
            <>
              <ArrowPathIcon className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Reconnecting...
            </>
          ) : (
            'Reconnect'
          )}
        </Button>
      )}
      <OAuthConnectionActions
        integrationId={integrationId}
        isConnected={isConnected}
        searchParamKey="github"
        getConnectUrl={() => getGitHubConnectUrl({ data: {} })}
        displayName="GitHub"
        disconnectDescription="This will remove the GitHub integration and stop all issue syncing. You can reconnect at any time."
      />
    </div>
  )
}
