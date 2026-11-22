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

  test('connected: Sync now sends the dates the calendar shows', async ({ page }) => {
    const api = await openAppointments(page, HOST_STAFF, { app_configured: true, connected: true, needs_reconnect: false, email: 'staff@calendly.test' }, [
      { method: 'POST', match: '/common/calendly/sync', body: ok({ created: 2, updated: 0, cancelled: 0 }) },
    ])

    await expect(page.getByText('staff@calendly.test')).toBeVisible()
    await page.getByRole('button', { name: /sync now/i }).click()

    const sync = await expectCall(api, 'POST', '/common/calendly/sync')
    expect(sync.json).toMatchObject({ from: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), to: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) })
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
})
