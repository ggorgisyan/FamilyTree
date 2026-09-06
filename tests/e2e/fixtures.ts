/**
 * Shared fixture data for the Playwright E2E suite. Kept intentionally tiny
 * (5 members, 2 users) — enough to exercise parent/child navigation, search,
 * editing, and the "public figure" chatbot rule without dragging in the full
 * ~150-person tree from src/data/familyTree.json.
 */

export const EMULATOR_PROJECT_ID =
  process.env.VITE_FIREBASE_PROJECT_ID || 'familytree-4f1af'

export interface E2EMember {
  id: string
  name: string
  parentId: string | null
  birthYear?: number
  location?: string
  bio?: string
  isPublicFigure?: boolean
}

// Ana
// └─ Boris
//    ├─ Dara
//    └─ Eli
// └─ Carla
export const E2E_MEMBERS: E2EMember[] = [
  {
    id: 'e2e-1',
    name: 'Ana Emulator',
    parentId: null,
    birthYear: 1930,
    location: 'Yerevan, Armenia',
    bio: 'Seed fixture: family founder used by the E2E suite.',
    isPublicFigure: true,
  },
  {
    id: 'e2e-1.1',
    name: 'Boris Emulator',
    parentId: 'e2e-1',
    birthYear: 1955,
    location: 'Los Angeles, USA',
  },
  {
    id: 'e2e-1.2',
    name: 'Carla Emulator',
    parentId: 'e2e-1',
    birthYear: 1958,
    location: 'Paris, France',
  },
  {
    id: 'e2e-1.1.1',
    name: 'Dara Emulator',
    parentId: 'e2e-1.1',
    birthYear: 1980,
  },
  {
    id: 'e2e-1.1.2',
    name: 'Eli Emulator',
    parentId: 'e2e-1.1',
    birthYear: 1983,
  },
]

export interface E2EUser {
  uid: string
  email: string
  displayName: string
  role: 'viewer' | 'editor' | 'admin'
  password: string
}

export const E2E_VIEWER: E2EUser = {
  uid: 'e2e-viewer-uid',
  email: 'e2e-viewer@example.com',
  displayName: 'Viewer Emulator',
  role: 'viewer',
  password: 'not-used-custom-token-auth',
}

export const E2E_EDITOR: E2EUser = {
  uid: 'e2e-editor-uid',
  email: 'e2e-editor@example.com',
  displayName: 'Editor Emulator',
  role: 'editor',
  password: 'not-used-custom-token-auth',
}

export const E2E_USERS: E2EUser[] = [E2E_VIEWER, E2E_EDITOR]
