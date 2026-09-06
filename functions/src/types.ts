// Mirrors src/types/index.ts from the frontend. Kept as a standalone copy
// because `functions/` is a separate TypeScript project/deploy unit and does
// not share a build graph with the Vite app.

export type LifeEventType = 'birth' | 'relocation' | 'marriage' | 'death'

interface LifeEventBase {
  id: string
  type: LifeEventType
  date?: string // ISO 'YYYY-MM-DD'; often unknown for older generations
}

export interface BirthEvent extends LifeEventBase {
  type: 'birth'
  place?: string
}

export interface RelocationEvent extends LifeEventBase {
  type: 'relocation'
  fromPlace?: string
  toPlace?: string
}

export interface MarriageEvent extends LifeEventBase {
  type: 'marriage'
  spouseName?: string
  details?: string
  spousePhotoURL?: string
}

export interface DeathEvent extends LifeEventBase {
  type: 'death'
  place?: string // burial place
}

export type LifeEvent = BirthEvent | RelocationEvent | MarriageEvent | DeathEvent

export interface FamilyMember {
  id: string
  name: string
  parentId: string | null
  location?: string
  birthYear?: number
  bio?: string
  photoURL?: string
  events?: LifeEvent[]
  isPublicFigure?: boolean
}
