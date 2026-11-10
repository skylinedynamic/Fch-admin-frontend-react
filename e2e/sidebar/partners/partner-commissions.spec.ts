import { test, expect } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall } from '../../support/helpers'

/**
 * Partner profile › Commissions: the host sets a partner's commission - its
 * share (%) of the success fee - with PUT /admin/partners/{id}/commission.
 * The funding application's commission split opens at it.
 */

const PARTNER = {
  id: 5, entity_id: 5, full_name: 'Wile Coyote', company_name: 'Acme Funding', email: 'wile@acme.test', phone_number: '(444) 444-4444',
  partner_type: 'White-Label Partner (WL)', is_host: 0, status: 'active', country: 'United States', subscriptions: [], commission: 20,
}
const MANAGER = ['view partners', 'update partners', 'view commission', 'update commission']

test.describe('Partner profile - Commissions tab', () => {
  test('the host saves a new commission and sees the split it gives', async ({ page }) => {
    await seedSession(page, { permissions: MANAGER })
    const api = await mockApi(page, [
      { method: 'GET', match: '/admin/partners-details/5', body: ok(PARTNER) },
      { method: 'PUT', match: '/admin/partners/5/commission', body: ok({ id: 5, commission: 35 }, 'Partner commission updated successfully.') },
    ])
    await page.goto('/partners/5')
    await page.getByRole('tab', { name: 'Commissions' }).click()

    const rate = page.getByLabel('Partner Commission (%)')
    await expect(rate).toHaveValue('20')
    await rate.fill('35')
    await expect(page.getByTestId('commission-split-admin')).toHaveText('65%')

    await page.getByRole('button', { name: /save commission/i }).click()

    const call = await expectCall(api, 'PUT', '/admin/partners/5/commission')
    expect(call.json).toEqual({ commission: 35 })
    await expect(page.getByText('Partner commission updated successfully.')).toBeVisible()
  })

  test('a refused commission shows the API error', async ({ page }) => {
    await seedSession(page, { permissions: MANAGER })
    await mockApi(page, [
      { method: 'GET', match: '/admin/partners-details/5', body: ok(PARTNER) },
      { method: 'PUT', match: '/admin/partners/5/commission', status: 422, body: failure('Validation', { commission: 'Commission must be a number.' }) },
    ])
    await page.goto('/partners/5')
    await page.getByRole('tab', { name: 'Commissions' }).click()

    await page.getByLabel('Partner Commission (%)').fill('40')
    await page.getByRole('button', { name: /save commission/i }).click()

    await expect(page.getByText('Commission must be a number.')).toBeVisible()
  })

  test('without "update commission" the rate is read-only', async ({ page }) => {
    await seedSession(page, { permissions: ['view partners', 'update partners', 'view commission'] })
    await mockApi(page, [{ method: 'GET', match: '/admin/partners-details/5', body: ok(PARTNER) }])
    await page.goto('/partners/5')
    await page.getByRole('tab', { name: 'Commissions' }).click()

    await expect(page.getByLabel('Partner Commission (%)')).toBeDisabled()
    await expect(page.getByRole('button', { name: /save commission/i })).toHaveCount(0)
  })

  test('without "view commission" there is no Commissions tab', async ({ page }) => {
    await seedSession(page, { permissions: ['view partners', 'update partners'] })
    await mockApi(page, [{ method: 'GET', match: '/admin/partners-details/5', body: ok(PARTNER) }])
    await page.goto('/partners/5')

    await expect(page.getByRole('tab', { name: 'Status & Agent' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Commissions' })).toHaveCount(0)
  })
})
