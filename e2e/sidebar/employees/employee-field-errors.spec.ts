import { test, expect } from '@playwright/test'
import { mockApi, failure, seedSession } from '../../support/helpers'

// The API's messages for Alternate Mobile and Zip Code show under their fields;
// the form used to drop both, so an invalid number failed the save silently.
test('an invalid Alternate Mobile and Zip Code show their API messages', async ({ page }) => {
  await seedSession(page, { permissions: ['view employees', 'create employees'] })
  await mockApi(page, [{
    method: 'POST', match: /\/common\/employees$/, status: 422,
    body: failure('The given data was invalid.', {
      phone_number_2: 'Enter a valid 10-digit US phone number, e.g. (555) 234-5678.',
      postal_code: 'Enter a 5-digit ZIP code, e.g. 12345.',
    }),
  }])
  await page.goto('/employees/create')

  await page.locator('input[name="phone_number_2"]').fill('1')
  await page.getByRole('button', { name: /^\W*(save|create)/i }).first().click()

  await expect(page.locator('input[name="phone_number_2"]')).toHaveClass(/is-invalid/)
  await expect(page.getByText('Enter a valid 10-digit US phone number, e.g. (555) 234-5678.')).toBeVisible()
  await expect(page.getByText('Enter a 5-digit ZIP code, e.g. 12345.')).toBeVisible()
})
