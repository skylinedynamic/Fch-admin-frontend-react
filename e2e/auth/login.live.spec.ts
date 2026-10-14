import { test, expect } from '../support/live/fixtures'

// Guest pages against the real API, without the saved session.
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Auth › Login (live)', () => {
  // An address that does not exist, so repeated runs cannot lock the real
  // account (the API locks an account after 5 failed attempts).
  test('an unknown email is refused with the API message', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('Enter email address').fill('e2e-no-such-admin@example.invalid')
    await page.getByPlaceholder('Enter password').fill('wrong-password')
    const response = page.waitForResponse((r) => r.url().includes('/auth/login'))
    await page.getByRole('button', { name: 'Sign In' }).click()
    expect((await response).status()).toBe(401)
    await expect(page.getByText('The email you entered does not exist').first()).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('a signed-out visitor is sent to the login page', async ({ page }) => {
    await page.goto('/clients')
    await expect(page).toHaveURL(/\/login/)
  })

  test('forgot password opens from the login page', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: /Forgot/i }).click()
    await expect(page).toHaveURL(/\/forgot-password$/)
  })
})
