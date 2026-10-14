import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall, type ApiMock } from '../../support/helpers'

test.describe('Notifications', () => {
  const BASE = '/common/notifications'
  const item = (id: string, over: Record<string, unknown> = {}) => ({
    id, type: 'system.test', title: `Title ${id}`, message: `Message ${id}`, url: `/clients/${id}`,
    is_read: false, created_at: new Date().toISOString(), ...over,
  })
  const list = (items: ReturnType<typeof item>[]) => ({
    status: true, message: 'ok', data: items,
    meta: { total: items.length, current_page: 1, last_page: 1, per_page: 20, unread_count: items.filter((n) => !n.is_read).length },
  })

  async function open(page: Page, items = [item('1'), item('2', { is_read: true })]): Promise<ApiMock> {
    await seedSession(page, { permissions: ['view clients'] })
    const api = await mockApi(page, [
      { method: 'GET', match: /\/common\/notifications(\?|$)/, body: list(items) },
      { method: 'GET', match: `${BASE}/unread-count`, body: ok({ unread_count: items.filter((n) => !n.is_read).length }) },
    ])
    await page.goto('/notifications')
    // The header bell renders the same list in a hidden dropdown, so everything is scoped to the page.
    if (items.length) await expect(page.locator('.notifications-page').getByText('Title 1')).toBeVisible()
    return api
  }
  const row = (page: Page, title: string) => page.locator('.notifications-page .notif-item', { hasText: title })

  test('lists notifications and marks unread ones', async ({ page }) => {
    await open(page)
    await expect(row(page, 'Title 2')).toBeVisible()
    await expect(row(page, 'Title 1').getByTitle('Unread')).toHaveCount(1)
    await expect(row(page, 'Title 2').getByTitle('Unread')).toHaveCount(0)
  })

  test('shows the empty state', async ({ page }) => {
    await open(page, [])
    await expect(page.locator('.notifications-page').getByText('No notifications yet')).toBeVisible()
  })

  test('the Unread tab requests only unread notifications', async ({ page }) => {
    const api = await open(page)
    await page.locator('.notifications-page').getByRole('tab', { name: /unread/i }).click()
    await expect.poll(() => api.find('GET', /\/common\/notifications\?/).some((c) => c.path.includes('status=unread'))).toBe(true)
  })

  test('Mark as read posts for that notification', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: `${BASE}/1/read`, body: ok({ notification: item('1', { is_read: true }), unread_count: 0 }) })
    await row(page, 'Title 1').getByRole('button', { name: 'Mark as read' }).click()
    await expectCall(api, 'POST', `${BASE}/1/read`)
  })

  test('Mark all as read posts once', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: `${BASE}/read-all`, body: ok({ unread_count: 0 }) })
    await page.locator('.notifications-page').getByRole('button', { name: /mark all as read/i }).click()
    await expectCall(api, 'POST', `${BASE}/read-all`)
  })

  test('Delete removes the notification', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'DELETE', match: `${BASE}/2`, body: ok({ unread_count: 1 }) })
    await row(page, 'Title 2').getByRole('button', { name: 'Delete notification' }).click()
    await expectCall(api, 'DELETE', `${BASE}/2`)
  })

  test('opening an unread notification marks it read and follows its link', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: `${BASE}/1/read`, body: ok({ notification: item('1', { is_read: true }), unread_count: 0 }) })
    await row(page, 'Title 1').locator('.notif-item__main').click()
    await expectCall(api, 'POST', `${BASE}/1/read`)
    await expect(page).toHaveURL(/\/clients\/1$/)
  })
})
