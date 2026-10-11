import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall, type ApiMock } from './helpers'

test.describe('My profile', () => {
  const USER = { name: 'Host Admin', email: 'host@example.test', phone_number: '5551234567' }
  const PROFILE = '/common/auth-profile/update-profile'
  const PASSWORD = '/common/auth-profile/update-password'

  async function open(page: Page): Promise<ApiMock> {
    await seedSession(page, USER)
    const api = await mockApi(page)
    await page.goto('/profile')
    await expect(page.getByPlaceholder('Enter your first name')).toHaveValue('Host')
    return api
  }
  const saveProfile = (page: Page) => page.locator('button[form="profile-form"]')
  const savePassword = (page: Page) => page.locator('button[form="password-form"]')
  const openPasswordTab = (page: Page) => page.locator('.nav-link, button, a').filter({ has: page.locator('.ri-lock-password-line') }).first().click()

  test('prefills the form from the signed-in user, splitting the name', async ({ page }) => {
    await open(page)
    await expect(page.getByPlaceholder('Enter your last name')).toHaveValue('Admin')
    await expect(page.getByPlaceholder('Enter your email')).toHaveValue('host@example.test')
    await expect(page.getByPlaceholder('Enter your phone number')).toHaveValue('(555) 123-4567')
  })

  test('first and last name are required', async ({ page }) => {
    const api = await open(page)
    await page.getByPlaceholder('Enter your first name').fill('')
    await page.getByPlaceholder('Enter your last name').fill('')
    await saveProfile(page).click()
    await expect(page.getByText('First name is required')).toBeVisible()
    await expect(page.getByText('Last name is required')).toBeVisible()
    expect(api.find('POST', PROFILE)).toHaveLength(0)
  })

  test('saving posts the profile without the image field', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: PROFILE, body: ok(null, 'Profile updated successfully!') })
    await page.getByPlaceholder('Enter your first name').fill('Hosta')
    await saveProfile(page).click()
    const call = await expectCall(api, 'POST', PROFILE)
    expect(call.json).toMatchObject({ first_name: 'Hosta', last_name: 'Admin', email: 'host@example.test' })
    expect(call.json).not.toHaveProperty('image')
    await expect(page.getByText('Profile updated successfully!')).toBeVisible()
  })

  test('server validation errors are shown under the fields', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: PROFILE, status: 422, body: failure('Invalid', { phone_number: 'The phone number is not valid.' }) })
    await saveProfile(page).click()
    await expect(page.getByText('The phone number is not valid.')).toBeVisible()
  })

  test('a status:false response is reported', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: PROFILE, body: failure('Profile is locked.') })
    await saveProfile(page).click()
    await expect(page.getByText('Profile is locked.').first()).toBeVisible()
  })

  test.describe('Change password', () => {
    async function openPassword(page: Page) {
      const api = await open(page)
      await openPasswordTab(page)
      await expect(page.getByPlaceholder('Enter current password')).toBeVisible()
      return api
    }

    test('all three fields are required', async ({ page }) => {
      const api = await openPassword(page)
      await savePassword(page).click()
      await expect(page.getByText('Current password is required')).toBeVisible()
      await expect(page.getByText('New password is required')).toBeVisible()
      await expect(page.getByText('Please confirm your new password')).toBeVisible()
      expect(api.find('POST', PASSWORD)).toHaveLength(0)
    })

    test('a new password shorter than 8 characters is rejected', async ({ page }) => {
      await openPassword(page)
      await page.getByPlaceholder('Enter current password').fill('OldPassw0rd')
      await page.getByPlaceholder('Enter new password').fill('short1')
      await page.getByPlaceholder('Confirm new password').fill('short1')
      await savePassword(page).click()
      await expect(page.getByText('Password must be at least 8 characters')).toBeVisible()
    })

    test('the confirmation must match', async ({ page }) => {
      const api = await openPassword(page)
      await page.getByPlaceholder('Enter current password').fill('OldPassw0rd')
      await page.getByPlaceholder('Enter new password').fill('NewPassw0rd')
      await page.getByPlaceholder('Confirm new password').fill('Different0')
      await savePassword(page).click()
      await expect(page.getByText('Passwords do not match')).toBeVisible()
      expect(api.find('POST', PASSWORD)).toHaveLength(0)
    })

    test('a valid change is posted and the form is cleared', async ({ page }) => {
      const api = await openPassword(page)
      api.add({ method: 'POST', match: PASSWORD, body: ok(null, 'Password updated successfully.') })
      await page.getByPlaceholder('Enter current password').fill('OldPassw0rd')
      await page.getByPlaceholder('Enter new password').fill('NewPassw0rd')
      await page.getByPlaceholder('Confirm new password').fill('NewPassw0rd')
      await savePassword(page).click()
      const call = await expectCall(api, 'POST', PASSWORD)
      expect(call.json).toEqual({ current_password: 'OldPassw0rd', new_password: 'NewPassw0rd', new_password_confirmation: 'NewPassw0rd' })
      await expect(page.getByText('Password updated successfully.')).toBeVisible()
      await expect(page.getByPlaceholder('Enter current password')).toHaveValue('')
    })

    test('a wrong current password is reported under the field', async ({ page }) => {
      const api = await openPassword(page)
      api.add({ method: 'POST', match: PASSWORD, status: 422, body: failure('Invalid', { current_password: 'The current password is incorrect.' }) })
      await page.getByPlaceholder('Enter current password').fill('WrongPassw0rd')
      await page.getByPlaceholder('Enter new password').fill('NewPassw0rd')
      await page.getByPlaceholder('Confirm new password').fill('NewPassw0rd')
      await savePassword(page).click()
      await expect(page.getByText('The current password is incorrect.')).toBeVisible()
    })
  })
})

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

