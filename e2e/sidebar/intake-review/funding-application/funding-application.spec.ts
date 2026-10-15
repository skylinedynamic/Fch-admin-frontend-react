import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, paginated, failure, seedSession, expectCall, type ApiMock } from '../../../support/helpers'

const RA = '/common/request-application'

test.describe('Funding applications', () => {
  const APPS = [
    { id: 401, full_name: 'Fran Funding', application_no: 'APP-0001', industry_type: 'Retail', entity_type: 'LLC', purpose_of_funds: 'Inventory', requested_amount: '$80,000', date: '2026-03-02', status: 'Submitted' },
    { id: 402, full_name: 'Gus Growth', application_no: 'APP-0002', industry_type: 'Tech', entity_type: 'C-Corp', purpose_of_funds: 'Hiring', requested_amount: '$300,000', date: '2026-03-05', status: 'Approved' },
  ]
  const LIST = new RegExp(`${RA}/funding-application$`)

  async function openList(page: Page): Promise<ApiMock> {
    await seedSession(page, { permissions: ['view funding application'] })
    const api = await mockApi(page, [{ method: 'POST', match: LIST, body: paginated(APPS) }])
    await page.goto('/intake-review/funding-application')
    await expect(page.getByText('Fran Funding')).toBeVisible()
    return api
  }

  test('lists applications', async ({ page }) => {
    await openList(page)
    await expect(page.getByText('Gus Growth')).toBeVisible()
    await expect(page.getByText('Inventory')).toBeVisible()
  })

  test('search is sent to the API', async ({ page }) => {
    const api = await openList(page)
    await page.getByPlaceholder('Search here...').fill('gus')
    await page.getByPlaceholder('Search here...').press('Enter')
    await expect.poll(() => JSON.stringify(api.find('POST', LIST).at(-1)?.json ?? {})).toContain('gus')
  })

  test('shows the empty state', async ({ page }) => {
    await seedSession(page, { permissions: ['view funding application'] })
    await mockApi(page, [{ method: 'POST', match: LIST, body: paginated([]) }])
    await page.goto('/intake-review/funding-application')
    await expect(page.getByText('No applications found')).toBeVisible()
  })

  test('clicking a row opens the application', async ({ page }) => {
    await openList(page)
    await page.getByText('Inventory').click()
    await expect(page).toHaveURL(/\/intake-review\/funding-application\/401$/)
  })

  test('the page is blocked without the view permission', async ({ page }) => {
    await seedSession(page, { permissions: [] })
    await mockApi(page)
    await page.goto('/intake-review/funding-application')
    await expect(page).toHaveURL(/access-denied/)
  })
})

// QA (funding-application/82): the host saw Edit Funding Application on a
// white-label partner's application. Only the owning partner edits it.
test.describe('Funding application details — Edit Funding Application', () => {
  const DETAIL = new RegExp(`${RA}/funding-application/82$`)
  const application = {
    id: 82, partner_id: 21, borrower_id: 7, status: 'Pending', full_name: 'Zia Fuentes', business_name: 'Fuentes LLC',
    funding_request_id: 29, funding_request_status: 'Approved', is_editable: true, co_borrowers: [], documents: [],
  }
  const editLink = (page: Page) => page.getByRole('link', { name: /edit funding application/i })

  async function openDetails(page: Page, user: Record<string, unknown>) {
    await seedSession(page, { permissions: ['view funding application', 'update funding application'], ...user })
    await mockApi(page, [{ method: 'GET', match: DETAIL, body: ok(application) }])
    await page.goto('/intake-review/funding-application/82')
    await expect(page.getByRole('link', { name: /back/i })).toBeVisible()
  }

  test('the host sees the application without an Edit button', async ({ page }) => {
    await openDetails(page, { is_host: 1, partner_id: 1 })
    await expect(page.getByRole('button', { name: /download/i })).toBeVisible()
    await expect(editLink(page)).toHaveCount(0)
  })

  test('the partner that owns it can edit it', async ({ page }) => {
    await openDetails(page, { is_host: 0, partner_id: 21 })
    await expect(editLink(page)).toHaveAttribute('href', '/fund-application/29')
  })
})
