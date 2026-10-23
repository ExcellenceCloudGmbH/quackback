import { describe, expect, it } from 'vitest'
import { widgetDocumentCsp, widgetFrameAncestors } from '../csp'

describe('widgetFrameAncestors', () => {
  it('limits a profile widget to the validated host origin', () => {
    expect(
      widgetFrameAncestors({ source: 'profile', embedOrigin: 'https://excellence-cloud.de' })
    ).toBe("'self' https://excellence-cloud.de")
  })

  it('keeps * for a profile widget without a known host origin', () => {
    expect(widgetFrameAncestors({ source: 'profile' })).toBe('*')
  })

  it('ignores a host origin that is not a plain http(s) origin', () => {
    expect(widgetFrameAncestors({ source: 'profile', embedOrigin: 'null' })).toBe('*')
    expect(
      widgetFrameAncestors({ source: 'profile', embedOrigin: 'https://a.example; script-src *' })
    ).toBe('*')
  })

  it('only allows the portal itself to frame a disabled widget', () => {
    expect(
      widgetFrameAncestors({ source: 'disabled', embedOrigin: 'https://excellence-cloud.de' })
    ).toBe("'self'")
  })

  it('keeps * for the global widget', () => {
    expect(widgetFrameAncestors({ source: 'global' })).toBe('*')
  })
})

describe('widgetDocumentCsp', () => {
  const csp = widgetDocumentCsp({ source: 'profile', embedOrigin: 'https://excellence-cloud.de' })
  const directives = Object.fromEntries(
    csp.split('; ').map((d) => {
      const [name, ...values] = d.split(' ')
      return [name, values.join(' ')]
    })
  )

  it('defines a default-src fallback and the directives that do not fall back to it', () => {
    expect(directives['default-src']).toBe("'self'")
    expect(directives['form-action']).toBe("'self'")
    expect(directives['frame-ancestors']).toBe("'self' https://excellence-cloud.de")
    expect(directives['base-uri']).toBe("'self'")
  })

  it('has no wildcard source for a profile widget', () => {
    expect(csp).not.toMatch(/(^|\s)\*(;|\s|$)/)
  })
})
