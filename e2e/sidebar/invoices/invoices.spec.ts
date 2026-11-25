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
// What the list API sends as status_options: fch-api Invoice::STATUSES (R3-BUG-078).
const STATUS_OPTIONS = ['Paid', 'Unpaid', 'Processing', 'Expired'].map((status) => ({ label: status, value: status }))

test.describe('Invoices list', () => {
  async function openList(page: Page): Promise<ApiMock> {
    await seedSession(page, { permissions: ['view invoices', 'view payments'] })
    const api = await mockApi(page, [{ method: 'POST', match: I_LIST, body: { ...paginated(INVOICES), status_options: STATUS_OPTIONS } }])
    await page.goto('/invoices')
    await expect(page.getByText('INV-1001')).toBeVisible()
    return api
  }

  // BUG-206: View Details said "Payment Method: Stripe" and showed a Card Holder for an invoice paid by Bank Transfer.
  test('View Details shows the method the invoice was really paid with', async ({ page }) => {
    const api = await openList(page)
    api.add({
      method: 'GET', match: /\/common\/invoices\/1002$/,
      body: ok({ ...INVOICES[1], payment_amount: 1200, payment_method: 'Bank Transfer', payment_reference: 'QA-TEST-REF-0320', is_card_payment: false, billed_to: { name: 'Johnathan Smithfield' } }),
    })

    await page.locator('tr', { hasText: 'INV-1002' }).getByTitle('View Details').click()

    const details = page.locator('.modal.show').getByRole('heading', { name: /Payment Details/ }).locator('..')
    await expect(details).toContainText('Payment Method: Bank Transfer')
    await expect(details).toContainText('Reference: QA-TEST-REF-0320')
    await expect(details).toContainText('Paid By: Johnathan Smithfield')
    await expect(details).not.toContainText('Card Holder')
    await expect(details).not.toContainText('Stripe')
  })

  // BUG-202: View Details named the party billed (the partner owner) as the payer of an invoice its staff user paid.
  test('View Details names the user who paid the invoice', async ({ page }) => {
    const api = await openList(page)
    api.add({
      method: 'GET', match: /\/common\/invoices\/1002$/,
      body: ok({ ...INVOICES[1], payment_amount: 1200, payment_method: 'Cash', payment_reference: 'QA-TEST-REF-1112', is_card_payment: false, paid_by_name: 'Sam Staff', billed_to: { name: 'Johnathan Smithfield' } }),
    })

    await page.locator('tr', { hasText: 'INV-1002' }).getByTitle('View Details').click()

    const details = page.locator('.modal.show').getByRole('heading', { name: /Payment Details/ }).locator('..')
    await expect(details).toContainText('Paid By: Sam Staff')
    await expect(details).not.toContainText('Johnathan Smithfield')
  })

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

  // BUG-021 round 2: no invoice is ever Overdue (an unpaid one locks the
  // profile instead); older invoices are Expired. R3-BUG-078: the options are
  // exactly the API's status_options, the list the client portal uses too.
  test('the status filter offers the statuses invoices have and sends the one picked', async ({ page }) => {
    const api = await openList(page)
    await page.locator('.employee-filter-dropdown', { hasText: 'All Status' }).click()
    const panel = page.locator('.p-dropdown-panel')
    await expect(panel.getByRole('option')).toHaveText(['All Status', 'Paid', 'Unpaid', 'Processing', 'Expired'])
    await panel.getByRole('option', { name: 'Expired', exact: true }).click()
    await page.locator('button', { hasText: 'Filters' }).click()
    await expect.poll(() => api.find('POST', I_LIST).at(-1)?.json.status).toBe('Expired')
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

  // BUG-202: who paid it - for a partner's invoice, often one of its staff.
  test('a paid invoice says who paid it', async ({ page }) => {
    await open(page, undefined, { ...INVOICES[0], status: 'Paid', payment_date: '11 Nov, 2026', paid_by_name: 'Sam Staff' })
    await expect(page.getByText('Paid By: Sam Staff')).toBeVisible()
  })

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
