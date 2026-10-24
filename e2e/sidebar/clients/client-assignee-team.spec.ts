import { test, expect, type Page, type Route } from '@playwright/test'

// BUG-055: a client's "Assign to" is one of its own partner's team. The host
// opening a partner's client picks from that partner's staff, not its own; an
// assignee saved before the rule, outside the team, still shows (marked) and
// saves. fch-api's ClientAssigneeTeamTest covers the API side. Backend calls
// are intercepted at the API origin (see lead-owner-team.spec.ts).
const API_ORIGIN = 'http://127.0.0.1:8000/api/v1'

const HOST_USER = {
  id: 11,
  name: 'Hal Host',
  email: 'host@example.test',
  user_type: 'Admin',
  entity_type: 'Partner',
  is_host: 1,
  partner_id: 1,
  permissions: ['view clients', 'create clients', 'update clients'],
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

const clientOf = (overrides: Record<string, unknown> = {}) => ({
  id: 5,
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@example.test',
  phone_number: '(555) 234-5678',
  country: 'United States',
  business_country: 'United States',
  partner_id: 2,
  assign_id: 22,
  assign_name: 'Sal WLP',
  ...overrides,
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

/** Serves the client and each partner's team; records every get-all-users body. */
async function stubApi(page: Page, client: ReturnType<typeof clientOf>) {
  const calls = { teams: [] as Record<string, unknown>[] }
  await page.route(`${API_ORIGIN}/**`, (route) => jsonOk(route, [], { meta: { total: 0 } }))
  await page.route(`${API_ORIGIN}/common/partner-theme`, (route) => jsonOk(route, { ...THEME, branding: THEME }))
  await page.route(`${API_ORIGIN}/common/get-all-users`, (route) => {
    const body = route.request().postDataJSON() ?? {}
    calls.teams.push(body)
    return jsonOk(route, body.partner_id === 2 ? WLP_TEAM : HOST_TEAM)
  })
  await page.route(`${API_ORIGIN}/common/borrowers/${client.id}`, (route) =>
    route.request().method() === 'GET' ? jsonOk(route, client) : route.fallback()
  )
  return calls
}

const assignTo = (page: Page) =>
  page.locator('.mb-3', { has: page.locator('label.form-label', { hasText: 'Assign to' }) }).locator('.p-dropdown')

test.describe('Client profile › Assign to', () => {
  test("the host on a partner's client picks from that partner's team", async ({ page }) => {
    await seedSession(page)
    const calls = await stubApi(page, clientOf())
    await page.goto('/clients/5')

    const field = assignTo(page)
    await expect(field.locator('.p-dropdown-label')).toHaveText('Sal WLP')
    expect(calls.teams).toContainEqual({ partner_id: 2 })

    await field.click()
    await expect(field.locator('.p-dropdown-item')).toHaveText(['Wil Label', 'Sal WLP'])
  })

  test('an assignee from before, outside the team, still shows - marked', async ({ page }) => {
    await seedSession(page)
    await stubApi(page, clientOf({ assign_id: 11, assign_name: 'Hal Host' }))
    await page.goto('/clients/5')

    const field = assignTo(page)
    await expect(field.locator('.p-dropdown-label')).toHaveText("Hal Host (not on this partner's team)")

    await field.click()
    await expect(field.locator('.p-dropdown-item')).toHaveText(['Wil Label', 'Sal WLP', "Hal Host (not on this partner's team)"])
  })

  test('Add Client assigns from your own team', async ({ page }) => {
    await seedSession(page)
    const calls = await stubApi(page, clientOf())
    await page.goto('/clients/create')

    await assignTo(page).click()
    await expect(assignTo(page).locator('.p-dropdown-item')).toHaveText(['Hal Host'])
    expect(calls.teams.every((body) => !('partner_id' in body))).toBe(true)
  })
})
