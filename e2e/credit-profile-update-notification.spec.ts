import { test, expect, type Page, type Route } from '@playwright/test'

// A borrower whose iSoftPull report the host already saved asks for it to be
// updated. The host's bell notification ("… asked to update their credit
// profile.") opens that borrower's request, not the request list. The link
// itself comes from fch-api (RequestCreditProfileUpdateNotifiesHostTest); this
// checks the portal follows it. Backend calls are intercepted at the API origin.
const API_ORIGIN = 'http://127.0.0.1:8000/api/v1'

const HOST_USER = {
  id: 1,
  name: 'Host Admin',
  email: 'host@example.test',
  user_type: 'Admin',
  is_host: 1,
  partner_id: null,
  permissions: [],
}

const THEME = {
  favicon: null, favicon_full_url: null,
  primary_color: '#2C6ECB', primary_logo: null, primary_logo_full_url: null,
  secondary_color: '#1A1A1A', secondary_logo: null, secondary_logo_full_url: null,
  sidebar_text_color: null, sidebar_icon_color: null,
  sidebar_text_hover_color: null, sidebar_icon_hover_color: null,
  site_name: 'Four Corner Funding', site_slogan: null,
}

const REQUEST = {
  id: 42,
  borrower_id: 9,
  first_name: 'Odessa',
  middle_name: null,
  last_name: 'Mccall',
  address: '270 Sharulia Road',
  apt_suite_other: null,
  city: 'Austin',
  state: 'Texas',
  zip: '78701',
  ssn: '123456789',
  date_of_birth: '1986-09-01',
  phone: '5125550100',
  email: 'odessa@example.test',
  created_at: '2026-10-01T10:00:00Z',
  updated_at: '2026-10-18T10:00:00Z',
  borrower: { id: 9, business_name: 'Odessa LLC' },
}

const NOTIFICATION = {
  id: 'n-1',
  type: 'host.credit_profile.update_requested',
  title: 'Credit profile update requested',
  body: 'Odessa Mccall asked to update their credit profile.',
  url: `/intake-review/credit-profile-requests/${REQUEST.id}`,
  icon: 'ri-file-user-line',
  category: 'document',
  is_read: false,
  read_at: null,
  created_at: '2026-10-18T10:00:00Z',
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

function jsonOk(route: Route, data: unknown, extra: Record<string, unknown> = {}) {
  return route.fulfill({ json: { status: true, message: 'ok', data, ...extra } })
}

test.describe('Notifications › credit profile update requested', () => {
  test.beforeEach(async ({ page }) => {
    await seedHostSession(page)

    await page.route(`${API_ORIGIN}/**`, (route) => jsonOk(route, []))
    await page.route(`${API_ORIGIN}/common/partner-theme`, (route) => jsonOk(route, { ...THEME, branding: THEME }))
    await page.route(`${API_ORIGIN}/common/notifications?**`, (route) =>
      jsonOk(route, [NOTIFICATION], { meta: { current_page: 1, last_page: 1, per_page: 5, total: 1, unread_count: 1 } })
    )
    await page.route(`${API_ORIGIN}/common/notifications/unread-count`, (route) => jsonOk(route, { unread_count: 1 }))
    await page.route(`${API_ORIGIN}/admin/credit-profile-requests/${REQUEST.id}`, (route) => jsonOk(route, REQUEST))
  })

  test("clicking it opens that borrower's request, not the list", async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: /notifications, 1 unread/i }).click()
    await page.getByText('Odessa Mccall asked to update their credit profile.').click()

    await expect(page).toHaveURL(new RegExp(`/intake-review/credit-profile-requests/${REQUEST.id}$`))
    await expect(page.getByText('Applicant Details')).toBeVisible()
    await expect(page.getByText('odessa@example.test').first()).toBeVisible()
  })

  test('a request opened from the profile shows what it has, and "Not provided" for the rest', async ({ page }) => {
    // The borrower never submitted the form: the update request opened one from
    // their profile, which held no ZIP, phone or date of birth.
    await page.route(`${API_ORIGIN}/admin/credit-profile-requests/${REQUEST.id}`, (route) =>
      jsonOk(route, { ...REQUEST, zip: null, phone: null, date_of_birth: null })
    )
    await page.goto('/')

    await page.getByRole('button', { name: /notifications, 1 unread/i }).click()
    await page.getByText('Odessa Mccall asked to update their credit profile.').click()

    await expect(page).toHaveURL(new RegExp(`/intake-review/credit-profile-requests/${REQUEST.id}$`))
    const field = (label: string) => page.locator('.cpr-field', { has: page.locator('.cpr-field-label', { hasText: label }) })
    await expect(field('Zip Code')).toContainText('Not provided')
    await expect(field('Phone Number')).toContainText('Not provided')
    await expect(field('Date of Birth')).toContainText('Not provided')
    await expect(field('City')).toContainText('Austin')
    await expect(page.locator('a[href="tel:null"]')).toHaveCount(0)
  })
})
