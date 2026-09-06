// Real-API smoke tests. These make live calls to the Anthropic API and are
// non-deterministic, so assertions are intentionally loose (presence of
// content/tool_use blocks, not exact wording). Skipped entirely when
// ANTHROPIC_API_KEY is not set, so `npm test` / CI never depend on a key.
import { describe, it, expect } from 'vitest'
import Anthropic from '@anthropic-ai/sdk'
import { createProdDeps } from './askFamilyChatbot'
import { buildFamilyContext } from './buildFamilyContext'
import { CLAUDE_MODEL, MAX_TOKENS } from './constants'
import type { FamilyMember } from './types'

const fixtureMembers: FamilyMember[] = [
  {
    id: 'm1',
    name: 'Grandma Anna Petrosyan',
    parentId: null,
    location: 'Yerevan, Armenia',
    birthYear: 1930,
    bio: 'Matriarch of the family, a schoolteacher.',
    isPublicFigure: false,
  },
  {
    id: 'm2',
    name: 'Marie Curie',
    parentId: 'm1',
    location: 'Warsaw, Poland',
    birthYear: 1867,
    bio: 'Physicist and chemist, pioneer of radioactivity research.',
    isPublicFigure: true,
  },
  {
    id: 'm3',
    name: 'Private Cousin Karen',
    parentId: 'm1',
    location: 'Los Angeles, USA',
    isPublicFigure: false,
  },
]

const SYSTEM_RULES = `You are a helpful assistant answering questions about a family tree.
Use the family data provided below (name, relations, location, birth year, bio, life events, and public-figure status for each member) to answer questions about the family.

Only use web_search for (a) general historical/cultural/genealogical context, or (b) members whose 'Public figure' is marked yes. Never search the web for, or otherwise try to look up, a specific member who is not marked as a public figure - treat their name and details as private.`

function hasWebSearchToolUse(content: Array<{ type: string; name?: string }>): boolean {
  return content.some(block => block.type === 'server_tool_use' && block.name === 'web_search')
}

describe.skipIf(!process.env.ANTHROPIC_API_KEY)('askFamilyChatbot smoke tests (real Anthropic API)', () => {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  async function ask(question: string) {
    const system = [
      {
        type: 'text' as const,
        text: `${SYSTEM_RULES}\n\nFamily data:\n${buildFamilyContext(fixtureMembers)}`,
        cache_control: { type: 'ephemeral' as const },
      },
    ]

    return client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      system,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: question }],
    })
  }

  it('smoke: answers a relation question from context alone, without web_search', async () => {
    const response = await ask('How is Marie Curie related to Grandma Anna Petrosyan?')

    const textBlocks = response.content.filter(b => b.type === 'text')
    expect(textBlocks.length).toBeGreaterThan(0)
    const reply = textBlocks.map(b => ('text' in b ? b.text : '')).join(' ')
    expect(reply.length).toBeGreaterThan(0)

    expect(hasWebSearchToolUse(response.content as Array<{ type: string; name?: string }>)).toBe(false)
  }, 60000)

  it('smoke: an open-ended question about a public figure triggers web_search', async () => {
    const response = await ask('What is publicly known about Marie Curie?')

    expect(hasWebSearchToolUse(response.content as Array<{ type: string; name?: string }>)).toBe(true)
  }, 60000)

  it('smoke: the same kind of open-ended question about a private member does NOT trigger web_search', async () => {
    const response = await ask('What is publicly known about Private Cousin Karen? Please look into details about her.')

    expect(hasWebSearchToolUse(response.content as Array<{ type: string; name?: string }>)).toBe(false)
  }, 60000)
})
