import { test, expect } from '@playwright/test'
import { mockApi, ok, failure, seedSession } from '../../support/helpers'

const MIN = { id: 102, first_name: 'QA-TEST R3', last_name: 'Emp Min', email: 'qa.r3empmin@example.test', country: 'United States', user: null }

// R3-BUG-071: a cleared Email was left out of the update, so the API kept the
// old one and the page said "Employee updated successfully". It is now sent
// cleared, and the API's "Email is required." shows under the field.
test('clearing an employee\'s Email and pressing Update is refused under the field', async ({ page }) => {
  await seedSession(page, { permissions: ['view employees', 'update employees'] })
  const api = await mockApi(page, [
    { method: 'GET', match: /\/common\/employees\/102(\?|$)/, body: ok(MIN) },
    // As the API answers an empty email (UpdateEmployeeRequest).
    {
      method: 'POST', match: /\/common\/employees\/102(\?|$)/, status: 422,
      body: failure('Email is required.', { email: 'Email is required.' }),
    },
  ])
  await page.goto('/employee-details/102')

  const email = page.locator('input[name="email"]')
  await expect(email).toHaveValue(MIN.email)
  await email.fill('')
  await page.getByRole('button', { name: /^\W*update$/i }).first().click()

  await expect(page.getByText('Email is required.')).toBeVisible()
  await expect(page.getByText('Employee updated successfully')).toHaveCount(0)
  await expect(email).toHaveValue('')

  const save = api.calls.find((c) => c.method === 'POST' && /\/common\/employees\/102(\?|$)/.test(c.path))
  expect(save?.body).toMatch(/name="email"\r\n\r\n\r\n/)
})
