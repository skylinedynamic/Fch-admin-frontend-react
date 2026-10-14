import { test, expect, pageHeading } from '../../support/live/fixtures'
import type { Page } from '@playwright/test'

// The header user menu renders in a portal on <body>.
const openUserMenu = async (page: Page) => {
  await page.goto('/')
  await page.locator('#page-topbar #page-header-user-dropdown').click()
  return page.locator('body > .dropdown-menu.show')
}

test.describe('Topbar (live)', () => {
  test('the user menu offers Profile, Contacts and Logout to the host', async ({ page }) => {
    const menu = await openUserMenu(page)
    for (const item of ['Profile', 'Contacts', 'Logout']) await expect(menu.locator('.dropdown-item', { hasText: item })).toBeVisible()
  })

  test('Profile opens the signed-in user’s profile', async ({ page }) => {
    const menu = await openUserMenu(page)
    await menu.locator('.dropdown-item', { hasText: 'Profile' }).click()
    await expect(page).toHaveURL(/\/profile$/)
    const email = await page.evaluate(() => JSON.parse(localStorage.getItem('auth') || '{}')?.state?.user?.email || '')
    await expect(page.locator('.page-content input[type="email"]').first()).toHaveValue(email)
  })

  test('Contacts opens the contacts list', async ({ page }) => {
    const menu = await openUserMenu(page)
    await menu.locator('.dropdown-item', { hasText: 'Contacts' }).click()
    await expect(page).toHaveURL(/\/contacts$/)
    await expect(pageHeading(page, /Contacts/)).toBeVisible()
  })

  test('the notification bell lists the latest notifications and links to the inbox', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /^Notifications/ }).click()
    const panel = page.locator('.notif-dropdown')
    await expect(panel.getByText('View all notifications')).toBeVisible()
    await panel.getByText('View all notifications').click()
    await expect(page).toHaveURL(/\/notifications$/)
  })
})
