import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, paginated, failure, seedSession, expectCall, type ApiMock } from '../../support/helpers'

test.describe('Subscription details', () => {
  const DETAIL = '/common/subscriptions/301'
  const INVOICES = '/common/invoices/fetch-invoices'
  const sub = (over: Record<string, unknown> = {}) => ({
    id: 301, entity_type: 'Partner', subscription_title: 'White-Label Plan', status: 'Active',
    subscriber_name: 'Acme Funding', subscriber_email: 'acme@example.test', company_name: 'Acme LLC',
    subscription_start_date: '2026-01-01', subscription_end_date: '2026-12-31', first_payment_date: '2026-01-05',
    down_payment: '$1,000.00', monthly_platform_fee: '$299.00', user_seats: 3, per_seat_amount: '$25.00',
    borrower_fee_amount: '$10.00', installment_type: 0, ...over,
  })
  const INVOICE_ROWS = [
    { id: 1001, invoice_id: 'INV-1001', created_at: '2026-02-01', displayable_payment_amount: '$299.00', type: 'Platform Fee', status: 'Paid' },
  ]

  async function open(page: Page, detail: unknown = ok(sub()), invoices: unknown = paginated(INVOICE_ROWS), user: Record<string, unknown> = { permissions: ['view subscriptions', 'view invoices'] }): Promise<ApiMock> {
    await seedSession(page, user)
    const api = await mockApi(page, [
      { method: 'GET', match: DETAIL, body: detail },
      { method: 'POST', match: INVOICES, body: invoices },
    ])
    await page.goto('/subscriptions/301')
    return api
  }

  test('shows the subscriber, plan and fees', async ({ page }) => {
    const api = await open(page)
    await expectCall(api, 'GET', DETAIL)
    await expect(page.getByRole('heading', { name: 'Acme Funding' })).toBeVisible()
    await expect(page.getByText('acme@example.test')).toBeVisible()
    await expect(page.getByText('White-Label Plan')).toBeVisible()
    await expect(page.getByText('Acme LLC')).toBeVisible()
    await expect(page.getByText('$299.00').first()).toBeVisible()
    await expect(page.getByText('3 Seats')).toBeVisible()
  })

  test('loads the invoices of this subscription only', async ({ page }) => {
    const api = await open(page)
    const call = await expectCall(api, 'POST', INVOICES)
    expect(call.json).toMatchObject({ subscription_id: '301', sort_field: 'created_at', sort_order: 'desc' })
    await expect(page.getByText('INV-1001')).toBeVisible()
  })

  test('an invoice row opens the invoice', async ({ page }) => {
    await open(page)
    await page.getByTitle('View Invoice').click()
    await expect(page).toHaveURL(/\/invoices\/1001$/)
  })

  test('no invoices shows the ledger empty state', async ({ page }) => {
    await open(page, ok(sub()), paginated([]))
    await expect(page.getByText('No invoices found for this subscription.')).toBeVisible()
  })

  test('a borrower subscription is labelled as a borrower', async ({ page }) => {
    await open(page, ok(sub({ entity_type: 'Borrower', subscription_title: null, company_name: null })))
    await expect(page.getByText('Borrower Subscription')).toBeVisible()
  })

  test('a status:false response is reported and shows not found', async ({ page }) => {
    const api = await open(page, failure('Subscription not found'))
    await expectCall(api, 'GET', DETAIL)
    await expect(page.locator('.Toastify').getByText('Subscription not found').first()).toBeVisible()
    await expect(page.getByText('Subscription details not found.')).toBeVisible()
    expect(api.find('POST', INVOICES)).toHaveLength(0)
  })

  test('the page is blocked without the view permission', async ({ page }) => {
    await open(page, ok(sub()), paginated([]), { permissions: [] })
    await expect(page).toHaveURL(/access-denied/)
  })
})
