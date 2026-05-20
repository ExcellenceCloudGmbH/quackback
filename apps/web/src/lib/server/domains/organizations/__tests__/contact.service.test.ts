/**
 * Focused unit tests for contact.service exercising validation, email
 * normalisation, dedupe, and link idempotency.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const contactFindFirstMock = vi.fn()
const linkFindFirstMock = vi.fn()
const insertReturningMock = vi.fn()

vi.mock('@/lib/server/db', () => {
  const insertChain = {
    values: vi.fn().mockReturnThis(),
    returning: insertReturningMock,
  }
  return {
    db: {
      query: {
        contacts: { findFirst: contactFindFirstMock },
        contactUserLinks: { findFirst: linkFindFirstMock, findMany: vi.fn() },
      },
      insert: vi.fn(() => insertChain),
      update: vi.fn(() => ({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn(),
      })),
      delete: vi.fn(() => ({ where: vi.fn() })),
      select: vi.fn(),
    },
    eq: vi.fn(),
    and: vi.fn(),
    or: vi.fn(),
    ilike: vi.fn(),
    isNull: vi.fn(),
    asc: vi.fn(),
    desc: vi.fn(),
    contacts: {
      id: 'contacts.id',
      email: 'contacts.email',
      externalId: 'contacts.external_id',
      organizationId: 'contacts.organization_id',
      archivedAt: 'contacts.archived_at',
      name: 'contacts.name',
    },
    contactUserLinks: {
      id: 'contact_user_links.id',
      contactId: 'contact_user_links.contact_id',
      userId: 'contact_user_links.user_id',
    },
  }
})

vi.mock('@/lib/shared/errors', () => ({
  ConflictError: class extends Error {
    code: string
    constructor(c: string, m: string) {
      super(m)
      this.code = c
    }
  },
  NotFoundError: class extends Error {
    code: string
    constructor(c: string, m: string) {
      super(m)
      this.code = c
    }
  },
  ValidationError: class extends Error {
    code: string
    constructor(c: string, m: string) {
      super(m)
      this.code = c
    }
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  contactFindFirstMock.mockReset()
  linkFindFirstMock.mockReset()
  insertReturningMock.mockReset()
})

describe('createContact', () => {
  it('rejects when neither name nor email is provided', async () => {
    const { createContact } = await import('../contact.service')
    await expect(createContact({})).rejects.toThrow(/name or email/i)
  })

  it('rejects when email is malformed', async () => {
    const { createContact } = await import('../contact.service')
    await expect(createContact({ name: 'Bob', email: 'not-an-email' })).rejects.toThrow(/invalid/i)
  })

  it('throws ConflictError when email already exists', async () => {
    contactFindFirstMock.mockResolvedValueOnce({ id: 'contact_x', email: 'a@b.com' })
    const { createContact } = await import('../contact.service')
    await expect(createContact({ email: 'A@B.com' })).rejects.toThrow(/already exists/i)
  })

  it('inserts with normalised email on success', async () => {
    contactFindFirstMock.mockResolvedValue(undefined)
    insertReturningMock.mockResolvedValueOnce([{ id: 'contact_new', email: 'a@b.com' }])
    const { createContact } = await import('../contact.service')
    const result = await createContact({ email: 'A@B.COM' })
    expect(result.id).toBe('contact_new')
  })
})

describe('findOrCreateByEmail', () => {
  it('returns existing contact when email matches', async () => {
    contactFindFirstMock.mockResolvedValueOnce({ id: 'contact_existing', email: 'a@b.com' })
    const { findOrCreateByEmail } = await import('../contact.service')
    const result = await findOrCreateByEmail({ email: 'A@B.com' })
    expect(result.id).toBe('contact_existing')
  })

  it('creates a new contact when no match', async () => {
    contactFindFirstMock.mockResolvedValueOnce(undefined)
    insertReturningMock.mockResolvedValueOnce([{ id: 'contact_new', email: 'a@b.com' }])
    const { findOrCreateByEmail } = await import('../contact.service')
    const result = await findOrCreateByEmail({ email: 'a@b.com' })
    expect(result.id).toBe('contact_new')
  })

  it('rejects invalid email', async () => {
    const { findOrCreateByEmail } = await import('../contact.service')
    await expect(findOrCreateByEmail({ email: 'garbage' })).rejects.toThrow(/invalid/i)
  })
})

describe('linkContactToUser', () => {
  it('returns existing link when one is present (idempotent)', async () => {
    linkFindFirstMock.mockResolvedValueOnce({
      id: 'cu_link_existing',
      contactId: 'contact_x',
      userId: 'user_x',
    })
    const { linkContactToUser } = await import('../contact.service')
    const result = await linkContactToUser({
      contactId: 'contact_x' as never,
      userId: 'user_x' as never,
    })
    expect(result.id).toBe('cu_link_existing')
  })

  it('creates a new link when none exists', async () => {
    linkFindFirstMock.mockResolvedValueOnce(undefined)
    insertReturningMock.mockResolvedValueOnce([
      { id: 'cu_link_new', contactId: 'contact_x', userId: 'user_x' },
    ])
    const { linkContactToUser } = await import('../contact.service')
    const result = await linkContactToUser({
      contactId: 'contact_x' as never,
      userId: 'user_x' as never,
    })
    expect(result.id).toBe('cu_link_new')
  })
})
