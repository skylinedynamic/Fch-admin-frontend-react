import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, paginated, failure, seedSession, expectCall, type ApiMock } from '../../support/helpers'

test.describe('Upcoming billing details', () => {
  const DETAIL = '/common/billing/401'
  const INVOICES = '/common/invoices/fetch-invoices'
  const partner = (over: Record<string, unknown> = {}) => ({
    entity_type: 'Partner', entity_id: 5,
    subscriber: { full_name: 'Acme Funding', email: 'acme@example.test', phone: '555-0100', company_name: 'Acme LLC' },
    subscription: { status: 'Active' }, upcoming_billing: null, ...over,
  })
  const INVOICE_ROWS = [
    { id: 1001, invoice_id: 'INV-1001', created_at: '2026-02-01', displayable_payment_amount: '$299.00', type: 'Platform Fee', status: 'Paid' },
  ]

  async function open(page: Page, detail: unknown = ok(partner()), invoices: unknown = paginated(INVOICE_ROWS), user: Record<string, unknown> = { permissions: ['view subscriptions', 'view invoices'] }): Promise<ApiMock> {
    await seedSession(page, user)
    const api = await mockApi(page, [
      { method: 'GET', match: DETAIL, body: detail },
      { method: 'POST', match: INVOICES, body: invoices },
    ])
    await page.goto('/billing/401')
    return api
  }

  test('a partner subscriber links to the partner profile', async ({ page }) => {
    const api = await open(page)
    await expectCall(api, 'GET', DETAIL)
    await expect(page.getByRole('link', { name: 'Acme Funding' })).toHaveAttribute('href', '/partners/5')
    await expect(page.getByText('acme@example.test').first()).toBeVisible()
    await expect(page.getByText('Acme LLC')).toBeVisible()
  })

  test('a borrower subscriber is named from first and last name and links to the client', async ({ page }) => {
    await open(page, ok(partner({ entity_type: 'Borrower', entity_id: 7, subscriber: { first_name: 'Jane', last_name: 'Doe', email: 'jane@example.test' } })))
    await expect(page.getByRole('link', { name: 'Jane Doe' })).toHaveAttribute('href', '/clients/7')
  })

  test('an unknown subscriber type shows the name without a link', async ({ page }) => {
    await open(page, ok(partner({ entity_type: 'User', entity_id: 9, subscriber: { first_name: 'Sam', last_name: 'Lee', email: 's@example.test' } })))
    await expect(page.locator('h4', { hasText: 'Sam Lee' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Sam Lee' })).toHaveCount(0)
  })

  test('requests the invoices of this subscription, newest first', async ({ page }) => {
    const api = await open(page)
    const call = await expectCall(api, 'POST', INVOICES)
    expect(call.json).toMatchObject({ subscription_id: '401', page: 1, per_page: 10, sort_field: 'created_at', sort_order: 'desc' })
    await expect(page.getByText('INV-1001')).toBeVisible()
  })

  test('no invoices shows the empty state', async ({ page }) => {
    await open(page, ok(partner()), paginated([]))
    await expect(page.getByText('No invoices found.')).toBeVisible()
  })

  test('a status:false response is reported and shows not found', async ({ page }) => {
    await open(page, failure('Billing not found'))
    await expect(page.locator('.Toastify').getByText('Billing not found').first()).toBeVisible()
    await expect(page.getByText('Subscriber details not found.')).toBeVisible()
  })

  test('the page is blocked without the view permission', async ({ page }) => {
    await open(page, ok(partner()), paginated([]), { permissions: [] })
    await expect(page).toHaveURL(/access-denied/)
  })
})
