import type { FamilyMember, TreeNodeDatum } from '../types'

export function buildTree(members: FamilyMember[]): TreeNodeDatum | null {
  const map = new Map<string, TreeNodeDatum>()

  for (const m of members) {
    map.set(m.id, {
      name: m.name,
      __memberId: m.id,
      children: [],
    })
  }

  let root: TreeNodeDatum | null = null

  for (const m of members) {
    const node = map.get(m.id)!
    if (m.parentId === null) {
      root = node
    } else {
      const parent = map.get(m.parentId)
      if (parent) {
        parent.children = parent.children ?? []
        parent.children.push(node)
      }
    }
  }

  return root
}
