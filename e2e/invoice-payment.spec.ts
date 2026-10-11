import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall, type ApiMock } from './helpers'

/**
 * Paying an invoice from its details page: Pay Now loads the partner's payment
 * providers, a bank transfer or a cash payment is submitted to /payment/process.
 * The same dialog is used when buying extra user seats. payments-invoices.spec.ts
 * covers the invoice list and the details page itself.
 */

const INVOICE = {
  id: 1001, created_at: '2026-03-01', invoice_id: 'INV-1001', customer_name: 'Acme Funding', entity_type: 'Partner',
  payment_amount: '$499.00', displayable_payment_amount: '$499.00', type: 'Subscription', status: 'Unpaid',
}
const BANK = {
  id: 6, name: 'Bank Transfer',
  bank_details: [
    { id: 71, bank_name: 'First National', account_name: 'FCF Operating', account_number: '000123456', is_default: false },
    { id: 72, bank_name: 'Second Street Bank', account_name: 'FCF Payments', account_number: '000987654', is_default: true },
  ],
}
const CASH = { id: 5, name: 'Cash Payment' }
const PARTNER = { permissions: ['view invoices'], is_host: 0, partner_id: 5, entity_type: 'Partner', entity_id: 5 }

async function open(page: Page, providers: unknown = [BANK, CASH], user: Record<string, unknown> = PARTNER, invoice: Record<string, unknown> = INVOICE): Promise<ApiMock> {
  await seedSession(page, user)
  const api = await mockApi(page, [
    { method: 'GET', match: /\/common\/invoices\/1001$/, body: ok(invoice) },
    { method: 'GET', match: '/payment/get-payment-methods', body: Array.isArray(providers) ? ok(providers) : providers },
  ])
  await page.goto('/invoices/1001')
  await expect(page.getByRole('button', { name: /download pdf/i })).toBeVisible()
  return api
}

const modal = (page: Page) => page.locator('.ppm-modal.show')
const payNow = (page: Page) => page.getByRole('button', { name: /pay now/i })

test.describe('Invoice payment - who can pay', () => {
  test('a partner sees Pay Now on an unpaid partner invoice', async ({ page }) => {
    await open(page)
    await expect(payNow(page)).toBeVisible()
  })

  test('the host does not pay invoices', async ({ page }) => {
    await open(page, [BANK], { permissions: ['view invoices'] })
    await expect(payNow(page)).toHaveCount(0)
  })

  test('a paid invoice has no Pay Now', async ({ page }) => {
    await open(page, [BANK], PARTNER, { ...INVOICE, status: 'Paid' })
    await expect(payNow(page)).toHaveCount(0)
  })

  test('an invoice already being processed has no Pay Now', async ({ page }) => {
    await open(page, [BANK], PARTNER, { ...INVOICE, status: 'Processing' })
    await expect(payNow(page)).toHaveCount(0)
  })
})

test.describe('Invoice payment - providers', () => {
  test('Pay Now loads the payment providers', async ({ page }) => {
    const api = await open(page)
    await payNow(page).click()
    await expectCall(api, 'GET', '/payment/get-payment-methods')
    await expect(modal(page)).toContainText('Select Payment Method')
    await expect(modal(page)).toContainText('INV-1001')
    await expect(modal(page).locator('.pps-card-name', { hasText: 'Bank Transfer' })).toBeVisible()
    await expect(modal(page).locator('.pps-card-name', { hasText: 'Cash Payment' })).toBeVisible()
  })

  test('says so when no provider is active', async ({ page }) => {
    await open(page, [])
    await payNow(page).click()
    await expect(modal(page).getByText('No active payment providers are available.')).toBeVisible()
  })

  test('a failed provider load shows the message', async ({ page }) => {
    await open(page, { status: false, message: 'Payments are disabled for this partner.', data: [] })
    await payNow(page).click()
    await expect(modal(page).locator('.alert-danger')).toHaveText('Payments are disabled for this partner.')
  })

  test('a single provider is chosen automatically', async ({ page }) => {
    await open(page, [BANK])
    await payNow(page).click()
    await expect(modal(page)).toContainText('Complete Payment')
    await expect(modal(page)).toContainText('Second Street Bank')
  })
})

