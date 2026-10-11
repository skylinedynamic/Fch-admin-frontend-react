import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, paginated, failure, seedSession, expectCall, type ApiMock } from './helpers'

test.describe('Subscriptions', () => {
  const SUBS = [
    { id: 1101, subscriber_name: 'Acme Funding', entity_type: 'Partner', enrollment_type: 'Monthly', payable_amount: '499.00', subscription_start_date: '2026-01-01', subscription_end_date: '2026-12-31', created_at: '2026-01-01', status: 'Active' },
    { id: 1102, subscriber_name: 'Johnathan Smithfield', entity_type: 'Borrower', enrollment_type: 'Installment', payable_amount: '1200.00', subscription_start_date: '2026-02-01', subscription_end_date: '2026-08-01', created_at: '2026-02-01', status: 'Expired' },
  ]
  const LIST = '/common/subscriptions/fetch-all'

  async function openList(page: Page): Promise<ApiMock> {
    await seedSession(page, { permissions: ['view subscriptions'] })
    const api = await mockApi(page, [{ method: 'POST', match: LIST, body: paginated(SUBS) }])
    await page.goto('/subscriptions')
    await expect(page.getByText('Acme Funding')).toBeVisible()
    return api
  }

  test('lists subscriptions with entity type and status', async ({ page }) => {
    await openList(page)
    const row = page.locator('tr', { hasText: 'Johnathan Smithfield' })
    await expect(row.getByText('Borrower')).toBeVisible()
    await expect(row.getByText('Expired')).toBeVisible()
  })

  test('search is sent to the API', async ({ page }) => {
    const api = await openList(page)
    await page.getByPlaceholder('Search subscriptions...').fill('acme')
    await page.getByPlaceholder('Search subscriptions...').press('Enter')
    await expect.poll(() => api.find('POST', LIST).some((c) => c.json?.search === 'acme')).toBe(true)
  })

  test('shows the empty state', async ({ page }) => {
    await seedSession(page, { permissions: ['view subscriptions'] })
    await mockApi(page, [{ method: 'POST', match: LIST, body: paginated([]) }])
    await page.goto('/subscriptions')
    await expect(page.getByText('No subscriptions found')).toBeVisible()
  })

  test('a failed list request is reported', async ({ page }) => {
    await seedSession(page, { permissions: ['view subscriptions'] })
    await mockApi(page, [{ method: 'POST', match: LIST, body: failure('Subscriptions are unavailable.') }])
    await page.goto('/subscriptions')
    await expect(page.getByText('Subscriptions are unavailable.').first()).toBeVisible()
  })

  test('clicking a row opens the subscription', async ({ page }) => {
    await openList(page)
    await page.getByText('Acme Funding').click()
    await expect(page).toHaveURL(/\/subscriptions\/1101$/)
  })

  test('the page is blocked without the view permission', async ({ page }) => {
    await seedSession(page, { permissions: [] })
    await mockApi(page)
    await page.goto('/subscriptions')
    await expect(page).toHaveURL(/access-denied/)
  })
})

test.describe('Upcoming billing', () => {
  const ROWS = [
    { id: 1, subscription_id: 1101, subscriber_name: 'Acme Funding', upcoming_billing_type: 'Platform Fee', upcoming_billing_amount: '499.00', upcoming_billing_date: '2026-04-01', outstanding_amount: '0.00', enrollment_type: 'Monthly', status: 'Active' },
  ]
  const LIST = '/common/billing/fetch-upcoming'

  async function openList(page: Page): Promise<ApiMock> {
    await seedSession(page, { permissions: ['view subscriptions'] })
    const api = await mockApi(page, [{ method: 'POST', match: LIST, body: paginated(ROWS, { window_days: 30 }) }])
    await page.goto('/billing')
    await expect(page.getByText('Acme Funding')).toBeVisible()
    return api
  }

  test('lists upcoming charges', async ({ page }) => {
    await openList(page)
    await expect(page.locator('tr', { hasText: 'Acme Funding' }).getByText('Monthly')).toBeVisible()
  })

  test('the default request applies no entity-type filter', async ({ page }) => {
    const api = await openList(page)
    expect(api.find('POST', LIST)[0].json).not.toHaveProperty('entity_type')
  })

  test('search is sent to the API', async ({ page }) => {
    const api = await openList(page)
    await page.getByPlaceholder('Search by name, email...').fill('acme')
    await page.locator('button.btn-warning').click()
    await expect.poll(() => api.find('POST', LIST).some((c) => c.json?.search === 'acme')).toBe(true)
  })

  test('shows the empty state', async ({ page }) => {
    await seedSession(page, { permissions: ['view subscriptions'] })
    await mockApi(page, [{ method: 'POST', match: LIST, body: paginated([]) }])
    await page.goto('/billing')
    await expect(page.getByText('No upcoming billing found')).toBeVisible()
  })

  test('a failed list request is reported', async ({ page }) => {
    await seedSession(page, { permissions: ['view subscriptions'] })
    await mockApi(page, [{ method: 'POST', match: LIST, body: failure('Billing is unavailable.') }])
    await page.goto('/billing')
    await expect(page.getByText('Billing is unavailable.').first()).toBeVisible()
  })

  test('clicking a row opens the billing detail by subscription id', async ({ page }) => {
    await openList(page)
    await page.getByText('Acme Funding').click()
    await expect(page).toHaveURL(/\/billing\/1101$/)
  })
})

