import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall, type ApiMock } from '../../support/helpers'

/**
 * The partner's Calendly card on Appointments: what the partner account (connects,
 * syncs, disconnects) and its staff (sync only) see, and each action's API call.
 */
test.describe('Appointments - Calendly', () => {
  const LIST = '/common/appointments/fetch-all'
  const STATUS = '/common/calendly/status'

  const connected = {
    configured: true, connected: true, needs_reconnect: false, can_manage: true, can_sync: true,
    is_host: true, can_book: true, name: 'Acme Advisors', email: 'calendar@acme.test',
    scheduling_url: 'https://calendly.com/acme', webhooks_active: true, last_synced_at: null,
  }

  async function open(page: Page, status: Record<string, unknown> | null, extra: Parameters<typeof mockApi>[1] = []): Promise<ApiMock> {
    await seedSession(page, { permissions: ['view appointments', 'create appointments'] })
    const api = await mockApi(page, [
      { method: 'POST', match: LIST, body: ok([]) },
      { method: 'GET', match: STATUS, body: ok(status) },
      ...extra,
    ])
    await page.goto('/appointments')
    await expect(page.locator('.fc')).toBeVisible()
    return api
  }

  const card = (page: Page) => page.locator('.calendly-card')

  test('a connected partner sees the account, Sync now and Disconnect', async ({ page }) => {
    await open(page, connected)

    await expect(card(page).getByText('Connected', { exact: true })).toBeVisible()
    await expect(card(page).getByText('Acme Advisors · calendar@acme.test')).toBeVisible()
    await expect(card(page).getByRole('button', { name: 'Sync now' })).toBeVisible()
    await expect(card(page).getByRole('button', { name: 'Disconnect' })).toBeVisible()
  })

  test('Sync now: Pull is picked first and sends the dates the calendar shows', async ({ page }) => {
    const api = await open(page, connected, [
      { method: 'POST', match: '/common/calendly/sync', body: ok({ direction: 'pull', from: '2026-11-01', to: '2026-11-30', pulled: 3, pushed: 0, failed: 0, errors: [] }) },
    ])

    await card(page).getByRole('button', { name: 'Sync now' }).click()
    const dialog = page.locator('.modal.show')
    await expect(dialog.getByText('Pull from Calendly')).toBeVisible()
    await expect(dialog.getByRole('radio', { name: 'Pull from Calendly' })).toBeChecked()
    await dialog.getByRole('button', { name: 'Sync', exact: true }).click()

    const call = await expectCall(api, 'POST', '/common/calendly/sync')
    expect(call.json.direction).toBe('pull')
    expect(call.json.from).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(call.json.to).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(call.json.timezone).toBeTruthy()
    await expect(page.getByText(/Calendly synced: 3 brought in from Calendly/)).toBeVisible()
    // The calendar is read again with what came in.
    await expect.poll(() => api.find('POST', LIST).length).toBeGreaterThan(1)
  })

  test('Sync now: Two-way sends "both" and reports what was sent', async ({ page }) => {
    const api = await open(page, connected, [
      { method: 'POST', match: '/common/calendly/sync', body: ok({ direction: 'both', from: '2026-11-01', to: '2026-11-30', pulled: 1, pushed: 2, failed: 0, errors: [] }) },
    ])

    await card(page).getByRole('button', { name: 'Sync now' }).click()
    const dialog = page.locator('.modal.show')
    await dialog.getByText('Two-way sync').click()
    await dialog.getByRole('button', { name: 'Sync', exact: true }).click()

    expect((await expectCall(api, 'POST', '/common/calendly/sync')).json.direction).toBe('both')
    await expect(page.getByText(/1 brought in from Calendly, 2 sent to Calendly/)).toBeVisible()
  })

  test('a sync Calendly refuses is reported', async ({ page }) => {
    await open(page, connected, [
      { method: 'POST', match: '/common/calendly/sync', status: 422, body: failure('Calendly is not connected for your partner yet.') },
    ])

    await card(page).getByRole('button', { name: 'Sync now' }).click()
    await page.locator('.modal.show').getByRole('button', { name: 'Sync', exact: true }).click()

    await expect(page.getByText('Calendly is not connected for your partner yet.')).toBeVisible()
  })

  test('Disconnect asks first, then removes the connection', async ({ page }) => {
    const api = await open(page, connected, [
      { method: 'DELETE', match: '/common/calendly/connection', body: ok(null) },
    ])

    await card(page).getByRole('button', { name: 'Disconnect' }).click()
    await expect(page.getByText('Disconnect Calendly?')).toBeVisible()
    await page.getByRole('button', { name: 'Yes, disconnect' }).click()

    await expectCall(api, 'DELETE', '/common/calendly/connection')
    await expect(page.getByText('Calendly disconnected')).toBeVisible()
  })

  test('not connected: Connect Calendly starts the sign-in and comes back connected', async ({ page }) => {
    const api = await open(page, { ...connected, connected: false, name: null, email: null }, [
      // Calendly's sign-in is outside the app: it sends the browser straight back, connected.
      { method: 'POST', match: '/common/calendly/connect', body: ok({ url: '/appointments?calendly=connected' }) },
    ])

    await card(page).getByRole('button', { name: 'Connect Calendly' }).click()

    await expectCall(api, 'POST', '/common/calendly/connect')
    await expect(page.getByText('Calendly connected')).toBeVisible()
    await expect(page).not.toHaveURL(/calendly=/)
  })

  test('coming back with an account already used elsewhere says so', async ({ page }) => {
    await seedSession(page, { permissions: ['view appointments'] })
    await mockApi(page, [
      { method: 'POST', match: LIST, body: ok([]) },
      { method: 'GET', match: STATUS, body: ok({ ...connected, connected: false }) },
    ])
    await page.goto('/appointments?calendly=in_use')

    await expect(page.getByText(/This Calendly account is already connected in the portal/)).toBeVisible()
  })

  test('an expired connection offers Reconnect', async ({ page }) => {
    await open(page, { ...connected, connected: false, needs_reconnect: true })

    await expect(card(page).getByText('Expired')).toBeVisible()
    await expect(card(page).getByRole('button', { name: 'Reconnect Calendly' })).toBeVisible()
  })

  test('no app keys yet: points to Settings instead of connecting', async ({ page }) => {
    await open(page, { ...connected, configured: false, connected: false })

    await expect(card(page).getByText('Not set up')).toBeVisible()
    await expect(card(page).getByRole('link', { name: 'Add keys in Settings' })).toBeVisible()
    await expect(card(page).getByRole('button', { name: 'Connect Calendly' })).toHaveCount(0)
  })

  test('staff of a connected partner may sync, but not disconnect', async ({ page }) => {
    await open(page, { ...connected, can_manage: false })

    await expect(card(page).getByRole('button', { name: 'Sync now' })).toBeVisible()
    await expect(card(page).getByRole('button', { name: 'Disconnect' })).toHaveCount(0)
  })

  test('staff of a partner with no Calendly see no card', async ({ page }) => {
    await open(page, { ...connected, connected: false, can_manage: false, can_sync: false })

    await expect(card(page)).toHaveCount(0)
  })
})
