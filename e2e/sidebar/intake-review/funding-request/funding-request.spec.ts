import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, paginated, failure, seedSession, expectCall, type ApiMock } from '../../../support/helpers'

const RA = '/common/request-application'

test.describe('Funding requests', () => {
  const REQS = [
    { id: 601, borrower: { first_name: 'Rhea', last_name: 'Requester' }, partner: { full_name: 'Acme Funding' }, funding_sequence: { name: 'SBA 7(a)' }, funding_type: 'SBA Loan', requested_amount: 150000, lender_names: 'First Capital', status: 'Pending', application_status: 'Submitted' },
  ]
  const LIST = /\/common\/funding-request$/

  async function openList(page: Page): Promise<ApiMock> {
    await seedSession(page, { permissions: ['view funding request'] })
    const api = await mockApi(page, [{ method: 'POST', match: LIST, body: paginated(REQS) }])
    await page.goto('/intake-review/funding-request')
    await expect(page.getByText('Rhea Requester')).toBeVisible()
    return api
  }

  test('lists requests with borrower, partner, sequence and lender', async ({ page }) => {
    await openList(page)
    const row = page.locator('tr', { hasText: 'Rhea Requester' })
    await expect(row.getByText('Acme Funding')).toBeVisible()
    await expect(row.getByText('SBA 7(a)')).toBeVisible()
    await expect(row.getByText('First Capital')).toBeVisible()
  })

  test('search is sent to the API', async ({ page }) => {
    const api = await openList(page)
    await page.getByPlaceholder('Search borrower or partner name...').fill('rhea')
    await page.getByPlaceholder('Search borrower or partner name...').press('Enter')
    await expect.poll(() => JSON.stringify(api.find('POST', LIST).at(-1)?.json ?? {})).toContain('rhea')
  })

  test('shows the empty state', async ({ page }) => {
    await seedSession(page, { permissions: ['view funding request'] })
    await mockApi(page, [{ method: 'POST', match: LIST, body: paginated([]) }])
    await page.goto('/intake-review/funding-request')
    await expect(page.getByText('No funding requests found')).toBeVisible()
  })

  test('clicking a row opens the request', async ({ page }) => {
    await openList(page)
    await page.getByText('Acme Funding').click()
    await expect(page).toHaveURL(/\/intake-review\/funding-request\/601$/)
  })

  test('the page is blocked without the view permission', async ({ page }) => {
    await seedSession(page, { permissions: [] })
    await mockApi(page)
    await page.goto('/intake-review/funding-request')
    await expect(page).toHaveURL(/access-denied/)
  })
})
