'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowPathIcon, FolderIcon } from '@heroicons/react/24/solid'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useUpdateIntegration } from '@/lib/client/mutations'
import { fetchGitHubReposFn, type GitHubRepo } from '@/lib/server/integrations/github/functions'
import { StatusSyncConfig } from '@/components/admin/settings/integrations/status-sync-config'
import { OnDeleteConfig } from '@/components/admin/settings/integrations/on-delete-config'
import { useInboxes } from '@/lib/client/hooks/use-inboxes-queries'
import { GitHubUserMappings } from './github-user-mappings'
import { GitHubSyncHistory } from './github-sync-history'
import type { GitHubSyncDirection } from '@/lib/server/integrations/github/types'

interface EventMapping {
  id: string
  eventType: string
  enabled: boolean
  filters?: Record<string, unknown> | null
}

interface GitHubConfigProps {
  integrationId: string
  initialConfig: Record<string, unknown>
  initialEventMappings: EventMapping[]
  enabled: boolean
}

const SYNC_DIRECTIONS: { value: GitHubSyncDirection; label: string; description: string }[] = [
  { value: 'outbound', label: 'Outbound', description: 'Ticket changes → GitHub issues' },
  { value: 'inbound', label: 'Inbound', description: 'GitHub issues → Tickets' },
  { value: 'bidirectional', label: 'Bidirectional', description: 'Sync both ways' },
]

const TICKET_EVENTS = [
  {
    id: 'ticket.created',
    label: 'Ticket created → Create issue',
    description: 'Create a GitHub issue when a ticket is created',
  },
  {
    id: 'ticket.status_changed',
    label: 'Ticket status changed → Update issue',
    description: 'Open/close GitHub issue when ticket status changes',
  },
  {
    id: 'ticket.assigned',
    label: 'Ticket assigned → Assign issue',
    description: 'Sync ticket assignee to GitHub issue',
  },
  {
    id: 'ticket.updated',
    label: 'Ticket updated → Update issue',
    description: 'Sync ticket subject/description changes to GitHub issue',
  },
]

const POST_EVENTS = [
  {
    id: 'post.created',
    label: 'Create issue from new feedback',
    description: 'Create a GitHub issue when new feedback is submitted',
  },
  {
    id: 'post.status_changed',
    label: 'Sync feedback status changes',
    description: 'Update linked issues when feedback status changes',
  },
]

