import { test, expect, openFromSidebar, dataRows, pageHeading, waitForApi } from '../../support/live/fixtures'

// Real API, nothing written: the save is refused, so the client is unchanged.
//
// BUG-006 (QA round 2): Business Financials saved a 17-digit annual revenue
// (rounded on the way in), a 150% profit margin and a debt of -500 as 500 - the
// field dropped the minus sign before the API saw it. Amounts are now 0 to
// 999,999,999.99 and a margin -100% to 100%; each refusal shows on its field.
const AMOUNT_MAX = 'Enter an amount no greater than 999,999,999.99.'
const AMOUNT_MIN = 'Enter an amount of 0 or more.'
const MARGIN = 'Enter a profit margin between -100% and 100%.'

test.describe('Sidebar › Clients › Business Financials — out-of-range values (live)', () => {
  test('refuses QA\'s revenue, margin and negative debt on their fields and saves nothing', async ({ page }) => {
    await openFromSidebar(page, 'Clients', /\/clients$/)
    await dataRows(page).first().click()
    await expect(page).toHaveURL(/\/clients\/\d+$/)
    await expect(pageHeading(page, 'Client Profile')).toBeVisible()

    const loaded = waitForApi(page, /\/business-financials\/\d+/)
    await page.locator('.nav-link', { hasText: /^\s*Business Financials\s*$/ }).first().click()
    await loaded

    const revenue = page.locator('#annual_revenue')
    const margin = page.locator('#profit_margin')
    const debt = page.locator('#current_business_debt')
    await expect(revenue).toBeVisible()
    const before = [await revenue.inputValue(), await margin.inputValue(), await debt.inputValue()]

    await revenue.fill('99999999999999999')
    await margin.fill('150')
    await debt.fill('-500')
    // The minus stays in the field instead of being dropped.
    await expect(debt).toHaveValue('-500')

    const saved = waitForApi(page, /\/borrowers\/\d+\/business-financials/, 'POST')
    await page.locator('.btn.btn-primary.w-lg', { hasText: 'Update' }).click()
    const response = await saved

    expect(response.status()).toBe(422)
    const errors = (await response.json()).errors ?? {}
    expect(errors.annual_revenue).toBe(AMOUNT_MAX)
    expect(errors.profit_margin).toBe(MARGIN)
    expect(errors.current_business_debt).toBe(AMOUNT_MIN)
    for (const [field, message] of [[revenue, AMOUNT_MAX], [margin, MARGIN], [debt, AMOUNT_MIN]] as const) {
      await expect(field).toHaveClass(/is-invalid/)
      await expect(page.getByText(message)).toBeVisible()
    }

    // Nothing was saved.
    await page.reload()
    const reloaded = waitForApi(page, /\/business-financials\/\d+/)
    await page.locator('.nav-link', { hasText: /^\s*Business Financials\s*$/ }).first().click()
    await reloaded
    await expect(page.locator('#annual_revenue')).toHaveValue(before[0])
    await expect(page.locator('#profit_margin')).toHaveValue(before[1])
    await expect(page.locator('#current_business_debt')).toHaveValue(before[2])
  })
})
