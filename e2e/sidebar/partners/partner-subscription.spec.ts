import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, seedSession } from '../../support/helpers'

/**
 * Partners › a partner › Subscription: a partner has one subscription, shown
 * as its details - not as a one-row table. The API is mocked; nothing is
 * written.
 */
const SUBSCRIPTION = {
  id: 170,
  partner_type: 'White-Label Partner (WL)',
  enrollment_type: 'Installment',
  total_subscription_amount: '$6,696.70',
  payable_amount: '$7,696.70',
  monthly_platform_fee: '$399.00',
  subscription_start_date: '2026-10-21',
  subscription_end_date: '2026-11-21',
  status: 'Active',
}

const partner = (subscriptions: unknown[]) => ({
  id: 21, user_id: 77, company_name: 'Pentagon Funding Group', full_name: 'Pat Partner', email: 'owner@pentagon.test',
  partner_type: 'White-Label Partner (WL)', is_host: 0, has_sign: true, status: 'active', country: 'United States', subscriptions,
})

async function openTab(page: Page, subscriptions: unknown[]) {
  await page.setViewportSize({ width: 2400, height: 900 })
  await seedSession(page, { id: 1, is_host: 1, partner_id: 1, entity_type: 'Partner', permissions: ['view partners', 'update partners'] })
  await mockApi(page, [{ method: 'GET', match: '/admin/partners-details/21', body: ok(partner(subscriptions)) }])
  await page.goto('/partners/21?tab=subscription')
}

const value = (page: Page, label: string) => page.locator('dt', { hasText: label }).locator('xpath=following-sibling::dd[1]')

test.describe('Partner profile - Subscription', () => {
  test('shows the one subscription as details, with no table', async ({ page }) => {
    await openTab(page, [SUBSCRIPTION])

    await expect(value(page, 'Enrollment Type')).toHaveText('Installment')
    await expect(value(page, 'Total Amount')).toHaveText('$7,696.70')
    await expect(value(page, 'Installment Balance')).toHaveText('$6,696.70')
    await expect(value(page, 'Platform Fee')).toHaveText('$399.00')
    await expect(value(page, 'End Date')).toHaveText('2026-11-21')
    await expect(value(page, 'Status')).toHaveText('Active')
    await expect(page.locator('.tab-pane table')).toHaveCount(0)
  })

  test('says so when the partner has no subscription', async ({ page }) => {
    await openTab(page, [])

    await expect(page.getByText('No subscription found')).toBeVisible()
  })
})
