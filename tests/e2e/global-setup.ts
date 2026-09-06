/**
 * Playwright global setup: seeds the Firebase Emulator Suite before any spec
 * runs.
 *
 * This does NOT start the emulators themselves — spawning `firebase
 * emulators:start` programmatically and reliably waiting for all three
 * (auth/firestore/functions) to be ready turned out to be the flaky part in
 * this sandbox, so instead this file fails fast with a clear message if the
 * emulators aren't already up, and tests/e2e/README.md documents the two
 * supported ways to start them. See that file before running `npm run
 * test:e2e`.
 */
import { seedEmulators } from './seed'

const AUTH_EMULATOR_URL = 'http://127.0.0.1:9099'
const FIRESTORE_EMULATOR_URL = 'http://127.0.0.1:8080'

async function isUp(url: string): Promise<boolean> {
  try {
    const res = await fetch(url)
    // Emulators respond (even with 4xx on a bare GET) as long as something
    // is listening; a network error means nothing is there.
    return res.status < 500
  } catch {
    return false
  }
}

export default async function globalSetup(): Promise<void> {
  const [authUp, firestoreUp] = await Promise.all([
    isUp(AUTH_EMULATOR_URL),
    isUp(FIRESTORE_EMULATOR_URL),
  ])

  if (!authUp || !firestoreUp) {
    throw new Error(
      'Firebase emulators are not reachable at 127.0.0.1:9099 (Auth) / 127.0.0.1:8080 (Firestore).\n' +
        'Start them first — see tests/e2e/README.md. Quick start:\n' +
        '  firebase emulators:exec --only auth,firestore,functions "npm run test:e2e"\n' +
        'or, in a separate terminal:\n' +
        '  npm run emulators   # then, in another terminal:\n' +
        '  npm run test:e2e',
    )
  }

  await seedEmulators()
}
