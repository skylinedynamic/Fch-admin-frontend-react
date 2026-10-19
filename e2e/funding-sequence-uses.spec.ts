import { test, expect, type Page, type Route } from '@playwright/test'

// Edit Funding Sequence -> Uses selects several: a sequence holds an array of
// uses. Every saved use shows (one not on the standard list too), a use can be
// added, and the save sends them all. Backend calls are intercepted at the API
// origin; nothing is written.
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

const SEQUENCE = {
  id: 1,
  name: 'Term Loans',
  subtitle: 'Fixed payments',
  amount_range: '10000-250000',
  terms: '12 - 60 months',
  status: 'Active',
  action_url: '',
  description: '',
  icon: '',
  icon_color: 'blue',
  sort_order: 1,
  speed_to_funds: '1 - 7 Days',
  // "Travel" is not on the standard list: older sequences hold free-text uses.
  uses: ['Working Capital', 'Inventory', 'Travel'],
  readiness_factors: [],
  missing_documents: [],
  allowed_documents: [],
  lenders: [],
  lender_visibilities: [],
}

async function openEdit(page: Page) {
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

  const sent: { display: Record<string, unknown> | null } = { display: null }
  const ok = (route: Route, data: unknown) => route.fulfill({ json: { status: true, message: 'ok', data } })

  await page.route(`${API_ORIGIN}/**`, (route) => ok(route, []))
  await page.route(`${API_ORIGIN}/common/partner-theme`, (route) => ok(route, { ...THEME, branding: THEME }))
  await page.route(`${API_ORIGIN}/admin/funding-sequencings/${SEQUENCE.id}`, (route) => ok(route, SEQUENCE))
  await page.route(`${API_ORIGIN}/admin/funding-sequencings/${SEQUENCE.id}/display`, (route) => {
    sent.display = route.request().postDataJSON()
    return ok(route, SEQUENCE)
  })

  await page.goto(`/funding/${SEQUENCE.id}`)
  return sent
}

const usesField = (page: Page) => page.locator('.taxonomy-field', { has: page.locator('label[for="uses"]') }).locator('.p-multiselect')

test.describe('Edit Funding Sequence › Uses', () => {
  test('shows every saved use, and saves an added one with the rest', async ({ page }) => {
    const sent = await openEdit(page)

    const field = usesField(page)
    await expect(field.locator('.p-multiselect-token-label')).toHaveText(['Working Capital', 'Inventory', 'Travel'])

    await field.locator('.p-multiselect-trigger').click()
    await field.locator('.p-multiselect-item', { hasText: /^Payroll$/ }).click()
    await expect(field.locator('.p-multiselect-token-label')).toHaveText(['Working Capital', 'Inventory', 'Travel', 'Payroll'])
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: /update/i }).first().click()

    await expect.poll(() => sent.display?.uses).toEqual(['Working Capital', 'Inventory', 'Travel', 'Payroll'])
  })

  test('looks like the taxonomy picker: chips inside the box, a plain search header', async ({ page }) => {
    await openEdit(page)

    const field = usesField(page)
    await expect(field.locator('.p-multiselect-token')).toHaveCount(3)
    const box = (await field.boundingBox())!
    for (const chip of await field.locator('.p-multiselect-token').all()) {
      const c = (await chip.boundingBox())!
      expect(c.y).toBeGreaterThanOrEqual(box.y)
      expect(c.y + c.height).toBeLessThanOrEqual(box.y + box.height)
    }

    await field.locator('.p-multiselect-trigger').click()
    const panel = field.locator('.p-multiselect-panel')
    await expect(panel).toHaveClass(/taxonomy-field-panel/)
    await expect(panel.locator('.p-multiselect-header .p-checkbox')).toHaveCount(0)
    const open = (await field.boundingBox())!
    const list = (await panel.boundingBox())!
    await page.screenshot({
      path: process.env.UI_SHOT || 'test-results/uses-field.png',
      clip: { x: open.x - 10, y: open.y - 40, width: open.width + 20, height: list.y + list.height - open.y + 50 },
    })
  })
})
