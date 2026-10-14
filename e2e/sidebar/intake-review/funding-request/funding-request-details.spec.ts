import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall, pickPrime, type ApiMock } from '../../../support/helpers'

test.describe('Funding request details', () => {
  const DETAIL = /\/common\/funding-request\/501$/
  const STATUS = '/common/funding-request/status-update'
  const review = (over: Record<string, unknown> = {}) => ({
    id: 501, status: 'Pending', partner_id: 5, borrower_id: 7,
    borrower: { id: 7, first_name: 'Jane', last_name: 'Doe', email: 'jane@example.test' },
    partner: { full_name: 'Acme Funding', email: 'acme@example.test' },
    funding_sequence: { name: 'Working capital' }, use_of_funds: 'Inventory', funding_type: 'Term Loan',
    requested_amount: 50000, estimated_speed: '2 weeks', matched_lenders: [], assign_lender: null, documents: [], ...over,
  })
  const PERMS = ['view funding request', 'update funding request']

  async function open(page: Page, body: unknown = ok(review()), user: Record<string, unknown> = { permissions: PERMS }): Promise<ApiMock> {
    await seedSession(page, user)
    const api = await mockApi(page, [{ method: 'GET', match: DETAIL, body }])
    await page.goto('/intake-review/funding-request/501')
    return api
  }
  const actions = (page: Page) => page.locator('.card', { has: page.getByRole('heading', { name: 'Review Actions' }) })

  test('shows the borrower, partner and funding information', async ({ page }) => {
    const api = await open(page)
    await expectCall(api, 'GET', DETAIL)
    await expect(page.getByRole('heading', { name: 'Jane Doe' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Acme Funding' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Working capital' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '2 weeks' })).toBeVisible()
  })

  test('confirming an unchanged status posts nothing', async ({ page }) => {
    const api = await open(page)
    await actions(page).getByRole('button', { name: /Confirm/ }).click()
    await expect(page.getByText('Status is unchanged.')).toBeVisible()
    expect(api.find('POST', STATUS)).toHaveLength(0)
  })

  test('changing the status asks for confirmation and posts it', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: STATUS, body: ok() })
    await pickPrime(page, actions(page).locator('.p-dropdown'), 'In Progress')
    await actions(page).getByRole('button', { name: /Confirm/ }).click()
    const modal = page.locator('.modal.show')
    await expect(modal.getByText('Confirm Status Update')).toBeVisible()
    await modal.getByRole('button', { name: /Confirm/ }).click()
    const call = await expectCall(api, 'POST', STATUS)
    expect(call.json).toEqual({ id: 501, status: 'In Progress' })
    await expect(page.getByText('Funding request status updated to In Progress successfully')).toBeVisible()
  })

  test('Cancel in the confirmation posts nothing', async ({ page }) => {
    const api = await open(page)
    await pickPrime(page, actions(page).locator('.p-dropdown'), 'Accepted')
    await actions(page).getByRole('button', { name: /Confirm/ }).click()
    await page.locator('.modal.show').getByRole('button', { name: 'Cancel' }).click()
    expect(api.find('POST', STATUS)).toHaveLength(0)
  })

  test('rejecting requires a reason', async ({ page }) => {
    const api = await open(page)
    await pickPrime(page, actions(page).locator('.p-dropdown'), 'Rejected')
    await actions(page).getByRole('button', { name: /Confirm/ }).click()
    await expect(page.getByText('The reason / note field is required.')).toBeVisible()
    expect(api.find('POST', STATUS)).toHaveLength(0)
  })

  test('rejecting with a reason sends it', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: STATUS, body: ok() })
    await pickPrime(page, actions(page).locator('.p-dropdown'), 'Rejected')
    await page.getByPlaceholder('Please provide a reason for rejection...').fill('Revenue too low')
    await actions(page).getByRole('button', { name: /Confirm/ }).click()
    await page.locator('.modal.show').getByRole('button', { name: /Confirm/ }).click()
    const call = await expectCall(api, 'POST', STATUS)
    expect(call.json).toEqual({ id: 501, status: 'Rejected', reject_reason: 'Revenue too low' })
  })

  test('approving without an assigned lender asks for a lender first', async ({ page }) => {
    const api = await open(page)
    await pickPrime(page, actions(page).locator('.p-dropdown'), 'Approved')
    await actions(page).getByRole('button', { name: /Confirm/ }).click()
    await expect(page.locator('.modal.show').getByText('Lender Required')).toBeVisible()
    expect(api.find('POST', STATUS)).toHaveLength(0)
  })

  test('a server error on the status update is reported', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: STATUS, status: 500, body: failure('Could not update') })
    await pickPrime(page, actions(page).locator('.p-dropdown'), 'In Progress')
    await actions(page).getByRole('button', { name: /Confirm/ }).click()
    await page.locator('.modal.show').getByRole('button', { name: /Confirm/ }).click()
    await expect(page.getByText('Could not update')).toBeVisible()
  })

  test('a partner sees the request but no review actions', async ({ page }) => {
    await open(page, ok(review()), { permissions: PERMS, is_host: 0, partner_id: 5 })
    await expect(page.getByRole('heading', { name: 'Jane Doe' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Review Actions' })).toHaveCount(0)
  })

  test('a failed load goes back to the list', async ({ page }) => {
    await open(page, failure('Not found'))
    await expect(page).toHaveURL(/\/intake-review\/funding-request$/)
    await expect(page.getByText('Failed to load review details').first()).toBeVisible()
  })

  test('the page is blocked without the view permission', async ({ page }) => {
    await open(page, ok(review()), { permissions: [] })
    await expect(page).toHaveURL(/access-denied/)
  })
})
