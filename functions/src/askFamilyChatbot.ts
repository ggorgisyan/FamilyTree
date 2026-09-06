import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import Anthropic from '@anthropic-ai/sdk'
import type { FamilyMember } from './types'
import { buildFamilyContext } from './buildFamilyContext'
import { CLAUDE_MODEL, DAILY_MESSAGE_LIMIT, MAX_HISTORY_TURNS, MAX_TOKENS } from './constants'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AskFamilyChatbotRequestData {
  messages: ChatMessage[]
}

export interface AskFamilyChatbotResponse {
  reply: string
  mentionedMemberIds: string[]
}

export interface ChatUsage {
  date: string // 'YYYY-MM-DD'
  count: number
}

/**
 * Storage/AI dependencies, injected so the handler can be unit tested without
 * a real Firestore instance or a real Anthropic API key.
 */
export interface AskFamilyChatbotDeps {
  getChatUsage(uid: string): Promise<ChatUsage | null>
  setChatUsage(uid: string, usage: ChatUsage): Promise<void>
  getAllMembers(): Promise<FamilyMember[]>
  createMessage(params: {
    model: string
    max_tokens: number
    system: Array<{ type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }>
    tools: Array<{ type: string; name: string }>
    messages: ChatMessage[]
  }): Promise<{ content: Array<{ type: string; text?: string }> }>
  now(): Date
}

const SYSTEM_RULES = `You are a helpful assistant answering questions about a family tree.
Use the family data provided below (name, relations, location, birth year, bio, life events, and public-figure status for each member) to answer questions about the family.

Only use web_search for (a) general historical/cultural/genealogical context, or (b) members whose 'Public figure' is marked yes. Never search the web for, or otherwise try to look up, a specific member who is not marked as a public figure - treat their name and details as private.`

function todayUTC(now: Date): string {
  return now.toISOString().slice(0, 10) // 'YYYY-MM-DD'
}

function buildSystemPrompt(members: FamilyMember[]): Array<{ type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }> {
  const familyContext = buildFamilyContext(members)
  return [
    {
      type: 'text',
      text: `${SYSTEM_RULES}\n\nFamily data:\n${familyContext}`,
      cache_control: { type: 'ephemeral' },
    },
  ]
}

// Heuristic only: a member is considered "mentioned" if their exact name
// appears as a substring of the reply text. This can over- or under-match
// (e.g. shared first names, nicknames) but is good enough for surfacing
// relevant profile links in the UI.
function findMentionedMemberIds(reply: string, members: FamilyMember[]): string[] {
  return members.filter(m => m.name && reply.includes(m.name)).map(m => m.id)
}

async function getOrInitUsage(
  deps: AskFamilyChatbotDeps,
  uid: string,
): Promise<ChatUsage> {
  const today = todayUTC(deps.now())
  const existing = await deps.getChatUsage(uid)

  if (!existing || existing.date !== today) {
    return { date: today, count: 0 }
  }
  return existing
}

/**
 * Core handler logic, separated from the `onCall` wrapper so it can be
 * invoked directly in tests without deploying or using firebase-functions-test.
 */
export async function handleAskFamilyChatbot(
  data: AskFamilyChatbotRequestData,
  uid: string | undefined,
  deps: AskFamilyChatbotDeps,
): Promise<AskFamilyChatbotResponse> {
  if (!uid) {
    throw new HttpsError('unauthenticated', 'You must be signed in to use the chatbot.')
  }

  if (!Array.isArray(data?.messages) || data.messages.length === 0) {
    throw new HttpsError('invalid-argument', 'messages must be a non-empty array.')
  }

  const usage = await getOrInitUsage(deps, uid)
  if (usage.count >= DAILY_MESSAGE_LIMIT) {
    throw new HttpsError('resource-exhausted', 'Daily chatbot message limit reached. Please try again tomorrow.')
  }

  const nextUsage: ChatUsage = { date: usage.date, count: usage.count + 1 }
  await deps.setChatUsage(uid, nextUsage)

  const members = await deps.getAllMembers()
  const system = buildSystemPrompt(members)

  const trimmedMessages = data.messages.slice(-MAX_HISTORY_TURNS)

  const response = await deps.createMessage({
    model: CLAUDE_MODEL,
    max_tokens: MAX_TOKENS,
    system,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    messages: trimmedMessages,
  })

  const reply = response.content
    .filter((block): block is { type: 'text'; text: string } => block.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('\n')
    .trim()

  const mentionedMemberIds = findMentionedMemberIds(reply, members)

  return { reply, mentionedMemberIds }
}

export function createProdDeps(anthropicClient: Anthropic): AskFamilyChatbotDeps {
  const db = getFirestore()

  return {
    async getChatUsage(uid: string) {
      const snap = await db.collection('chatUsage').doc(uid).get()
      if (!snap.exists) return null
      return snap.data() as ChatUsage
    },
    async setChatUsage(uid: string, usage: ChatUsage) {
      await db.collection('chatUsage').doc(uid).set(usage, { merge: true })
    },
    async getAllMembers() {
      const snapshot = await db.collection('members').get()
      return snapshot.docs.map(d => d.data() as FamilyMember)
    },
    async createMessage(params) {
      return anthropicClient.messages.create(params as Anthropic.MessageCreateParamsNonStreaming) as unknown as Promise<{
        content: Array<{ type: string; text?: string }>
      }>
    },
    now: () => new Date(),
  }
}

export const askFamilyChatbot = onCall(
  { secrets: ['ANTHROPIC_API_KEY'] },
  async (request: CallableRequest<AskFamilyChatbotRequestData>) => {
    const anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const deps = createProdDeps(anthropicClient)
    return handleAskFamilyChatbot(request.data, request.auth?.uid, deps)
  },
)
