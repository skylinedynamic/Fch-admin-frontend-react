import { test, expect, openFromSidebar, dataRows, pageHeading, waitForApi } from '../../support/live/fixtures'

// Real API, nothing written: the save is refused, so the client is unchanged.
//
// Credit scores are checked by the API only (App\Rules\FicoScore and
// BusinessCreditScore), not by the portal: a FICO is a whole number from 300 to
// 850, a business credit score a whole number of 0 or more. This holds that a
// refusal from the real server reaches the fields it belongs to on the client's
// Business Financials tab.
const FICO_INVALID = 'Enter a FICO score as a whole number between 300 and 850.'
const BUSINESS_INVALID = 'Enter the business credit score as a whole number of 0 or more.'

test.describe('Sidebar › Clients › Business Financials — credit score errors (live)', () => {
  test('shows the API\'s FICO and business score errors on their fields and saves nothing', async ({ page }) => {
    await openFromSidebar(page, 'Clients', /\/clients$/)
    await dataRows(page).first().click()
    await expect(page).toHaveURL(/\/clients\/\d+$/)
    await expect(pageHeading(page, 'Client Profile')).toBeVisible()

    const loaded = waitForApi(page, /\/business-financials\/\d+/)
    await page.locator('.nav-link', { hasText: /^\s*Business Financials\s*$/ }).first().click()
    await loaded

    const fico = page.locator('#fico_score')
    const paydex = page.locator('#paydex_score')
    await expect(fico).toBeVisible()
    const [ficoBefore, paydexBefore] = [await fico.inputValue(), await paydex.inputValue()]

    await fico.fill('900')
    await paydex.fill('12.5')
    const saved = waitForApi(page, /\/borrowers\/\d+\/business-financials/, 'POST')
    await page.locator('.btn.btn-primary.w-lg', { hasText: 'Update' }).click()
    const response = await saved

    expect(response.status()).toBe(422)
    const errors = (await response.json()).errors ?? {}
    expect(errors.fico_score).toBe(FICO_INVALID)
    expect(errors.paydex_score).toBe(BUSINESS_INVALID)
    await expect(fico).toHaveClass(/is-invalid/)
    await expect(paydex).toHaveClass(/is-invalid/)
    await expect(page.getByText(FICO_INVALID)).toBeVisible()
    await expect(page.getByText(BUSINESS_INVALID)).toBeVisible()

    // Nothing was saved.
    await page.reload()
    const reloaded = waitForApi(page, /\/business-financials\/\d+/)
    await page.locator('.nav-link', { hasText: /^\s*Business Financials\s*$/ }).first().click()
    await reloaded
    await expect(page.locator('#fico_score')).toHaveValue(ficoBefore)
    await expect(page.locator('#paydex_score')).toHaveValue(paydexBefore)
  })
})
