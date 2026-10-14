import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, paginated, failure, seedSession, expectCall, type ApiMock } from '../../support/helpers'

const PAYMENTS = [
  { id: 901, transaction_date: '2026-03-02', invoice_id: 'INV-1001', from: 'Bank Transfer', transaction_type: 'Subscription', partner_name: 'Acme Funding', amount: '$499.00', status: 'Processing', is_environment: 'live' },
  { id: 902, transaction_date: '2026-03-03', invoice_id: 'INV-1002', from: 'Card', transaction_type: 'Enrollment', borrower_name: 'Johnathan Smithfield', amount: '$1,200.00', status: 'Paid', is_environment: 'live' },
]
const P_LIST = '/common/payments/fetch-payments'

const INVOICES = [
  { id: 1001, created_at: '2026-03-01', invoice_id: 'INV-1001', customer_name: 'Acme Funding', payment_amount: '$499.00', displayable_payment_amount: '$499.00', type: 'Subscription', status: 'Unpaid' },
  { id: 1002, created_at: '2026-03-02', invoice_id: 'INV-1002', customer_name: 'Johnathan Smithfield', payment_amount: '$1,200.00', displayable_payment_amount: '$1,200.00', type: 'Enrollment', status: 'Paid', payment_id: 902 },
]
const I_LIST = '/common/invoices/fetch-invoices'

test.describe('Invoices list', () => {
  async function openList(page: Page): Promise<ApiMock> {
    await seedSession(page, { permissions: ['view invoices', 'view payments'] })
    const api = await mockApi(page, [{ method: 'POST', match: I_LIST, body: paginated(INVOICES) }])
    await page.goto('/invoices')
    await expect(page.getByText('INV-1001')).toBeVisible()
    return api
  }

  test('lists invoices', async ({ page }) => {
    await openList(page)
    await expect(page.getByText('INV-1002')).toBeVisible()
    await expect(page.locator('tr', { hasText: 'INV-1001' }).getByText('Unpaid')).toBeVisible()
  })

  test('a host does not scope the list to an entity', async ({ page }) => {
    const api = await openList(page)
    expect(api.find('POST', I_LIST)[0].json).toMatchObject({ entity_type: null, entity_id: null })
  })

  test('a partner user scopes the list to their own entity', async ({ page }) => {
    await seedSession(page, { permissions: ['view invoices'], is_host: 0, partner_id: 5, entity_type: 'Partner', entity_id: 5 })
    const api = await mockApi(page, [{ method: 'POST', match: I_LIST, body: paginated(INVOICES) }])
    await page.goto('/invoices')
    await expect.poll(() => api.find('POST', I_LIST).length).toBeGreaterThan(0)
    expect(api.find('POST', I_LIST).at(-1)!.json).toMatchObject({ entity_type: 'Partner', entity_id: 5 })
  })

  test('search is sent to the API and Clear resets it', async ({ page }) => {
    const api = await openList(page)
    await page.getByPlaceholder('Search invoices...').fill('INV-1002')
    await page.locator('button', { hasText: 'Filters' }).click()
    await expect.poll(() => api.find('POST', I_LIST).at(-1)?.json.search).toBe('INV-1002')
    await page.locator('button', { hasText: 'Clear' }).click()
    await expect(page.getByPlaceholder('Search invoices...')).toHaveValue('')
  })

  test('shows the empty state', async ({ page }) => {
    await seedSession(page, { permissions: ['view invoices'] })
    await mockApi(page, [{ method: 'POST', match: I_LIST, body: paginated([]) }])
    await page.goto('/invoices')
    await expect(page.getByText('No invoices found.')).toBeVisible()
  })

  test('clicking a row opens the invoice', async ({ page }) => {
    await openList(page)
    await page.getByText('INV-1001').click()
    await expect(page).toHaveURL(/\/invoices\/1001$/)
  })

  test('the page is blocked without the view permission', async ({ page }) => {
    await seedSession(page, { permissions: [] })
    await mockApi(page)
    await page.goto('/invoices')
    await expect(page).toHaveURL(/access-denied/)
  })
})

test.describe('Invoice details', () => {
  async function open(page: Page, user: Record<string, unknown> = { permissions: ['view invoices'] }, invoice: Record<string, unknown> = INVOICES[0]): Promise<ApiMock> {
    await seedSession(page, user)
    const api = await mockApi(page, [{ method: 'GET', match: /\/common\/invoices\/1001$/, body: ok(invoice) }])
    await page.goto('/invoices/1001')
    await expect(page.getByRole('button', { name: /download pdf/i })).toBeVisible()
    return api
  }

  test('shows the invoice total', async ({ page }) => {
    await open(page)
    await expect(page.getByText('Total Amount')).toBeVisible()
    await expect(page.getByText('$499.00').first()).toBeVisible()
  })

  test('Download PDF saves the file returned by the API', async ({ page }) => {
    const api = await open(page)
    api.add({
      method: 'GET', match: '/common/invoices/1001/download',
      body: ok({ file: Buffer.from('%PDF-1.4 fake').toString('base64'), mime_type: 'application/pdf', file_name: 'Invoice-INV-1001.pdf' }),
    })
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: /download pdf/i }).click()
    expect((await download).suggestedFilename()).toBe('Invoice-INV-1001.pdf')
    await expect(page.getByText('Invoice downloaded successfully')).toBeVisible()
  })

  test('a download with no file is reported as a failure', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'GET', match: '/common/invoices/1001/download', body: ok({}) })
    await page.getByRole('button', { name: /download pdf/i }).click()
    await expect(page.getByText('Failed to download invoice')).toBeVisible()
  })

  test('a download error is reported', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'GET', match: '/common/invoices/1001/download', status: 500, body: failure('boom') })
    await page.getByRole('button', { name: /download pdf/i }).click()
    await expect(page.getByText('Error downloading invoice')).toBeVisible()
  })

  test('a host never sees Pay Now', async ({ page }) => {
    await open(page)
    await expect(page.getByRole('button', { name: /pay now/i })).toHaveCount(0)
  })

  test('a paid invoice has no Pay Now for the partner either', async ({ page }) => {
    await open(page, { permissions: ['view invoices'], is_host: 0, partner_id: 5 }, { ...INVOICES[1], id: 1001, entity_type: 'Partner' })
    await expect(page.getByRole('button', { name: /pay now/i })).toHaveCount(0)
  })
})
