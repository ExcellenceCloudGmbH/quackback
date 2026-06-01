import { describe, it, expect } from 'vitest'
import { setConversationPriority, addConversationTag, removeConversationTag } from '../chat.service'
import type { Actor } from '@/lib/server/policy/types'
import type { ConversationId, TagId } from '@quackback/ids'

// A non-team (anonymous) actor — the agent guard runs before any DB access, so
// these reject without a database.
const visitor: Actor = {
  principalId: 'principal_visitor' as unknown as Actor['principalId'],
  role: 'user',
  principalType: 'anonymous',
  segmentIds: new Set(),
}

const convId = 'conversation_x' as unknown as ConversationId
const tagId = 'tag_x' as unknown as TagId

describe('conversation tag/priority mutations require an agent', () => {
  it('setConversationPriority rejects a non-agent', async () => {
    await expect(setConversationPriority(convId, 'high', visitor)).rejects.toThrow()
  })
  it('addConversationTag rejects a non-agent', async () => {
    await expect(addConversationTag(convId, tagId, visitor)).rejects.toThrow()
  })
  it('removeConversationTag rejects a non-agent', async () => {
    await expect(removeConversationTag(convId, tagId, visitor)).rejects.toThrow()
  })
})
