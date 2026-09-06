import { describe, it, expect } from 'vitest'
import { buildFamilyContext } from './buildFamilyContext'
import type { FamilyMember } from './types'

const fixtureMembers: FamilyMember[] = [
  {
    id: 'm1',
    name: 'Grandma Anna',
    parentId: null,
    location: 'Yerevan',
    birthYear: 1930,
    bio: 'Matriarch of the family',
    isPublicFigure: false,
  },
  {
    id: 'm2',
    name: 'Uncle Bob',
    parentId: 'm1',
    location: 'Boston',
    isPublicFigure: true,
  },
  {
    id: 'm3',
    name: 'Cousin Cathy',
    parentId: 'm1',
    events: [
      { id: 'e1', type: 'birth', date: '1985-04-02', place: 'Moscow' },
      { id: 'e2', type: 'relocation', date: '2005-01-01', fromPlace: 'Moscow', toPlace: 'Berlin' },
    ],
  },
  {
    id: 'm4',
    name: 'Baby Dan',
    parentId: 'm3',
  },
]

describe('buildFamilyContext', () => {
  const context = buildFamilyContext(fixtureMembers)

  it('includes name and id for every member', () => {
    for (const m of fixtureMembers) {
      expect(context).toContain(`Member: ${m.name} (id: ${m.id})`)
    }
  })

  it('resolves parent relation by walking parentId', () => {
    expect(context).toMatch(/Member: Uncle Bob \(id: m2\)[\s\S]*?Parent: Grandma Anna \(id: m1\)/)
    expect(context).toMatch(/Member: Baby Dan \(id: m4\)[\s\S]*?Parent: Cousin Cathy \(id: m3\)/)
  })

  it('has no parent for the root member', () => {
    expect(context).toMatch(/Member: Grandma Anna \(id: m1\)[\s\S]*?Parent: none/)
  })

  it('derives children by scanning for matching parentId', () => {
    expect(context).toMatch(/Member: Grandma Anna \(id: m1\)[\s\S]*?Children: Uncle Bob \(id: m2\), Cousin Cathy \(id: m3\)/)
    expect(context).toMatch(/Member: Baby Dan \(id: m4\)[\s\S]*?Children: none/)
  })

  it('includes location, birthYear, and bio when present', () => {
    expect(context).toContain('Location: Yerevan')
    expect(context).toContain('Birth year: 1930')
    expect(context).toContain('Bio: Matriarch of the family')
  })

  it('marks the public figure flag explicitly, both yes and no', () => {
    expect(context).toMatch(/Member: Uncle Bob \(id: m2\)[\s\S]*?Public figure: yes/)
    expect(context).toMatch(/Member: Grandma Anna \(id: m1\)[\s\S]*?Public figure: no/)
  })

  it('includes life event type, date, and type-specific fields', () => {
    expect(context).toMatch(/Member: Cousin Cathy \(id: m3\)[\s\S]*?Life events:.*birth \(1985-04-02\) - place: Moscow/)
    expect(context).toContain('relocation (2005-01-01) - from: Moscow to: Berlin')
  })

  it('is deterministic regardless of input order', () => {
    const shuffled = [...fixtureMembers].reverse()
    expect(buildFamilyContext(shuffled)).toBe(context)
  })
})
