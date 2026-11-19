import { test, expect } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall, openProfileTab, profileTabNames } from '../../support/helpers'

/**
 * Partner profile › Commissions: the host sets a partner's Funding commission
 * tiers by how many of its clients' funding applications have been funded -
 * each tier a share (%) of the success fee or a flat amount ($) per deal,
 * picked in its Type dropdown - with PUT /admin/partners/{id}/commission.
 * The funding application's split opens at the tier for that deal.
 */

const PARTNER = {
  id: 5, entity_id: 5, full_name: 'Wile Coyote', company_name: 'Acme Funding', email: 'wile@acme.test', phone_number: '(444) 444-4444',
  partner_type: 'White-Label Partner (WL)', is_host: 0, status: 'active', country: 'United States', subscriptions: [],
  commission_tiers: [{ id: 1, min_count: 0, max_count: null, percentage: 20 }],
  funded_deal_count: 10,
}
const MANAGER = ['view partners', 'update partners', 'view commission', 'update commission']

test.describe('Partner profile - Commissions tab', () => {
  test('the host splits the rate into count tiers and sees the next deal\'s split', async ({ page }) => {
    await seedSession(page, { permissions: MANAGER })
    const api = await mockApi(page, [
      { method: 'GET', match: '/admin/partners-details/5', body: ok(PARTNER) },
      {
        method: 'PUT',
        match: '/admin/partners/5/commission',
        body: ok({
          id: 5,
          commission_tiers: [
            { id: 1, min_count: 0, max_count: 10, percentage: 20 },
            { id: 2, min_count: 11, max_count: null, percentage: 35 },
          ],
          funded_deal_count: 10,
        }, 'Partner commission updated successfully.'),
      },
    ])
    await page.goto('/partners/5')
    await openProfileTab(page, 'Commissions')

    await expect(page.getByLabel('Tier 1 commission (%)')).toHaveValue('20')
    // The first tier always starts at 0.
    await expect(page.getByLabel('Tier 1 from')).toHaveValue('0')
    await expect(page.getByLabel('Tier 1 from')).toHaveAttribute('readonly', '')
    await expect(page.getByRole('button', { name: 'Remove tier 1' })).toBeDisabled()
    await page.getByLabel('Tier 1 to').fill('10')
    await page.getByRole('button', { name: /add tier/i }).click()
    await expect(page.getByLabel('Tier 2 from')).toHaveValue('11')
    await page.getByLabel('Tier 2 commission (%)').fill('35')

    // 10 funded so far: the next deal (#11) is in the new tier.
    await expect(page.getByTestId('next-deal-tier')).toHaveText('10 funded so far. Deal #11 falls in tier 2 (11+).')
    await expect(page.getByTestId('commission-split-admin')).toHaveText('65%')

    await page.getByRole('button', { name: /save commission/i }).click()

    const call = await expectCall(api, 'PUT', '/admin/partners/5/commission')
    expect(call.json).toEqual({ tiers: [
      { min_count: 0, max_count: 10, commission_type: 'percentage', percentage: 20 },
      { min_count: 11, max_count: null, commission_type: 'percentage', percentage: 35 },
    ] })
    await expect(page.getByText('Partner commission updated successfully.')).toBeVisible()
  })

  test('a tier is switched to a flat amount in its Type dropdown and saved', async ({ page }) => {
    await seedSession(page, { permissions: MANAGER })
    const api = await mockApi(page, [
      { method: 'GET', match: '/admin/partners-details/5', body: ok(PARTNER) },
      {
        method: 'PUT',
        match: '/admin/partners/5/commission',
        body: ok({
          id: 5,
          commission_tiers: [
            { id: 1, min_count: 0, max_count: 10, commission_type: 'percentage', percentage: 20, amount: null },
            { id: 2, min_count: 11, max_count: null, commission_type: 'flat', percentage: null, amount: 750 },
          ],
          funded_deal_count: 10,
        }, 'Partner commission updated successfully.'),
      },
    ])
    await page.goto('/partners/5')
    await openProfileTab(page, 'Commissions')

    await expect(page.getByRole('button', { name: 'Tier 1 commission type' })).toHaveText('Percentage')
    await page.getByLabel('Tier 1 to').fill('10')
    await page.getByRole('button', { name: /add tier/i }).click()
    await page.getByRole('button', { name: 'Tier 2 commission type' }).click()
    await page.getByRole('button', { name: 'Flat Amount', exact: true }).click()
    await expect(page.getByLabel('Tier 2 commission (%)')).toHaveCount(0)
    await page.getByLabel('Tier 2 commission ($)').fill('750')

    // Deal #11 is in the flat tier: $750 of a $10,000 success fee is 7.5%.
    await expect(page.getByTestId('commission-split-partner')).toHaveText('7.5%')
    await expect(page.getByTestId('preview-partner-payout')).toHaveText('$750')

    await page.getByRole('button', { name: /save commission/i }).click()

    const call = await expectCall(api, 'PUT', '/admin/partners/5/commission')
    expect(call.json).toEqual({ tiers: [
      { min_count: 0, max_count: 10, commission_type: 'percentage', percentage: 20 },
      { min_count: 11, max_count: null, commission_type: 'flat', amount: 750 },
    ] })
    await expect(page.getByText('Partner commission updated successfully.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tier 2 commission type' })).toHaveText('Flat Amount')
  })

  test('a refused tier shows the API error under that tier', async ({ page }) => {
    await seedSession(page, { permissions: MANAGER })
    await mockApi(page, [
      { method: 'GET', match: '/admin/partners-details/5', body: ok(PARTNER) },
      {
        method: 'PUT',
        match: '/admin/partners/5/commission',
        status: 422,
        body: failure('Validation', { 'tiers.1.min_count': 'This tier must start at 11, right after the previous tier.' }),
      },
    ])
    await page.goto('/partners/5')
    await openProfileTab(page, 'Commissions')

    await page.getByLabel('Tier 1 to').fill('10')
    await page.getByRole('button', { name: /add tier/i }).click()
    await page.getByLabel('Tier 2 from').fill('15')
    await page.getByLabel('Tier 2 commission (%)').fill('30')
    await page.getByRole('button', { name: /save commission/i }).click()

    await expect(page.getByText('This tier must start at 11, right after the previous tier.')).toBeVisible()
    await expect(page.getByLabel('Tier 2 from')).toHaveClass(/is-invalid/)
  })

  test('without "update commission" the tiers are read-only', async ({ page }) => {
    await seedSession(page, { permissions: ['view partners', 'update partners', 'view commission'] })
    await mockApi(page, [{ method: 'GET', match: '/admin/partners-details/5', body: ok(PARTNER) }])
    await page.goto('/partners/5')
    await openProfileTab(page, 'Commissions')

    await expect(page.getByLabel('Tier 1 commission (%)')).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Tier 1 commission type' })).toBeDisabled()
    await expect(page.getByRole('button', { name: /add tier/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /save commission/i })).toHaveCount(0)
  })

  test('without "view commission" there is no Commissions tab', async ({ page }) => {
    await seedSession(page, { permissions: ['view partners', 'update partners'] })
    await mockApi(page, [{ method: 'GET', match: '/admin/partners-details/5', body: ok(PARTNER) }])
    await page.goto('/partners/5')

    const tabs = await profileTabNames(page)
    expect(tabs).toContain('Status & Agent')
    expect(tabs).not.toContain('Commissions')
  })
})
