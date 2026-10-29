import { test, expect, type Page, type Route } from '@playwright/test'

// A lead's Lead Owner (salesperson_id) is one of its own partner's team. The
// host opening a WLP's lead sees - and may only pick from - that WLP's team, so
// the owner the WLP set shows; the Leads list's Lead Owner filter follows the
// Partner filter the same way. The host sees every lead's type, but may change
// it only on its own leads not yet converted - any other partner's lead is
// always a Borrower lead, and a converted lead keeps its type. fch-api's
// LeadOwnerTeamTest covers the API side. Backend calls are intercepted at the
// API origin (see activity-visibility.spec.ts).
const API_ORIGIN = 'http://127.0.0.1:8000/api/v1'

const HOST_USER = {
  id: 11,
  name: 'Hal Host',
  email: 'host@example.test',
  user_type: 'Admin',
  entity_type: 'Partner',
  is_host: 1,
  partner_id: 1,
  permissions: ['view leads', 'update leads'],
}

const THEME = {
  favicon: null, favicon_full_url: null,
  primary_color: '#2C6ECB', primary_logo: null, primary_logo_full_url: null,
  secondary_color: '#1A1A1A', secondary_logo: null, secondary_logo_full_url: null,
  sidebar_text_color: null, sidebar_icon_color: null,
  sidebar_text_hover_color: null, sidebar_icon_hover_color: null,
  site_name: 'Four Corner Funding', site_slogan: null,
}

const HOST_TEAM = [{ id: 11, name: 'Hal Host' }]
const WLP_TEAM = [{ id: 21, name: 'Wil Label' }, { id: 22, name: 'Sal WLP' }]
const PARTNERS = [
  { id: 1, full_name: 'Hal Host', company_name: 'Host Co' },
  { id: 2, full_name: 'Wil Label', company_name: 'WLP Co' },
]

const leadOf = (id: number, partnerId: number, overrides: Record<string, unknown> = {}) => ({
  id,
  lead_type: 'Borrower',
  status: 'New Lead',
  probability: 'High',
  contact_person: `Lee Lead ${id}`,
  company_name: `Lead Co ${id}`,
  email: `lead-${id}@example.test`,
  phone_number: '(555) 123-4567',
  country: 'United States',
  lead_source: 'Website',
  convert_to: null as string | null,
  convert_email_already: false,
  salesperson_id: partnerId === 2 ? 22 : 11,
  salesperson_name: partnerId === 2 ? 'Sal WLP' : 'Hal Host',
  partner: { id: partnerId, full_name: 'Owner', company_name: partnerId === 2 ? 'WLP Co' : 'Host Co' },
  convert_on_behalf_of: partnerId === 2 ? { id: 2, company_name: 'WLP Co' } : null,
  ...overrides,
})

const WLP_LEAD = leadOf(7, 2)
const HOST_LEAD = leadOf(8, 1, { lead_type: 'Partner' })

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

/** Serves the leads and each partner's team; records every get-all-users and fetch-leads body. */
async function stubApi(page: Page, leads: ReturnType<typeof leadOf>[]) {
  const calls = { teams: [] as Record<string, unknown>[], fetches: [] as Record<string, unknown>[] }
  await page.route(`${API_ORIGIN}/**`, (route) => jsonOk(route, [], { meta: { total: 0 }, statistics: {} }))
  await page.route(`${API_ORIGIN}/common/partner-theme`, (route) => jsonOk(route, { ...THEME, branding: THEME }))
  await page.route(`${API_ORIGIN}/common/get-all-partners`, (route) => jsonOk(route, PARTNERS))
  await page.route(`${API_ORIGIN}/common/get-all-users`, (route) => {
    const body = route.request().postDataJSON() ?? {}
    calls.teams.push(body)
    return jsonOk(route, body.partner_id === 2 ? WLP_TEAM : HOST_TEAM)
  })
  await page.route(`${API_ORIGIN}/common/leads/fetch-leads`, (route) => {
    calls.fetches.push(route.request().postDataJSON() ?? {})
    return jsonOk(route, leads, { meta: { total: leads.length }, statistics: { total_leads: leads.length, new_leads: 0, qualified_rate: 0, declined_rate: 0 } })
  })
  for (const lead of leads) {
    await page.route(`${API_ORIGIN}/common/leads/${lead.id}`, (route) => jsonOk(route, lead))
  }
  return calls
}

/** The dropdown under a lead form label. */
const fieldDropdown = (page: Page, label: string) =>
  page.locator('.mb-3', { has: page.locator('label.form-label', { hasText: label }) }).locator('.p-dropdown')

