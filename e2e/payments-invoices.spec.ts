import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, paginated, failure, seedSession, expectCall, type ApiMock } from './helpers'

const PAYMENTS = [
  { id: 901, transaction_date: '2026-03-02', invoice_id: 'INV-1001', from: 'Bank Transfer', transaction_type: 'Subscription', partner_name: 'Acme Funding', amount: '$499.00', status: 'Processing', is_environment: 'live' },
  { id: 902, transaction_date: '2026-03-03', invoice_id: 'INV-1002', from: 'Card', transaction_type: 'Enrollment', borrower_name: 'Johnathan Smithfield', amount: '$1,200.00', status: 'Paid', is_environment: 'live' },
]
const P_LIST = '/common/payments/fetch-payments'

test.describe('Payments list', () => {
  async function openList(page: Page): Promise<ApiMock> {
    await seedSession(page, { permissions: ['view payments'] })
    const api = await mockApi(page, [{ method: 'POST', match: P_LIST, body: paginated(PAYMENTS) }])
    await page.goto('/payments')
    await expect(page.getByText('INV-1001')).toBeVisible()
    return api
  }

  test('lists payments with payer, amount and status', async ({ page }) => {
    await openList(page)
    const row = page.locator('tr', { hasText: 'INV-1002' })
    await expect(row.getByText('Johnathan Smithfield')).toBeVisible()
    await expect(row.getByText('$1,200.00')).toBeVisible()
    await expect(row.getByText('Paid')).toBeVisible()
  })

  test('search is sent to the API', async ({ page }) => {
    const api = await openList(page)
    await page.getByPlaceholder('Search...').fill('INV-1002')
    await page.getByPlaceholder('Search...').press('Enter')
    await expect.poll(() => api.find('POST', P_LIST).at(-1)?.json.search).toBe('INV-1002')
  })

  test('a search term in the URL is applied on load', async ({ page }) => {
    // KNOWN BUG: InvoiceTable's "Review" button navigates to /payments?search=<invoice id>, but
    // Payments.jsx never reads the query string, so the list opens unfiltered.
    // Remove test.fail() once the page honours ?search=.
    test.fail()
    await seedSession(page, { permissions: ['view payments'] })
    const api = await mockApi(page, [{ method: 'POST', match: P_LIST, body: paginated(PAYMENTS) }])
    await page.goto('/payments?search=INV-1001')
    await expect.poll(() => api.find('POST', P_LIST).some((c) => c.json.search === 'INV-1001')).toBe(true)
  })

  test('shows the empty state', async ({ page }) => {
    await seedSession(page, { permissions: ['view payments'] })
    await mockApi(page, [{ method: 'POST', match: P_LIST, body: paginated([]) }])
    await page.goto('/payments')
    await expect(page.getByText('No payments found.')).toBeVisible()
  })

  test('a failed list request is reported', async ({ page }) => {
    await seedSession(page, { permissions: ['view payments'] })
    await mockApi(page, [{ method: 'POST', match: P_LIST, body: failure('Payments are unavailable.') }])
    await page.goto('/payments')
    await expect(page.getByText('Payments are unavailable.').first()).toBeVisible()
  })

  test('clicking a row opens the payment', async ({ page }) => {
    await openList(page)
    await page.getByText('INV-1001').click()
    await expect(page).toHaveURL(/\/payments\/901$/)
  })

  test('the page is blocked without the view permission', async ({ page }) => {
    await seedSession(page, { permissions: [] })
    await mockApi(page)
    await page.goto('/payments')
    await expect(page).toHaveURL(/access-denied/)
  })
})

