import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, paginated, failure, seedSession, expectCall, type ApiMock } from '../../support/helpers'

const HOST_PARTNER = { is_host: 1, entity_type: 'Partner', entity_id: 1 }

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
