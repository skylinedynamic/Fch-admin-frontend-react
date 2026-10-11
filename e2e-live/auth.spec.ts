import { test, expect } from '@playwright/test'
import { LIVE, requireCredentials } from './env'

// These start signed out, so they do not use the saved session.
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Live - sign in', () => {
  test.beforeEach(() => requireCredentials())

  test('a wrong password is rejected by the real API and the user stays on login', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('Enter email address').fill(LIVE.email)
    await page.getByPlaceholder('Enter password').fill(`${LIVE.password}-wrong`)

    const response = page.waitForResponse((r) => r.url().includes('/auth/login'))
    await page.getByRole('button', { name: 'Sign In' }).click()

    expect((await response).status()).toBeGreaterThanOrEqual(400)
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('.invalid-feedback:visible, .alert-danger').first()).toBeVisible()
  })

  test('submitting nothing returns field errors from the real validator', async ({ page }) => {
    await page.goto('/login')
    const response = page.waitForResponse((r) => r.url().includes('/auth/login'))
    await page.getByRole('button', { name: 'Sign In' }).click()
    expect((await response).status()).toBe(422)
    await expect(page).toHaveURL(/\/login/)
  })

  test('a protected page redirects a signed-out visitor to login', async ({ page }) => {
    await page.goto('/clients')
    await expect(page).toHaveURL(/\/login/)
  })
})