test.describe('Payment details - approve / reject', () => {
  const DETAIL = { id: 901, transaction_id: 'TXN-901', invoice_id: 'INV-1001', amount: '$499.00', status: 'Processing', can_approve: true }
  const NOTE = /Enter approval details or rejection reason/
  const PERMS = ['view payments', 'can approve payment']

  async function open(page: Page, permissions = PERMS, detail: Record<string, unknown> = DETAIL): Promise<ApiMock> {
    await seedSession(page, { permissions })
    const api = await mockApi(page, [{ method: 'GET', match: /\/common\/payments\/901$/, body: ok(detail) }])
    await page.goto('/payments/901')
    await expect(page.getByText('Payment Details').first()).toBeVisible()
    return api
  }
  const modal = (page: Page) => page.locator('.modal.show')

  test('approving asks for confirmation and posts the trimmed note', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: '/common/payments/901/approve', body: ok({ ...DETAIL, status: 'Paid', can_approve: false }, 'Payment approved successfully!') })
    await page.getByPlaceholder(NOTE).fill('  Wire ref 12345  ')
    await page.getByRole('button', { name: /approve payment/i }).click()
    await expect(modal(page).getByText('Confirm Payment Approval')).toBeVisible()
    await modal(page).getByRole('button', { name: /confirm & approve/i }).click()
    const call = await expectCall(api, 'POST', '/common/payments/901/approve')
    expect(call.json).toEqual({ note: 'Wire ref 12345' })
    await expect(page.getByText('Payment approved successfully!')).toBeVisible()
    // The decision panel disappears once the payment can no longer be approved.
    await expect(page.getByRole('button', { name: /approve payment/i })).toHaveCount(0)
  })

  test('approval can be cancelled from the confirmation', async ({ page }) => {
    const api = await open(page)
    await page.getByRole('button', { name: /approve payment/i }).click()
    await modal(page).getByRole('button', { name: 'Cancel' }).click()
    await expect(page.locator('.modal.show')).toHaveCount(0)
    expect(api.find('POST', '/approve')).toHaveLength(0)
  })

  test('rejecting without a note is blocked with an inline error', async ({ page }) => {
    const api = await open(page)
    await page.getByRole('button', { name: /reject payment/i }).click()
    await expect(page.getByText('Note / Rejection reason is required for rejection.')).toBeVisible()
    await expect(page.getByPlaceholder(NOTE)).toHaveClass(/is-invalid/)
    await expect(page.locator('.modal.show')).toHaveCount(0)
    expect(api.find('POST', '/reject')).toHaveLength(0)
  })

  test('a whitespace-only note does not count as a reason', async ({ page }) => {
    await open(page)
    await page.getByPlaceholder(NOTE).fill('    ')
    await page.getByRole('button', { name: /reject payment/i }).click()
    await expect(page.getByText('Note / Rejection reason is required for rejection.')).toBeVisible()
  })

  test('typing a note clears the error', async ({ page }) => {
    await open(page)
    await page.getByRole('button', { name: /reject payment/i }).click()
    await expect(page.getByText('Note / Rejection reason is required for rejection.')).toBeVisible()
    await page.getByPlaceholder(NOTE).fill('Wrong amount')
    await expect(page.getByText('Note / Rejection reason is required for rejection.')).toHaveCount(0)
  })

  test('rejecting with a reason confirms and posts it', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: '/common/payments/901/reject', body: ok({ ...DETAIL, status: 'Rejected', can_approve: false }, 'Payment rejected.') })
    await page.getByPlaceholder(NOTE).fill('Amount does not match the invoice')
    await page.getByRole('button', { name: /reject payment/i }).click()
    await expect(modal(page).getByText('Confirm Payment Rejection')).toBeVisible()
    await modal(page).getByRole('button', { name: /confirm & reject/i }).click()
    const call = await expectCall(api, 'POST', '/common/payments/901/reject')
    expect(call.json).toEqual({ reason: 'Amount does not match the invoice', note: 'Amount does not match the invoice' })
    await expect(page.getByText('Payment rejected.')).toBeVisible()
  })

  test('a failed approval shows the server message', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: '/common/payments/901/approve', status: 409, body: failure('Payment was already approved.') })
    await page.getByRole('button', { name: /approve payment/i }).click()
    await modal(page).getByRole('button', { name: /confirm & approve/i }).click()
    await expect(page.getByText('Payment was already approved.').first()).toBeVisible()
  })

  test('the decision panel is hidden without the approve permission', async ({ page }) => {
    await open(page, ['view payments'])
    await expect(page.getByRole('button', { name: /approve payment/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /reject payment/i })).toHaveCount(0)
  })

  test('the decision panel is hidden when the payment is not awaiting approval', async ({ page }) => {
    await open(page, PERMS, { ...DETAIL, status: 'Paid', can_approve: false })
    await expect(page.getByRole('button', { name: /approve payment/i })).toHaveCount(0)
  })
})

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
