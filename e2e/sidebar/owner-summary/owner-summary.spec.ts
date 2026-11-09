import { test, expect } from '@playwright/test'
import { mockApi, ok, seedSession, expectCall, HOST_USER } from '../../support/helpers'
import { ownerSummaryFixture } from '../../../tests/mocks/ownerSummary'

// The host partner's own login, with the screens the summary links to.
const HOST_OWNER = { ...HOST_USER, entity_type: 'Partner', permissions: ['view commission', 'view invoices', 'view payments'] }

test.describe('Sidebar › Owner Summary', () => {
  test('the host owner opens it from the sidebar and reads this month in live payments', async ({ page }) => {
    await seedSession(page, HOST_OWNER)
    const api = await mockApi(page, [{ method: 'GET', match: '/common/owner-summary', body: ok(ownerSummaryFixture) }])

    await page.goto('/')
    await page.locator('#navbar-nav').getByRole('link', { name: 'Owner Summary' }).click()
    await expect(page).toHaveURL(/\/owner-summary$/)

    const call = await expectCall(api, 'GET', '/common/owner-summary')
    expect(call.path).toContain('period=this_month')
    expect(call.path).toContain('environment=production')

    const kpis = page.getByTestId('owner-kpis')
    await expect(kpis.getByText('Cash collected')).toBeVisible()
    await expect(kpis.getByText('$1.6K')).toBeVisible()
    await expect(kpis.getByText('$150.0K')).toBeVisible()
    await expect(page.getByTestId('owner-attention').getByRole('link', { name: 'Review failed invoices' })).toBeVisible()
    await expect(page.getByTestId('owner-stalled').getByText('FUND-000044')).toBeVisible()
  })

  test('changing the period asks the API again', async ({ page }) => {
    await seedSession(page, HOST_OWNER)
    const api = await mockApi(page, [{ method: 'GET', match: '/common/owner-summary', body: ok(ownerSummaryFixture) }])

    await page.goto('/owner-summary')
    await expect(page.getByTestId('owner-kpis')).toBeVisible()
    await page.getByRole('group', { name: 'Period' }).getByRole('button', { name: 'Last month' }).click()

    await expect.poll(() => api.find('GET', 'period=last_month').length).toBeGreaterThan(0)
  })

  test('a needs-attention item opens the screen it is about', async ({ page }) => {
    await seedSession(page, HOST_OWNER)
    await mockApi(page, [{ method: 'GET', match: '/common/owner-summary', body: ok(ownerSummaryFixture) }])

    await page.goto('/owner-summary')
    await page.getByTestId('owner-attention').getByRole('link', { name: 'Review commission payouts due' }).click()

    await expect(page).toHaveURL(/\/commissions$/)
  })

  test('host staff who do not manage commissions neither see it nor reach it', async ({ page }) => {
    await seedSession(page, { ...HOST_USER, entity_type: 'Employee', permissions: ['view commission'] })
    const api = await mockApi(page)

    await page.goto('/owner-summary')
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator('#navbar-nav').getByRole('link', { name: 'Owner Summary' })).toHaveCount(0)
    expect(api.find('GET', '/common/owner-summary')).toHaveLength(0)
  })

  test('fits a phone without scrolling sideways, and six headline cards share one row on a laptop', async ({ page }) => {
    await seedSession(page, HOST_OWNER)
    await mockApi(page, [{ method: 'GET', match: '/common/owner-summary', body: ok(ownerSummaryFixture) }])

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/owner-summary')
    await expect(page.getByTestId('owner-stalled')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)

    await page.setViewportSize({ width: 1440, height: 900 })
    const tops = await page.getByTestId('owner-kpis').locator('.os-kpi').evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().top)))
    expect(new Set(tops).size).toBe(1)
  })

  test('says so when the API refuses the viewer', async ({ page }) => {
    await seedSession(page, HOST_OWNER)
    await mockApi(page, [{ method: 'GET', match: '/common/owner-summary', status: 403, body: { message: 'This action is unauthorized.' } }])

    await page.goto('/owner-summary')

    await expect(page.getByText('Only the host owner can see this summary.')).toBeVisible()
  })
})
