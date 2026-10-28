import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, paginated, failure, seedSession, expectCall, type ApiMock } from '../../../support/helpers'

const RA = '/common/request-application'

test.describe('Change requests', () => {
  const ROWS = [
    { id: 701, borrower_business_name: 'Smithfield Bakery LLC', borrower_first_name: 'Johnathan', borrower_last_name: 'Smithfield', field_name: 'business_address', old_value: '1 Old Rd', new_value: '2 New Ave', status: 'Pending', note: null, created_at: '2026-03-03' },
    { id: 702, borrower_business_name: 'Quill Ink Co', borrower_first_name: 'Mara', borrower_last_name: 'Quill', field_name: 'phone_number', old_value: '111', new_value: '222', status: 'Approved', note: 'Verified by phone', created_at: '2026-03-01' },
  ]
  const LIST = /\/admin\/change-requests$/
  const PERMS = ['view change requests', 'update change requests']

  async function open(page: Page, user: Record<string, unknown> = { permissions: PERMS }): Promise<ApiMock> {
    await seedSession(page, user)
    const api = await mockApi(page, [{ method: 'POST', match: LIST, body: paginated(ROWS) }])
    await page.goto('/intake-review/change-requests')
    await expect(page.getByText('Smithfield Bakery LLC')).toBeVisible()
    return api
  }
  const modal = (page: Page) => page.locator('.modal', { hasText: 'Review Change Request' })

  test('lists requests with the field, old and new values', async ({ page }) => {
    await open(page)
    const row = page.locator('tr', { hasText: 'Smithfield Bakery LLC' })
    await expect(row.getByText('business address')).toBeVisible()
    await expect(row.getByText('1 Old Rd')).toBeVisible()
    await expect(row.getByText('2 New Ave')).toBeVisible()
  })

  test('search is sent to the API and Clear resets it', async ({ page }) => {
    const api = await open(page)
    await page.getByPlaceholder('Search borrower name...').fill('quill')
    await page.locator('button.btn-warning', { hasText: 'Filter' }).click()
    await expect.poll(() => JSON.stringify(api.find('POST', LIST).at(-1)?.json ?? {})).toContain('quill')
    await page.locator('button', { hasText: 'Clear' }).click()
    await expect(page.getByPlaceholder('Search borrower name...')).toHaveValue('')
  })

  test('shows the empty state', async ({ page }) => {
    await seedSession(page, { permissions: PERMS })
    await mockApi(page, [{ method: 'POST', match: LIST, body: paginated([]) }])
    await page.goto('/intake-review/change-requests')
    await expect(page.getByText('No change requests found.')).toBeVisible()
  })

  test('approving a pending request PATCHes status=Approved', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'PATCH', match: '/admin/change-requests/701', body: ok(null, 'Change request approved.') })
    await page.getByText('Smithfield Bakery LLC').click()
    await modal(page).getByPlaceholder('Optional note…').fill('Looks right')
    await modal(page).getByRole('button', { name: /confirm/i }).click()
    const call = await expectCall(api, 'PATCH', '/admin/change-requests/701')
    expect(call.json).toEqual({ status: 'Approved', note: 'Looks right' })
    await expect(page.getByText('Change request approved.')).toBeVisible()
  })

  test('rejecting requires a note before Confirm is enabled', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'PATCH', match: '/admin/change-requests/701', body: ok(null, 'Change request rejected.') })
    await page.getByText('Smithfield Bakery LLC').click()
    await modal(page).getByRole('button', { name: 'Rejected' }).click()
    await expect(modal(page).getByText('A note is required when rejecting.')).toBeVisible()
    await expect(modal(page).getByRole('button', { name: /confirm/i })).toBeDisabled()

    await modal(page).getByPlaceholder('Please provide a reason for rejection…').fill('Address does not match records')
    await expect(modal(page).getByText('A note is required when rejecting.')).toHaveCount(0)
    await modal(page).getByRole('button', { name: /confirm/i }).click()
    const call = await expectCall(api, 'PATCH', '/admin/change-requests/701')
    expect(call.json).toEqual({ status: 'Rejected', note: 'Address does not match records' })
  })

  test('a whitespace-only rejection note does not enable Confirm', async ({ page }) => {
    await open(page)
    await page.getByText('Smithfield Bakery LLC').click()
    await modal(page).getByRole('button', { name: 'Rejected' }).click()
    await modal(page).getByPlaceholder('Please provide a reason for rejection…').fill('   ')
    await expect(modal(page).getByRole('button', { name: /confirm/i })).toBeDisabled()
  })

  test('Cancel closes the review without saving', async ({ page }) => {
    const api = await open(page)
    await page.getByText('Smithfield Bakery LLC').click()
    await modal(page).getByRole('button', { name: 'Cancel' }).click()
    await expect(modal(page)).toHaveCount(0)
    expect(api.find('PATCH', '/admin/change-requests/')).toHaveLength(0)
  })

  test('an already-reviewed request is read-only', async ({ page }) => {
    await open(page)
    await page.getByText('Quill Ink Co').click()
    await expect(modal(page).getByRole('button', { name: /confirm/i })).toHaveCount(0)
    await expect(modal(page).locator('textarea')).toBeDisabled()
    await expect(modal(page).locator('textarea')).toHaveValue('Verified by phone')
    await expect(modal(page).getByRole('button', { name: 'Close' }).last()).toBeVisible()
  })

  test('a status:false response is reported and the review stays open', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'PATCH', match: '/admin/change-requests/701', body: failure('Request was already reviewed.') })
    await page.getByText('Smithfield Bakery LLC').click()
    await modal(page).getByRole('button', { name: /confirm/i }).click()
    await expect(page.getByText('Request was already reviewed.').first()).toBeVisible()
    await expect(modal(page)).toBeVisible()
  })

  test('a server error is reported', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'PATCH', match: '/admin/change-requests/701', status: 500, body: failure('boom') })
    await page.getByText('Smithfield Bakery LLC').click()
    await modal(page).getByRole('button', { name: /confirm/i }).click()
    await expect(page.getByText('Something went wrong')).toBeVisible()
  })

  test('a user without the update permission cannot decide', async ({ page }) => {
    await open(page, { permissions: ['view change requests'] })
    await page.getByText('Smithfield Bakery LLC').click()
    await expect(modal(page).getByText('You do not have permission to approve or reject this request.')).toBeVisible()
    await expect(modal(page).getByRole('button', { name: /confirm/i })).toHaveCount(0)
  })

  test('a non-host user with the permission still cannot decide', async ({ page }) => {
    await open(page, { permissions: PERMS, is_host: 0, partner_id: 3 })
    await page.getByText('Smithfield Bakery LLC').click()
    await expect(modal(page).getByText('You do not have permission to approve or reject this request.')).toBeVisible()
  })

  // BUG-014: an EIN change is listed masked; the review reveals both numbers on one button.
  test('an EIN change is listed masked and its numbers revealed in the review', async ({ page }) => {
    const ein = { id: 703, borrower_business_name: 'Chen Co', borrower_first_name: 'Michael', borrower_last_name: 'Chen', field_name: 'business_ein', old_value: '**-***6789', new_value: '**-***5345', is_masked: true, status: 'Pending', note: null, created_at: '2026-10-19' }
    await seedSession(page, { permissions: PERMS })
    const api = await mockApi(page, [
      { method: 'POST', match: LIST, body: paginated([ein]) },
      { method: 'POST', match: '/admin/change-requests/703/reveal', body: ok({ id: 703, old_value: '123456789', new_value: '345345345' }) },
    ])
    await page.goto('/intake-review/change-requests')

    const row = page.locator('tr', { hasText: 'Chen Co' })
    await expect(row.getByText('**-***5345')).toBeVisible()
    await row.click()
    await expect(modal(page).getByText('**-***6789')).toBeVisible()

    await modal(page).getByRole('button', { name: 'Show numbers' }).click()

    await expect(modal(page).getByText('12-3456789')).toBeVisible()
    await expect(modal(page).getByText('34-5345345')).toBeVisible()
    await expectCall(api, 'POST', '/admin/change-requests/703/reveal')
  })
})
