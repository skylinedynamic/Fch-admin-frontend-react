import { test, expect } from '../../support/live/fixtures'

// Logging out revokes the token on the server. It runs in its own browser
// context with a fresh login, so the shared session of the other specs stays valid.
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Topbar › Logout (live)', () => {
  test('logs out on the server and lands on the login page', async ({ page }) => {
    const email = process.env.E2E_HOST_EMAIL || ''
    const password = process.env.E2E_HOST_PASSWORD || ''
    test.skip(!email || !password, 'Set E2E_HOST_EMAIL and E2E_HOST_PASSWORD in .env.e2e')

    await page.goto('/login')
    await page.getByPlaceholder('Enter email address').fill(email)
    await page.getByPlaceholder('Enter password').fill(password)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page.locator('#navbar-nav')).toBeVisible()

    const logout = page.waitForResponse((r) => r.url().includes('/auth/logout') && r.request().method() === 'POST')
    await page.locator('#page-topbar #page-header-user-dropdown').click()
    await page.locator('body > .dropdown-menu.show .dropdown-item', { hasText: 'Logout' }).click()
    expect((await logout).status()).toBe(200)
    await expect(page).toHaveURL(/\/login$/)

    await page.goto('/clients')
    await expect(page).toHaveURL(/\/login/)
  })
})
