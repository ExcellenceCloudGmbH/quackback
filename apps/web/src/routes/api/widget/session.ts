import { createFileRoute } from '@tanstack/react-router'
import { getWidgetSession } from '@/lib/server/functions/widget-auth'

export const Route = createFileRoute('/api/widget/session')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const session = await getWidgetSession()
          if (!session) {
            return Response.json(
              { error: { code: 'AUTH_REQUIRED', message: 'Valid widget session required' } },
              { status: 401, headers: noStoreHeaders() }
            )
          }

          const isAnonymous = session.principal.type === 'anonymous'
          return Response.json(
            {
              data: {
                user: isAnonymous
                  ? null
                  : {
                      id: session.user.id,
                      name: session.user.name,
                      email: session.user.email,
                      avatarUrl: session.user.image,
                    },
                // True iff this widget user is linked to a CRM contact via a
                // verified identify. Drives the widget UI's decision to show
                // "My tickets" — anonymous / unverified sessions can still
                // file a ticket via inline email but cannot list past ones.
                contactLinked: !isAnonymous && session.contactId !== null,
              },
            },
            { headers: noStoreHeaders() }
          )
        } catch (error) {
          console.error('[widget:session] Error:', error)
          return Response.json(
            { error: { code: 'SERVER_ERROR', message: 'Failed to load widget session' } },
            { status: 500, headers: noStoreHeaders() }
          )
        }
      },
    },
  },
})

function noStoreHeaders(): HeadersInit {
  return {
    'Cache-Control': 'no-store',
  }
}
