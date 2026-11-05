import { test, expect, type Page, type Route } from '@playwright/test'

// Maintenance mode for a tab that is already open: the server's Nginx starts
// answering every API call with 503 { maintenance: true } and every portal page
// with its static maintenance page. The open tab reloads once and lands on that
// page. Backend calls are answered at the API origin, and the static page is
// stood in for at the portal origin, so no backend or Nginx is needed.
const API_ORIGIN = 'http://127.0.0.1:8000/api/v1'
const MAINTENANCE_MESSAGE = 'We are updating the platform. Please try again in a few minutes.'
const STATIC_PAGE = '<!doctype html><title>Maintenance</title><h1>We\'ll be right back</h1>'

const THEME = {
  favicon: null, favicon_full_url: null,
  primary_color: '#2C6ECB', secondary_color: '#1A1A1A',
  site_name: 'Four Corner Funding', site_slogan: null,
}
const COMPLETE = { is_fresh_email: true, is_fresh_settings: true, is_fresh_payment: true }

const PARTNER = {
  id: 1,
  name: 'Wendy White-Label',
  email: 'wendy@example.test',
  user_type: 'Partner',
  entity_type: 'Partner',
  partner_type: 'White-Label Partner (WL)',
  is_host: 0,
  partner_id: 2,
  permissions: ['update payment settings', 'update email configuration settings', 'update branding settings', 'view clients'],
}

const ok = (route: Route, data: unknown) => route.fulfill({ json: { status: true, message: 'ok', data } })

async function signIn(page: Page) {
  await page.addInitScript(
    ([u]) => {
      window.localStorage.setItem('auth', JSON.stringify({ state: { token: 'e2e-fake-token', user: u, rememberMe: true }, version: 0 }))
      document.cookie = 'auth_session_active=true; path=/'
    },
    [PARTNER]
  )
  await page.route(`${API_ORIGIN}/**`, (route) => ok(route, []))
  await page.route(`${API_ORIGIN}/common/partner-theme`, (route) => ok(route, { ...THEME, branding: THEME, status_flags: COMPLETE }))
  await page.route(`${API_ORIGIN}/common/mail-configurations`, (route) => ok(route, {
    configurations: [], providers: [], uses_own_configuration: true,
    fallback: { is_configured: true, is_verified: true, from_address: 'noreply@fch.test' },
    can_manage_fallback: false,
  }))
}

/** The API side of the switch: every call answers the maintenance 503. */
async function apiInMaintenance(page: Page) {
  await page.unrouteAll({ behavior: 'ignoreErrors' })
  await page.route(`${API_ORIGIN}/**`, (route) =>
    route.fulfill({ status: 503, json: { status: false, maintenance: true, message: MAINTENANCE_MESSAGE } })
  )
}

/** The portal side of the switch: page loads get the static maintenance page. */
async function portalInMaintenance(page: Page, baseURL: string) {
  await page.route(`${new URL(baseURL).origin}/**`, (route) =>
    route.request().resourceType() === 'document'
      ? route.fulfill({ status: 503, contentType: 'text/html', body: STATIC_PAGE })
      : route.continue()
  )
}

const openEmailConfiguration = (page: Page) =>
  page.locator('.settings-menu-card .list-group-item', { hasText: 'Email Configuration' }).click()

test.describe('Maintenance in an open tab', () => {
  test('reloads onto the server maintenance page once maintenance starts', async ({ page, baseURL }) => {
    await signIn(page)
    await page.goto('/settings')
    await expect(page).toHaveURL(/\/settings\/payment-integration$/)

    await apiInMaintenance(page)
    await portalInMaintenance(page, baseURL!)
    await openEmailConfiguration(page)

    await expect(page.getByRole('heading', { name: "We'll be right back" })).toBeVisible()
  })

  test('reloads only once when the portal itself is still up, then shows the message', async ({ page }) => {
    await signIn(page)
    await page.goto('/settings')
    await expect(page).toHaveURL(/\/settings\/payment-integration$/)

    // Only the API reports maintenance; the portal page still loads normally.
    await apiInMaintenance(page)
    let loads = 0
    page.on('load', () => {
      loads += 1
    })
    await openEmailConfiguration(page)

    await expect(page.locator('.Toastify__toast', { hasText: MAINTENANCE_MESSAGE })).toBeVisible()
    // Give a second reload every chance to happen; it must not.
    await page.waitForTimeout(2000)
    expect(loads).toBe(1)
  })
})
