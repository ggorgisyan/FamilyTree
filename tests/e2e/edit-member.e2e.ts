import { test, expect } from '@playwright/test'
import { signInAs, openMemberBySearch } from './helpers'
import { E2E_EDITOR } from './fixtures'

test.describe('edit member (editor)', () => {
  test('editor can edit bio and toggle public figure, and it persists after reload', async ({ page }) => {
    const bioText = `Updated by Playwright at ${Date.now()}`

    await page.goto('/')
    await signInAs(page, E2E_EDITOR)

    await openMemberBySearch(page, 'Carla Emulator')
    const panel = page.locator('aside.panel:not(.chat-panel)')
    await expect(panel.locator('h2')).toHaveText('Carla Emulator')

    await panel.getByRole('button', { name: 'Edit details' }).click()

    const bioField = panel.locator('textarea')
    await bioField.fill(bioText)

    const publicFigureCheckbox = panel.locator('input[type="checkbox"]')
    const wasChecked = await publicFigureCheckbox.isChecked()
    if (wasChecked) {
      await publicFigureCheckbox.uncheck()
    } else {
      await publicFigureCheckbox.check()
    }

    await panel.getByRole('button', { name: /Save changes/ }).click()
    await expect(panel.getByRole('button', { name: 'Edit details' })).toBeVisible()
    await expect(panel).toContainText(bioText)

    // Reload the whole app and re-open the member to confirm the write
    // actually landed in Firestore, not just local component state.
    await page.reload()
    await signInAs(page, E2E_EDITOR)
    await openMemberBySearch(page, 'Carla Emulator')

    const reopened = page.locator('aside.panel:not(.chat-panel)')
    await expect(reopened.locator('h2')).toHaveText('Carla Emulator')
    await expect(reopened).toContainText(bioText)
    await expect(reopened).toContainText(wasChecked ? 'No — site data only' : 'Yes — web lookups allowed')
  })
})
