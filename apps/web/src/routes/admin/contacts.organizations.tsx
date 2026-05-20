/**
 * Organizations list route — header + search + create dialog + list table.
 */
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { createRouteErrorComponent } from '@/components/admin/shared'
import { Suspense } from 'react'
import { organizationQueries } from '@/lib/client/queries/organizations'
import { OrganizationList } from '@/components/admin/contacts/organization-list'
import { OrganizationCreateDialog } from '@/components/admin/contacts/organization-create-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { PlusIcon } from '@heroicons/react/24/solid'
import { PermissionGate } from '@/components/admin/shared/permission-gate'
import { PERMISSIONS } from '@/lib/server/domains/authz'

export const Route = createFileRoute('/admin/contacts/organizations')({
  loader: async ({ context }) => {
    const { queryClient } = context as {
      queryClient: import('@tanstack/react-query').QueryClient
    }
    await queryClient.ensureQueryData(organizationQueries.list({ includeArchived: true }))
  },
  errorComponent: createRouteErrorComponent('Failed to load organizations'),
  component: OrganizationsPage,
})

function OrganizationsPage() {
  const [search, setSearch] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <Input
          placeholder="Search organizations…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="orgs-show-archived"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            <Label htmlFor="orgs-show-archived" className="text-xs font-normal">
              Show archived
            </Label>
          </div>
          <PermissionGate permission={PERMISSIONS.ORG_MANAGE}>
            <OrganizationCreateDialog
              trigger={
                <Button size="sm">
                  <PlusIcon className="h-4 w-4 mr-1" />
                  New organization
                </Button>
              }
            />
          </PermissionGate>
        </div>
      </div>

      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <OrganizationList search={search} showArchived={showArchived} />
      </Suspense>
    </div>
  )
}
