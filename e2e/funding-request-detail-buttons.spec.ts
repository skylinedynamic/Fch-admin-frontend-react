import { test, expect, type Page, type Route } from '@playwright/test'

// Funding Request Details: "Go to Client" (header) and "Confirm" (Review
// Actions) are drawn in the partner's primary colour, not info-blue or dark.
// Backend calls are intercepted at the API origin.
const API_ORIGIN = 'http://127.0.0.1:8000/api/v1'

const PRIMARY = '#2C6ECB'
const PRIMARY_RGB = 'rgb(44, 110, 203)'

const HOST_USER = {
  id: 1,
  name: 'Host Admin',
  email: 'host@example.test',
  user_type: 'Admin',
  is_host: 1,
  partner_id: null,
  permissions: ['view funding request', 'update funding request'],
}

const THEME = {
  favicon: null, favicon_full_url: null,
  primary_color: PRIMARY, primary_logo: null, primary_logo_full_url: null,
  secondary_color: '#1A1A1A', secondary_logo: null, secondary_logo_full_url: null,
  sidebar_text_color: null, sidebar_icon_color: null,
  sidebar_text_hover_color: null, sidebar_icon_hover_color: null,
  site_name: 'Four Corner Funding', site_slogan: null,
}

const REVIEW = {
  id: 5,
  borrower_id: 3,
  borrower: { id: 3, first_name: 'Giselle', last_name: 'Noel', business_name: 'Noel Holdings LLC' },
  status: 'Pending',
  funding_type: 'Term Loan',
  requested_amount: 45000,
  documents_with_urls: [],
  matched_lenders: [],
  lender_names: [],
  created_at: '2026-10-01T10:00:00Z',
  updated_at: '2026-10-01T10:00:00Z',
}

async function openDetails(page: Page, status = 'Pending') {
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

  const ok = (route: Route, data: unknown) => route.fulfill({ json: { status: true, message: 'ok', data } })
  await page.route(`${API_ORIGIN}/**`, (route) => ok(route, []))
  await page.route(`${API_ORIGIN}/common/partner-theme`, (route) => ok(route, { ...THEME, branding: THEME }))
  await page.route(`${API_ORIGIN}/common/funding-request/${REVIEW.id}`, (route) => ok(route, { ...REVIEW, status }))

  await page.goto(`/intake-review/funding-request/${REVIEW.id}`)
}

test.describe('Funding Request Details › action buttons', () => {
  test('Go to Client and Confirm are in the primary colour', async ({ page }) => {
    await openDetails(page)

    await expect(page.getByRole('link', { name: /go to client/i })).toHaveCSS('background-color', PRIMARY_RGB)
    await expect(page.getByRole('button', { name: /^confirm/i })).toHaveCSS('background-color', PRIMARY_RGB)
  })

  test('Confirm stays primary when rejecting', async ({ page }) => {
    await openDetails(page, 'Rejected')

    await expect(page.getByRole('button', { name: /^confirm/i })).toHaveCSS('background-color', PRIMARY_RGB)
  })
})
