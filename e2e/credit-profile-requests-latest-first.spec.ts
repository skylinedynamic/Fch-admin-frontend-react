import { test, expect, type Page, type Route } from '@playwright/test'

// Intake & Review -> Request Credit Profile lists the latest request first.
//
// A borrower has one credit profile request, updated in place when they submit
// again, so "latest" is when it was last submitted (updated_at). The screen
// asks the API for updated_at desc, keeps the order it gets back, and dates
// each row by its latest submission. Backend calls are intercepted at the API
// origin (see activity-visibility.spec.ts for the pattern); the ordering
// itself is covered against the real database by fch-api's
// CreditProfileRequestListOrderTest.
const API_ORIGIN = 'http://127.0.0.1:8000/api/v1'

const HOST_USER = {
  id: 1,
  name: 'Host Admin',
  email: 'host@example.test',
  user_type: 'Admin',
  is_host: 1,
  partner_id: null,
  permissions: ['manage credit profile requests'],
}

const THEME = {
  favicon: null, favicon_full_url: null,
  primary_color: '#2C6ECB', primary_logo: null, primary_logo_full_url: null,
  secondary_color: '#1A1A1A', secondary_logo: null, secondary_logo_full_url: null,
  sidebar_text_color: null, sidebar_icon_color: null,
  sidebar_text_hover_color: null, sidebar_icon_hover_color: null,
  site_name: 'Four Corner Funding', site_slogan: null,
}

const request = (id: number, firstName: string, createdAt: string, updatedAt: string) => ({
  id,
  borrower_id: id,
  first_name: firstName,
  middle_name: null,
  last_name: 'Client',
  ssn: '123456789',
  phone: '5125550100',
  email: `${firstName.toLowerCase()}@example.test`,
  created_at: createdAt,
  updated_at: updatedAt,
  request_status: 'pending',
  borrower: { id, business_name: `${firstName} LLC` },
})

// As the API returns them for updated_at desc: Resubmitted first asked on the
// 1st but submitted again on the 12th, above a request first made on the 10th.
const ROWS = [
  request(2, 'Resubmitted', '2026-10-01T10:00:00Z', '2026-10-12T10:00:00Z'),
  request(3, 'Newer', '2026-10-10T10:00:00Z', '2026-10-10T10:00:00Z'),
]

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

function jsonOk(route: Route, data: unknown, message = 'ok') {
  return route.fulfill({ json: { status: true, message, data } })
}

test.describe('Intake & Review › Request Credit Profile — latest first', () => {
  let listBodies: Record<string, unknown>[]

  test.beforeEach(async ({ page }) => {
    listBodies = []
    await seedHostSession(page)

    await page.route(`${API_ORIGIN}/**`, (route) => jsonOk(route, []))
    await page.route(`${API_ORIGIN}/common/partner-theme`, (route) => jsonOk(route, { ...THEME, branding: THEME }))
    await page.route(`${API_ORIGIN}/admin/credit-profile-requests`, (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      listBodies.push(route.request().postDataJSON() ?? {})
      return jsonOk(route, { current_page: 1, data: ROWS, total: ROWS.length, per_page: 10, last_page: 1 })
    })

    await page.goto('/intake-review/credit-profile-requests')
  })

  test('asks for the latest request first and lists it at the top', async ({ page }) => {
    const rows = page.locator('.p-datatable-tbody > tr')
    await expect(rows.first()).toContainText('Resubmitted Client')
    await expect(rows.nth(1)).toContainText('Newer Client')

    expect(listBodies[0]).toMatchObject({ sort_field: 'updated_at', sort_order: 'desc' })
  })

  test('dates a resubmitted request by its latest submission', async ({ page }) => {
    const resubmitted = page.locator('.p-datatable-tbody > tr', { hasText: 'Resubmitted Client' })

    await expect(resubmitted).toContainText('Oct 12, 2026')
    await expect(resubmitted).not.toContainText('Oct 1, 2026')
  })

  test('sorting by Request Date asks the API to sort by the latest submission', async ({ page }) => {
    await expect(page.locator('.p-datatable-tbody > tr').first()).toContainText('Resubmitted Client')

    await page.getByRole('columnheader', { name: /Request Date/ }).click()

    await expect.poll(() => listBodies.at(-1)?.sort_field).toBe('updated_at')
  })
})
