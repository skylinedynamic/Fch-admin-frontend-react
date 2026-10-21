import { test, expect, type Page, type Route } from '@playwright/test'

// When the host converts a partner's lead on that partner's behalf, fch-api
// tells the partner in its bell (partner.lead.converted_on_behalf, pushed over
// Reverb) and by email from the host; LeadConvertedOnBehalfNotificationTest
// covers that side. Here: the partner sees the notice in its bell and it opens
// the new borrower. Backend calls are intercepted at the API origin (see
// activity-visibility.spec.ts).
const API_ORIGIN = 'http://127.0.0.1:8000/api/v1'

const WLP_USER = {
  id: 21,
  name: 'Wil Label',
  email: 'owner@wlp.example.test',
  user_type: 'Partner',
  entity_type: 'Partner',
  is_host: 0,
  partner_id: 2,
  permissions: ['view clients', 'view leads'],
}

const THEME = {
  favicon: null, favicon_full_url: null,
  primary_color: '#2C6ECB', primary_logo: null, primary_logo_full_url: null,
  secondary_color: '#1A1A1A', secondary_logo: null, secondary_logo_full_url: null,
  sidebar_text_color: null, sidebar_icon_color: null,
  sidebar_text_hover_color: null, sidebar_icon_hover_color: null,
  site_name: 'WLP Co', site_slogan: null,
}

const NOTIFICATION = {
  id: 'n-1',
  type: 'partner.lead.converted_on_behalf',
  title: 'Your lead was converted to a borrower',
  body: 'Host Co converted your lead Lee Lead to a borrower on your behalf.',
  url: '/clients/99',
  icon: 'ri-user-follow-line',
  category: 'funding',
  is_read: false,
  read_at: null,
  created_at: new Date().toISOString(),
}

async function seedPartnerSession(page: Page) {
  await page.addInitScript(
    ([user]) => {
      window.localStorage.setItem(
        'auth',
        JSON.stringify({ state: { token: 'e2e-fake-token', user, rememberMe: true }, version: 0 })
      )
      document.cookie = 'auth_session_active=true; path=/'
    },
    [WLP_USER]
  )
}

function jsonOk(route: Route, data: unknown, extra: Record<string, unknown> = {}) {
  return route.fulfill({ json: { status: true, message: 'ok', data, ...extra } })
}

test.describe('Notifications › lead converted on the partner\'s behalf', () => {
  test.beforeEach(async ({ page }) => {
    await seedPartnerSession(page)

    await page.route(`${API_ORIGIN}/**`, (route) => jsonOk(route, []))
    await page.route(`${API_ORIGIN}/common/partner-theme`, (route) => jsonOk(route, { ...THEME, branding: THEME }))
    await page.route(`${API_ORIGIN}/common/notifications?**`, (route) =>
      jsonOk(route, [NOTIFICATION], { meta: { current_page: 1, last_page: 1, per_page: 5, total: 1, unread_count: 1 } })
    )
    await page.route(`${API_ORIGIN}/common/notifications/unread-count`, (route) => jsonOk(route, { unread_count: 1 }))
  })

  test('the partner sees who converted which lead, and it opens the new borrower', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: /notifications, 1 unread/i }).click()
    await expect(page.getByText('Your lead was converted to a borrower')).toBeVisible()
    await page.getByText('Host Co converted your lead Lee Lead to a borrower on your behalf.').click()

    await expect(page).toHaveURL(/\/clients\/99$/)
  })
})
