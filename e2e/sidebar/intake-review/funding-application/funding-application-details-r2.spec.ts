import { test, expect, type Page } from '@playwright/test'
import { API_ORIGIN, mockApi, ok, failure, seedSession, expectCall, pickPrime, type ApiMock } from '../../../support/helpers'

// Funding Application details (host): QA round 2 defects on the status
// update and the commission card.
//   R2 BUG-037  a double-click on the confirmation's Update applied the change twice
//   R2 BUG-038  closing at a funded amount far above the requested one gave no warning
//   R2 BUG-036  a refused Success Fee showed nothing and the card kept the unsaved value

const DETAIL = /\/common\/request-application\/funding-application\/90$/
const STATUS = '/common/request-application/funding-application/status-update'
const COMMISSION = '/admin/funding-application/save-commission'

const APPLICATION = {
  id: 90, partner_id: 1, borrower_id: 1,
  status: 'Submitted – Pending Review', status_note: 'Received docs',
  funding_request_id: 47, funding_request_status: 'Approved', is_editable: true,
  full_name: 'QA-TEST Owner Client Two', business_name: 'QA Co', co_borrowers: [], documents: [],
  requested_amount_original: 12000, total_commission: 7.5, admin_commission: 100, partner_commission: 0,
}

async function open(page: Page): Promise<ApiMock> {
  await seedSession(page, {
    id: 1, is_host: 1, partner_id: 1,
    permissions: ['view funding application', 'update funding application', 'view commission', 'update commission'],
  })
  const api = await mockApi(page, [{ method: 'GET', match: DETAIL, body: ok(APPLICATION) }])
  await page.goto('/intake-review/funding-application/90')
  await expect(page.getByRole('button', { name: 'Update Status' })).toBeVisible()
  return api
}

const statusPicker = (page: Page) => page.locator('.p-dropdown', { has: page.locator('.p-dropdown-label', { hasText: /Submitted|Closed/ }) }).first()

test.describe('Funding application details › QA round 2', () => {
  test('R2 BUG-037: a double-click on Update sends one change, with the status the page showed', async ({ page }) => {
    await open(page)
    // Answered slowly, so the second click lands while the first is in flight.
    let posts = 0
    await page.route(`${API_ORIGIN}${STATUS}`, async (route) => {
      posts += 1
      await new Promise((resolve) => setTimeout(resolve, 800))
      await route.fulfill({ json: ok({ ...APPLICATION, status: 'Submitted (Received)' }, 'Status updated successfully') })
    })

    await pickPrime(page, statusPicker(page), 'Submitted (Received)')
    await page.getByRole('button', { name: 'Update Status' }).click()
    await page.locator('.modal.show').getByRole('button', { name: 'Update', exact: true }).dblclick()

    await expect(page.getByText('Status updated successfully').first()).toBeVisible()
    expect(posts).toBe(1)
  })

  test('R2 BUG-037: the change carries the status the page showed', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: STATUS, body: ok({ ...APPLICATION, status: 'Submitted (Received)' }) })

    await pickPrime(page, statusPicker(page), 'Submitted (Received)')
    await page.getByRole('button', { name: 'Update Status' }).click()
    await page.locator('.modal.show').getByRole('button', { name: 'Update', exact: true }).click()

    const call = await expectCall(api, 'POST', STATUS)
    expect(call.json).toMatchObject({ funding_application_id: 90, status: 'Submitted (Received)', expected_status: 'Submitted – Pending Review' })
  })

  test('R2 BUG-038: a funded amount above the requested one must be confirmed before closing', async ({ page }) => {
    await open(page)

    await pickPrime(page, statusPicker(page), 'Closed (Completed)')
    await page.getByRole('button', { name: 'Update Status' }).click()
    const modal = page.locator('.modal.show')
    await modal.locator('input[type="number"]').fill('60000')

    await expect(modal.getByText(/is above the requested/)).toBeVisible()
    const confirm = modal.getByRole('button', { name: /Confirm & Update/i })
    await expect(confirm).toBeDisabled()
    await modal.getByLabel('I have checked this amount and it is correct.').check()
    await expect(confirm).toBeEnabled()

    // Back at or under the requested amount, no warning.
    await modal.locator('input[type="number"]').fill('12000')
    await expect(modal.getByText(/is above the requested/)).toHaveCount(0)
    await expect(confirm).toBeEnabled()
  })

  test('R2 BUG-036: a refused Success Fee is shown and the field goes back to the saved rate', async ({ page }) => {
    const api = await open(page)
    api.add({
      method: 'POST', match: COMMISSION, status: 422,
      body: failure('Invalid', { total_commission: 'The success fee commission must be at least 1.' }),
    })

    const fee = page.getByLabel('Success Fee (%)')
    await expect(fee).toHaveAttribute('min', '1')
    await expect(fee).toHaveAttribute('max', '100')
    await fee.fill('0')
    await page.getByRole('button', { name: /save commission/i }).click()

    await expectCall(api, 'POST', COMMISSION)
    await expect(page.getByText('The success fee commission must be at least 1.').first()).toBeVisible()
    await expect(fee).toHaveValue('7.5')
  })
})

test.describe('Funding application details › Go to Client', () => {
  const link = (page: Page) => page.getByRole('link', { name: 'Go to Client' })

  async function openAs(page: Page, permissions: string[], application: Record<string, unknown> = APPLICATION) {
    await seedSession(page, { id: 1, is_host: 1, partner_id: 1, permissions })
    await mockApi(page, [{ method: 'GET', match: DETAIL, body: ok(application) }])
    await page.goto('/intake-review/funding-application/90')
    await expect(page.getByRole('heading', { name: 'Funding Application Details' })).toBeVisible()
  }

  test('opens the client of this application', async ({ page }) => {
    await openAs(page, ['view funding application', 'view clients'], { ...APPLICATION, borrower_id: 7 })
    await link(page).click()
    await expect(page).toHaveURL(/\/clients\/7$/)
  })

  test('shows whatever the viewer\'s permissions', async ({ page }) => {
    await openAs(page, ['view funding application'], { ...APPLICATION, borrower_id: 7 })
    await expect(link(page)).toHaveAttribute('href', '/clients/7')
  })

  test('is hidden when the application has no client', async ({ page }) => {
    await openAs(page, ['view funding application', 'view clients'], { ...APPLICATION, borrower_id: null })
    await expect(link(page)).toHaveCount(0)
  })

  test('the header buttons fit a phone', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openAs(page, ['view funding application', 'view clients'])
    await expect(link(page)).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  })
})
