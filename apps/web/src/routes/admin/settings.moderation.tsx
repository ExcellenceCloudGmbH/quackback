import { useState, useTransition } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useSuspenseQuery } from '@tanstack/react-query'
import { ShieldCheckIcon } from '@heroicons/react/24/solid'
import { settingsQueries } from '@/lib/client/queries/settings'
import { updateModerationDefaultFn } from '@/lib/server/functions/settings'
import { BackLink } from '@/components/ui/back-link'
import { PageHeader } from '@/components/shared/page-header'
import { SettingsCard } from '@/components/admin/settings/settings-card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/admin/settings/moderation')({
  loader: async ({ context }) => {
    const { requireWorkspaceRole } = await import('@/lib/server/functions/workspace-utils')
    await requireWorkspaceRole({ data: { allowedRoles: ['admin'] } })

    const { queryClient } = context
    await queryClient.ensureQueryData(settingsQueries.portalConfig())
    return {}
  },
  component: ModerationSettingsPage,
})

const LEVELS: {
  value: 'none' | 'anonymous' | 'authenticated' | 'all'
  label: string
  description: string
}[] = [
  {
    value: 'none',
    label: 'No approval needed',
    description: 'Posts publish immediately on every board that inherits this default.',
  },
  {
    value: 'anonymous',
    label: 'Approve anonymous submissions',
    description: 'Posts from visitors without an account wait for review.',
  },
  {
    value: 'authenticated',
    label: 'Approve signed-in submissions',
    description: 'Posts from signed-in portal users wait for review.',
  },
  {
    value: 'all',
    label: 'Approve all submissions',
    description: 'Every post waits for review before publishing.',
  },
]

function ModerationSettingsPage() {
  const router = useRouter()
  const portalConfigQuery = useSuspenseQuery(settingsQueries.portalConfig())
  const [isPending, startTransition] = useTransition()
  const [value, setValue] = useState(
    portalConfigQuery.data.moderationDefault?.requireApproval ?? 'none'
  )
  const [saving, setSaving] = useState(false)

  async function onChange(next: 'none' | 'anonymous' | 'authenticated' | 'all') {
    const prev = value
    setValue(next)
    setSaving(true)
    try {
      await updateModerationDefaultFn({ data: { requireApproval: next } })
      startTransition(() => router.invalidate())
    } catch {
      setValue(prev)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="lg:hidden">
        <BackLink to="/admin/settings">Settings</BackLink>
      </div>
      <PageHeader
        icon={ShieldCheckIcon}
        title="Moderation"
        description="The default approval policy for new posts. Boards can override it on their Access tab."
      />
      <SettingsCard
        title="Default approval policy"
        description="Applied to every board set to inherit."
      >
        <RadioGroup
          value={value}
          onValueChange={(v) => onChange(v as typeof value)}
          className="grid gap-3"
        >
          {LEVELS.map((lvl) => (
            <Label
              key={lvl.value}
              htmlFor={`mod-${lvl.value}`}
              className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
            >
              <RadioGroupItem
                value={lvl.value}
                id={`mod-${lvl.value}`}
                className="mt-0.5"
                disabled={saving || isPending}
              />
              <div className="flex-1 space-y-1">
                <span className="font-medium">{lvl.label}</span>
                <p className="text-xs text-muted-foreground">{lvl.description}</p>
              </div>
            </Label>
          ))}
        </RadioGroup>
      </SettingsCard>
    </div>
  )
}
