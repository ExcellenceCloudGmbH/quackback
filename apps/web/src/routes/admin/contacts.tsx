/**
 * Contacts surface layout — Organizations / People sub-tab strip + Outlet.
 */
import { createFileRoute, Link, Outlet, useRouterState } from '@tanstack/react-router'
import { cn } from '@/lib/shared/utils'

export const Route = createFileRoute('/admin/contacts')({
  component: ContactsLayout,
})

function ContactsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const tabs: { label: string; to: string }[] = [
    { label: 'Organizations', to: '/admin/contacts/organizations' },
    { label: 'People', to: '/admin/contacts/people' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Contacts</h1>
        <p className="text-sm text-muted-foreground">Organizations and the people you support.</p>
      </div>

      <div className="flex items-center gap-1 border-b border-border/60">
        {tabs.map((t) => {
          const active = pathname === t.to || pathname.startsWith(t.to + '/')
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                'px-3 py-2 text-sm border-b-2 -mb-px transition-colors',
                active
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </Link>
          )
        })}
      </div>

      <Outlet />
    </div>
  )
}
