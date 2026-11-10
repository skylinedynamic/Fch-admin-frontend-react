import { test, expect, openFromSidebar, dataRows, expectOk, waitForApi } from '../../support/live/fixtures'

// Real fch-backend-api and local database (see e2e/auth.setup.ts).
// Partner profile › Commissions: sets a partner's commission, checks it is kept
// after a reload, then puts the original value back - safe to repeat.
test.describe('Partners › profile › Commissions (live)', () => {
  test('the host saves a partner commission and it is kept', async ({ page }) => {
    await openFromSidebar(page, 'Partners', /\/partners$/)
    // The tabs depend on the partner (none for the host), so wait for its details.
    const details = waitForApi(page, /\/admin\/partners-details\/\d+$/)
    await dataRows(page).first().click()
    await expect(page).toHaveURL(/\/partners\/\d+$/)
    const partner = (await (await details).json())?.data

    // The first row may be the host itself, which has no commission.
    test.skip(!!partner?.is_host, 'first partner is the host, which has no commission')
    const tab = page.getByRole('tab', { name: 'Commissions' })
    await tab.click()

    const rate = page.getByLabel('Partner Commission (%)')
    const original = await rate.inputValue()
    const next = original === '12.5' ? '13.5' : '12.5'

    const save = async (value: string) => {
      await rate.fill(value)
      const res = waitForApi(page, /\/admin\/partners\/\d+\/commission$/, 'PUT')
      await page.getByRole('button', { name: /save commission/i }).click()
      await expectOk(await res)
    }

    try {
      await save(next)
      // Logged on the partner's activity, and shown without a reload.
      const activity = page.locator('.accordion-button', { hasText: original === '' ? 'Commission added' : 'Commission updated' }).first()
      await expect(activity).toBeVisible()
      await page.reload()
      await page.getByRole('tab', { name: 'Commissions' }).click()
      await expect(rate).toHaveValue(next)
      await expect(page.getByTestId('commission-split-admin')).toHaveText(`${100 - Number(next)}%`)
    } finally {
      await save(original)
    }
  })
})
