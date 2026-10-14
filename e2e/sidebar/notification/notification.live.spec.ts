import { test, expect, openFromSidebar, pageHeading } from '../../support/live/fixtures'
import type { Page } from '@playwright/test'

// The Unread tab carries a count pill ("Unread 3"), so tabs match by their first word.
const tab = (page: Page, name: string) => page.locator('.notifications-page').getByRole('tab', { name: new RegExp(`^${name}\\b`) })

test.describe('Sidebar › Notification (live)', () => {
  test.beforeEach(async ({ page }) => {
    await openFromSidebar(page, 'Notification', /\/notifications$/)
  })

  test('shows the inbox with its filters', async ({ page }) => {
    await expect(pageHeading(page, 'Notifications')).toBeVisible()
    for (const name of ['All', 'Unread', 'Read']) await expect(tab(page, name)).toBeVisible()
    await expect(tab(page, 'All')).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('.notifications-page .notif-item').first().or(page.locator('.notifications-page').getByText(/No notifications/i))).toBeVisible()
  })

  test('the Unread tab asks the API for unread notifications only', async ({ page }) => {
    const request = page.waitForRequest((r) => r.url().includes('/common/notifications') && /unread/.test(r.url()))
    await tab(page, 'Unread').click()
    await request
    await expect(tab(page, 'Unread')).toHaveAttribute('aria-selected', 'true')
  })
})