test.describe('Commissions', () => {
  const ROWS = [
    { id: 1201, date: '2026-03-01', borrower: 'Johnathan Smithfield', partner: 'Acme Funding', commission_status: 'Approved', requested_amount: 100000, funded_amount: 90000, admin_commission_amount: 4500, partner_commission_amount: 2700, payment_status: 'Unpaid' },
  ]
  const LIST = /\/common\/commissions$/

  async function openList(page: Page, user: Record<string, unknown> = { permissions: ['view commission'] }): Promise<ApiMock> {
    await seedSession(page, user)
    const api = await mockApi(page, [{ method: 'POST', match: LIST, body: paginated(ROWS) }])
    await page.goto('/commissions')
    await expect(page.getByText('Johnathan Smithfield')).toBeVisible()
    return api
  }

  test('a host sees the partner and admin commission columns', async ({ page }) => {
    await openList(page)
    await expect(page.getByRole('columnheader', { name: /^Partner$/ })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Admin Comm\./ })).toBeVisible()
  })

  test('a partner does not see the partner or admin commission columns', async ({ page }) => {
    await openList(page, { permissions: ['view commission'], is_host: false, partner_id: 5 })
    await expect(page.getByRole('columnheader', { name: /Admin Comm\./ })).toHaveCount(0)
    await expect(page.getByRole('columnheader', { name: /^Partner$/ })).toHaveCount(0)
    await expect(page.getByRole('columnheader', { name: /Partner Comm\./ })).toBeVisible()
  })

  test('search is sent to the API and Clear resets it', async ({ page }) => {
    const api = await openList(page)
    await page.getByPlaceholder('Search borrower or ID...').fill('smith')
    await page.locator('button', { hasText: 'Filters' }).click()
    await expect.poll(() => JSON.stringify(api.find('POST', LIST).at(-1)?.json ?? {})).toContain('smith')
    await page.locator('button', { hasText: 'Clear' }).click()
    await expect(page.getByPlaceholder('Search borrower or ID...')).toHaveValue('')
  })

  test('shows the empty state', async ({ page }) => {
    await seedSession(page, { permissions: ['view commission'] })
    await mockApi(page, [{ method: 'POST', match: LIST, body: paginated([]) }])
    await page.goto('/commissions')
    await expect(page.getByText('No commissions found')).toBeVisible()
  })

  test('clicking a row opens the commission', async ({ page }) => {
    await openList(page)
    await page.getByText('Johnathan Smithfield').click()
    await expect(page).toHaveURL(/\/commissions\/1201$/)
  })

  test('the page is blocked without the view permission', async ({ page }) => {
    await seedSession(page, { permissions: [] })
    await mockApi(page)
    await page.goto('/commissions')
    await expect(page).toHaveURL(/access-denied/)
  })
})

// Gateways and plan fees are reserved for the host partner account (is_host + entity_type Partner).
const HOST_PARTNER = { is_host: 1, entity_type: 'Partner', entity_id: 1 }

