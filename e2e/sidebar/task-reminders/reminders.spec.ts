import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall, type ApiMock } from '../../support/helpers'

test.describe('Reminders', () => {
  const FETCH = '/common/reminders/fetch-reminders'
  const REMINDERS = [
    { id: 1301, reference: 'Appointment', reference_type: 'appointment', summary: 'Call the lender', status: 'pending', reminder_date: '2026-04-01 10:00' },
    { id: 1302, reference: 'Activity', reference_type: 'activity', summary: 'Send documents', status: 'dismissed', reminder_date: '2026-03-01 10:00' },
  ]
  const body = (rows: unknown[]) => ok({ reminders: { data: rows, meta: { total: rows.length } } })

  async function open(page: Page, rows: unknown[] = REMINDERS): Promise<ApiMock> {
    await seedSession(page, { permissions: ['view reminders'] })
    const api = await mockApi(page, [{ method: 'POST', match: FETCH, body: body(rows) }])
    await page.goto('/reminders')
    if (rows.length) await expect(page.getByText('Call the lender')).toBeVisible()
    return api
  }
  const confirm = (page: Page) => page.locator('.modal.show')

  test('lists reminders', async ({ page }) => {
    await open(page)
    await expect(page.getByText('Send documents')).toBeVisible()
  })

  test('shows the empty state', async ({ page }) => {
    await open(page, [])
    await expect(page.getByText('No reminders found')).toBeVisible()
  })

  test('search is sent to the API, empty filters are omitted', async ({ page }) => {
    const api = await open(page)
    await page.getByPlaceholder('Search subject or client...').fill('lender')
    await page.locator('button', { hasText: 'Filters' }).click()
    await expect.poll(() => JSON.stringify(api.find('POST', FETCH).at(-1)?.json ?? {})).toContain('lender')
    const last = api.find('POST', FETCH).at(-1)!.json
    for (const value of Object.values(last)) expect(value === '' || value === null).toBe(false)
  })

  test('Clear empties the search box', async ({ page }) => {
    await open(page)
    await page.getByPlaceholder('Search subject or client...').fill('lender')
    await page.locator('button', { hasText: 'Clear' }).click()
    await expect(page.getByPlaceholder('Search subject or client...')).toHaveValue('')
  })

  test('dismissing the selected reminders posts their ids after confirmation', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: '/common/reminders/bulk-dismiss', body: ok(null) })
    await page.locator('.p-datatable-tbody .p-checkbox').first().click()
    await page.locator('.dropdown-toggle-split').first().click()
    await page.getByRole('button', { name: /dismiss selected \(1\)/i }).click()
    await expect(confirm(page).getByText('Dismiss Selected Reminders')).toBeVisible()
    await confirm(page).getByRole('button', { name: 'Yes, Dismiss' }).click()
    const call = await expectCall(api, 'POST', '/common/reminders/bulk-dismiss')
    expect(call.json).toEqual({ ids: [1301] })
    await expect(page.getByText('Reminders dismissed successfully')).toBeVisible()
  })

  test('a failed dismiss is reported and the confirmation stays open', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: '/common/reminders/bulk-dismiss', status: 500, body: failure('boom') })
    await page.locator('.p-datatable-tbody .p-checkbox').first().click()
    await page.locator('.dropdown-toggle-split').first().click()
    await page.getByRole('button', { name: /dismiss selected/i }).click()
    await confirm(page).getByRole('button', { name: 'Yes, Dismiss' }).click()
    await expect(page.getByText('Failed to dismiss reminders')).toBeVisible()
    await expect(confirm(page)).toBeVisible()
  })

  test('the page is blocked without the view permission', async ({ page }) => {
    await seedSession(page, { permissions: [] })
    await mockApi(page)
    await page.goto('/reminders')
    await expect(page).toHaveURL(/access-denied/)
  })
})
