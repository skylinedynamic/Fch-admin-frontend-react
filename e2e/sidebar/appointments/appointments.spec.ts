import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall, type ApiMock } from '../../support/helpers'

test.describe('Appointments', () => {
  const LIST = '/common/appointments/fetch-all'

  async function open(page: Page, permissions: string[]): Promise<ApiMock> {
    await seedSession(page, { permissions })
    const api = await mockApi(page, [{ method: 'POST', match: LIST, body: ok([]) }])
    await page.goto('/appointments')
    await expect(page.locator('.fc')).toBeVisible()
    return api
  }

  test('loads the calendar and requests the appointments', async ({ page }) => {
    const api = await open(page, ['view appointments'])
    await expectCall(api, 'POST', LIST)
  })

  test('Create New Appointment is hidden without the create permission', async ({ page }) => {
    await open(page, ['view appointments'])
    await expect(page.locator('#btn-new-event')).toHaveCount(0)
  })

  test('Create New Appointment is offered with the create permission', async ({ page }) => {
    await open(page, ['view appointments', 'create appointments'])
    await expect(page.locator('#btn-new-event')).toBeVisible()
  })

  test('a failed load is reported', async ({ page }) => {
    await seedSession(page, { permissions: ['view appointments'] })
    await mockApi(page, [{ method: 'POST', match: LIST, status: 500, body: failure('boom') }])
    await page.goto('/appointments')
    await expect(page.getByText('Failed to load appointments').first()).toBeVisible()
  })

  test('the page is blocked without the view permission', async ({ page }) => {
    await seedSession(page, { permissions: [] })
    await mockApi(page)
    await page.goto('/appointments')
    await expect(page).toHaveURL(/access-denied/)
  })
})
