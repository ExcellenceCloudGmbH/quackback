import { describe, it, expect } from 'vitest'
import { parseEmbedUrl } from '../parse-embed-url'

// Real, round-trip-valid TypeIDs. The changelog prefix is `changelog_`
// (per @quackback/ids ID_PREFIXES), not `clog_`, and isValidTypeId rejects
// structurally-bogus suffixes — so the parser only accepts ids that can
// actually resolve.
const POST_ID = 'post_01ktjwt5tyf6br9mw521h13n6n'
const CHANGELOG_ID = 'changelog_01ktjwt5tyf6br9mwcz1vskk44'

describe('parseEmbedUrl', () => {
  it('parses a post url', () => {
    expect(parseEmbedUrl(`https://acme.quackback.io/b/features/posts/${POST_ID}`)).toEqual({
      kind: 'post',
      id: POST_ID,
    })
  })
  it('parses a changelog url', () => {
    expect(parseEmbedUrl(`https://acme.quackback.io/changelog/${CHANGELOG_ID}`)).toEqual({
      kind: 'changelog',
      id: CHANGELOG_ID,
    })
  })
  it('rejects a non-typeid id', () => {
    expect(parseEmbedUrl('https://acme.quackback.io/b/x/posts/not-an-id')).toBeNull()
  })
  it('rejects a typeid of the wrong kind', () => {
    // A post id sitting on the changelog path must not parse as a changelog.
    expect(parseEmbedUrl(`https://acme.quackback.io/changelog/${POST_ID}`)).toBeNull()
  })
  it('ignores unrelated urls', () => {
    expect(parseEmbedUrl('https://youtube.com/watch?v=abc')).toBeNull()
    expect(parseEmbedUrl('https://acme.quackback.io/?board=features')).toBeNull()
    expect(parseEmbedUrl('not a url')).toBeNull()
  })
})
