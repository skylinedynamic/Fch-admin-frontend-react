import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, paginated, failure, seedSession, expectCall, type ApiMock } from './helpers'

const CB = '/common/credit-builder'
const QUEUE = [
  { borrower_id: 1, borrower_name: 'Johnathan Smithfield', partner_name: 'Acme Funding', tier_name: 'Tier 1', pending_count: 2, request_date: '2026-03-01' },
  { borrower_id: 2, borrower_name: 'Mara Quill', partner_name: 'Globex Capital', tier_name: 'Tier 0', pending_count: 0, request_date: '2026-03-02' },
]
const REQUESTS = [
  { id: 501, task_title: 'Open a vendor account', tier_name: 'Tier 1', tier_code: 'T1', status: 'processing', request_date: '2026-03-01' },
  { id: 502, task_title: 'Register the business', tier_name: 'Tier 0', tier_code: 'T0', status: 'verified', note: 'Looks good', request_date: '2026-02-20' },
]

test.describe('Verification center queue', () => {
  async function open(page: Page): Promise<ApiMock> {
    await seedSession(page)
    const api = await mockApi(page, [{ method: 'POST', match: `${CB}/verification-center-fetch-all`, body: paginated(QUEUE) }])
    await page.goto('/verification-center')
    await expect(page.getByRole('link', { name: 'Johnathan Smithfield' })).toBeVisible()
    return api
  }

  test('lists borrowers with their partner, tier and pending count', async ({ page }) => {
    await open(page)
    const row = page.locator('tr', { hasText: 'Mara Quill' })
    await expect(row.getByText('Globex Capital')).toBeVisible()
    await expect(row.getByText('Tier 0')).toBeVisible()
  })

  test('search is sent to the API', async ({ page }) => {
    const api = await open(page)
    await page.getByPlaceholder('Search borrower, partner or tier...').fill('mara')
    await page.locator('button', { hasText: 'Filters' }).click()
    await expect.poll(() => api.find('POST', `${CB}/verification-center-fetch-all`).at(-1)?.json.search).toBe('mara')
  })

  test('Clear resets the search', async ({ page }) => {
    await open(page)
    await page.getByPlaceholder('Search borrower, partner or tier...').fill('mara')
    await page.locator('button', { hasText: 'Clear' }).click()
    await expect(page.getByPlaceholder('Search borrower, partner or tier...')).toHaveValue('')
  })

  test('a failed load is reported', async ({ page }) => {
    await seedSession(page)
    await mockApi(page, [{ method: 'POST', match: `${CB}/verification-center-fetch-all`, body: failure('Verification queue unavailable.') }])
    await page.goto('/verification-center')
    await expect(page.getByText('Verification queue unavailable.').first()).toBeVisible()
  })

  test('the borrower name opens their requests', async ({ page }) => {
    await open(page)
    await page.getByRole('link', { name: 'Johnathan Smithfield' }).click()
    await expect(page).toHaveURL(/\/verification-center\/borrower-requests\/1$/)
  })

  test('non-host users cannot reach the verification center', async ({ page }) => {
    await seedSession(page, { is_host: 0, partner_id: 5 })
    await mockApi(page)
    await page.goto('/verification-center')
    await expect(page).not.toHaveURL(/verification-center/)
  })
})

