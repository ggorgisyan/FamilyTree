import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HttpsError } from 'firebase-functions/v2/https'
import { CLAUDE_MODEL } from './constants'

// Mock the Anthropic SDK entirely. The mock constructor stores the instance
// so tests can assert on the payload passed to `messages.create`.
const createMock = vi.fn()
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create: createMock },
    })),
  }
})

// Mock the Admin SDK Firestore surface used by createProdDeps.
const firestoreDocGet = vi.fn()
const firestoreDocSet = vi.fn()
const firestoreCollectionGet = vi.fn()
vi.mock('firebase-admin/firestore', () => {
  return {
    getFirestore: vi.fn().mockImplementation(() => ({
      collection: (name: string) => ({
        doc: () => ({
          get: firestoreDocGet,
          set: firestoreDocSet,
        }),
        get: firestoreCollectionGet,
      }),
    })),
  }
})

import Anthropic from '@anthropic-ai/sdk'
import { handleAskFamilyChatbot, createProdDeps, type AskFamilyChatbotDeps, type ChatUsage } from './askFamilyChatbot'
import type { FamilyMember } from './types'

const fixtureMembers: FamilyMember[] = [
  { id: 'm1', name: 'Grandma Anna', parentId: null, isPublicFigure: false },
  { id: 'm2', name: 'Uncle Bob', parentId: 'm1', isPublicFigure: true },
]

function makeDeps(overrides: Partial<AskFamilyChatbotDeps> = {}): {
  deps: AskFamilyChatbotDeps
  usageStore: Map<string, ChatUsage>
} {
  const usageStore = new Map<string, ChatUsage>()

  const deps: AskFamilyChatbotDeps = {
    async getChatUsage(uid) {
      return usageStore.get(uid) ?? null
    },
    async setChatUsage(uid, usage) {
      usageStore.set(uid, usage)
    },
    async getAllMembers() {
      return fixtureMembers
    },
    async createMessage() {
      return { content: [{ type: 'text', text: 'Default mocked reply.' }] }
    },
    now: () => new Date('2026-09-06T12:00:00.000Z'),
    ...overrides,
  }

  return { deps, usageStore }
}

