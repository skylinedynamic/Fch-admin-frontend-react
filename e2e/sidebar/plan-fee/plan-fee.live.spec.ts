import { test, expect, openFromSidebar, pageHeading } from '../../support/live/fixtures'

test.describe('Sidebar › Plan & Fee (live)', () => {
  test.beforeEach(async ({ page }) => {
    await openFromSidebar(page, 'Plan & Fee', /\/plan-and-fee$/)
  })

  test('shows the plan tabs and the partner plans', async ({ page }) => {
    await expect(pageHeading(page, 'Plan & Fee')).toBeVisible()
    for (const tab of [/Partner Enrollment/, /Borrower Enrollment/, /Borrower Fee/, /User Seat/]) {
      await expect(page.locator('.page-content').getByText(tab).first()).toBeVisible()
    }
    await expect(page.getByText('Certified Partner - One Time Payment').first()).toBeVisible()
    await expect(page.getByText('White Label Partner (WL) - Installment').first()).toBeVisible()
  })

  test('each tab opens its own plans', async ({ page }) => {
    await page.locator('.page-content').getByText(/Borrower Enrollment/).first().click()
    await expect(page.getByRole('button', { name: 'Save' }).first()).toBeVisible()
  })
})
