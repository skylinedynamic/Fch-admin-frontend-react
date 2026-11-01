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

// BUG-102: a meeting a white-label client booked with its partner. The partner
// (whoever it was booked with) can reschedule, confirm or cancel it; only the
// person who booked it edits or deletes it.
test.describe('Appointment dialog - the person it was booked with', () => {
  const CLIENT = { id: 50, name: 'QA-TEST Wanda Client One' }
  const WANDA = { id: 7, name: 'Wanda', entity_type: 'Partner', entity_id: 3 }
  const BOOKING = {
    id: 1, subject: 'QA-TEST Run1 WL client booking', appointment_date: '2026-10-28 09:00:00', duration_minutes: 30,
    meeting_type: 'Business Review', status: 'pending', scheduled_by: CLIENT, assigned_for: WANDA,
  }
  const PERMISSIONS = ['view appointments', 'update appointments', 'delete appointments']
  const DETAIL = /\/common\/appointments\/1$/

  async function openBooking(page: Page, userId: number, booking: Record<string, unknown> = BOOKING): Promise<ApiMock> {
    await page.clock.setFixedTime(MORNING)
    await seedSession(page, { id: userId, permissions: PERMISSIONS, is_host: 0, entity_type: 'Partner', entity_id: 3, partner_id: 3 })
    const api = await mockApi(page, [
      { method: 'POST', match: '/common/appointments/fetch-all', body: ok([booking]) },
      { method: 'GET', match: DETAIL, body: ok(booking) },
      { method: 'PUT', match: DETAIL, body: ok(booking, 'Appointment updated successfully') },
      { method: 'POST', match: SELECTABLE, body: ok([]) },
    ])
    await page.goto('/appointments')
    await page.locator('.upcoming-event-card', { hasText: 'QA-TEST Run1 WL client booking' }).click()
    await expect(dialog(page).getByRole('heading', { name: 'QA-TEST Run1 WL client booking' })).toBeVisible()
    return api
  }

  test('the partner sees Reschedule, Confirm and Cancel Appointment, not Delete', async ({ page }) => {
    await openBooking(page, WANDA.id)
    await expect(dialog(page).getByRole('button', { name: /Reschedule/ })).toBeVisible()
    await expect(dialog(page).getByRole('button', { name: /^\W*Confirm$/ })).toBeVisible()
    await expect(dialog(page).getByRole('button', { name: /Cancel Appointment/ })).toBeVisible()
    await expect(dialog(page).getByRole('button', { name: /Delete/ })).toHaveCount(0)
  })

  test('Confirm sets the status to confirmed', async ({ page }) => {
    const api = await openBooking(page, WANDA.id)
    await dialog(page).getByRole('button', { name: /^\W*Confirm$/ }).click()
    const call = await expectCall(api, 'PUT', DETAIL)
    expect(call.json).toEqual({ assigned_for: WANDA.id, status: 'confirmed' })
    await expect(page.getByText('Appointment updated successfully')).toBeVisible()
  })

  test('Cancel Appointment asks first, then sets the status to cancelled', async ({ page }) => {
    const api = await openBooking(page, WANDA.id)
    await dialog(page).getByRole('button', { name: /Cancel Appointment/ }).click()
    await dialog(page).getByRole('button', { name: 'Yes, cancel it' }).click()
    const call = await expectCall(api, 'PUT', DETAIL)
    expect(call.json).toEqual({ assigned_for: WANDA.id, status: 'cancelled' })
    await expect(page.getByText('Appointment updated successfully')).toBeVisible()
  })

  test('Reschedule moves the time without changing who it is with', async ({ page }) => {
    const api = await openBooking(page, WANDA.id)
    await dialog(page).getByRole('button', { name: /Reschedule/ }).click()
    await expect(dialog(page).getByText('Edit Appointment')).toBeVisible()
    await expect(dialog(page).getByText('Meeting with host')).toHaveCount(0)
    await pickPrime(page, dialog(page).locator('.time-slot-container .p-dropdown').first(), '10:00 AM')
    await dialog(page).getByRole('button', { name: 'Save Changes' }).click()
    const call = await expectCall(api, 'PUT', DETAIL)
    expect(call.json).toMatchObject({ assigned_for: WANDA.id, appointment_date: '2026-10-28 10:00:00', duration_minutes: 30 })
    expect(call.json).not.toHaveProperty('entity_type')
    expect(call.json).not.toHaveProperty('meeting_with_host')
  })

  // BUG-132: editing the time saved it 6 hours later - the local time picked
  // was sent labelled "UTC". The edit now sends the browser's zone with it.
  test("Edit saves the time picked, in the browser's time zone", async ({ page }) => {
    const api = await openBooking(page, CLIENT.id)
    await dialog(page).getByRole('button', { name: /Edit/ }).click()
    await expect(dialog(page).getByText('Edit Appointment')).toBeVisible()
    await expect(dialog(page).getByLabel('Time Zone')).toHaveValue('Asia/Dhaka (GMT+06:00)')

    await pickPrime(page, dialog(page).locator('.time-slot-container .p-dropdown').first(), '02:00 PM')
    await dialog(page).getByRole('button', { name: 'Save Changes' }).click()

    const call = await expectCall(api, 'PUT', DETAIL)
    expect(call.json).toMatchObject({ appointment_date: '2026-10-28 14:00:00', timezone: 'Asia/Dhaka' })
  })

  test('the person who booked it still gets Edit and Delete, and no Confirm', async ({ page }) => {
    await openBooking(page, CLIENT.id)
    await expect(dialog(page).getByRole('button', { name: /Edit/ })).toBeVisible()
    await expect(dialog(page).getByRole('button', { name: /Delete/ })).toBeVisible()
    await expect(dialog(page).getByRole('button', { name: /^\W*Confirm$/ })).toHaveCount(0)
  })
})
