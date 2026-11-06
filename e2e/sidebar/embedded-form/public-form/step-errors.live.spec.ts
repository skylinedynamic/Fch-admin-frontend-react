import { test, expect } from '../../../support/live/fixtures'

// BUG-190: on the public application form, typing a bad value (a 4-digit ZIP)
// and clicking Continue straight away showed only that field's error. Leaving
// the field drew its message, which pushed Continue down before the mouse was
// released, so the click never happened and the page was never checked. Every
// required-field error must show on the first Continue (decision D5).
test.describe('Embedded Form › public form step errors (live)', () => {
  test('a bad ZIP then Continue shows every required-field error at once', async ({ page }) => {
    const config = page.waitForResponse(async (r) => /share_pub_[0-9a-f]+/.test(await r.text().catch(() => '')))
    await page.goto('/embed-form/settings')
    const key = (await (await config).text()).match(/share_pub_[0-9a-f]+/)![0]

    await page.goto(`http://127.0.0.1:8000/form/${key}`)
    const step = page.locator('#tab-1')
    const zip = step.locator('[data-type="postal"]').first()
    await zip.click()
    await page.keyboard.type('1234')
    await page.locator('#btnNext').click()

    await expect(step.getByText('ZIP code must be 5 digits.')).toBeVisible()
    await expect(step.getByText('This field is required.').first()).toBeVisible()
    expect(await step.locator('input.is-invalid[name], select.is-invalid[name]').count()).toBeGreaterThan(5)
  })
})
