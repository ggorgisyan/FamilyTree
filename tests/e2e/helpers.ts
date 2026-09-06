import type { Page } from '@playwright/test'
import { mintCustomToken } from './seed'
import type { E2EUser } from './fixtures'

/**
 * Signs the browser's Firebase Auth instance in as a seeded test user.
 *
 * Real Google popup sign-in can't be automated, so instead:
 *  1. Node-side (this file, running in the Playwright test process) mints a
 *     custom token for the user's uid via the Admin SDK against the Auth
 *     emulator.
 *  2. Browser-side, we call `signInWithCustomToken` against the app's own,
 *     already-initialized `auth` instance — exposed only in emulator mode as
 *     `window.__testAuth` (see the guarded block at the bottom of
 *     src/firebase.ts). This exercises the real `onAuthStateChanged` /
 *     AuthContext code path, not a mock.
 *
 * The page must already have loaded the app (so the module-level
 * `window.__testAuth` assignment in src/firebase.ts has run) before calling
 * this.
 */
export async function signInAs(page: Page, user: E2EUser): Promise<void> {
  const token = await mintCustomToken(user.uid)

  await page.waitForFunction(() => Boolean((window as unknown as { __testAuth?: unknown }).__testAuth))

  await page.evaluate(async customToken => {
    const testAuth = (window as unknown as {
      __testAuth: { auth: import('firebase/auth').Auth; signInWithCustomToken: typeof import('firebase/auth').signInWithCustomToken }
    }).__testAuth
    await testAuth.signInWithCustomToken(testAuth.auth, customToken)
  }, token)

  // Wait for the app shell (topbar search) to replace the login page.
  await page.waitForSelector('.topbar', { timeout: 15_000 })
}

/** Opens a member's panel by typing their name into the topbar search and clicking the first result. */
export async function openMemberBySearch(page: Page, name: string): Promise<void> {
  await page.fill('.search input', name)
  await page.waitForSelector('.results button')
  await page.click('.results button')
}
