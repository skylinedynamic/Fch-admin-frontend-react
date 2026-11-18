import { test, expect, openFromSidebar } from '../../support/live/fixtures'
import { INSIGHTS_AUTH_STATE_PATH, INSIGHTS_EMAIL, INSIGHTS_PASSWORD } from '../../support/live/env'

// Real API and database: saves the settings back exactly as it found them, so
// it is safe to repeat. Sends nothing - email only goes out from the Sunday command.
test.describe('Sidebar › Business Insights › Report settings (live)', () => {
  // A Developer login: it holds "manage business insights report".
  test.use({ storageState: INSIGHTS_AUTH_STATE_PATH })
  test.skip(!INSIGHTS_EMAIL || !INSIGHTS_PASSWORD, 'Set E2E_INSIGHTS_EMAIL and E2E_INSIGHTS_PASSWORD in .env.e2e')

  test('saved settings come back from the API', async ({ page }) => {
    await openFromSidebar(page, 'Business Insights', /\/business-insights$/)
    await page.getByRole('button', { name: 'Report settings' }).click()

    const dialog = page.getByRole('dialog', { name: 'Report settings' })
    const checkbox = dialog.getByRole('checkbox', { name: /Send the weekly report/ })
    await expect(checkbox).toBeVisible()

    const save = page.waitForResponse((res) => res.url().includes('/owner-summary/report-settings') && res.request().method() === 'PUT')
    await dialog.getByRole('button', { name: 'Save settings' }).click()

    expect((await save).status()).toBe(200)
    await expect(dialog).toBeHidden()
  })
})
