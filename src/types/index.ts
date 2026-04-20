export type Role = 'viewer' | 'editor' | 'admin'

export interface FamilyMember {
  id: string
  name: string
  parentId: string | null
  location?: string
  birthYear?: number
  bio?: string
  photoURL?: string
}

export interface AppUser {
  uid: string
  email: string
  displayName: string
  photoURL: string
  role: Role
  firstVisit: string // ISO timestamp
  lastVisit: string  // ISO timestamp
}

// Shape used by react-d3-tree
export interface TreeNodeDatum {
  name: string
  attributes?: Record<string, string>
  children?: TreeNodeDatum[]
  __memberId: string
}
