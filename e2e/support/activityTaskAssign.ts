import { expect, type Locator, type Page } from '@playwright/test'
import { expectCall, type ApiMock } from './helpers'

/**
 * Activity log › "Want to Assign" on a Task - shared by the Partner, Lead,
 * Client, Funding Application and Funding Request pages, which all open the
 * same New Event modal (and the same Edit modal from an entry).
 */

// The get-all-users response: the staff of the team asked for.
export const STAFF = [
  { id: 12, name: 'Avery Staff', email: 'avery@example.test', phone_number: '(222) 111-2222' },
  { id: 14, name: 'Blake Ops', email: 'blake@example.test', phone_number: null },
  { id: 15, name: 'Casey Lane', email: 'casey@example.test', phone_number: null },
]

// Some pages mount the modal themselves as well as through GlobalModals, so
// two elements share the id; Bootstrap opens one of them - the one shown.
export const activityModal = (page: Page) => page.locator('#activityCreateModal.show')

// The Edit modal is a React portal on <body>, not a Bootstrap modal.
export const editModal = (page: Page) => page.locator('.modal.show.d-block')

export async function openNewEvent(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: /new event/i }).first().click()
  const modal = activityModal(page)
  await expect(modal).toBeVisible()
  return modal
}

/**
 * The modal's own dropdowns: a combobox button whose list opens on <body>.
 * `scope` is the modal holding the field.
 */
export async function pickOption(page: Page, scope: Locator, fieldId: string, label: string) {
  await scope.locator(`#${fieldId}`).click()
  await page.locator('.acm-select__menu').getByRole('option', { name: new RegExp(`^\\W*${label}`) }).click()
  await expect(scope.locator(`#${fieldId}`)).toContainText(label)
}

export const pickReference = (page: Page, reference: string) =>
  pickOption(page, activityModal(page), 'activityReference', reference)

export const assignSwitch = (scope: Locator) => scope.getByRole('switch', { name: 'Want to Assign' })

/**
 * The activity date defaults to now (BUG-057) and a Task must be in the future,
 * so a spec that creates a Task types a later one first.
 */
export async function typeFutureActivityDate(modal: Locator) {
  await modal.locator('#activityDate').fill('01 Nov, 2030 10:00 AM')
  // Close the calendar by clicking away (Escape would close the whole modal).
  await modal.locator('.modal-title').click()
}

/** Picking Task offers the switch; any other reference hides it. */
export async function expectAssignSwitchOnlyForTask(page: Page) {
  const modal = activityModal(page)
  await expect(assignSwitch(modal)).toHaveCount(0)
  await pickReference(page, 'Task')
  await expect(assignSwitch(modal)).toBeVisible()
  await pickReference(page, 'Call')
  await expect(assignSwitch(modal)).toHaveCount(0)
}

/**
 * Turns "Want to Assign" on and checks what the page set up: which team's
 * staff were asked for, and the record's own responsible person above
 * Assigned To.
 */
export async function expectAssignSetup(
  page: Page,
  api: ApiMock,
  { teamRequest, ownerLabel, ownerText }: { teamRequest: Record<string, unknown>; ownerLabel: string; ownerText: string }
) {
  const modal = activityModal(page)
  await pickReference(page, 'Task')
  await assignSwitch(modal).check()

  // The page may ask for its own staff lists too; one request must be this team's.
  await expectCall(api, 'POST', '/common/get-all-users')
  await expect
    .poll(() => api.find('POST', '/common/get-all-users').map((c) => JSON.stringify(c.json ?? {})))
    .toContain(JSON.stringify(teamRequest))

  const owner = modal.locator('#activityTaskOwner')
  await expect(owner).toContainText(ownerLabel)
  await expect(owner).toContainText(ownerText)
}
