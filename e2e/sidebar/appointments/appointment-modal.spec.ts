import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall, pickPrime, type ApiMock } from '../../support/helpers'

/**
 * The appointment dialog the calendar opens: who can be booked (loaded from
 * fetch-selectable-users), and what Confirm Appointment sends.
 * workspace.spec.ts covers the calendar page itself.
 */

const USERS = [
  { id: 301, name: 'Jane Borrower', entity_id: 31, entity_type: 'Borrower' },
  { id: 302, name: 'Sam Employee', entity_id: 12, entity_type: 'Employee' },
]
const SELECTABLE = '/common/appointments/fetch-selectable-users'
const HOST_PARTNER = { permissions: ['view appointments', 'create appointments'], is_host: 1, entity_type: 'Partner', entity_id: 1, partner_id: 1 }

// The browser's clock and zone are fixed so "today" and "now" are known:
// 08:00 in Dhaka (02:00 UTC) on 26 Oct 2026, unless a test moves it.
test.use({ timezoneId: 'Asia/Dhaka' })
const MORNING = new Date('2026-10-26T02:00:00Z')

async function openCreate(page: Page, user: Record<string, unknown> = HOST_PARTNER, now: Date = MORNING): Promise<ApiMock> {
  await page.clock.setFixedTime(now)
  await seedSession(page, user)
  const api = await mockApi(page, [
    { method: 'POST', match: '/common/appointments/fetch-all', body: ok([]) },
    { method: 'POST', match: SELECTABLE, body: ok(USERS) },
  ])
  await page.goto('/appointments')
  await page.locator('#btn-new-event').click()
  await expect(dialog(page).getByPlaceholder(/Enter ap/)).toBeVisible()
  return api
}

const dialog = (page: Page) => page.locator('.modal.show')
const users = (page: Page) => dialog(page).locator('.p-dropdown', { hasText: /Select Users|Jane Borrower|Sam Employee/ })

test.describe('Appointment dialog - who can be booked', () => {
  test('a host loads the users it may book, without partners by default', async ({ page }) => {
    const api = await openCreate(page)
    const call = await expectCall(api, 'POST', SELECTABLE)
    expect(call.json).toEqual({ meeting_with: 0 })
    await users(page).click()
    await expect(page.locator('.p-dropdown-item', { hasText: 'Jane Borrower' })).toBeVisible()
  })

  test('ticking "Meeting with partner" reloads the list with partners', async ({ page }) => {
    const api = await openCreate(page)
    await expectCall(api, 'POST', SELECTABLE)
    await dialog(page).locator('#meeting-with-toggle').check()
    await expect.poll(() => api.find('POST', SELECTABLE).some((c) => c.json?.meeting_with === 1)).toBe(true)
  })

  test('a partner asks with meeting_with_host instead', async ({ page }) => {
    const api = await openCreate(page, { permissions: ['view appointments', 'create appointments'], is_host: 0, entity_type: 'Partner', entity_id: 5, partner_id: 5 })
    const call = await expectCall(api, 'POST', SELECTABLE)
    expect(call.json).toEqual({ meeting_with_host: 0 })
    await expect(dialog(page).getByText('Meeting with host')).toBeVisible()
  })

  test('a host employee is not offered the partner toggle', async ({ page }) => {
    await openCreate(page, { permissions: ['view appointments', 'create appointments'], is_host: 1, entity_type: 'Employee', entity_id: 12, partner_id: 1 })
    await expect(dialog(page).locator('#meeting-with-toggle')).toHaveCount(0)
  })
})

test.describe('Appointment dialog - saving', () => {
  test('Confirm Appointment posts the title, person, time and duration', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: /\/common\/appointments$/, body: ok({ id: 1 }, 'Appointment created successfully') })
    await dialog(page).getByPlaceholder(/Enter ap/).fill('Loan review call')
    await pickPrime(page, users(page), 'Jane Borrower')
    await dialog(page).getByRole('button', { name: 'Confirm Appointment' }).click()
    const call = await expectCall(api, 'POST', /\/common\/appointments$/)
    expect(call.json).toMatchObject({ subject: 'Loan review call', assigned_for: 301, entity_id: 31, entity_type: 'borrower', duration_minutes: 30, meeting_with: 0 })
    expect(call.json.appointment_date).toBe('2026-10-26 09:00:00')
    await expect(page.getByText('Appointment created successfully')).toBeVisible()
  })

  test('validation errors from the API are shown on the form', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: /\/common\/appointments$/, status: 422, body: failure('Invalid', { subject: 'The subject field is required.', assigned_for: 'Please choose who the appointment is with.' }) })
    await dialog(page).getByRole('button', { name: 'Confirm Appointment' }).click()
    await expect(dialog(page).getByText('The subject field is required.')).toBeVisible()
    await expect(dialog(page).getByText('Please choose who the appointment is with.')).toBeVisible()
  })

  test('a general failure is toasted', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: /\/common\/appointments$/, status: 500, body: { status: false, message: 'Calendar is unavailable.' } })
    await dialog(page).getByPlaceholder(/Enter ap/).fill('Loan review call')
    await dialog(page).getByRole('button', { name: 'Confirm Appointment' }).click()
    await expect(page.getByText('Calendar is unavailable.').first()).toBeVisible()
  })
})

// BUG-078 / BUG-080: booked in the browser's zone (the API stores UTC), and
// never at a time of today that has already passed.
test.describe('Appointment dialog - time and time zone', () => {
  const startSlot = (page: Page) => dialog(page).locator('.time-slot-container .p-dropdown').first()

  test("shows the browser's time zone and books in it", async ({ page }) => {
    const api = await openCreate(page)
    await expect(dialog(page).getByLabel('Time Zone')).toHaveValue('Asia/Dhaka (GMT+06:00)')

    api.add({ method: 'POST', match: /\/common\/appointments$/, body: ok({ id: 1 }, 'Appointment created successfully') })
    await dialog(page).getByPlaceholder(/Enter ap/).fill('Loan review call')
    await pickPrime(page, users(page), 'Jane Borrower')
    await dialog(page).getByRole('button', { name: 'Confirm Appointment' }).click()
    const call = await expectCall(api, 'POST', /\/common\/appointments$/)
    expect(call.json).toMatchObject({ timezone: 'Asia/Dhaka', appointment_date: '2026-10-26 09:00:00' })
  })

  test("today's times that have passed are not offered, and the start moves to the next free one", async ({ page }) => {
    // 19:10 in Dhaka.
    await openCreate(page, HOST_PARTNER, new Date('2026-10-26T13:10:00Z'))
    await expect(startSlot(page).locator('.p-dropdown-label')).toHaveText('07:30 PM')

    await startSlot(page).click()
    await expect(page.locator('.p-dropdown-panel .p-dropdown-item').first()).toHaveText('07:30 PM')
    await expect(page.locator('.p-dropdown-panel .p-dropdown-item', { hasText: /^09:00 AM$/ })).toHaveCount(0)
  })

  test('the API refusing the time shows its message under the date', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: /\/common\/appointments$/, status: 422, body: failure('Invalid', { appointment_date: 'Jane Borrower already has an appointment from 9:00 AM to 9:30 AM. Choose another time.' }) })
    await dialog(page).getByPlaceholder(/Enter ap/).fill('Loan review call')
    await pickPrime(page, users(page), 'Jane Borrower')
    await dialog(page).getByRole('button', { name: 'Confirm Appointment' }).click()
    await expect(dialog(page).getByText('Jane Borrower already has an appointment from 9:00 AM to 9:30 AM. Choose another time.')).toBeVisible()
  })
})