test.describe('Invoice payment - bank transfer', () => {
  async function chooseBank(page: Page): Promise<ApiMock> {
    const api = await open(page)
    await payNow(page).click()
    await modal(page).locator('.pps-card-name', { hasText: 'Bank Transfer' }).click()
    await expect(modal(page)).toContainText('First National')
    return api
  }

  test('lists the bank accounts to transfer to', async ({ page }) => {
    await chooseBank(page)
    await expect(modal(page)).toContainText('FCF Operating')
    await expect(modal(page)).toContainText('000987654')
  })

  test('Confirm Payment submits the default account and the reference number', async ({ page }) => {
    const api = await chooseBank(page)
    api.add({ method: 'POST', match: '/payment/process', body: ok(null) })
    await modal(page).getByPlaceholder('Enter wire or transfer reference number').fill('  WIRE-5521  ')
    await modal(page).getByRole('button', { name: /confirm payment/i }).click()
    const call = await expectCall(api, 'POST', '/payment/process')
    expect(call.json).toMatchObject({ invoice_id: 1001, payment_method_id: 6, bank_detail_id: 72 })
    expect(JSON.parse(call.json.payment_token)).toEqual({ gateway: 'Bank Transfer', mode: 'manual', bank_detail_id: 72, transaction_number: 'WIRE-5521' })
    await expect(modal(page)).toContainText('Payment Confirmation')
  })

  test('a failed submission keeps the form and shows the message', async ({ page }) => {
    const api = await chooseBank(page)
    api.add({ method: 'POST', match: '/payment/process', status: 422, body: failure('This invoice has already been paid.') })
    await modal(page).getByRole('button', { name: /confirm payment/i }).click()
    await expect(page.getByText('This invoice has already been paid.').first()).toBeVisible()
    await expect(modal(page).getByRole('button', { name: /confirm payment/i })).toBeVisible()
  })

  test('the back arrow returns to the provider list', async ({ page }) => {
    await chooseBank(page)
    await modal(page).locator('.ppm-card-header .btn-link').click()
    await expect(modal(page)).toContainText('Select Payment Method')
  })
})

test.describe('Invoice payment - cash', () => {
  async function chooseCash(page: Page): Promise<ApiMock> {
    const api = await open(page)
    await payNow(page).click()
    await modal(page).locator('.pps-card-name', { hasText: 'Cash Payment' }).click()
    await expect(modal(page)).toContainText('Complete Payment')
    return api
  }

  test('Confirm Payment submits a manual payment for review', async ({ page }) => {
    const api = await chooseCash(page)
    api.add({ method: 'POST', match: '/payment/process', body: ok(null) })
    await modal(page).getByRole('button', { name: /confirm payment/i }).click()
    const call = await expectCall(api, 'POST', '/payment/process')
    expect(call.json).toMatchObject({ invoice_id: 1001, payment_method_id: 5 })
    expect(JSON.parse(call.json.payment_token)).toMatchObject({ gateway: 'Cash Payment', mode: 'manual' })
    await expect(modal(page)).toContainText('Payment Confirmation')
  })

  // KNOWN BUG (InvoicePaymentModal.jsx, ManualProcessingNoticeView): the
  // /payment/process call is wrapped in its own try/catch that only logs, so a
  // rejected manual payment still shows the "Payment Confirmation" receipt and
  // tells the payer administration is reviewing it. Remove test.fail() once
  // the error reaches the user.
  test('a rejected cash payment is not reported as submitted', async ({ page }) => {
    test.fail()
    const api = await chooseCash(page)
    api.add({ method: 'POST', match: '/payment/process', status: 422, body: failure('Cash payments are not accepted for this invoice.') })
    await modal(page).getByRole('button', { name: /confirm payment/i }).click()
    await expectCall(api, 'POST', '/payment/process')
    await expect(page.getByText('Cash payments are not accepted for this invoice.').first()).toBeVisible({ timeout: 3000 })
    await expect(modal(page)).not.toContainText('Payment Confirmation')
  })
})
