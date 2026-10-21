import { test, expect, type Page, type Route } from '@playwright/test'

// The host's partner filter dropdowns all list every partner from fch-api's
// POST common/get-all-partners - not the first page of the Partners table's
// /admin/partners/fetch-partners, which they used to read and which pages ten at
// a time. fch-api's PartnerOptionsApiTest covers the endpoint itself. Backend
// calls are intercepted at the API origin (see activity-visibility.spec.ts).
const API_ORIGIN = 'http://127.0.0.1:8000/api/v1'

const HOST_USER = {
  id: 1,
  name: 'Host Admin',
  email: 'host@example.test',
  user_type: 'Admin',
  entity_type: 'Partner',
  is_host: 1,
  partner_id: 1,
  permissions: ['view partners', 'view leads', 'view clients', 'view commission', 'view change requests'],
}

const THEME = {
  favicon: null, favicon_full_url: null,
  primary_color: '#2C6ECB', primary_logo: null, primary_logo_full_url: null,
  secondary_color: '#1A1A1A', secondary_logo: null, secondary_logo_full_url: null,
  sidebar_text_color: null, sidebar_icon_color: null,
  sidebar_text_hover_color: null, sidebar_icon_hover_color: null,
  site_name: 'Four Corner Funding', site_slogan: null,
}

const PARTNERS = Array.from({ length: 12 }, (_, i) => {
  const n = String(i + 1).padStart(2, '0')
  return { id: i + 1, full_name: `Partner ${n}`, company_name: `Company ${n}` }
})

async function seedSession(page: Page) {
  await page.addInitScript(
    ([u]) => {
      window.localStorage.setItem(
        'auth',
        JSON.stringify({ state: { token: 'e2e-fake-token', user: u, rememberMe: true }, version: 0 })
      )
      document.cookie = 'auth_session_active=true; path=/'
    },
    [HOST_USER]
  )
}

function jsonOk(route: Route, data: unknown, extra: Record<string, unknown> = {}) {
  return route.fulfill({ json: { status: true, message: 'ok', data, ...extra } })
}

/** Serves every partner as options, and fetch-partners a page of ten; counts calls to each. */
async function stubApi(page: Page) {
  const calls = { options: 0, fetchPartnersBodies: [] as Record<string, unknown>[] }
  await page.route(`${API_ORIGIN}/**`, (route) => jsonOk(route, [], { meta: { total: 0 }, statistics: {} }))
  await page.route(`${API_ORIGIN}/common/partner-theme`, (route) => jsonOk(route, { ...THEME, branding: THEME }))
  await page.route(`${API_ORIGIN}/common/get-all-partners`, (route) => {
    calls.options++
    return jsonOk(route, PARTNERS)
  })
  await page.route(`${API_ORIGIN}/admin/partners/fetch-partners`, (route) => {
    calls.fetchPartnersBodies.push(route.request().postDataJSON() ?? {})
    return jsonOk(route, PARTNERS.slice(0, 10), { meta: { total: PARTNERS.length }, statistics: {} })
  })
  return calls
}

// Every screen labels a partner the same way: "Company (Full name)".
const LABELS = PARTNERS.map((p) => `${p.company_name} (${p.full_name})`)

const SCREENS = [
  { name: 'Partners', path: '/partners', placeholder: 'All Partners' },
  { name: 'Leads', path: '/leads', placeholder: 'All Partners' },
  { name: 'Clients', path: '/clients', placeholder: 'All Partners' },
  { name: 'Commissions', path: '/commissions', placeholder: 'Select Partner' },
  { name: 'Verification Center', path: '/verification-center', placeholder: 'All Partners' },
  { name: 'Change Requests', path: '/intake-review/change-requests', placeholder: 'All Partners' },
]

test.describe('Partner filter dropdowns list every partner', () => {
  for (const screen of SCREENS) {
    test(`${screen.name}: the partner filter lists all ${PARTNERS.length} partners, sorted by name`, async ({ page }) => {
      await seedSession(page)
      const calls = await stubApi(page)
      await page.goto(screen.path)

      await page.locator('.p-dropdown', { hasText: screen.placeholder }).first().click()
      const items = page.locator('.p-dropdown-panel .p-dropdown-item').filter({ hasNotText: /^All Partners$/ })

      await expect(items).toHaveCount(PARTNERS.length)
      await expect(items).toHaveText(LABELS)
      expect(calls.options).toBe(1)
      // Only the Partners table itself pages through fetch-partners.
      expect(calls.fetchPartnersBodies.every((body) => 'page' in body)).toBe(true)
    })

    test(`${screen.name}: the partner filter has a search field`, async ({ page }) => {
      await seedSession(page)
      await stubApi(page)
      await page.goto(screen.path)

      await page.locator('.p-dropdown', { hasText: screen.placeholder }).first().click()
      const search = page.locator('.p-dropdown-panel .p-dropdown-filter')
      await expect(search).toBeVisible()
      await search.fill('Company 12')

      await expect(page.locator('.p-dropdown-panel .p-dropdown-item')).toHaveText(['Company 12 (Partner 12)'])
    })
  }
})
