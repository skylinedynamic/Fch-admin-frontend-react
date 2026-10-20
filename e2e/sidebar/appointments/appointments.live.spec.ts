import { test, expect, openFromSidebar, pageHeading } from '../../support/live/fixtures'

test.describe('Sidebar › Appointments (live)', () => {
  test.beforeEach(async ({ page }) => {
    await openFromSidebar(page, 'Appointments', /\/appointments$/)
  })

  test('shows the calendar and the create button', async ({ page }) => {
    await expect(pageHeading(page, 'Appointments')).toBeVisible()
    await expect(page.locator('.fc')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create New Appointment' }).first()).toBeVisible()
  })

  test('the calendar switches between month, week, day and list views', async ({ page }) => {
    for (const [view, cls] of [['Week', /fc-timeGridWeek-view/], ['Day', /fc-timeGridDay-view/], ['List', /fc-list/], ['Month', /fc-dayGridMonth-view/]] as const) {
      await page.getByRole('button', { name: view, exact: true }).click()
      await expect(page.locator('.fc-view-harness > div').first()).toHaveClass(cls)
    }
  })

  test('Create New Appointment opens the appointment form', async ({ page }) => {
    await page.getByRole('button', { name: 'Create New Appointment' }).first().click()
    await expect(page.locator('.modal.show')).toBeVisible()
  })
})
