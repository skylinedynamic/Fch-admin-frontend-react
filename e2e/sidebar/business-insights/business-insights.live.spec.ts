import { test, expect, openFromSidebar, pageHeading, sidebarLink } from '../../support/live/fixtures'
import { INSIGHTS_AUTH_STATE_PATH, INSIGHTS_EMAIL, INSIGHTS_PASSWORD } from '../../support/live/env'

// Business Insights is offered to the Developer role alone (the developer-only
// "view business insights" permission). The usual live host is not a Developer,
// so the panel neither offers nor opens it.
test.describe('Sidebar › Business Insights (live, another account)', () => {
  test('is not offered and the route sends it home', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#navbar-nav')).toBeVisible()
    await expect(sidebarLink(page, 'Business Insights')).toHaveCount(0)

    await page.goto('/business-insights')
    await expect.poll(() => new URL(page.url()).pathname).toBe('/')
  })
})

// Read-only: the allowed login opens the summary like a user and every section
// renders from the real API (the fixture fails the test on any 5xx or page error).
test.describe('Sidebar › Business Insights (live)', () => {
  test.use({ storageState: INSIGHTS_AUTH_STATE_PATH })
  test.skip(!INSIGHTS_EMAIL || !INSIGHTS_PASSWORD, 'Set E2E_INSIGHTS_EMAIL and E2E_INSIGHTS_PASSWORD in .env.e2e')

  test.beforeEach(async ({ page }) => {
    await openFromSidebar(page, 'Business Insights', /\/business-insights$/)
  })

  test('shows the headline numbers and every section', async ({ page }) => {
    await expect(pageHeading(page, 'Business Insights')).toBeVisible()

    const kpis = page.getByTestId('owner-kpis')
    for (const title of ['Net Earnings', 'Funded Volume', 'Funded Deals', 'Lead-To-Funded']) {
      await expect(kpis.getByText(title)).toBeVisible()
    }
    for (const title of ['Partners', 'Clients', 'Leads']) {
      await expect(kpis.getByText(title, { exact: true }).first()).toBeVisible()
    }
    // The real API splits clients between FCH and partners.
    const clients = page.getByTestId('owner-kpi-clients')
    await expect(clients.locator('.os-kpi__row').filter({ hasText: 'FCH' })).toBeVisible()
    await expect(clients.locator('.os-kpi__row').filter({ hasText: 'Partners' })).toBeVisible()
    for (const section of ['owner-attention', 'owner-cash', 'owner-commissions', 'owner-owed', 'owner-pipeline', 'owner-sources', 'owner-chart-funded', 'owner-chart-cash', 'owner-network', 'owner-top-partners', 'owner-stalled']) {
      await expect(page.getByTestId(section)).toBeVisible()
    }
    // A deal closes once the lender pays, so the commission card says closed, not "not cash".
    await expect(page.getByTestId('owner-commissions').getByText('Commission on deals closed this period')).toBeVisible()
  })

  test('another period loads without an error', async ({ page }) => {
    const response = page.waitForResponse((res) => res.url().includes('/common/owner-summary') && res.url().includes('period=this_week'))
    await page.getByRole('group', { name: 'Period' }).getByRole('button', { name: 'This week' }).click()

    expect((await response).status()).toBe(200)
    await expect(page.getByTestId('owner-kpis')).toBeVisible()
  })

  test('each payments mode loads from the real API and says which it shows', async ({ page }) => {
    const payments = page.getByRole('group', { name: 'Payments' })

    for (const [name, environment, showing] of [
      ['Sandbox', 'sandbox', 'Sandbox payments'],
      ['All Payment', 'all', 'All Payment'],
      ['Production', 'production', 'Production payments'],
    ]) {
      const response = page.waitForResponse((res) => res.url().includes('/common/owner-summary') && res.url().includes(`environment=${environment}`))
      await payments.getByRole('button', { name }).click()
      expect((await response).status()).toBe(200)
      await expect(page.locator('.os-showing').getByText(showing)).toBeVisible()
    }
  })

  test('a custom range loads from the real API and says what it shows', async ({ page }) => {
    await page.getByRole('group', { name: 'Period' }).getByRole('button', { name: 'Custom' }).click()
    const response = page.waitForResponse((res) => res.url().includes('/common/owner-summary') && res.url().includes('period=custom'))
    await page.getByRole('button', { name: 'Apply' }).click()

    expect((await response).status()).toBe(200)
    await expect(page.getByText(/\(custom\)/)).toBeVisible()
    await expect(page.getByText(/days before/)).toBeVisible()
  })
})
