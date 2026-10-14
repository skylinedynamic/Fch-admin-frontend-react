import { test, expect, openFromSidebar, pageHeading } from '../../support/live/fixtures'
import type { Page } from '@playwright/test'

const SECTIONS = [
  'Payment Integration', 'Agreement Builder', 'Email Configuration', 'SMS Configuration', 'Branding',
  'Custom Domain', 'MicroBilt Config', 'Credit Profile', 'Score Calculation', 'OpenAI Configuration', 'Test Mail',
]

// A button of the Settings Menu, by its label (the button also holds an icon).
const section = (page: Page, name: string) =>
  page.locator('.page-content .list-group button').filter({ has: page.locator('span', { hasText: new RegExp(`^${name}$`) }) })

test.describe('Sidebar › Settings (live)', () => {
  test.beforeEach(async ({ page }) => {
    await openFromSidebar(page, 'Settings', /\/admin\/settings$/)
  })

  test('the host sees every settings section', async ({ page }) => {
    await expect(pageHeading(page, 'Settings')).toBeVisible()
    for (const name of SECTIONS) await expect(section(page, name)).toBeVisible()
  })

  for (const name of SECTIONS) {
    test(`${name} opens without a server error`, async ({ page }) => {
      await section(page, name).click()
      await expect(section(page, name)).toHaveClass(/active/)
      await page.waitForLoadState('networkidle')
    })
  }
})
