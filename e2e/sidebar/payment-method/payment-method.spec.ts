import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, paginated, failure, seedSession, expectCall, type ApiMock } from '../../support/helpers'

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
