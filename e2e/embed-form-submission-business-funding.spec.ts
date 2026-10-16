import { test, expect, type Page, type Route } from '@playwright/test'

// Embed Form › Loan Applications › details: the answers the public form now
// collects - the business EIN, the business start date (stored as
// business_checking_start_date), the requested amount's currency and the
// additional funding types. The backend side is covered by fch-api's
// EmbedFormSubmissionResourceTest. Backend calls are intercepted at the API
// origin (see embed-form-convert-existing-borrower.spec.ts for the pattern).
const API_ORIGIN = 'http://127.0.0.1:8000/api/v1'

const HOST_USER = {
  id: 1,
  name: 'Host Admin',
  email: 'host@example.test',
  user_type: 'Admin',
  is_host: 1,
  partner_id: null,
  permissions: ['view application'],
}

const THEME = {
  favicon: null, favicon_full_url: null,
  primary_color: '#2C6ECB', primary_logo: null, primary_logo_full_url: null,
  secondary_color: '#1A1A1A', secondary_logo: null, secondary_logo_full_url: null,
  sidebar_text_color: null, sidebar_icon_color: null,
  sidebar_text_hover_color: null, sidebar_icon_hover_color: null,
  site_name: 'Four Corner Funding', site_slogan: null,
}

const SUBMISSION = {
  id: 5,
  submission_uid: 'e2e-submission-5',
  partner_id: 1,
  first_name: 'Odessa',
  last_name: 'Mccall',
  email: 'odessa@example.test',
  status: 'new',
  business_ein: '123456789',
  business_ein_display: '12-3456789',
  years_in_business: '3+ years',
  business_checking_start_date: '2019-04-01',
  currency: 'GBP',
  currency_symbol: '£',
  requested_amount: '150000.00',
  requested_amount_formatted: '£150,000.00',
  preferred_funding_type: 'Term Loan',
  additional_funding_types: ['SBA Loan', 'Line of Credit'],
  attachments: [],
  co_borrowers: [],
  created_at: '2026-10-16 09:00:00',
}

async function seedHostSession(page: Page) {
  await page.addInitScript(
    ([user]) => {
      window.localStorage.setItem(
        'auth',
        JSON.stringify({ state: { token: 'e2e-fake-token', user, rememberMe: true }, version: 0 })
      )
      document.cookie = 'auth_session_active=true; path=/'
    },
    [HOST_USER]
  )
}

function jsonOk(route: Route, data: unknown) {
  return route.fulfill({ json: { status: true, message: 'ok', data } })
}

test.describe('Embed Form › Loan application › business and funding answers', () => {
  test.beforeEach(async ({ page }) => {
    await seedHostSession(page)

    await page.route(`${API_ORIGIN}/**`, (route) => jsonOk(route, []))
    await page.route(`${API_ORIGIN}/common/partner-theme`, (route) => jsonOk(route, { ...THEME, branding: THEME }))
    await page.route(`${API_ORIGIN}/common/embed-forms/submissions/5`, (route) => jsonOk(route, SUBMISSION))

    await page.goto('/embed-form/loan-applications/5')
  })

  test('shows the EIN and the business start date', async ({ page }) => {
    await expect(page.getByText('Business EIN')).toBeVisible()
    await expect(page.getByText('12-3456789')).toBeVisible()
    await expect(page.getByText('Business Start Date')).toBeVisible()
    await expect(page.getByText('Checking Opened')).toHaveCount(0)
  })

  test('shows the requested amount in its currency', async ({ page }) => {
    await expect(page.getByText('£150,000.00').first()).toBeVisible()
    await expect(page.getByText('GBP', { exact: true })).toBeVisible()
    await expect(page.getByText('$150,000.00')).toHaveCount(0)
  })

  test('lists the additional funding types after the preferred one', async ({ page }) => {
    await expect(page.getByText('Preferred Funding Type')).toBeVisible()
    await expect(page.getByText('Additional Funding Types')).toBeVisible()
    await expect(page.getByText('SBA Loan, Line of Credit')).toBeVisible()
  })
})
