import { createFileRoute } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { adminQueries } from '@/lib/client/queries/admin'
import { UserGroupIcon } from '@heroicons/react/24/solid'
import { BackLink } from '@/components/ui/back-link'
import { PageHeader } from '@/components/shared/page-header'
import { SettingsCard } from '@/components/admin/settings/settings-card'
import { UserAttributesList } from '@/components/admin/settings/user-attributes/user-attributes-list'
import { SegmentList } from '@/components/admin/segments/segment-list'

export const Route = createFileRoute('/admin/settings/people')({
  loader: async ({ context }) => {
    const { queryClient } = context
    await Promise.all([
      queryClient.ensureQueryData(adminQueries.userAttributes()),
      queryClient.ensureQueryData(adminQueries.segments()),
    ])
    return {}
  },
  component: PeoplePage,
})

function PeoplePage() {
  const attrsQuery = useSuspenseQuery(adminQueries.userAttributes())

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="lg:hidden">
        <BackLink to="/admin/settings">Settings</BackLink>
      </div>
      <PageHeader
        icon={UserGroupIcon}
        title="People"
        description="Custom attributes and segments for the people who use your portal."
      />

      {/* UserAttributesList renders its own SettingsCard internally */}
      <UserAttributesList initialAttributes={attrsQuery.data} />

      <SettingsCard
        title="Segments"
        description="Organize users into groups for filtering and analysis. Manual segments are assigned by hand; dynamic segments update automatically based on rules."
      >
        <SegmentList />
      </SettingsCard>
    </div>
  )
}
