import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, paginated, failure, seedSession, expectCall, type ApiMock } from '../../support/helpers'

test.describe('Subscriptions', () => {
  const SUBS = [
    { id: 1101, subscriber_name: 'Acme Funding', entity_type: 'Partner', enrollment_type: 'Monthly', payable_amount: '499.00', subscription_start_date: '2026-01-01', subscription_end_date: '2026-12-31', created_at: '2026-01-01', status: 'Active' },
    { id: 1102, subscriber_name: 'Johnathan Smithfield', entity_type: 'Borrower', enrollment_type: 'Installment', payable_amount: '1200.00', subscription_start_date: '2026-02-01', subscription_end_date: '2026-08-01', created_at: '2026-02-01', status: 'Expired' },
  ]
  const LIST = '/common/subscriptions/fetch-all'

  async function openList(page: Page): Promise<ApiMock> {
    await seedSession(page, { permissions: ['view subscriptions'] })
    const api = await mockApi(page, [{ method: 'POST', match: LIST, body: paginated(SUBS) }])
    await page.goto('/subscriptions')
    await expect(page.getByText('Acme Funding')).toBeVisible()
    return api
  }

  test('lists subscriptions with entity type and status', async ({ page }) => {
    await openList(page)
    const row = page.locator('tr', { hasText: 'Johnathan Smithfield' })
    await expect(row.getByText('Borrower')).toBeVisible()
    await expect(row.getByText('Expired')).toBeVisible()
  })

  test('search is sent to the API', async ({ page }) => {
    const api = await openList(page)
    await page.getByPlaceholder('Search subscriptions...').fill('acme')
    await page.getByPlaceholder('Search subscriptions...').press('Enter')
    await expect.poll(() => api.find('POST', LIST).some((c) => c.json?.search === 'acme')).toBe(true)
  })

  test('shows the empty state', async ({ page }) => {
    await seedSession(page, { permissions: ['view subscriptions'] })
    await mockApi(page, [{ method: 'POST', match: LIST, body: paginated([]) }])
    await page.goto('/subscriptions')
    await expect(page.getByText('No subscriptions found')).toBeVisible()
  })

  test('a failed list request is reported', async ({ page }) => {
    await seedSession(page, { permissions: ['view subscriptions'] })
    await mockApi(page, [{ method: 'POST', match: LIST, body: failure('Subscriptions are unavailable.') }])
    await page.goto('/subscriptions')
    await expect(page.getByText('Subscriptions are unavailable.').first()).toBeVisible()
  })

  test('clicking a row opens the subscription', async ({ page }) => {
    await openList(page)
    await page.getByText('Acme Funding').click()
    await expect(page).toHaveURL(/\/subscriptions\/1101$/)
  })

  test('the page is blocked without the view permission', async ({ page }) => {
    await seedSession(page, { permissions: [] })
    await mockApi(page)
    await page.goto('/subscriptions')
    await expect(page).toHaveURL(/access-denied/)
  })
})