test.describe('Borrower verification requests', () => {
  const UPDATE = `${CB}/verification-center-status-update`

  async function open(page: Page): Promise<ApiMock> {
    await seedSession(page)
    const api = await mockApi(page, [
      { method: 'POST', match: `${CB}/verification-center-borrower-requests`, body: paginated(REQUESTS) },
      { method: 'GET', match: '/common/borrowers/get-borrower-profile/1', body: ok({ id: 1, full_name: 'Johnathan Smithfield' }) },
    ])
    await page.goto('/verification-center/borrower-requests/1')
    await expect(page.getByText('Open a vendor account')).toBeVisible()
    return api
  }

  const openRowAction = async (page: Page, action: RegExp) => {
    const row = page.locator('tr', { hasText: 'Open a vendor account' })
    await row.locator('[data-bs-toggle="dropdown"]').click()
    await row.getByRole('button', { name: action }).click()
  }
  const modal = (page: Page) => page.locator('.modal.show')

  test('lists the borrower tasks and requests them by borrower id', async ({ page }) => {
    const api = await open(page)
    await expect(page.getByText('Register the business')).toBeVisible()
    expect(api.find('POST', `${CB}/verification-center-borrower-requests`)[0].json).toMatchObject({ borrower_id: '1' })
  })

  test('task search is sent to the API', async ({ page }) => {
    const api = await open(page)
    await page.getByPlaceholder('Search task title...').fill('vendor')
    await page.locator('button', { hasText: 'Filters' }).click()
    await expect.poll(() => api.find('POST', `${CB}/verification-center-borrower-requests`).at(-1)?.json.search).toBe('vendor')
  })

  test('Back returns to the queue', async ({ page }) => {
    await open(page)
    await page.locator('button', { hasText: 'Back' }).click()
    await expect(page).toHaveURL(/\/verification-center$/)
  })

  test('a processing T1 task offers manual verification and reject, but not MicroBilt', async ({ page }) => {
    await open(page)
    const row = page.locator('tr', { hasText: 'Open a vendor account' })
    await row.locator('[data-bs-toggle="dropdown"]').click()
    await expect(row.getByRole('button', { name: /manual verification/i })).toBeVisible()
    await expect(row.getByRole('button', { name: /reject request/i })).toBeVisible()
    await expect(row.getByRole('button', { name: /microbilt verification/i })).toHaveCount(0)
  })

  test('manual verification posts status=verified with the note', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: UPDATE, body: ok([], 'Request verified.') })
    await openRowAction(page, /manual verification/i)
    await expect(modal(page).getByText('Are you sure you want to manually verify this request?')).toBeVisible()
    await modal(page).getByPlaceholder('Enter verification note...').fill('Checked the invoice')
    await modal(page).getByRole('button', { name: 'Verify' }).click()
    const call = await expectCall(api, 'POST', UPDATE)
    expect(call.json).toEqual({ request_ids: [501], status: 'verified', note: 'Checked the invoice', is_api: false })
    await expect(page.getByText('Request verified.').first()).toBeVisible()
  })

  test('reject posts status=rejected with the reason', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: UPDATE, body: ok([], 'Request rejected.') })
    await openRowAction(page, /reject request/i)
    await expect(modal(page).getByText(/This action cannot be undone/)).toBeVisible()
    await modal(page).getByPlaceholder('Enter reason for rejection...').fill('Document is unreadable')
    await modal(page).getByRole('button', { name: 'Reject', exact: true }).click()
    const call = await expectCall(api, 'POST', UPDATE)
    expect(call.json).toEqual({ request_ids: [501], status: 'rejected', note: 'Document is unreadable', is_api: false })
  })

  test('rejecting without a reason shows the server validation message in the dialog', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: UPDATE, status: 422, body: failure('Invalid', { note: 'The rejection reason is required.' }) })
    await openRowAction(page, /reject request/i)
    await modal(page).getByRole('button', { name: 'Reject', exact: true }).click()
    await expect(modal(page).getByText('The rejection reason is required.')).toBeVisible()
    await expect(modal(page).locator('textarea')).toHaveClass(/is-invalid/)
  })

  test('Cancel closes the dialog without calling the API', async ({ page }) => {
    const api = await open(page)
    await openRowAction(page, /manual verification/i)
    await modal(page).getByRole('button', { name: 'Cancel' }).click()
    await expect(page.locator('.modal.show')).toHaveCount(0)
    expect(api.find('POST', UPDATE)).toHaveLength(0)
  })

  test('a status:false response is reported and the dialog stays open', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: UPDATE, body: failure('Request was already processed.') })
    await openRowAction(page, /manual verification/i)
    await modal(page).getByRole('button', { name: 'Verify' }).click()
    await expect(page.getByText('Request was already processed.').first()).toBeVisible()
  })

  test('a server error is reported', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: UPDATE, status: 500, body: failure('boom') })
    await openRowAction(page, /manual verification/i)
    await modal(page).getByRole('button', { name: 'Verify' }).click()
    await expect(page.getByText('An unexpected error occurred processing requests.')).toBeVisible()
  })
})
