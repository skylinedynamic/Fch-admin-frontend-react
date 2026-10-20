import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, paginated, failure, seedSession, expectCall, type ApiMock } from '../../../support/helpers'

const RA = '/common/request-application'

test.describe('Pre-qualification applications', () => {
  const APPS = [
    { id: 301, full_name: 'Pia Prequal', business_name: 'Prequal Co', funding_type: 'Term Loan', requested_amount: '$50,000', date: '2026-03-01', status: 'Pending' },
    { id: 302, full_name: 'Quinn Qualified', business_name: 'Qualified LLC', funding_type: 'Line of Credit', requested_amount: '$120,000', date: '2026-03-04', status: 'Approved' },
  ]
  const LIST = new RegExp(`${RA}/pre-qualification$`)

  async function openList(page: Page, permissions = ['view pre qualification']): Promise<ApiMock> {
    await seedSession(page, { permissions })
    const api = await mockApi(page, [{ method: 'POST', match: LIST, body: paginated(APPS) }])
    await page.goto('/intake-review/pre-qualification')
    await expect(page.getByText('Pia Prequal')).toBeVisible()
    return api
  }

  test('lists applications with status', async ({ page }) => {
    await openList(page)
    await expect(page.locator('tr', { hasText: 'Quinn Qualified' }).getByText('Approved')).toBeVisible()
    await expect(page.getByText('Prequal Co')).toBeVisible()
  })

  test('search is sent to the API and Clear resets it', async ({ page }) => {
    const api = await openList(page)
    await page.getByPlaceholder('Search here...').fill('quinn')
    await page.locator('button', { hasText: 'Filters' }).click()
    await expect.poll(() => JSON.stringify(api.find('POST', LIST).at(-1)?.json ?? {})).toContain('quinn')
    await page.locator('button', { hasText: 'Clear' }).click()
    await expect(page.getByPlaceholder('Search here...')).toHaveValue('')
  })

  test('shows the empty state', async ({ page }) => {
    await seedSession(page, { permissions: ['view pre qualification'] })
    await mockApi(page, [{ method: 'POST', match: LIST, body: paginated([]) }])
    await page.goto('/intake-review/pre-qualification')
    await expect(page.getByText('No applications found')).toBeVisible()
  })

  test('clicking a row opens the application', async ({ page }) => {
    await openList(page)
    await page.getByText('Prequal Co').click()
    await expect(page).toHaveURL(/\/intake-review\/pre-qualification\/301$/)
  })

  test('the page is blocked without the view permission', async ({ page }) => {
    await seedSession(page, { permissions: [] })
    await mockApi(page)
    await page.goto('/intake-review/pre-qualification')
    await expect(page).toHaveURL(/access-denied/)
  })
})

test.describe('Pre-qualification details - status update', () => {
  const DETAIL = {
    id: 301, full_name: 'Pia Prequal', first_name: 'Pia', last_name: 'Prequal', email: 'pia@example.test',
    business_name: 'Prequal Co', funding_type: 'Term Loan', requested_amount: 50000, status: '', status_note: '',
  }
  const UPDATE = `${RA}/pre-qualification/status-update`

  async function open(page: Page, permissions = ['view pre qualification', 'update pre qualification']): Promise<ApiMock> {
    await seedSession(page, { permissions })
    const api = await mockApi(page, [{ method: 'GET', match: `${RA}/pre-qualification/301`, body: ok(DETAIL) }])
    await page.goto('/intake-review/pre-qualification/301')
    await expect(page.getByPlaceholder('Add notes...')).toBeVisible()
    return api
  }

  test('status and notes are required before the confirmation opens', async ({ page }) => {
    const api = await open(page)
    await page.getByRole('button', { name: 'Update Status' }).click()
    await expect(page.getByText('Select a status before updating.')).toBeVisible()
    await expect(page.getByPlaceholder('Add notes...')).toHaveClass(/is-invalid/)
    await expect(page.locator('.modal.show')).toHaveCount(0)
    expect(api.find('POST', UPDATE)).toHaveLength(0)
  })

  test('the note counter tracks what is typed', async ({ page }) => {
    await open(page)
    await page.getByPlaceholder('Add notes...').fill('Reviewed')
    await expect(page.getByText(/^8 \/ \d+ characters$/)).toBeVisible()
  })

  test('the update button is hidden without the update permission', async ({ page }) => {
    await seedSession(page, { permissions: ['view pre qualification'] })
    await mockApi(page, [{ method: 'GET', match: `${RA}/pre-qualification/301`, body: ok({ ...DETAIL, status: 'Pending' }) }])
    await page.goto('/intake-review/pre-qualification/301')
    await expect(page.getByRole('link', { name: /back/i }).or(page.locator('button', { hasText: 'Back' })).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Update Status' })).toHaveCount(0)
  })

  test('an application that fails to load is reported', async ({ page }) => {
    await seedSession(page, { permissions: ['view pre qualification'] })
    await mockApi(page, [{ method: 'GET', match: `${RA}/pre-qualification/999`, status: 404, body: failure('Not found') }])
    await page.goto('/intake-review/pre-qualification/999')
    await expect(page.getByText('Failed to load application details').first()).toBeVisible()
  })
})
