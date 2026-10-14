import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, paginated, failure, seedSession, expectCall, type ApiMock } from '../../support/helpers'

test.describe('Upcoming billing', () => {
  const ROWS = [
    { id: 1, subscription_id: 1101, subscriber_name: 'Acme Funding', upcoming_billing_type: 'Platform Fee', upcoming_billing_amount: '499.00', upcoming_billing_date: '2026-04-01', outstanding_amount: '0.00', enrollment_type: 'Monthly', status: 'Active' },
  ]
  const LIST = '/common/billing/fetch-upcoming'

  async function openList(page: Page): Promise<ApiMock> {
    await seedSession(page, { permissions: ['view subscriptions'] })
    const api = await mockApi(page, [{ method: 'POST', match: LIST, body: paginated(ROWS, { window_days: 30 }) }])
    await page.goto('/billing')
    await expect(page.getByText('Acme Funding')).toBeVisible()
    return api
  }

  test('lists upcoming charges', async ({ page }) => {
    await openList(page)
    await expect(page.locator('tr', { hasText: 'Acme Funding' }).getByText('Monthly')).toBeVisible()
  })

  test('the default request applies no entity-type filter', async ({ page }) => {
    const api = await openList(page)
    expect(api.find('POST', LIST)[0].json).not.toHaveProperty('entity_type')
  })

  test('search is sent to the API', async ({ page }) => {
    const api = await openList(page)
    await page.getByPlaceholder('Search by name, email...').fill('acme')
    await page.locator('button.btn-warning').click()
    await expect.poll(() => api.find('POST', LIST).some((c) => c.json?.search === 'acme')).toBe(true)
  })

  test('shows the empty state', async ({ page }) => {
    await seedSession(page, { permissions: ['view subscriptions'] })
    await mockApi(page, [{ method: 'POST', match: LIST, body: paginated([]) }])
    await page.goto('/billing')
    await expect(page.getByText('No upcoming billing found')).toBeVisible()
  })

  test('a failed list request is reported', async ({ page }) => {
    await seedSession(page, { permissions: ['view subscriptions'] })
    await mockApi(page, [{ method: 'POST', match: LIST, body: failure('Billing is unavailable.') }])
    await page.goto('/billing')
    await expect(page.getByText('Billing is unavailable.').first()).toBeVisible()
  })

  test('clicking a row opens the billing detail by subscription id', async ({ page }) => {
    await openList(page)
    await page.getByText('Acme Funding').click()
    await expect(page).toHaveURL(/\/billing\/1101$/)
  })
})
