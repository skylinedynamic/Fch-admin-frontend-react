import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, seedSession, expectCall, type ApiMock } from '../../support/helpers'

test.describe('Topbar - notification bell', () => {
  const item = (id: string, over: Record<string, unknown> = {}) => ({
    id, type: 'system.test', title: `Bell ${id}`, message: `Message ${id}`, url: `/clients/${id}`,
    is_read: false, created_at: new Date().toISOString(), ...over,
  })

  async function open(page: Page, items: ReturnType<typeof item>[], unread: number): Promise<ApiMock> {
    await seedSession(page, { permissions: ['view clients'] })
    const api = await mockApi(page, [
      { method: 'GET', match: /\/common\/notifications(\?|$)/, body: { status: true, message: 'ok', data: items, meta: { total: items.length, current_page: 1, last_page: 1, per_page: 20, unread_count: unread } } },
      { method: 'GET', match: '/common/notifications/unread-count', body: ok({ unread_count: unread }) },
    ])
    await page.goto('/')
    return api
  }
  const bell = (page: Page) => page.getByRole('button', { name: /^Notifications/ })
  const panel = (page: Page) => page.locator('.notif-dropdown')

  test('shows the unread count on the bell', async ({ page }) => {
    await open(page, [item('1'), item('2')], 2)
    await expect(page.getByTestId('notification-badge')).toHaveText('2')
    await expect(bell(page)).toHaveAccessibleName('Notifications, 2 unread')
  })

  test('more than 99 unread is shown as 99+', async ({ page }) => {
    await open(page, [item('1')], 150)
    await expect(page.getByTestId('notification-badge')).toHaveText('99+')
  })

  test('no badge when everything is read', async ({ page }) => {
    await open(page, [item('1', { is_read: true })], 0)
    await expect(bell(page)).toBeVisible()
    await expect(page.getByTestId('notification-badge')).toHaveCount(0)
  })

  test('opening the bell lists the latest notifications', async ({ page }) => {
    await open(page, [item('1'), item('2')], 2)
    await bell(page).click()
    await expect(panel(page).getByText('Bell 1')).toBeVisible()
    await expect(panel(page).getByText('Bell 2')).toBeVisible()
  })

  test('an empty inbox shows the empty state', async ({ page }) => {
    await open(page, [], 0)
    await bell(page).click()
    await expect(panel(page).getByText('No notifications yet')).toBeVisible()
  })

  test('Mark all as read posts once', async ({ page }) => {
    const api = await open(page, [item('1')], 1)
    await bell(page).click()
    await panel(page).getByRole('button', { name: /Mark all as read/ }).click()
    await expectCall(api, 'POST', '/common/notifications/read-all')
  })

  test('View all notifications opens the notifications page', async ({ page }) => {
    await open(page, [item('1')], 1)
    await bell(page).click()
    await panel(page).getByText('View all notifications').click()
    await expect(page).toHaveURL(/\/notifications$/)
  })
})
