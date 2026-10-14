import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, paginated, failure, seedSession, expectCall, type ApiMock } from '../../support/helpers'

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
