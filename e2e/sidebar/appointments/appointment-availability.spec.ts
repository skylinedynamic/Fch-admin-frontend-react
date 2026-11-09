import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, seedSession, expectCall, pickPrime, type ApiMock } from '../../support/helpers'

// R2 BUG-073: the dialog's live availability check sent the client's record
// id (entity_id) as `assigned_for`, while Confirm sent the client's user id.
// The API refused the check ("Assigned user does not exist.") or checked
// another user, so a clash only showed after Confirm. The check now names the
// client as Confirm does, and a clash is shown as soon as the slot is picked.

const CLIENT = { id: 321, name: 'QA-TEST ONB WFree', entity_id: 178, entity_type: 'Borrower' }
const SELECTABLE = '/common/appointments/fetch-selectable-users'
const CHECK = '/common/appointments/check-availability'
const WANDA = { permissions: ['view appointments', 'create appointments'], is_host: 0, entity_type: 'Partner', entity_id: 5, partner_id: 5 }

test.use({ timezoneId: 'UTC' })

const dialog = (page: Page) => page.locator('.modal.show')
const users = (page: Page) => dialog(page).locator('.p-dropdown', { hasText: /Select Users|QA-TEST ONB WFree/ })

async function openCreate(page: Page, availability: unknown): Promise<ApiMock> {
  await page.clock.setFixedTime(new Date('2026-10-31T06:00:00Z'))
  await seedSession(page, WANDA)
  const api = await mockApi(page, [
    { method: 'POST', match: '/common/appointments/fetch-all', body: ok([]) },
    { method: 'POST', match: SELECTABLE, body: ok([CLIENT]) },
    { method: 'POST', match: CHECK, body: ok(availability) },
  ])
  await page.goto('/appointments')
  await page.locator('#btn-new-event').click()
  await expect(dialog(page).getByPlaceholder(/Enter ap/)).toBeVisible()
  return api
}

test.describe('Appointment dialog › live availability check (R2 BUG-073)', () => {
  test('checks the client by user id, the same attendee Confirm sends', async ({ page }) => {
    const api = await openCreate(page, { available: true })
    await expectCall(api, 'POST', SELECTABLE)

    await pickPrime(page, users(page), 'QA-TEST ONB WFree')

    const check = await expectCall(api, 'POST', CHECK)
    expect(check.json.assigned_for).toBe(321)
    expect(check.json.assigned_for).not.toBe(178)
  })

  test("warns about the client's clash before Confirm, and Confirm is held back", async ({ page }) => {
    const api = await openCreate(page, {
      available: false,
      scheduler_conflicts: [],
      // The whole day, so it overlaps whatever slot the dialog starts on.
      assignee_conflicts: [{ id: 52, date: '2026-10-31', start_time: '00:00', end_time: '23:59', duration_minutes: 1439 }],
    })
    await expectCall(api, 'POST', SELECTABLE)

    await pickPrime(page, users(page), 'QA-TEST ONB WFree')
    await expectCall(api, 'POST', CHECK)

    await expect(dialog(page).getByText('Scheduling Conflict')).toBeVisible()
    await expect(dialog(page).getByRole('button', { name: 'Confirm Appointment' })).toBeDisabled()
    expect(api.find('POST', /^\/common\/appointments$/)).toHaveLength(0)
  })
})
