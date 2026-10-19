import { test, expect, type Page, type Route } from '@playwright/test'

// Client > Credit Profile: only the host partner's team uploads, updates or
// removes a client's credit report; another partner only reads it. Backend
// calls are answered at the API origin.
const API_ORIGIN = 'http://127.0.0.1:8000/api/v1'

const THEME = { primary_color: '#2C6ECB', secondary_color: '#1A1A1A', site_name: 'Four Corner Funding' }

const PROFILE = {
  id: 1,
  pdf_url: null,
  document_id: null,
  personal_info: { name: 'Odessa Mccall', dob: '1986-09-01', ssn: '6789', email: null, phone: null },
  metrics: { fico_score: 712 },
  addresses: [],
  trade_accounts: [],
  inquiries: [],
}

function ok(route: Route, data: unknown, message = 'ok') {
  return route.fulfill({ json: { status: true, message, data } })
}

async function openCreditProfile(page: Page, isHost: boolean, state: { profile: unknown }) {
  const user = {
    id: 1,
    name: isHost ? 'Host Owner' : 'Wendy White-Label',
    email: 'user@example.test',
    user_type: 'Partner',
    entity_type: 'Partner',
    partner_type: isHost ? '' : 'White-Label Partner (WL)',
    is_host: isHost ? 1 : 0,
    partner_id: isHost ? 1 : 2,
    permissions: ['view clients', 'update clients'],
  }
  await page.addInitScript(
    ([u]) => {
      window.localStorage.setItem('auth', JSON.stringify({ state: { token: 'e2e-fake-token', user: u, rememberMe: true }, version: 0 }))
      document.cookie = 'auth_session_active=true; path=/'
    },
    [user]
  )
  await page.route(`${API_ORIGIN}/**`, (route) => ok(route, []))
  await page.route(`${API_ORIGIN}/common/partner-theme`, (route) =>
    ok(route, { branding: THEME, status_flags: { is_fresh_email: true, is_fresh_settings: true, is_fresh_payment: true } })
  )
  await page.route(`${API_ORIGIN}/common/borrowers/3`, (route) =>
    ok(route, { id: 3, first_name: 'Odessa', last_name: 'Mccall', email: 'odessa@example.test', status: 'Active' })
  )
  await page.route(`${API_ORIGIN}/common/borrowers/get-credit-profile/3`, (route) => ok(route, state.profile))

  await page.goto('/clients/3')
  await page.getByRole('tab', { name: 'Credit Profile' }).click()
}

test.describe('Client › Credit Profile', () => {
  test('another partner reads the credit profile but cannot upload, update or remove it', async ({ page }) => {
    await openCreditProfile(page, false, { profile: PROFILE })

    await expect(page.getByText('Extracted Credit Metrics')).toBeVisible()
    await expect(page.getByRole('button', { name: /re-upload pdf/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /save credit profile/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /delete credit profile/i })).toHaveCount(0)
  })

  test('another partner is told the host uploads it when there is none', async ({ page }) => {
    await openCreditProfile(page, false, { profile: null })

    await expect(page.getByText('No credit profile yet')).toBeVisible()
    await expect(page.getByText(/choose pdf report/i)).toHaveCount(0)
  })

  test('the host removes all of it after confirming', async ({ page }) => {
    const state = { profile: PROFILE as unknown }
    let deleted = 0
    await openCreditProfile(page, true, state)
    await page.route(`${API_ORIGIN}/common/borrowers/3/credit-profile`, (route) => {
      deleted++
      state.profile = null
      return ok(route, null, 'Credit profile data removed.')
    })

    await page.getByRole('button', { name: /delete credit profile/i }).click()
    const modal = page.locator('.modal.show', { hasText: 'Delete Credit Profile Data' })
    await expect(modal).toBeVisible()
    expect(deleted).toBe(0)

    await modal.getByRole('button', { name: 'Yes, Delete All' }).click()
    await expect(page.getByText(/choose pdf report/i)).toBeVisible()
    expect(deleted).toBe(1)
  })
})
