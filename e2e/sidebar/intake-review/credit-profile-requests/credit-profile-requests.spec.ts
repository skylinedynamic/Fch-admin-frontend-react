import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, paginated, failure, seedSession, expectCall, type ApiMock } from '../../../support/helpers'

const RA = '/common/request-application'
const CAN_VIEW = { permissions: ['manage credit profile requests'] }

test.describe('Credit profile requests', () => {
  const ROWS = [
    { id: 801, first_name: 'Cy', last_name: 'Credit', email: 'cy@example.test', phone: '(555) 800-0001', ssn: '123-45-6789', created_at: '2026-03-06', request_status: 'pending', borrower: { business_name: 'Credit Works' } },
  ]
  const LIST = /\/admin\/credit-profile-requests$/

  async function open(page: Page): Promise<ApiMock> {
    await seedSession(page, CAN_VIEW)
    // This endpoint returns a raw Laravel paginator inside data: { data: { data: [...], total } }.
    const api = await mockApi(page, [{ method: 'POST', match: LIST, body: ok({ data: ROWS, total: ROWS.length }) }])
    await page.goto('/intake-review/credit-profile-requests')
    await expect(page.getByText('cy@example.test')).toBeVisible()
    return api
  }

  test('lists requests with company and status', async ({ page }) => {
    await open(page)
    await expect(page.getByText('Credit Works')).toBeVisible()
    await expect(page.locator('tbody').getByText('Pending')).toBeVisible()
  })

  test('masks the SSN down to its last four digits', async ({ page }) => {
    await open(page)
    await expect(page.locator('tbody').getByText('***-**-6789')).toBeVisible()
    await expect(page.locator('tbody')).not.toContainText(/\d{3}-\d{2}-\d{4}/)
  })

  test('search is sent to the API', async ({ page }) => {
    const api = await open(page)
    const box = page.getByPlaceholder(/Search applicant name/)
    await box.fill('cy')
    await box.press('Enter')
    await expect.poll(() => JSON.stringify(api.find('POST', LIST).at(-1)?.json ?? {})).toContain('cy')
  })

  test('shows the empty state', async ({ page }) => {
    await seedSession(page, CAN_VIEW)
    await mockApi(page, [{ method: 'POST', match: LIST, body: ok({ data: [], total: 0 }) }])
    await page.goto('/intake-review/credit-profile-requests')
    await expect(page.getByText('No credit profile requests found.')).toBeVisible()
  })

  test('clicking a row opens the request', async ({ page }) => {
    await open(page)
    await page.getByText('cy@example.test').click()
    await expect(page).toHaveURL(/\/intake-review\/credit-profile-requests\/801$/)
  })

  // BUG-097: a host user whose role does not include the permission.
  test('a host user without manage credit profile requests gets Access Denied', async ({ page }) => {
    await seedSession(page, { permissions: ['view leads'] })
    const api = await mockApi(page)
    await page.goto('/intake-review/credit-profile-requests')
    await expect(page.getByText(/Access Denied/i)).toBeVisible()
    expect(api.find('POST', LIST)).toHaveLength(0)
  })

  test('non-host users cannot reach credit profile requests', async ({ page }) => {
    await seedSession(page, { is_host: 0, partner_id: 3 })
    await mockApi(page)
    await page.goto('/intake-review/credit-profile-requests')
    await expect(page).not.toHaveURL(/credit-profile-requests/)
  })
})
