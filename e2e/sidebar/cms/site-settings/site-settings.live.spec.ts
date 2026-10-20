import { test, expect, openFromSidebar, pageHeading } from '../../../support/live/fixtures'

test.describe('Sidebar › CMS › Site Settings (live)', () => {
  test.beforeEach(async ({ page }) => {
    await openFromSidebar(page, 'Site Settings', /\/cms\/site-settings$/, 'CMS')
  })

  test('shows the settings sections, filled from the API', async ({ page }) => {
    await expect(pageHeading(page, 'Site Settings')).toBeVisible()
    for (const section of ['General Information', 'Social Media Links', 'Site Branding']) {
      await expect(page.locator('.page-content').getByText(section).first()).toBeVisible()
    }
    await expect(page.getByPlaceholder('Your Brand Name')).not.toHaveValue('')
    await expect(page.getByRole('button', { name: 'Save Settings' })).toBeVisible()
  })
})
