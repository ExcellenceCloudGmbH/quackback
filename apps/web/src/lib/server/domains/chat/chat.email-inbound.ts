/**
 * Inbound email parsing for the email channel, kept pure so it's unit-tested
 * directly. Resend posts an `email.received` event whose `data` carries the
 * parsed message; we normalize the shape we depend on and strip quoted reply
 * history so the ingested chat message is only what the visitor actually wrote.
 */

export interface ParsedInboundEmail {
  /** Recipient addresses (one is our plus-addressed `reply+<id>@domain`). */
  toAddresses: string[]
  from: string | null
  subject: string | null
  text: string | null
  /** Provider Message-ID (header preferred, email id as fallback) for dedupe. */
  messageId: string | null
}

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

/** Read a header value case-insensitively from either an array of
 *  `{name,value}` entries or a plain object map. */
function readHeader(headers: unknown, name: string): string | null {
  const want = name.toLowerCase()
  if (Array.isArray(headers)) {
    for (const h of headers) {
      if (
        h &&
        typeof h === 'object' &&
        String((h as { name?: unknown }).name).toLowerCase() === want
      ) {
        return asString((h as { value?: unknown }).value)
      }
    }
    return null
  }
  if (headers && typeof headers === 'object') {
    for (const [k, v] of Object.entries(headers as Record<string, unknown>)) {
      if (k.toLowerCase() === want) return asString(v)
    }
  }
  return null
}

export function parseInboundEmail(data: unknown): ParsedInboundEmail {
  const d = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
  const rawTo = d.to
  const toAddresses = Array.isArray(rawTo)
    ? rawTo.filter((t): t is string => typeof t === 'string')
    : typeof rawTo === 'string'
      ? [rawTo]
      : []
  return {
    toAddresses,
    from: asString(d.from),
    subject: asString(d.subject),
    text: asString(d.text),
    messageId: readHeader(d.headers, 'message-id') ?? asString(d.email_id) ?? asString(d.id),
  }
}

// Lines that mark the start of quoted history from common mail clients.
const QUOTE_SEPARATORS = [
  /^On\s.+\swrote:\s*$/i, // Gmail / Apple Mail
  /^-{2,}\s*Original Message\s*-{2,}/i, // Outlook
  /^_{5,}\s*$/, // Outlook divider
  /^From:\s.+/i, // forwarded/replied Outlook header block
]

/**
 * Trim quoted reply history and a trailing signature so the stored message is
 * just the visitor's new text. Conservative: cut at the first quote separator
 * or signature delimiter, then drop a fully-quoted trailing block.
 */
export function extractReplyText(raw: string): string {
  const lines = raw.replace(/\r\n/g, '\n').split('\n')

  let cut = lines.length
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.trimEnd() === '--') {
      cut = i // signature delimiter ("-- " trims to "--")
      break
    }
    if (QUOTE_SEPARATORS.some((re) => re.test(line))) {
      cut = i
      break
    }
  }

  const kept = lines.slice(0, cut)
  // Drop any trailing run of quoted (`>`) lines and blank lines left behind.
  while (kept.length > 0) {
    const last = kept[kept.length - 1].trim()
    if (last === '' || last.startsWith('>')) kept.pop()
    else break
  }
  return kept.join('\n').trim()
}
