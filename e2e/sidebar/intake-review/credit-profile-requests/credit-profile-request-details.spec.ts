import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall, type ApiMock } from '../../../support/helpers'

test.describe('Credit profile request details', () => {
  const DETAIL = '/admin/credit-profile-requests/801'
  const request = (over: Record<string, unknown> = {}) => ({
    id: 801, borrower_id: 7, first_name: 'Cy', middle_name: 'Q', last_name: 'Credit',
    email: 'cy@example.test', phone: '(555) 800-0001', ssn: '123-45-6789', date_of_birth: '1990-05-01',
    address: '9 Elm St', apt_suite_other: 'Apt 2', city: 'Austin', state: 'TX', zip: '73301',
    created_at: '2026-03-06T10:00:00Z',
    borrower: { business_name: 'Credit Works', email: 'works@example.test', phone_number: '555-0102' },
    credit_authorizations: null, credit_last_pulled_at: null, ...over,
  })

  async function open(page: Page, body: unknown = ok(request()), user: Record<string, unknown> = { permissions: ['view clients'] }, status = 200): Promise<ApiMock> {
    await seedSession(page, user)
    const api = await mockApi(page, [{ method: 'GET', match: DETAIL, body, status }])
    await page.goto('/intake-review/credit-profile-requests/801')
    return api
  }

  test('shows the applicant, address and borrower account', async ({ page }) => {
    const api = await open(page)
    await expectCall(api, 'GET', DETAIL)
    await expect(page.getByText('Cy Q Credit').first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'cy@example.test' })).toHaveAttribute('href', 'mailto:cy@example.test')
    await expect(page.getByText('9 Elm St')).toBeVisible()
    await expect(page.getByText('(Apt 2)')).toBeVisible()
    await expect(page.getByText('Credit Works')).toBeVisible()
    await expect(page.getByRole('link', { name: 'works@example.test' })).toBeVisible()
  })

  test('the SSN is masked until Reveal is pressed, and Hide masks it again', async ({ page }) => {
    await open(page)
    await expect(page.getByText('***-**-6789')).toBeVisible()
    await expect(page.getByText('123-45-6789')).toHaveCount(0)
    await page.getByRole('button', { name: 'Reveal' }).click()
    await expect(page.getByText('123-45-6789')).toBeVisible()
    await page.getByRole('button', { name: 'Hide' }).click()
    await expect(page.getByText('***-**-6789')).toBeVisible()
  })

  test('Go to Borrower Credit Profile links to the client with view clients', async ({ page }) => {
    await open(page)
    await expect(page.getByRole('link', { name: /Go to Borrower Credit Profile/ })).toHaveAttribute('href', '/clients/7')
  })

  test('the borrower link is hidden without view clients', async ({ page }) => {
    await open(page, ok(request()), { permissions: [] })
    await expect(page.getByText('Cy Q Credit').first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Go to Borrower Credit Profile/ })).toHaveCount(0)
  })

  test('a failed load shows the error and a way back to the list', async ({ page }) => {
    await open(page, failure('Not found'), undefined, 404)
    await expect(page.getByText('Error loading request details')).toBeVisible()
    await page.getByRole('link', { name: 'Back to List' }).click()
    await expect(page).toHaveURL(/\/intake-review\/credit-profile-requests$/)
  })

  test('a non-host user cannot open the request', async ({ page }) => {
    await open(page, ok(request()), { is_host: 0, partner_id: 5, permissions: ['view clients'] })
    await expect(page).not.toHaveURL(/credit-profile-requests\/801/)
  })
})
