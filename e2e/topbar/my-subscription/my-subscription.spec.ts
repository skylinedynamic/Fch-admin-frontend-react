import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall, type ApiMock } from '../../support/helpers'

test.describe('My subscription', () => {
  // Only a non-host partner account that has reached its first payment date can open this page.
  const PARTNER = { is_host: 0, partner_id: 5, entity_type: 'Partner', entity_id: 5, first_payment_date: '2026-01-01' }
  const DATA = {
    subscription: { id: 1, status: 'Active', enrollment_type: 'Monthly', payable_amount: '$499.00', monthly_platform_fee: '$99.00', subscription_start_date: '2026-01-01', subscription_end_date: '2026-12-31' },
    recent_payments: [], partner: { id: 5 },
  }
  const DETAILS = /\/common\/my-subscription$/
  const CANCEL = '/common/my-subscription/cancel-subscription'

  async function open(page: Page, data: Record<string, unknown> = DATA): Promise<ApiMock> {
    await seedSession(page, PARTNER)
    const api = await mockApi(page, [{ method: 'GET', match: DETAILS, body: ok(data) }])
    await page.goto('/my-subscription')
    await expect(page.getByText(/Active Subscription Plan:/)).toBeVisible()
    return api
  }
  const modal = (page: Page) => page.locator('.modal.show')

  test('shows the plan, amounts and an empty payment history', async ({ page }) => {
    await open(page)
    await expect(page.getByText('Active Subscription Plan: Monthly')).toBeVisible()
    await expect(page.getByText('$499.00').first()).toBeVisible()
    await expect(page.getByText('No payment history found')).toBeVisible()
  })

  // BUG-194: the $800 fee reads "Client Activation Fee" in Recent Payments History, as the API names it.
  test('payment history names the per-client fee Client Activation Fee', async ({ page }) => {
    await open(page, {
      ...DATA,
      recent_payments: [
        { id: 7, invoice_no: 'INV-FEE-1', invoice_type: 'borrower_fee', invoice_type_label: 'Client Activation Fee', amount: '$800.00', status: 'SUCCEEDED', created_at: '2026-03-01' },
      ],
    })
    const row = page.locator('tr', { hasText: 'INV-FEE-1' })
    await expect(row).toContainText('Client Activation Fee')
    await expect(row).not.toContainText('Borrower Fee')
  })

  test('cancelling asks for confirmation and can be backed out of', async ({ page }) => {
    const api = await open(page)
    await page.getByRole('button', { name: /cancel subscription/i }).click()
    await expect(modal(page).getByText(/Are you sure you want to cancel your partner subscription/)).toBeVisible()
    await modal(page).getByRole('button', { name: 'Keep Subscription' }).click()
    await expect(page.locator('.modal.show')).toHaveCount(0)
    expect(api.find('POST', CANCEL)).toHaveLength(0)
  })

  test('confirming cancels the subscription and reloads the details', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: CANCEL, body: ok(null) })
    const before = api.find('GET', DETAILS).length
    await page.getByRole('button', { name: /cancel subscription/i }).click()
    await modal(page).getByRole('button', { name: 'Yes, Cancel Subscription' }).click()
    await expectCall(api, 'POST', CANCEL)
    await expect(page.getByText('Subscription cancelled successfully')).toBeVisible()
    await expect.poll(() => api.find('GET', DETAILS).length).toBeGreaterThan(before)
  })

  test('a failed cancellation shows the server message', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: CANCEL, status: 422, body: failure('You have an unpaid invoice.') })
    await page.getByRole('button', { name: /cancel subscription/i }).click()
    await modal(page).getByRole('button', { name: 'Yes, Cancel Subscription' }).click()
    await expect(page.getByText('You have an unpaid invoice.').first()).toBeVisible()
  })

  test('an already cancelled subscription cannot be cancelled again', async ({ page }) => {
    await open(page, { ...DATA, subscription: { ...DATA.subscription, status: 'Cancelled' } })
    await expect(page.getByRole('button', { name: /cancel subscription/i })).toHaveCount(0)
  })

  test('a load failure shows the server message', async ({ page }) => {
    await seedSession(page, PARTNER)
    await mockApi(page, [{ method: 'GET', match: DETAILS, status: 500, body: failure('Subscription service unavailable.') }])
    await page.goto('/my-subscription')
    await expect(page.getByText('Subscription service unavailable.').first()).toBeVisible()
  })

  test('the host is redirected away from the partner subscription page', async ({ page }) => {
    await seedSession(page)
    await mockApi(page)
    await page.goto('/my-subscription')
    await expect(page).not.toHaveURL(/my-subscription/)
  })

  test('a partner without a first payment date is redirected away', async ({ page }) => {
    await seedSession(page, { ...PARTNER, first_payment_date: null })
    await mockApi(page)
    await page.goto('/my-subscription')
    await expect(page).not.toHaveURL(/my-subscription/)
  })
})
