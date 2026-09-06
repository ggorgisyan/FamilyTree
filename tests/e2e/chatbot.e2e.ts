import { test, expect } from '@playwright/test'
import { signInAs } from './helpers'
import { E2E_VIEWER } from './fixtures'

test.describe('chatbot', () => {
  test('asking a question renders the reply and a clickable member chip that navigates', async ({ page }) => {
    // The real chatbot function calls the Anthropic API — undesirable in E2E
    // (cost + flakiness). Intercept the callable function's HTTP call
    // instead: connectFunctionsEmulator makes the client POST to
    // http://127.0.0.1:5001/<project>/<region>/askFamilyChatbot, and a 2nd
    // gen `onCall` callable's HTTP response envelope wraps the return value
    // as `{ result: ... }` (mirroring firebase-functions' own wire format).
    await page.route('**/askFamilyChatbot', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            reply: 'Ana Emulator founded this family and is a public figure.',
            mentionedMemberIds: ['e2e-1'],
          },
        }),
      })
    })

    await page.goto('/')
    await signInAs(page, E2E_VIEWER)

    await page.click('.chat-fab')
    await page.fill('.chat-foot input', 'Who founded the family?')
    await page.click('.chat-foot button')

    await expect(page.locator('.chat-msg.assistant')).toContainText('Ana Emulator founded this family')
    const chip = page.locator('.chat-chip', { hasText: 'Ana Emulator' })
    await expect(chip).toBeVisible()

    await chip.click()

    const panel = page.locator('aside.panel:not(.chat-panel)')
    await expect(panel.locator('h2')).toHaveText('Ana Emulator')
  })
})
