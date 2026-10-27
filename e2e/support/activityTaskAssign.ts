import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Activity log › New Event › "Want to Assign" — shared by the Partner, Lead,
 * Client and Funding Application pages, which all open the same modal.
 */

export const STAFF = [
  { id: 12, name: 'Avery Staff', email: 'avery@example.test' },
  { id: 14, name: 'Blake Ops', email: 'blake@example.test' },
]

// Some pages mount the modal themselves as well as through GlobalModals, so
// two elements share the id; Bootstrap opens one of them — the one shown.
export const activityModal = (page: Page) => page.locator('#activityCreateModal.show')

export async function openNewEvent(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: /new event/i }).first().click()
  const modal = activityModal(page)
  await expect(modal).toBeVisible()
  return modal
}

/** The Reference field is a Choices.js dropdown over a hidden native select. */
export async function pickReference(page: Page, reference: string) {
  const modal = activityModal(page)
  await modal.locator('.choices').first().click()
  await modal.locator('.choices__list--dropdown .choices__item--choice', { hasText: reference }).first().click()
}

export const assignSwitch = (page: Page) => activityModal(page).getByLabel('Want to Assign')

/** Picking Task offers the switch; any other reference hides it. */
export async function expectAssignSwitchOnlyForTask(page: Page) {
  await expect(assignSwitch(page)).toHaveCount(0)
  await pickReference(page, 'Task')
  await expect(assignSwitch(page)).toBeVisible()
  await pickReference(page, 'Call')
  await expect(assignSwitch(page)).toHaveCount(0)
}
