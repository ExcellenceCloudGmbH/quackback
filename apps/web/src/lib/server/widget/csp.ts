/**
 * Content-Security-Policy for the widget iframe document (/widget).
 *
 * The document only loads same-origin assets: uploads are proxied through
 * /api/storage, fonts are self-hosted, and the only embed is YouTube's
 * no-cookie player. Inline scripts and styles stay allowed because the
 * TanStack Start bootstrap and the tenant theme/custom CSS are inlined.
 *
 * frame-ancestors follows the widget context: a profile-scoped widget may only
 * be framed by the host origin that passed the profile's allowedOrigins check;
 * a disabled widget only by the portal itself. The global (profile-less)
 * widget keeps `*`, since nothing restricts where it may be embedded.
 */
import type { ResolvedWidgetContext } from './context'

const HTTP_ORIGIN = /^https?:\/\/[^\s;,'"]+$/

export function widgetFrameAncestors(
  context: Pick<ResolvedWidgetContext, 'source' | 'embedOrigin'>
): string {
  if (context.source === 'disabled') return "'self'"
  if (
    context.source === 'profile' &&
    context.embedOrigin &&
    HTTP_ORIGIN.test(context.embedOrigin)
  ) {
    return `'self' ${context.embedOrigin}`
  }
  return '*'
}

export function widgetDocumentCsp(
  context: Pick<ResolvedWidgetContext, 'source' | 'embedOrigin'>
): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    'frame-src https://www.youtube-nocookie.com',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${widgetFrameAncestors(context)}`,
  ].join('; ')
}
