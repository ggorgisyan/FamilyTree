/**
 * Seeds the Firebase Emulator Suite (Auth + Firestore) with a small, fixed
 * set of test users and family members for the Playwright E2E suite.
 *
 * This mirrors src/scripts/seedFirestore.ts but talks to the LOCAL EMULATORS
 * instead of production, and additionally creates Auth users so tests can
 * sign in with `signInWithCustomToken` (real Google popup sign-in cannot be
 * automated).
 *
 * IMPORTANT: the emulator env vars must be set *before* firebase-admin is
 * imported/initialized, since the Admin SDK reads them at initialization
 * time to decide whether to talk to the emulator or to production.
 *
 * Usage (emulators already running, e.g. via `npm run emulators`):
 *   npx tsx tests/e2e/seed.ts
 *
 * Playwright's global-setup (tests/e2e/global-setup.ts) runs this
 * automatically before the test suite.
 */
process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099'

import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { E2E_MEMBERS, E2E_USERS, EMULATOR_PROJECT_ID, type E2EUser } from './fixtures'

if (!getApps().length) {
  // No credentials needed against the emulator — a bare projectId is enough,
  // and it must match the project id the app's Firebase client SDK targets
  // (see src/firebase.ts) so both sides read/write the same emulator data.
  initializeApp({ projectId: EMULATOR_PROJECT_ID })
}

const auth = getAuth()
const db = getFirestore()

async function upsertAuthUser(user: E2EUser): Promise<void> {
  try {
    await auth.getUser(user.uid)
  } catch {
    await auth.createUser({
      uid: user.uid,
      email: user.email,
      emailVerified: true,
      displayName: user.displayName,
    })
  }
}

async function seedUsers(): Promise<void> {
  for (const user of E2E_USERS) {
    await upsertAuthUser(user)
    await db.collection('users').doc(user.uid).set(
      {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: '',
        role: user.role,
        firstVisit: FieldValue.serverTimestamp(),
        lastVisit: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
  }
}

async function seedMembers(): Promise<void> {
  for (const member of E2E_MEMBERS) {
    await db.collection('members').doc(member.id).set(member, { merge: true })
  }
}

/**
 * Mints a custom token for a seeded user's uid. Callers (Playwright tests /
 * helpers.ts) sign the browser's Firebase Auth instance in with this via
 * `signInWithCustomToken`.
 */
export async function mintCustomToken(uid: string): Promise<string> {
  return auth.createCustomToken(uid)
}

export async function seedEmulators(): Promise<void> {
  await seedUsers()
  await seedMembers()
}

// Allow running directly: `npx tsx tests/e2e/seed.ts`
const isMain = process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href
if (isMain) {
  seedEmulators()
    .then(() => {
      console.log(`Seeded ${E2E_USERS.length} auth user(s) and ${E2E_MEMBERS.length} member(s) into the emulators.`)
      process.exit(0)
    })
    .catch(error => {
      console.error('Emulator seed failed:', error)
      process.exit(1)
    })
}
