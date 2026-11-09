import { test, expect, openFromSidebar, pageHeading } from '../../support/live/fixtures'

// Read-only: the host opens the summary like a user and every section renders
// from the real API (the fixture fails the test on any 5xx or page error).
test.describe('Sidebar › Owner Summary (live)', () => {
  test.beforeEach(async ({ page }) => {
    await openFromSidebar(page, 'Owner Summary', /\/owner-summary$/)
  })

  test('shows the headline numbers and every section', async ({ page }) => {
    await expect(pageHeading(page, 'Owner Summary')).toBeVisible()

    const kpis = page.getByTestId('owner-kpis')
    for (const title of ['Cash collected', 'Owed to us', 'Funded volume', 'New clients', 'New leads', 'Active partners']) {
      await expect(kpis.getByText(title)).toBeVisible()
    }
    for (const section of ['owner-attention', 'owner-cash', 'owner-commissions', 'owner-owed', 'owner-pipeline', 'owner-sources', 'owner-chart-funded', 'owner-chart-cash', 'owner-network', 'owner-top-partners', 'owner-stalled']) {
      await expect(page.getByTestId(section)).toBeVisible()
    }
  })

  test('another period loads without an error', async ({ page }) => {
    const response = page.waitForResponse((res) => res.url().includes('/common/owner-summary') && res.url().includes('period=this_year'))
    await page.getByRole('group', { name: 'Period' }).getByRole('button', { name: 'This year' }).click()

    expect((await response).status()).toBe(200)
    await expect(page.getByTestId('owner-kpis')).toBeVisible()
  })
})
