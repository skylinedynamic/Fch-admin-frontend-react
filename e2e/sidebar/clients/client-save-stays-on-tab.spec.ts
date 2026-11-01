import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, seedSession, expectCall } from '../../support/helpers'

/**
 * Saving a client keeps you on the tab you saved from. An update used to move
 * on to the next tab ~800ms later (Client Info -> Business Financials ->
 * Documents), and a new client opened on Business Financials.
 */

const B = '/common/borrowers'
const CLIENT = {
  id: 1, first_name: 'Johnathan', last_name: 'Smithfield', business_name: 'Smithfield Bakery LLC', email: 'john@example.test',
  phone_number: '(222) 222-2222', status: 'Active', partner_id: 2,
}
const FINANCIALS = { monthly_revenue: '25000.00', avg_bank_balance: '8000.00', average_monthly_deposits: '24000.00', monthly_deposit_count: 18, annual_revenue: '300000.00' }
const PERMS = ['view clients', 'create clients', 'update clients']
// Longer than the 800ms the old code waited before switching tabs.
const PAST_THE_OLD_TAB_SWITCH = 1500

const activeTab = (page: Page) => page.locator('.nav-link.active[role="tab"]')
const saveButton = (page: Page, label: 'Save' | 'Update') => page.locator('.btn.btn-primary.w-lg', { hasText: label })

async function openClient(page: Page) {
  await seedSession(page, { permissions: PERMS })
  const api = await mockApi(page, [
    { method: 'GET', match: new RegExp(`${B}/1$`), body: ok(CLIENT) },
    { method: 'POST', match: new RegExp(`${B}/1$`), body: ok(CLIENT) },
    { method: 'GET', match: `${B}/business-financials/1`, body: ok(FINANCIALS) },
    { method: 'POST', match: `${B}/1/business-financials`, body: ok(FINANCIALS) },
  ])
  await page.goto('/clients/1')
  await expect(page.locator('#first_name')).toHaveValue('Johnathan')
  return api
}

test.describe('Client profile - saving stays on the tab', () => {
  test('updating Client Info stays on Client Info', async ({ page }) => {
    const api = await openClient(page)

    await saveButton(page, 'Update').click()
    await expectCall(api, 'POST', new RegExp(`${B}/1$`))
    await expect(page.getByText('Client personal details updated successfully')).toBeVisible()
    await page.waitForTimeout(PAST_THE_OLD_TAB_SWITCH)

    await expect(activeTab(page)).toContainText('Client Info')
    await expect(page.locator('#first_name')).toBeVisible()
  })

  test('updating Business Financials stays on Business Financials', async ({ page }) => {
    const api = await openClient(page)
    await page.locator('.nav-link', { hasText: /^\s*Business Financials\s*$/ }).click()
    await expect(page.locator('input[name="monthly_revenue"]')).toHaveValue(/25,?000/)

    await saveButton(page, 'Update').click()
    await expectCall(api, 'POST', `${B}/1/business-financials`)
    await expect(page.getByText('Business financials updated successfully')).toBeVisible()
    await page.waitForTimeout(PAST_THE_OLD_TAB_SWITCH)

    await expect(activeTab(page)).toContainText('Business Financials')
  })

  test('a new client opens on Client Info, the tab it was created from', async ({ page }) => {
    await seedSession(page, { permissions: PERMS })
    const api = await mockApi(page, [
      { method: 'POST', match: new RegExp(`${B}$`), body: ok({ ...CLIENT, id: 7 }) },
      { method: 'GET', match: new RegExp(`${B}/7$`), body: ok({ ...CLIENT, id: 7 }) },
    ])
    await page.goto('/clients/create')
    await page.locator('#first_name').fill('Cora')

    await saveButton(page, 'Save').click()
    await expectCall(api, 'POST', new RegExp(`${B}$`))

    await expect(page).toHaveURL(/\/clients\/7$/)
    await page.waitForTimeout(PAST_THE_OLD_TAB_SWITCH)
    await expect(activeTab(page)).toContainText('Client Info')
  })
})
