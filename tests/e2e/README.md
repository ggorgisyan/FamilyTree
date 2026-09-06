# E2E tests (Playwright + Firebase Emulator Suite)

These tests drive the **real app** (via `npm run dev`) against the **local
Firebase Emulator Suite** (Auth + Firestore + Functions) — no mocked Firebase
SDK. Real Google popup sign-in can't be automated, so tests sign in with
Firebase Admin SDK **custom tokens** for two seeded users instead (see
`fixtures.ts`, `seed.ts`, `helpers.ts`).

## One-time setup

```bash
npm install -g firebase-tools   # if you don't already have the CLI
npx playwright install chromium
```

## Running the suite

The emulators must be running and reachable at `127.0.0.1:9099` (Auth) and
`127.0.0.1:8080` (Firestore) before `npm run test:e2e` starts — Playwright's
`globalSetup` (`global-setup.ts`) checks for them and fails fast with
instructions if they're not up. It does not spawn the emulators itself
(programmatically starting all three and reliably waiting for readiness was
the flaky part in a sandboxed environment) — pick one of:

**Option A — one command (recommended):**

```bash
firebase emulators:exec --only auth,firestore,functions "npm run test:e2e"
```

**Option B — two terminals:**

```bash
# terminal 1
npm run emulators

# terminal 2
npm run test:e2e
```

Either way, `globalSetup` seeds the emulators (2 users + 5 family members —
see `fixtures.ts`) before the specs run, and Playwright's own `webServer`
config starts `npm run dev` with `VITE_USE_FIREBASE_EMULATORS=true` for you
(reusing an already-running dev server on `localhost:5173` if present, so a
manually started `npm run dev` also works).

## How sign-in works

`src/firebase.ts` connects the client SDK to the emulators and, only when
`VITE_USE_FIREBASE_EMULATORS=true`, attaches `window.__testAuth = { auth,
signInWithCustomToken }`. `helpers.ts`'s `signInAs()` mints a custom token
Node-side via the Admin SDK (`seed.ts`'s `mintCustomToken`) and calls
`signInWithCustomToken` through that hook from `page.evaluate`, so the app's
real `AuthContext` / `onAuthStateChanged` code path runs exactly as it would
for a real user.

## How the chatbot test avoids calling Anthropic

`chatbot.e2e.ts` uses `page.route('**/askFamilyChatbot', ...)` to intercept
the callable function's HTTP request client-side and return a canned
response shaped like a real 2nd-gen `onCall` result envelope
(`{ result: { reply, mentionedMemberIds } }`). The `askFamilyChatbot` Cloud
Function itself is never invoked, so no Anthropic API key or network access
is needed for that test — the Functions emulator only needs to be running so
`firebase.json`'s emulator config resolves cleanly; it is not on the request
path for this test.

## What's verified vs. unverified

This suite was written and type-checked against the app's actual DOM/props
(see file-level comments), but running the emulators and a full green
`npm run test:e2e` was **not** verified in the sandbox this was authored in
— `firebase-tools` isn't installed there and outbound install isn't
available. Please run Option A above locally/in CI before relying on it, and
report back if any selector needs adjusting.
