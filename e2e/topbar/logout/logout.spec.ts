import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, seedSession, expectCall, type ApiMock } from '../../support/helpers'

// The header renders its user menu in a portal on <body>; the sidebar carries a
// second, hidden template menu with the same items, so scope to the open one.
const menu = (page: Page) => page.locator('body > .dropdown-menu.show')

test.describe('Topbar - logout', () => {
  async function openMenu(page: Page, status = 200): Promise<ApiMock> {
    await seedSession(page)
    const api = await mockApi(page, [{ method: 'POST', match: '/auth/logout', status, body: status === 200 ? ok() : { status: false, message: 'Server error' } }])
    await page.goto('/')
    await page.locator('#page-topbar #page-header-user-dropdown').click()
    return api
  }

  test('the user menu offers Profile and Logout', async ({ page }) => {
    await openMenu(page)
    await expect(menu(page).locator('.dropdown-item', { hasText: 'Profile' })).toBeVisible()
    await expect(menu(page).locator('.dropdown-item', { hasText: 'Logout' })).toBeVisible()
  })

  test('Contacts is offered only with the view contacts permission', async ({ page }) => {
    await openMenu(page)
    await expect(menu(page).locator('.dropdown-item', { hasText: 'Contacts' })).toHaveCount(0)
  })

  test('Contacts opens the contacts page', async ({ page }) => {
    await seedSession(page, { permissions: ['view contacts'] })
    await mockApi(page)
    await page.goto('/')
    await page.locator('#page-topbar #page-header-user-dropdown').click()
    await menu(page).locator('.dropdown-item', { hasText: 'Contacts' }).click()
    await expect(page).toHaveURL(/\/contacts$/)
  })

  test('Logout calls the API, clears the session and opens the login page', async ({ page }) => {
    const api = await openMenu(page)
    await menu(page).locator('.dropdown-item', { hasText: 'Logout' }).click()
    await expectCall(api, 'POST', '/auth/logout')
    await expect(page).toHaveURL(/\/login$/)
    const stored = await page.evaluate(() => window.localStorage.getItem('auth'))
    expect(stored ?? '').not.toContain('e2e-fake-token')
  })

  test('a failed logout request still signs the user out', async ({ page }) => {
    await openMenu(page, 500)
    await menu(page).locator('.dropdown-item', { hasText: 'Logout' }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  // seedSession re-seeds the session on every full page load, so this goes back
  // through the browser history (no reload) instead of page.goto().
  test('after logout going back to a protected page lands on login', async ({ page }) => {
    await openMenu(page)
    await menu(page).locator('.dropdown-item', { hasText: 'Logout' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await page.evaluate(() => { window.history.pushState({}, '', '/clients'); window.dispatchEvent(new PopStateEvent('popstate')) })
    await expect(page).toHaveURL(/\/login/)
  })
})
