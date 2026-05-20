/**
 * Default redirect: /admin/contacts → /admin/contacts/organizations.
 */
import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/contacts/')({
  loader: () => {
    throw redirect({ to: '/admin/contacts/organizations' })
  },
})
