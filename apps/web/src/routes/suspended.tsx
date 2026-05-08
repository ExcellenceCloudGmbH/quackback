import { createFileRoute } from '@tanstack/react-router'
import { Route as RootRoute } from './__root'

export const Route = createFileRoute('/suspended')({ component: SuspendedPage })

function SuspendedPage() {
  const ctx = RootRoute.useRouteContext()
  const isDeleting = ctx.state === 'deleting'
  const title = isDeleting
    ? 'This workspace is being archived.'
    : 'This workspace is currently unavailable.'
  const body = isDeleting
    ? 'Your data is being safely archived. If this was unexpected, get in touch with the workspace admin.'
    : 'Reach out to the workspace admin to restore access.'

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <img src="/logo.png" alt="Quackback" className="mx-auto mb-6 h-16 w-16" />
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  )
}
