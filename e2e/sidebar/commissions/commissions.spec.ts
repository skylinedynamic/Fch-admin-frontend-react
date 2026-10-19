import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, paginated, failure, seedSession, expectCall, type ApiMock } from '../../support/helpers'

test.describe('Commissions', () => {
  const ROWS = [
    { id: 1201, date: '2026-03-01', borrower: 'Johnathan Smithfield', partner: 'Acme Funding', commission_status: 'Approved', requested_amount: 100000, funded_amount: 90000, admin_commission_amount: 4500, partner_commission_amount: 2700, payment_status: 'Unpaid' },
  ]
  const LIST = /\/common\/commissions$/

  async function openList(page: Page, user: Record<string, unknown> = { permissions: ['view commission'] }): Promise<ApiMock> {
    await seedSession(page, user)
    const api = await mockApi(page, [{ method: 'POST', match: LIST, body: paginated(ROWS) }])
    await page.goto('/commissions')
    await expect(page.getByText('Johnathan Smithfield')).toBeVisible()
    return api
  }

  test('a host sees the partner and admin commission columns', async ({ page }) => {
    await openList(page)
    await expect(page.getByRole('columnheader', { name: /^Partner$/ })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Admin Comm\./ })).toBeVisible()
  })

  test('a partner does not see the partner or admin commission columns', async ({ page }) => {
    await openList(page, { permissions: ['view commission'], is_host: false, partner_id: 5 })
    await expect(page.getByRole('columnheader', { name: /Admin Comm\./ })).toHaveCount(0)
    await expect(page.getByRole('columnheader', { name: /^Partner$/ })).toHaveCount(0)
    await expect(page.getByRole('columnheader', { name: /Partner Comm\./ })).toBeVisible()
  })

  test('search is sent to the API and Clear resets it', async ({ page }) => {
    const api = await openList(page)
    await page.getByPlaceholder('Search borrower or ID...').fill('smith')
    await page.locator('button', { hasText: 'Filters' }).click()
    await expect.poll(() => JSON.stringify(api.find('POST', LIST).at(-1)?.json ?? {})).toContain('smith')
    await page.locator('button', { hasText: 'Clear' }).click()
    await expect(page.getByPlaceholder('Search borrower or ID...')).toHaveValue('')
  })

  test('shows the empty state', async ({ page }) => {
    await seedSession(page, { permissions: ['view commission'] })
    await mockApi(page, [{ method: 'POST', match: LIST, body: paginated([]) }])
    await page.goto('/commissions')
    await expect(page.getByText('No commissions found')).toBeVisible()
  })

  test('clicking a row opens the commission', async ({ page }) => {
    await openList(page)
    await page.getByText('Johnathan Smithfield').click()
    await expect(page).toHaveURL(/\/commissions\/1201$/)
  })

  test('the page is blocked without the view permission', async ({ page }) => {
    await seedSession(page, { permissions: [] })
    await mockApi(page)
    await page.goto('/commissions')
    await expect(page).toHaveURL(/access-denied/)
  })
})