test.describe('Payment gateways', () => {
  const PROVIDERS = [
    { id: 1, name: 'Stripe', logo: '', status: true },
    { id: 2, name: 'Bank Transfer', logo: '', status: false },
  ]

  async function open(page: Page): Promise<ApiMock> {
    await seedSession(page, HOST_PARTNER)
    const api = await mockApi(page, [{ method: 'GET', match: '/admin/payment-methods', body: ok(PROVIDERS) }])
    await page.goto('/payment-methods')
    await expect(page.getByRole('heading', { name: 'Stripe' })).toBeVisible()
    return api
  }
  const modal = (page: Page) => page.locator('.modal', { hasText: 'Confirm Status Change' })

  test('lists gateways with their enabled state', async ({ page }) => {
    await open(page)
    await expect(page.locator('#provider-status-1')).toBeChecked()
    await expect(page.locator('#provider-status-2')).not.toBeChecked()
    await expect(page.locator('.payment-method-row', { hasText: 'Bank Transfer' }).getByText('Disabled')).toBeVisible()
  })

  test('disabling a gateway asks for confirmation and posts status=false', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: '/admin/payment-methods/1', body: ok(null) })
    await page.locator('#provider-status-1').click()
    await expect(modal(page).getByText('Immediate Checkout Impact')).toBeVisible()
    await modal(page).getByRole('button', { name: 'Disable Gateway' }).click()
    const call = await expectCall(api, 'POST', '/admin/payment-methods/1')
    expect(call.json).toEqual({ status: false })
    await expect(page.getByText('Stripe status updated successfully.')).toBeVisible()
    await expect(page.locator('#provider-status-1')).not.toBeChecked()
  })

  test('enabling a gateway posts status=true', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: '/admin/payment-methods/2', body: ok(null) })
    await page.locator('#provider-status-2').click()
    await modal(page).getByRole('button', { name: 'Enable Gateway' }).click()
    const call = await expectCall(api, 'POST', '/admin/payment-methods/2')
    expect(call.json).toEqual({ status: true })
    await expect(page.locator('#provider-status-2')).toBeChecked()
  })

  test('Cancel leaves the gateway unchanged', async ({ page }) => {
    const api = await open(page)
    await page.locator('#provider-status-1').click()
    await modal(page).getByRole('button', { name: 'Cancel' }).click()
    await expect(page.locator('#provider-status-1')).toBeChecked()
    expect(api.find('POST', '/admin/payment-methods/')).toHaveLength(0)
  })

  test('a status:false response keeps the switch as it was', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: '/admin/payment-methods/1', body: failure('At least one gateway must stay enabled.') })
    await page.locator('#provider-status-1').click()
    await modal(page).getByRole('button', { name: 'Disable Gateway' }).click()
    await expect(page.getByText('At least one gateway must stay enabled.').first()).toBeVisible()
    await expect(page.locator('#provider-status-1')).toBeChecked()
  })

  test('a server error is reported', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: '/admin/payment-methods/1', status: 500, body: failure('boom') })
    await page.locator('#provider-status-1').click()
    await modal(page).getByRole('button', { name: 'Disable Gateway' }).click()
    await expect(page.getByText('Error updating provider status')).toBeVisible()
  })

  test('a failed load is reported', async ({ page }) => {
    await seedSession(page, HOST_PARTNER)
    await mockApi(page, [{ method: 'GET', match: '/admin/payment-methods', body: failure('Gateways are unavailable.') }])
    await page.goto('/payment-methods')
    await expect(page.getByText('Gateways are unavailable.').first()).toBeVisible()
  })
})

test.describe('Plan & fee', () => {
  test('a failed plan load is reported', async ({ page }) => {
    await seedSession(page, HOST_PARTNER)
    await mockApi(page, [{ method: 'POST', match: '/admin/plan-fee/fetch-subscription-plans', body: failure('Plans are unavailable.') }])
    await page.goto('/plan-and-fee')
    await expect(page.getByText('Plans are unavailable.').first()).toBeVisible()
  })

  test('the plans are requested on load', async ({ page }) => {
    await seedSession(page, HOST_PARTNER)
    const api = await mockApi(page, [{ method: 'POST', match: '/admin/plan-fee/fetch-subscription-plans', body: ok([]) }])
    await page.goto('/plan-and-fee')
    await expectCall(api, 'POST', '/admin/plan-fee/fetch-subscription-plans')
  })

  test('a host employee who is not the partner account is redirected away', async ({ page }) => {
    await seedSession(page, { is_host: 1, entity_type: 'Employee' })
    await mockApi(page)
    await page.goto('/plan-and-fee')
    await expect(page).not.toHaveURL(/plan-and-fee/)
  })
})
