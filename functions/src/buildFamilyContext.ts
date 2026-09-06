import type { FamilyMember, LifeEvent } from './types'

// Human-readable (not JSON) description of a single life event, e.g.
// "birth (1950) - place: Yerevan" or "marriage - spouse: Anna".
function describeEvent(event: LifeEvent): string {
  const parts: string[] = [event.type]
  if (event.date) parts.push(`(${event.date})`)

  switch (event.type) {
    case 'birth':
      if (event.place) parts.push(`- place: ${event.place}`)
      break
    case 'relocation':
      if (event.fromPlace || event.toPlace) {
        parts.push(`- from: ${event.fromPlace ?? 'unknown'} to: ${event.toPlace ?? 'unknown'}`)
      }
      break
    case 'marriage':
      if (event.spouseName) parts.push(`- spouse: ${event.spouseName}`)
      if (event.details) parts.push(`- details: ${event.details}`)
      break
    case 'death':
      if (event.place) parts.push(`- burial place: ${event.place}`)
      break
  }

  return parts.join(' ')
}

/**
 * Builds a compact, deterministic, human-readable text block describing the
 * whole family tree. This is meant to be embedded directly into an LLM system
 * prompt (not consumed as JSON), so it favors plain sentences over structured
 * markup.
 */
export function buildFamilyContext(members: FamilyMember[]): string {
  const byId = new Map(members.map(m => [m.id, m]))

  const childrenOf = (id: string): FamilyMember[] =>
    members
      .filter(m => m.parentId === id)
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id))

  const sorted = members.slice().sort((a, b) => a.id.localeCompare(b.id))

  const blocks = sorted.map(member => {
    const lines: string[] = []
    lines.push(`Member: ${member.name} (id: ${member.id})`)

    const parent = member.parentId ? byId.get(member.parentId) : undefined
    lines.push(`Parent: ${parent ? `${parent.name} (id: ${parent.id})` : 'none'}`)

    const children = childrenOf(member.id)
    lines.push(
      children.length
        ? `Children: ${children.map(c => `${c.name} (id: ${c.id})`).join(', ')}`
        : 'Children: none'
    )

    if (member.location) lines.push(`Location: ${member.location}`)
    if (member.birthYear !== undefined) lines.push(`Birth year: ${member.birthYear}`)
    if (member.bio) lines.push(`Bio: ${member.bio}`)

    if (member.events && member.events.length > 0) {
      const events = member.events.slice().sort((a, b) => (a.id ?? '').localeCompare(b.id ?? ''))
      lines.push(`Life events: ${events.map(describeEvent).join('; ')}`)
    }

    lines.push(`Public figure: ${member.isPublicFigure ? 'yes' : 'no'}`)

    return lines.join('\n')
  })

  return blocks.join('\n\n')
}
