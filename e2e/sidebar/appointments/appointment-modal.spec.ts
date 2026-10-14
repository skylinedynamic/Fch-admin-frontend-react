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

async function openCreate(page: Page, user: Record<string, unknown> = HOST_PARTNER): Promise<ApiMock> {
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
    expect(call.json.appointment_date).toMatch(/^\d{4}-\d{2}-\d{2} 09:00:00$/)
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