export function GitHubConfig({
  integrationId,
  initialConfig,
  initialEventMappings,
  enabled,
}: GitHubConfigProps) {
  const updateMutation = useUpdateIntegration()
  const inboxesQuery = useInboxes({ includeArchived: false })
  const inboxes = inboxesQuery.data ?? []

  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [loadingRepos, setLoadingRepos] = useState(false)
  const [repoError, setRepoError] = useState<string | null>(null)

  const [selectedRepo, setSelectedRepo] = useState((initialConfig.channelId as string) || '')
  const [_label, _setLabel] = useState((initialConfig.label as string) || '')
  const [integrationEnabled, setIntegrationEnabled] = useState(enabled)
  const [syncDirection, setSyncDirection] = useState<GitHubSyncDirection>(
    (initialConfig.syncDirection as GitHubSyncDirection) || 'outbound'
  )
  const [assigneeSync, setAssigneeSync] = useState((initialConfig.assigneeSync as boolean) ?? false)
  const [createTicketsFromIssues, setCreateTicketsFromIssues] = useState(
    (initialConfig.createTicketsFromIssues as boolean) ?? false
  )
  const [defaultInboxId, setDefaultInboxId] = useState(
    (initialConfig.defaultInboxId as string) || ''
  )
  const [eventSettings, setEventSettings] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      [...TICKET_EVENTS, ...POST_EVENTS].map((event) => [
        event.id,
        initialEventMappings.find((m) => m.eventType === event.id)?.enabled ?? false,
      ])
    )
  )

  const isInbound = syncDirection === 'inbound' || syncDirection === 'bidirectional'
  const isOutbound = syncDirection === 'outbound' || syncDirection === 'bidirectional'

  const fetchRepos = useCallback(async () => {
    setLoadingRepos(true)
    setRepoError(null)
    try {
      const result = await fetchGitHubReposFn({ data: { integrationId } })
      setRepos(result)
    } catch {
      setRepoError('Failed to load repositories. Please try again.')
    } finally {
      setLoadingRepos(false)
    }
  }, [integrationId])

  useEffect(() => {
    fetchRepos()
  }, [fetchRepos])

  const handleEnabledChange = (checked: boolean) => {
    setIntegrationEnabled(checked)
    updateMutation.mutate({ id: integrationId, enabled: checked })
  }

  const handleRepoChange = (repoFullName: string) => {
    setSelectedRepo(repoFullName)
    updateMutation.mutate({ id: integrationId, config: { channelId: repoFullName } })
  }

  const handleSyncDirectionChange = (value: GitHubSyncDirection) => {
    setSyncDirection(value)
    updateMutation.mutate({ id: integrationId, config: { syncDirection: value } })
  }

  const handleAssigneeSyncChange = (checked: boolean) => {
    setAssigneeSync(checked)
    updateMutation.mutate({ id: integrationId, config: { assigneeSync: checked } })
  }

  const handleCreateTicketsChange = (checked: boolean) => {
    setCreateTicketsFromIssues(checked)
    updateMutation.mutate({ id: integrationId, config: { createTicketsFromIssues: checked } })
  }

  const handleDefaultInboxChange = (value: string) => {
    setDefaultInboxId(value)
    updateMutation.mutate({ id: integrationId, config: { defaultInboxId: value } })
  }

  const handleEventToggle = (eventId: string, checked: boolean) => {
    const newSettings = { ...eventSettings, [eventId]: checked }
    setEventSettings(newSettings)
    updateMutation.mutate({
      id: integrationId,
      eventMappings: Object.entries(newSettings).map(([eventType, enabled]) => ({
        eventType,
        enabled,
      })),
    })
  }

  const saving = updateMutation.isPending

  return (
    <div className="space-y-6">
      {/* Enable/disable toggle */}
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor={`enabled-toggle-${integrationId}`} className="text-base font-medium">
            Integration enabled
          </Label>
          <p className="text-sm text-muted-foreground">
            Turn off to pause all syncing for this repository
          </p>
        </div>
        <Switch
          id={`enabled-toggle-${integrationId}`}
          checked={integrationEnabled}
          onCheckedChange={handleEnabledChange}
          disabled={saving}
        />
      </div>

      {/* Repository selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Repository</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchRepos}
            disabled={loadingRepos}
            className="h-8 gap-1.5 text-xs"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${loadingRepos ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        {repoError ? (
          <p className="text-sm text-destructive">{repoError}</p>
        ) : (
          <Select
            value={selectedRepo}
            onValueChange={handleRepoChange}
            disabled={loadingRepos || saving || !integrationEnabled}
          >
            <SelectTrigger className="w-full">
              {loadingRepos ? (
                <div className="flex items-center gap-2">
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  <span>Loading repositories...</span>
                </div>
              ) : (
                <SelectValue placeholder="Select a repository" />
              )}
            </SelectTrigger>
            <SelectContent>
              {repos.map((repo) => (
                <SelectItem key={repo.id} value={repo.fullName}>
                  <div className="flex items-center gap-2">
                    <FolderIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{repo.fullName}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Sync direction */}
      <div className="space-y-2">
        <Label>Sync direction</Label>
        <Select
          value={syncDirection}
          onValueChange={handleSyncDirectionChange}
          disabled={saving || !integrationEnabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SYNC_DIRECTIONS.map((dir) => (
              <SelectItem key={dir.value} value={dir.value}>
                <div>
                  <span className="font-medium">{dir.label}</span>
                  <span className="ml-2 text-muted-foreground text-xs">{dir.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Assignee sync */}
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">Assignee sync</Label>
          <p className="text-xs text-muted-foreground">
            Sync ticket assignees to/from GitHub issue assignees
          </p>
        </div>
        <Switch
          checked={assigneeSync}
          onCheckedChange={handleAssigneeSyncChange}
          disabled={saving || !integrationEnabled}
        />
      </div>

      {/* Inbound settings */}
      {isInbound && (
        <div className="space-y-4 rounded-lg border border-border/50 p-4">
          <div>
            <Label className="text-sm font-medium">Inbound settings</Label>
            <p className="text-xs text-muted-foreground">
              Configure how GitHub issues create tickets
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Create tickets from new issues</Label>
              <p className="text-xs text-muted-foreground">
                Automatically create a ticket when a new issue is opened in this repository
              </p>
            </div>
            <Switch
              checked={createTicketsFromIssues}
              onCheckedChange={handleCreateTicketsChange}
              disabled={saving || !integrationEnabled}
            />
          </div>

          {createTicketsFromIssues && (
            <div className="space-y-2">
              <Label className="text-sm">Default inbox</Label>
              <Select
                value={defaultInboxId}
                onValueChange={handleDefaultInboxChange}
                disabled={saving || !integrationEnabled}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an inbox" />
                </SelectTrigger>
                <SelectContent>
                  {inboxes.map((inbox) => (
                    <SelectItem key={inbox.id} value={inbox.id}>
                      {inbox.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                New tickets from GitHub issues will be created in this inbox
              </p>
            </div>
          )}
        </div>
      )}

      {/* Outbound ticket events */}
      {isOutbound && (
        <div className="space-y-3">
          <div>
            <Label className="text-base font-medium">Ticket events</Label>
            <p className="text-sm text-muted-foreground">
              Choose which ticket events sync to GitHub issues
            </p>
          </div>
          <div className="space-y-3 pt-1">
            {TICKET_EVENTS.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between rounded-lg border border-border/50 p-3"
              >
                <div>
                  <div className="font-medium text-sm">{event.label}</div>
                  <div className="text-xs text-muted-foreground">{event.description}</div>
                </div>
                <Switch
                  checked={eventSettings[event.id] ?? false}
                  onCheckedChange={(checked) => handleEventToggle(event.id, checked)}
                  disabled={saving || !integrationEnabled}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Post/feedback events */}
      <div className="space-y-3">
        <div>
          <Label className="text-base font-medium">Feedback events</Label>
          <p className="text-sm text-muted-foreground">Legacy feedback-to-issue syncing (posts)</p>
        </div>
        <div className="space-y-3 pt-1">
          {POST_EVENTS.map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between rounded-lg border border-border/50 p-3"
            >
              <div>
                <div className="font-medium text-sm">{event.label}</div>
                <div className="text-xs text-muted-foreground">{event.description}</div>
              </div>
              <Switch
                checked={eventSettings[event.id] ?? false}
                onCheckedChange={(checked) => handleEventToggle(event.id, checked)}
                disabled={saving || !integrationEnabled}
              />
            </div>
          ))}
        </div>
      </div>

      {/* User mappings */}
      {assigneeSync && (
        <GitHubUserMappings integrationId={integrationId} disabled={!integrationEnabled} />
      )}

      {saving && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowPathIcon className="h-4 w-4 animate-spin" />
          <span>Saving...</span>
        </div>
      )}

      {updateMutation.isError && (
        <div className="text-sm text-destructive">
          {updateMutation.error?.message || 'Failed to save changes'}
        </div>
      )}

      <StatusSyncConfig
        integrationId={integrationId}
        integrationType="github"
        config={initialConfig}
        enabled={integrationEnabled}
        externalStatuses={[
          { id: 'Open', name: 'Open' },
          { id: 'Closed', name: 'Closed' },
        ]}
      />

      <OnDeleteConfig
        integrationId={integrationId}
        integrationType="github"
        config={initialConfig}
        enabled={integrationEnabled}
      />

      <GitHubSyncHistory integrationId={integrationId} />
    </div>
  )
}