describe('handleAskFamilyChatbot', () => {
  beforeEach(() => {
    createMock.mockReset()
  })

  it('throws unauthenticated with no uid', async () => {
    const { deps } = makeDeps()
    await expect(
      handleAskFamilyChatbot({ messages: [{ role: 'user', content: 'hi' }] }, undefined, deps),
    ).rejects.toMatchObject({ code: 'unauthenticated' } satisfies Partial<HttpsError>)
  })

  it('rejects empty messages array with invalid-argument', async () => {
    const { deps } = makeDeps()
    await expect(
      handleAskFamilyChatbot({ messages: [] }, 'uid1', deps),
    ).rejects.toMatchObject({ code: 'invalid-argument' })
  })

  it('rejects non-array messages with invalid-argument', async () => {
    const { deps } = makeDeps()
    await expect(
      // @ts-expect-error - intentionally invalid input for the test
      handleAskFamilyChatbot({ messages: 'not-an-array' }, 'uid1', deps),
    ).rejects.toMatchObject({ code: 'invalid-argument' })
  })

  it('throws resource-exhausted when at the daily cap', async () => {
    const { deps, usageStore } = makeDeps()
    usageStore.set('uid1', { date: '2026-09-06', count: 50 })

    await expect(
      handleAskFamilyChatbot({ messages: [{ role: 'user', content: 'hi' }] }, 'uid1', deps),
    ).rejects.toMatchObject({ code: 'resource-exhausted' })
  })

  it('proceeds and increments the counter when under the cap', async () => {
    const { deps, usageStore } = makeDeps()
    usageStore.set('uid1', { date: '2026-09-06', count: 10 })

    await handleAskFamilyChatbot({ messages: [{ role: 'user', content: 'hi' }] }, 'uid1', deps)

    expect(usageStore.get('uid1')).toEqual({ date: '2026-09-06', count: 11 })
  })

  it('resets the counter to 1 on a new day', async () => {
    const { deps, usageStore } = makeDeps()
    usageStore.set('uid1', { date: '2026-09-05', count: 49 })

    await handleAskFamilyChatbot({ messages: [{ role: 'user', content: 'hi' }] }, 'uid1', deps)

    expect(usageStore.get('uid1')).toEqual({ date: '2026-09-06', count: 1 })
  })

  it('creates a fresh usage record for a first-time user', async () => {
    const { deps, usageStore } = makeDeps()

    await handleAskFamilyChatbot({ messages: [{ role: 'user', content: 'hi' }] }, 'new-uid', deps)

    expect(usageStore.get('new-uid')).toEqual({ date: '2026-09-06', count: 1 })
  })

  it('sends the expected system prompt and web_search tool config', async () => {
    const createMessage = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'Some reply' }] })
    const { deps } = makeDeps({ createMessage })

    await handleAskFamilyChatbot({ messages: [{ role: 'user', content: 'How is Bob related to Anna?' }] }, 'uid1', deps)

    expect(createMessage).toHaveBeenCalledTimes(1)
    const callArgs = createMessage.mock.calls[0][0]

    expect(callArgs.system).toBeInstanceOf(Array)
    const systemText = callArgs.system[0].text
    expect(systemText).toContain('Only use web_search for')
    expect(systemText).toContain('Never search the web for')
    expect(systemText).toContain('Grandma Anna')
    expect(systemText).toContain('Uncle Bob')
    expect(callArgs.system[0].cache_control).toEqual({ type: 'ephemeral' })

    expect(callArgs.tools).toEqual([{ type: 'web_search_20250305', name: 'web_search' }])
  })

  it('trims history to the last MAX_HISTORY_TURNS messages', async () => {
    const createMessage = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] })
    const { deps } = makeDeps({ createMessage })

    const longHistory = Array.from({ length: 30 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as const,
      content: `message ${i}`,
    }))

    await handleAskFamilyChatbot({ messages: longHistory }, 'uid1', deps)

    const callArgs = createMessage.mock.calls[0][0]
    expect(callArgs.messages.length).toBe(20)
    expect(callArgs.messages[callArgs.messages.length - 1].content).toBe('message 29')
  })

  it('returns { reply, mentionedMemberIds } shaped correctly, picking up a mentioned member name', async () => {
    const createMessage = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Uncle Bob is the son of Grandma Anna.' }],
    })
    const { deps } = makeDeps({ createMessage })

    const result = await handleAskFamilyChatbot(
      { messages: [{ role: 'user', content: 'How is Bob related to Anna?' }] },
      'uid1',
      deps,
    )

    expect(result.reply).toBe('Uncle Bob is the son of Grandma Anna.')
    expect(result.mentionedMemberIds.sort()).toEqual(['m1', 'm2'])
  })

  it('returns an empty mentionedMemberIds list when no member names appear', async () => {
    const createMessage = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'I do not have enough information.' }],
    })
    const { deps } = makeDeps({ createMessage })

    const result = await handleAskFamilyChatbot(
      { messages: [{ role: 'user', content: 'Who is the president?' }] },
      'uid1',
      deps,
    )

    expect(result.mentionedMemberIds).toEqual([])
  })
})

describe('createProdDeps (wired to the mocked @anthropic-ai/sdk and Admin SDK Firestore)', () => {
  beforeEach(() => {
    createMock.mockReset()
    firestoreDocGet.mockReset()
    firestoreDocSet.mockReset()
    firestoreCollectionGet.mockReset()
  })

  it('calls the Anthropic client with the expected model, system prompt, tools, and messages', async () => {
    firestoreDocGet.mockResolvedValue({ exists: false })
    firestoreDocSet.mockResolvedValue(undefined)
    firestoreCollectionGet.mockResolvedValue({
      docs: fixtureMembers.map(m => ({ data: () => m })),
    })
    createMock.mockResolvedValue({ content: [{ type: 'text', text: 'Uncle Bob is related to Grandma Anna.' }] })

    const anthropicClient = new Anthropic({ apiKey: 'test-key' })
    const deps = createProdDeps(anthropicClient)

    const result = await handleAskFamilyChatbot(
      { messages: [{ role: 'user', content: 'How is Bob related to Anna?' }] },
      'uid1',
      deps,
    )

    expect(createMock).toHaveBeenCalledTimes(1)
    const payload = createMock.mock.calls[0][0]
    expect(payload.model).toBe(CLAUDE_MODEL)
    expect(payload.tools).toEqual([{ type: 'web_search_20250305', name: 'web_search' }])
    expect(payload.system[0].text).toContain('Only use web_search for')
    expect(payload.system[0].text).toContain('Grandma Anna')
    expect(payload.messages).toEqual([{ role: 'user', content: 'How is Bob related to Anna?' }])

    expect(result.reply).toBe('Uncle Bob is related to Grandma Anna.')
    expect(firestoreDocSet).toHaveBeenCalledWith(expect.objectContaining({ count: 1 }), { merge: true })
  })
})
