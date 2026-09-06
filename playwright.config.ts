import { defineConfig, devices } from '@playwright/test'

const PORT = 5173
const baseURL = `http://127.0.0.1:${PORT}`

/**
 * E2E config: drives the real app (Vite dev server) against the Firebase
 * Emulator Suite (Auth + Firestore + Functions), signed in via Admin SDK
 * custom tokens instead of the real Google popup flow.
 *
 * Requires the emulators to be running and seeded before the suite starts —
 * see tests/e2e/README.md and tests/e2e/global-setup.ts.
 */
export default defineConfig({
  testDir: './tests/e2e',
  // Specs are named `*.e2e.ts` (not the default `*.spec.ts`/`*.test.ts`) so
  // that the root Vitest suite — which globs for `*.spec.*`/`*.test.*` and
  // otherwise has no reason to know about tests/e2e — never tries to collect
  // these Playwright-only files.
  testMatch: '**/*.e2e.ts',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --port ' + PORT,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      VITE_USE_FIREBASE_EMULATORS: 'true',
    },
  },
})
