import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, seedSession, expectCall, type ApiMock } from '../../support/helpers'

/**
 * Calendly v2 in the partner portal (API mocked): the host sets up FCH's one
 * Calendly app in Settings › Calendly Configuration; every user - staff
 * included - connects their own Calendly on the Appointments page; Add
 * Appointment offers "Sync with Calendly" when someone can host it.
 */
const SELECTABLE = '/common/appointments/fetch-selectable-users'
const HOST_STAFF = { permissions: ['view appointments', 'create appointments'], is_host: 1, entity_type: 'Employee', entity_id: 12, partner_id: 1 }
const PARTNER_STAFF = { permissions: ['update calendly configuration settings'], is_host: 0, entity_type: 'Employee', entity_id: 40, partner_id: 7 }
const HOST_ADMIN = { permissions: ['view appointments', 'update calendly configuration settings'], is_host: 1, entity_type: 'Partner', entity_id: 1, partner_id: 1 }
const ZOOM = { uri: 'ET1', name: '30 Minute Meeting', duration: 30, locations: [{ kind: 'zoom_conference' }], asks_location: false }

async function openAppointments(page: Page, user: Record<string, unknown>, connection: object, handlers: Parameters<typeof mockApi>[1] = []): Promise<ApiMock> {
  await seedSession(page, user)
  const api = await mockApi(page, [
    { method: 'POST', match: '/common/appointments/fetch-all', body: ok([]) },
    { method: 'GET', match: '/common/calendly/connection', body: ok(connection) },
    ...handlers,
  ])
  await page.goto('/appointments')
  return api
}

