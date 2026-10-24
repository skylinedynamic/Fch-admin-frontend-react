import { test, expect, openFromSidebar, dataRows, pageHeading, waitForApi } from '../../../support/live/fixtures'

// Real API, nothing written: the save is refused, so the account is unchanged.
//
// A card's typical minimum FICO is compared with a client's FICO, so the API
// checks it as a FICO score (App\Rules\FicoScore: a whole number from 300 to
// 850). It used to accept any digits, 0 included. The portal does not check it
// itself; this holds that the real server's refusal reaches the field.
const FICO_INVALID = 'Enter a FICO score as a whole number between 300 and 850.'

test.describe('Sidebar › Credit Builder › Credit Accounts — FICO minimum error (live)', () => {
  test('shows the API\'s FICO error on the typical minimum and saves nothing', async ({ page }) => {
    await openFromSidebar(page, 'Credit Accounts', /\/credit-accounts$/, 'Credit Builder')
    const loaded = waitForApi(page, /\/credit-accounts\/\d+/)
    await dataRows(page).first().click()
    await expect(page).toHaveURL(/\/credit-accounts\/\d+$/)
    await expect(pageHeading(page, 'Edit Credit Account')).toBeVisible()
    await loaded

    const minimum = page.locator('input[name="typical_personal_fico_min"]')
    await expect(minimum).toBeVisible()
    const before = await minimum.inputValue()

    await minimum.fill('0')
    const saved = page.waitForResponse((r) => /\/credit-accounts\/\d+/.test(r.url()) && r.request().method() !== 'GET')
    await page.getByRole('button', { name: /save changes/i }).click()
    const response = await saved

    expect(response.status()).toBe(422)
    expect((await response.json()).errors?.typical_personal_fico_min).toBe(FICO_INVALID)
    await expect(minimum).toHaveClass(/is-invalid/)
    await expect(page.getByText(FICO_INVALID)).toBeVisible()
    await expect(page).toHaveURL(/\/credit-accounts\/\d+$/)

    // Nothing was saved.
    const reloaded = waitForApi(page, /\/credit-accounts\/\d+/)
    await page.reload()
    await reloaded
    await expect(page.locator('input[name="typical_personal_fico_min"]')).toHaveValue(before)
  })
})
