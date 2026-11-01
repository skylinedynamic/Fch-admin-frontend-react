import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, seedSession, expectCall, HOST_USER } from '../../support/helpers'

/**
 * Saving a partner keeps you on the tab you saved from. An update used to move
 * on to the next tab ~800ms later, and a new partner opened on Status & Agent
 * instead of Partner information.
 */

const PARTNER = {
  id: 5, entity_id: 5, full_name: 'Wile Coyote', company_name: 'Acme Funding', email: 'wile@acme.test', phone_number: '(444) 444-4444',
  partner_type: 'White-Label Partner (WL)', is_host: 0, status: 'active', country: 'United States', subscriptions: [],
}
const ADMIN_PERMS = ['view partners', 'create partners', 'update partners']
// Longer than the 800ms the old code waited before switching tabs.
const PAST_THE_OLD_TAB_SWITCH = 1500

const activeTab = (page: Page) => page.locator('.nav-link.active[role="tab"]')
const saveButton = (page: Page, label: 'Save' | 'Update') => page.locator('.btn.btn-primary.w-lg', { hasText: label })

test.describe('Partner profile - saving stays on the tab', () => {
  test('updating Partner information stays on Partner information', async ({ page }) => {
    await seedSession(page, { permissions: ADMIN_PERMS })
    const api = await mockApi(page, [
      { method: 'GET', match: '/admin/partners-details/5', body: ok(PARTNER) },
      { method: 'POST', match: /\/admin\/partners\/5$/, body: ok(PARTNER) },
      // An update re-reads the signed-in user; the API returns that user.
      { method: 'GET', match: '/common/refresh-user', body: ok({ ...HOST_USER, permissions: ADMIN_PERMS }) },
    ])
    await page.goto('/partners/5?tab=personalDetails')
    await expect(page.getByPlaceholder('Enter company name')).toHaveValue('Acme Funding')

    await saveButton(page, 'Update').click()
    await expectCall(api, 'POST', /\/admin\/partners\/5$/)
    await expect(page.getByText('Partner updated successfully')).toBeVisible()
    await page.waitForTimeout(PAST_THE_OLD_TAB_SWITCH)

    await expect(activeTab(page)).toContainText('Partner information')
    await expect(page.getByPlaceholder('Enter company name')).toBeVisible()
  })

  test('a new partner opens on Partner information, the tab it was created from', async ({ page }) => {
    await seedSession(page, { permissions: ADMIN_PERMS })
    const api = await mockApi(page, [
      { method: 'POST', match: /\/admin\/partners$/, body: ok({ ...PARTNER, id: 42 }) },
      { method: 'GET', match: '/admin/partners-details/42', body: ok({ ...PARTNER, id: 42 }) },
    ])
    await page.goto('/partners/create')
    await page.getByPlaceholder('Enter full name').fill('Peter Partner')

    await saveButton(page, 'Save').click()
    await expectCall(api, 'POST', /\/admin\/partners$/)

    await expect(page).toHaveURL(/\/partners\/42$/)
    await page.waitForTimeout(PAST_THE_OLD_TAB_SWITCH)
    await expect(activeTab(page)).toContainText('Partner information')
  })
})
