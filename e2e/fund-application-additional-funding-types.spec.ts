import { test, expect, type Page, type Route } from '@playwright/test'

// Partner portal › funding application wizard › Step 4 of 8, Funding Request:
// Additional Funding Types after Preferred Funding Type - every funding type
// but the preferred one, several at once - sent with the step's save. The
// backend side is covered by fch-api's FundingRequestAdditionalFundingTypesTest.
// Backend calls are intercepted at the API origin (see
// embed-form-convert-existing-borrower.spec.ts for the pattern).
const API_ORIGIN = 'http://127.0.0.1:8000/api/v1'

const PARTNER_USER = {
  id: 1,
  name: 'Host Admin',
  email: 'host@example.test',
  user_type: 'Admin',
  is_host: 1,
  partner_id: null,
  permissions: ['view application', 'view funding application', 'create funding application', 'edit funding application'],
}

const THEME = {
  favicon: null, favicon_full_url: null,
  primary_color: '#2C6ECB', primary_logo: null, primary_logo_full_url: null,
  secondary_color: '#1A1A1A', secondary_logo: null, secondary_logo_full_url: null,
  sidebar_text_color: null, sidebar_icon_color: null,
  sidebar_text_hover_color: null, sidebar_icon_hover_color: null,
  site_name: 'Four Corner Funding', site_slogan: null,
}

// Steps 1-3 saved, so Step 4 can be opened.
const FUNDING_REQUEST = {
  id: 7,
  funding_request_id: 7,
  funding_sequence_id: 3,
  requested_amount: '50000.00',
  purpose_of_funds: 'Working Capital',
  approved_funding: 'Term Loans',
  preferred_funding_type: 'Term Loan',
  additional_funding_types: ['SBA Loan'],
  timeframe_needed: null,
  collateral_available: null,
  purpose_note: null,
  is_business_info_saved: true,
  is_ownership_info_saved: true,
  is_financial_info_saved: true,
  is_funding_request_saved: false,
  is_disclosures_saved: false,
  is_federal_compliance_saved: false,
  status: 'draft',
  is_locked: false,
  is_editable: true,
  requires_resign: false,
  edit_requires_resign: false,
  edit_needs_confirmation: false,
}

async function seedSession(page: Page) {
  await page.addInitScript(
    ([user]) => {
      window.localStorage.setItem(
        'auth',
        JSON.stringify({ state: { token: 'e2e-fake-token', user, rememberMe: true }, version: 0 })
      )
      document.cookie = 'auth_session_active=true; path=/'
    },
    [PARTNER_USER]
  )
}

function jsonOk(route: Route, data: unknown) {
  return route.fulfill({ json: { status: true, message: 'ok', data } })
}

test.describe('Funding application wizard › Step 4 › Additional Funding Types', () => {
  let saved: Record<string, unknown>[]

  test.beforeEach(async ({ page }) => {
    saved = []
    await seedSession(page)

    await page.route(`${API_ORIGIN}/**`, (route) => jsonOk(route, []))
    await page.route(`${API_ORIGIN}/common/partner-theme`, (route) => jsonOk(route, { ...THEME, branding: THEME }))
    await page.route(`${API_ORIGIN}/common/funding-sequencings/grouped**`, (route) => jsonOk(route, { groups: [] }))
    await page.route(`${API_ORIGIN}/common/funding-application/funding-request**`, (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() ?? {}
        saved.push(body)
        return jsonOk(route, { ...FUNDING_REQUEST, ...body, is_funding_request_saved: true })
      }
      return jsonOk(route, FUNDING_REQUEST)
    })

    await page.goto('/fund-application/7')
    // The partner wizard opens on Step 1; steps already saved can be opened directly.
    await page.getByRole('button', { name: /Funding Request/ }).first().click()
    await expect(page.getByText(/Step 4 of \d+: Funding Request/).first()).toBeVisible({ timeout: 30_000 })
  })

  test('sits after Preferred Funding Type with the types saved before', async ({ page }) => {
    const field = page.locator('.additional-funding-types >> visible=true')
    await expect(page.getByText('Additional Funding Types').locator('visible=true')).toBeVisible()
    await expect(field.locator('.p-multiselect-token-label')).toHaveText(['SBA Loan'])
  })

  test('offers every funding type but the preferred one', async ({ page }) => {
    await page.locator('.additional-funding-types >> visible=true').click()
    const options = page.locator('.p-multiselect-panel li.p-multiselect-item')
    await expect(options.first()).toBeVisible()
    const offered = (await options.allTextContents()).map((t) => t.trim())

    expect(offered).toContain('Line of Credit')
    expect(offered).not.toContain('Term Loan')
  })

  test('saves the chosen types with the step', async ({ page }) => {
    await page.locator('.additional-funding-types >> visible=true').click()
    await page.locator('.p-multiselect-panel li.p-multiselect-item', { hasText: 'Line of Credit' }).click()
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: /Save & Next/ }).first().click()

    await expect.poll(() => saved.length).toBeGreaterThan(0)
    expect(saved[0].additional_funding_types).toEqual(['SBA Loan', 'Line of Credit'])
    expect(saved[0].preferred_funding_type).toBe('Term Loan')
  })
})

// Intake & Review › funding application details › Funding Request tab.
test.describe('Funding application details › Funding Request tab', () => {
  test('lists the additional funding types after the preferred one', async ({ page }) => {
    await seedSession(page)
    await page.route(`${API_ORIGIN}/**`, (route) => jsonOk(route, []))
    await page.route(`${API_ORIGIN}/common/partner-theme`, (route) => jsonOk(route, { ...THEME, branding: THEME }))
    await page.route(`${API_ORIGIN}/common/request-application/funding-application/7`, (route) =>
      jsonOk(route, {
        id: 7,
        application_number: 'FUND-0000007',
        status: 'draft',
        full_name: 'Michael Chen',
        business_name: 'Alpha Tech Solutions',
        requested_amount: '50000.00',
        purpose_of_funds: 'Working Capital',
        preferred_funding_type: 'Term Loan',
        additional_funding_types: ['SBA Loan', 'Line of Credit'],
        co_borrowers: [],
        documents: [],
      })
    )

    await page.goto('/intake-review/funding-application/7')
    await page.getByText('Funding Request', { exact: true }).first().click()

    await expect(page.getByText('Preferred Funding Type')).toBeVisible()
    await expect(page.getByText('Additional Funding Types')).toBeVisible()
    await expect(page.getByText('SBA Loan, Line of Credit')).toBeVisible()
  })
})