test.describe('Partner portal › Calendly (each user connects their own)', () => {
  test('a staff member connects their own Calendly', async ({ page }) => {
    const api = await openAppointments(page, HOST_STAFF, { app_configured: true, connected: false, needs_reconnect: false }, [
      { method: 'POST', match: '/common/calendly/connection', body: ok({ url: '/appointments?calendly=connected' }) },
    ])

    await page.getByRole('button', { name: /connect calendly/i }).click()

    await expectCall(api, 'POST', '/common/calendly/connection')
    await expect(page.getByText('Calendly connected')).toBeVisible()
  })

  test('connected: Pull from Calendly and Push to Calendly each show their own list for the dates shown, and send only what is ticked', async ({ page }) => {
    const preview = {
      pull: [
        { uri: 'E-NEW', action: 'new', title: 'Intro call', start_time: '2999-01-03T15:00:00Z', end_time: '2999-01-03T15:30:00Z', people: ['guest@example.com'], appointment_id: null, previous_start_time: null },
        { uri: 'E-GONE', action: 'cancelled', title: 'Old call', start_time: '2999-01-05T09:00:00Z', end_time: '2999-01-05T09:30:00Z', people: [], appointment_id: 6, previous_start_time: '2999-01-05T09:00:00Z' },
      ],
      push: [{ appointment_id: 7, title: 'Business review', start_time: '2999-01-20T10:00:00Z', end_time: '2999-01-20T10:30:00Z', people: ['Ada Lovelace'], pushable: true, reason: null }],
      event_types: [ZOOM],
    }
    const api = await openAppointments(page, HOST_STAFF, { app_configured: true, connected: true, needs_reconnect: false, email: 'staff@calendly.test' }, [
      { method: 'POST', match: '/common/calendly/sync/preview', body: ok(preview) },
      { method: 'POST', match: /\/common\/calendly\/sync$/, body: ok({ pull: [{ uri: 'E-NEW', result: 'created' }], push: [{ appointment_id: 7, ok: true }] }) },
    ])

    await expect(page.getByText('staff@calendly.test')).toBeVisible()
    await page.getByRole('button', { name: 'Pull from Calendly' }).click()

    const ask = await expectCall(api, 'POST', '/common/calendly/sync/preview')
    expect(ask.json).toMatchObject({ from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) })

    const dialog = page.locator('.calendly-sync-modal')
    await expect(dialog.getByText('Intro call')).toBeVisible()
    await expect(dialog.getByText('Business review')).toHaveCount(0)
    await dialog.getByRole('checkbox', { name: 'Old call' }).uncheck()
    await dialog.getByRole('button', { name: /pull selected/i }).click()

    const pulled = await expectCall(api, 'POST', /\/common\/calendly\/sync$/)
    expect(pulled.json).toMatchObject({ pull: ['E-NEW'], push: [] })
    await dialog.getByRole('button', { name: 'Close' }).first().click()

    await page.getByRole('button', { name: 'Push to Calendly' }).click()
    const pushDialog = page.locator('.calendly-sync-modal')
    await expect(pushDialog.getByText('Intro call')).toHaveCount(0)
    await pushDialog.locator('li', { hasText: 'Business review' }).getByRole('checkbox', { name: 'Use this title in Calendly' }).check()
    await pushDialog.getByRole('button', { name: /push selected/i }).click()

    await expect.poll(() => api.find('POST', /\/common\/calendly\/sync$/).length).toBe(2)
    const pushed = api.find('POST', /\/common\/calendly\/sync$/)[1]
    expect(pushed.json).toMatchObject({ pull: [], push: [7], push_use_title: [7], calendly_event_type_uri: 'ET1' })
    await expect(pushDialog.getByText('Added to Calendly')).toBeVisible()
  })

  test('Add Appointment books in my Calendly, ticked by default', async ({ page }) => {
    const api = await openAppointments(page, HOST_STAFF, { app_configured: true, connected: true, needs_reconnect: false }, [
      { method: 'POST', match: SELECTABLE, body: ok([{ id: 301, name: 'Jane Borrower', entity_id: 31, entity_type: 'Borrower' }]) },
      { method: 'POST', match: '/common/appointments/check-availability', body: ok({ available: true, creator_conflicts: [], attendee_conflicts: [], can_create: true }) },
      { method: 'POST', match: '/common/calendly/booking-options', body: ok({ mode: 'own', host: { user_id: 1, name: 'Me' }, event_types: [ZOOM] }) },
      { method: 'POST', match: '/common/calendly/available-times', body: ok([{ start_time: '2999-01-01T09:00:00Z', local_time: '09:00' }]) },
      { method: 'POST', match: /\/common\/appointments$/, body: ok({ id: 9 }, 'Appointment created successfully') },
    ])
    await page.locator('#btn-new-event').click()
    const dialog = page.locator('.modal.show')
    await dialog.getByPlaceholder(/Enter ap/).fill('Calendly call')
    const people = dialog.getByRole('combobox', { name: 'Add people' })
    await people.fill('Jane')
    await dialog.getByRole('option', { name: 'Jane Borrower' }).click()
    await people.fill('spouse@example.com')
    await people.press('Enter')

    await expect(dialog.getByLabel('Sync with Calendly')).toBeChecked()
    await dialog.getByRole('button', { name: 'Confirm Appointment' }).click()

    const call = await expectCall(api, 'POST', /\/common\/appointments$/)
    expect(call.json).toMatchObject({
      attendees: [{ user_id: 301, name: 'Jane Borrower' }, { email: 'spouse@example.com' }],
      sync_with_calendly: true,
      calendly_event_type_uri: 'ET1',
    })
  })

  test('the host saves FCH\'s Calendly app in Settings', async ({ page }) => {
    await seedSession(page, HOST_ADMIN)
    const api = await mockApi(page, [
      { method: 'GET', match: '/common/calendly/settings', body: ok({ configured: false, client_id: null, has_client_secret: false, redirect_uri: 'https://api.example.test/api/v1/calendly/callback', scopes: ['users:read'] }) },
      { method: 'PUT', match: '/common/calendly/settings', body: ok({ configured: true, client_id: 'cid', has_client_secret: true, redirect_uri: 'https://api.example.test/api/v1/calendly/callback', scopes: ['users:read'] }) },
    ])
    await page.goto('/settings/calendly-configuration')

    await expect(page.getByText('https://api.example.test/api/v1/calendly/callback')).toBeVisible()
    await page.getByLabel('Client ID').fill('cid')
    await page.getByLabel('Client Secret').fill('secret')
    await page.getByRole('button', { name: 'Save Configuration' }).click()

    const call = await expectCall(api, 'PUT', '/common/calendly/settings')
    expect(call.json).toEqual({ client_id: 'cid', client_secret: 'secret' })
  })

  test("a partner's staff member, given the permission, saves their partner's own Calendly app", async ({ page }) => {
    await seedSession(page, PARTNER_STAFF)
    const api = await mockApi(page, [
      { method: 'GET', match: '/common/calendly/settings', body: ok({ configured: false, client_id: null, has_client_secret: false, redirect_uri: 'https://api.example.test/api/v1/calendly/callback', scopes: ['users:read'] }) },
      { method: 'PUT', match: '/common/calendly/settings', body: ok({ configured: true, client_id: 'partner-cid', has_client_secret: true, redirect_uri: 'https://api.example.test/api/v1/calendly/callback', scopes: ['users:read'] }) },
    ])
    await page.goto('/settings/calendly-configuration')

    await page.getByLabel('Client ID').fill('partner-cid')
    await page.getByLabel('Client Secret').fill('partner-secret')
    await page.getByRole('button', { name: 'Save Configuration' }).click()

    const call = await expectCall(api, 'PUT', '/common/calendly/settings')
    expect(call.json).toEqual({ client_id: 'partner-cid', client_secret: 'partner-secret' })
  })

  test('a start that is not open in Calendly is flagged under Time Slot, and the end follows the event type', async ({ page }) => {
    const HOUR = { ...ZOOM, duration: 60 }
    await openAppointments(page, HOST_STAFF, { app_configured: true, connected: true, needs_reconnect: false }, [
      { method: 'POST', match: SELECTABLE, body: ok([{ id: 301, name: 'Jane Borrower', entity_id: 31, entity_type: 'Borrower' }]) },
      { method: 'POST', match: '/common/appointments/check-availability', body: ok({ available: true, creator_conflicts: [], attendee_conflicts: [], can_create: true }) },
      { method: 'POST', match: '/common/calendly/booking-options', body: ok({ mode: 'own', host: { user_id: 1, name: 'Me' }, event_types: [HOUR] }) },
      { method: 'POST', match: '/common/calendly/available-times', body: ok([{ start_time: '2999-01-01T15:00:00Z', local_time: '15:00' }]) },
    ])
    await page.locator('#btn-new-event').click()
    const dialog = page.locator('.modal.show')
    await dialog.getByRole('combobox', { name: 'Add people' }).fill('Jane')
    await dialog.getByRole('option', { name: 'Jane Borrower' }).click()

    await expect(dialog.getByText(/not an open time in your calendly/i)).toBeVisible()
    await dialog.getByRole('button', { name: '15:00' }).click()

    await expect(dialog.getByText(/not an open time in your calendly/i)).toBeHidden()
    await expect(dialog.locator('.time-slot-container .p-dropdown-label').nth(1)).toHaveText(/04:00 PM/)
  })

  test('"Use this appointment\'s title in Calendly" books with the form\'s own title and length, not the event type\'s', async ({ page }) => {
    const HOUR = { ...ZOOM, duration: 60 }
    const api = await openAppointments(page, HOST_STAFF, { app_configured: true, connected: true, needs_reconnect: false }, [
      { method: 'POST', match: SELECTABLE, body: ok([{ id: 301, name: 'Jane Borrower', entity_id: 31, entity_type: 'Borrower' }]) },
      { method: 'POST', match: '/common/appointments/check-availability', body: ok({ available: true, creator_conflicts: [], attendee_conflicts: [], can_create: true }) },
      { method: 'POST', match: '/common/calendly/booking-options', body: ok({ mode: 'own', host: { user_id: 1, name: 'Me' }, event_types: [HOUR] }) },
      { method: 'POST', match: '/common/calendly/available-times', body: ok([]) },
      { method: 'POST', match: /\/common\/appointments$/, body: ok({ id: 9 }, 'Appointment created successfully') },
    ])
    await page.locator('#btn-new-event').click()
    const dialog = page.locator('.modal.show')
    await dialog.getByPlaceholder(/Enter ap/).fill('Demo Meeting for Presentation')
    await dialog.getByRole('combobox', { name: 'Add people' }).fill('Jane')
    await dialog.getByRole('option', { name: 'Jane Borrower' }).click()

    await dialog.getByLabel("Use this appointment's title in Calendly").check()
    await expect(dialog.getByText(/not an open time in your calendly/i)).toBeHidden()
    await dialog.getByRole('button', { name: 'Confirm Appointment' }).click()

    const call = await expectCall(api, 'POST', /\/common\/appointments$/)
    expect(call.json).toMatchObject({ subject: 'Demo Meeting for Presentation', sync_with_calendly: true, calendly_use_title: true })
  })
})
