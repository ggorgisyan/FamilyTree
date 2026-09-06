# family-tree-functions

Firebase Cloud Functions (2nd gen) backend powering the family-tree chatbot. The
`askFamilyChatbot` callable function reads all `members` from Firestore, builds
a compact text description of the family tree, and calls the Claude API
(Anthropic) with that context as a cached system prompt plus the `web_search`
server tool.

## Setup

```bash
npm --prefix functions install
```

### Secret: `ANTHROPIC_API_KEY`

The Anthropic API key is a server-side secret, managed via Firebase Secret
Manager - it is never exposed to the client and must NOT be set as a
`VITE_*` env var. Set it once per Firebase project:

```bash
firebase functions:secrets:set ANTHROPIC_API_KEY
```

The `askFamilyChatbot` function declares this secret in its definition
(`secrets: ['ANTHROPIC_API_KEY']`), so Firebase injects it into
`process.env.ANTHROPIC_API_KEY` at invocation time.

## Testing

```bash
npm --prefix functions test        # mocked unit tests (no network, no API key needed)
npm --prefix functions run test:smoke  # real Anthropic API calls - auto-skips without ANTHROPIC_API_KEY
```

- `npm test` runs the full mocked suite (`buildFamilyContext.test.ts`,
  `askFamilyChatbot.test.ts`). It mocks `@anthropic-ai/sdk` and the Admin SDK
  Firestore calls, so it never hits the network and never requires
  `ANTHROPIC_API_KEY`.
- `npm run test:smoke` runs `askFamilyChatbot.smoke.test.ts`, which makes real
  calls to the Anthropic API. Each `describe` block is wrapped in
  `describe.skipIf(!process.env.ANTHROPIC_API_KEY)`, so these tests are
  silently skipped (not failed) whenever the key isn't set in the
  environment - safe to leave in default CI runs.

To run smoke tests locally, export the key first:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm --prefix functions run test:smoke
```

## Deploying

```bash
npm --prefix functions run build
firebase deploy --only functions
```

(This requires being logged into the actual Firebase project via
`firebase login` / `firebase use` - not part of local development.)