test.describe('Lead details › owner and type', () => {
  test('the host sees the owner a WLP set on its lead, picked from the WLP\'s team, and its type read-only', async ({ page }) => {
    await seedSession(page)
    const calls = await stubApi(page, [WLP_LEAD])
    await page.goto('/leads/7?tab=leadDetails')

    const owner = fieldDropdown(page, 'Lead Owner')
    await expect(owner.locator('.p-dropdown-label')).toHaveText('Sal WLP')
    // Active staff only, keeping the saved owner even if since made inactive.
    expect(calls.teams).toContainEqual({ partner_id: 2, active_only: true, keep_ids: [22] })

    await owner.click()
    await expect(page.locator('.p-dropdown-panel .p-dropdown-item')).toHaveText(['Wil Label', 'Sal WLP'])
    await page.keyboard.press('Escape')

    const type = fieldDropdown(page, 'Lead Type')
    await expect(type.locator('.p-dropdown-label')).toHaveText('Borrower')
    await expect(type).toHaveClass(/p-disabled/)
  })

  test('the host sees its own lead\'s type, with its own team as owners', async ({ page }) => {
    await seedSession(page)
    const calls = await stubApi(page, [HOST_LEAD])
    await page.goto('/leads/8?tab=leadDetails')

    await expect(fieldDropdown(page, 'Lead Owner').locator('.p-dropdown-label')).toHaveText('Hal Host')
    await expect(fieldDropdown(page, 'Lead Type').locator('.p-dropdown-label')).toHaveText('Partner')
    expect(calls.teams.every((body) => !('partner_id' in body))).toBe(true)
  })
})

test.describe('Lead details › converted lead type', () => {
  test('a converted lead\'s type is read-only', async ({ page }) => {
    await seedSession(page)
    await stubApi(page, [{ ...HOST_LEAD, convert_to: 'Partner' }])
    await page.goto('/leads/8?tab=leadDetails')

    const type = fieldDropdown(page, 'Lead Type')
    await expect(type.locator('.p-dropdown-label')).toHaveText('Partner')
    await expect(type).toHaveClass(/p-disabled/)
    await type.click({ force: true })
    await expect(page.locator('.p-dropdown-panel')).toHaveCount(0)
  })

  test('a lead not yet converted keeps an editable type', async ({ page }) => {
    await seedSession(page)
    await stubApi(page, [HOST_LEAD])
    await page.goto('/leads/8?tab=leadDetails')

    const type = fieldDropdown(page, 'Lead Type')
    await expect(type.locator('.p-dropdown-label')).toHaveText('Partner')
    await type.click()
    await expect(page.locator('.p-dropdown-panel .p-dropdown-item')).toHaveText(['Borrower', 'Partner'])
  })
})

test.describe('Leads list › owner filter and type', () => {
  test('the Lead Owner filter lists the chosen partner\'s team', async ({ page }) => {
    await seedSession(page)
    const calls = await stubApi(page, [WLP_LEAD, HOST_LEAD])
    await page.goto('/leads')
    await expect(page.locator('tr', { hasText: 'Lee Lead 7' })).toBeVisible()

    await page.locator('.p-dropdown', { hasText: 'All Lead Owner' }).click()
    await expect(page.locator('.p-dropdown-panel .p-dropdown-item')).toHaveText(['All Lead Owner', 'Hal Host'])
    await page.locator('.p-dropdown-panel .p-dropdown-item', { hasText: /^Hal Host$/ }).click()

    await page.locator('.p-dropdown', { hasText: 'All Partners' }).click()
    await page.locator('.p-dropdown-panel .p-dropdown-item', { hasText: /^WLP Co \(Wil Label\)$/ }).click()

    await page.locator('.p-dropdown', { hasText: 'All Lead Owner' }).click()
    await expect(page.locator('.p-dropdown-panel .p-dropdown-item')).toHaveText(['All Lead Owner', 'Wil Label', 'Sal WLP'])
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: /Filters/ }).click()
    await expect.poll(() => calls.fetches[calls.fetches.length - 1]).toMatchObject({ partner_id: 2, salesperson_id: '' })
  })

  test('the host sees every lead\'s type, its own and other partners\'', async ({ page }) => {
    await seedSession(page)
    await stubApi(page, [WLP_LEAD, HOST_LEAD])
    await page.goto('/leads')

    const statusCell = (contact: string) => page.locator('tr', { hasText: contact }).locator('td', { hasText: 'New Lead' })
    await expect(statusCell('Lee Lead 8')).toHaveText('New LeadPartner')
    await expect(statusCell('Lee Lead 7')).toHaveText('New LeadBorrower')
  })
})