test.describe('Reminders', () => {
  const FETCH = '/common/reminders/fetch-reminders'
  const REMINDERS = [
    { id: 1301, reference: 'Appointment', reference_type: 'appointment', summary: 'Call the lender', status: 'pending', reminder_date: '2026-04-01 10:00' },
    { id: 1302, reference: 'Activity', reference_type: 'activity', summary: 'Send documents', status: 'dismissed', reminder_date: '2026-03-01 10:00' },
  ]
  const body = (rows: unknown[]) => ok({ reminders: { data: rows, meta: { total: rows.length } } })

  async function open(page: Page, rows: unknown[] = REMINDERS): Promise<ApiMock> {
    await seedSession(page, { permissions: ['view reminders'] })
    const api = await mockApi(page, [{ method: 'POST', match: FETCH, body: body(rows) }])
    await page.goto('/reminders')
    if (rows.length) await expect(page.getByText('Call the lender')).toBeVisible()
    return api
  }
  const confirm = (page: Page) => page.locator('.modal.show')

  test('lists reminders', async ({ page }) => {
    await open(page)
    await expect(page.getByText('Send documents')).toBeVisible()
  })

  test('shows the empty state', async ({ page }) => {
    await open(page, [])
    await expect(page.getByText('No reminders found')).toBeVisible()
  })

  test('search is sent to the API, empty filters are omitted', async ({ page }) => {
    const api = await open(page)
    await page.getByPlaceholder('Search subject or client...').fill('lender')
    await page.locator('button', { hasText: 'Filters' }).click()
    await expect.poll(() => JSON.stringify(api.find('POST', FETCH).at(-1)?.json ?? {})).toContain('lender')
    const last = api.find('POST', FETCH).at(-1)!.json
    for (const value of Object.values(last)) expect(value === '' || value === null).toBe(false)
  })

  test('Clear empties the search box', async ({ page }) => {
    await open(page)
    await page.getByPlaceholder('Search subject or client...').fill('lender')
    await page.locator('button', { hasText: 'Clear' }).click()
    await expect(page.getByPlaceholder('Search subject or client...')).toHaveValue('')
  })

  test('dismissing the selected reminders posts their ids after confirmation', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: '/common/reminders/bulk-dismiss', body: ok(null) })
    await page.locator('.p-datatable-tbody .p-checkbox').first().click()
    await page.locator('.dropdown-toggle-split').first().click()
    await page.getByRole('button', { name: /dismiss selected \(1\)/i }).click()
    await expect(confirm(page).getByText('Dismiss Selected Reminders')).toBeVisible()
    await confirm(page).getByRole('button', { name: 'Yes, Dismiss' }).click()
    const call = await expectCall(api, 'POST', '/common/reminders/bulk-dismiss')
    expect(call.json).toEqual({ ids: [1301] })
    await expect(page.getByText('Reminders dismissed successfully')).toBeVisible()
  })

  test('a failed dismiss is reported and the confirmation stays open', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: '/common/reminders/bulk-dismiss', status: 500, body: failure('boom') })
    await page.locator('.p-datatable-tbody .p-checkbox').first().click()
    await page.locator('.dropdown-toggle-split').first().click()
    await page.getByRole('button', { name: /dismiss selected/i }).click()
    await confirm(page).getByRole('button', { name: 'Yes, Dismiss' }).click()
    await expect(page.getByText('Failed to dismiss reminders')).toBeVisible()
    await expect(confirm(page)).toBeVisible()
  })

  test('the page is blocked without the view permission', async ({ page }) => {
    await seedSession(page, { permissions: [] })
    await mockApi(page)
    await page.goto('/reminders')
    await expect(page).toHaveURL(/access-denied/)
  })
})
