import { test, expect } from '../../support/live/fixtures'

// Real API, nothing written: the save is refused, so the profile is unchanged.
//
// Phone, ZIP, SSN, EIN and D-U-N-S formats are checked by the API only (its
// shared App\Rules classes), not by the portal. This holds that a refusal from
// the real server reaches the field it belongs to: (124) 982-7457 is written
// correctly but area code 124 does not exist.
const PHONE_INVALID = 'Enter a valid 10-digit US phone number, e.g. (555) 234-5678.'

test.describe('Topbar › Profile — server format errors (live)', () => {
  test('shows the API\'s phone error on the field and saves nothing', async ({ page }) => {
    await page.goto('/profile')
    const phone = page.getByPlaceholder('Enter your phone number')
    await expect(page.getByPlaceholder('Enter your first name')).not.toHaveValue('')
    const original = await phone.inputValue()

    await phone.fill('(124) 982-7457')
    const res = page.waitForResponse((r) => r.url().includes('/common/auth-profile/update-profile') && r.request().method() === 'POST')
    await page.locator('button[form="profile-form"]').click()
    const response = await res

    expect(response.status()).toBe(422)
    // The API sends each field's first error as a string.
    expect((await response.json()).errors?.phone_number).toBe(PHONE_INVALID)
    await expect(page.getByText(PHONE_INVALID)).toBeVisible()
    await expect(phone).toHaveClass(/is-invalid/)

    // Nothing was saved.
    await page.reload()
    await expect(page.getByPlaceholder('Enter your phone number')).toHaveValue(original)
  })
})
