import { test, expect } from '@playwright/test'
import { signInAs, openMemberBySearch } from './helpers'
import { E2E_VIEWER } from './fixtures'

test.describe('browse and search (viewer)', () => {
  test('search finds a seeded member, panel shows details, no edit controls', async ({ page }) => {
    await page.goto('/')
    await signInAs(page, E2E_VIEWER)

    await openMemberBySearch(page, 'Boris Emulator')

    const panel = page.locator('aside.panel:not(.chat-panel)')
    await expect(panel.locator('h2')).toHaveText('Boris Emulator')
    await expect(panel).toContainText('1955')
    await expect(panel).toContainText('Los Angeles, USA')
    await expect(panel).toContainText('Child of Ana Emulator')
    await expect(panel).toContainText('View only')

    // Viewers must not see any editing affordances.
    await expect(panel.getByRole('button', { name: 'Edit details' })).toHaveCount(0)
    await expect(panel.getByRole('button', { name: /Save changes/ })).toHaveCount(0)

    // Navigating to a child from the panel works.
    await panel.getByRole('button', { name: /Dara Emulator/ }).click()
    await expect(panel.locator('h2')).toHaveText('Dara Emulator')
  })

  test('search has no results for a non-existent name', async ({ page }) => {
    await page.goto('/')
    await signInAs(page, E2E_VIEWER)

    await page.fill('.search input', 'Nobody Here Zz')
    await expect(page.locator('.results .empty')).toHaveText('No matches')
  })
})
