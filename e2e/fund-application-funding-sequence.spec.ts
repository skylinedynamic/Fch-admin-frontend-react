import { test, expect, type Page, type Route } from '@playwright/test'

// Editing a funding application (Intake & Review > Funding Application > Edit),
// Step 4, Funding Request:
//  - "Approved Funding Product" is now "Funding Sequence";
//  - Preferred Funding Type is read-only;
//  - only an application converted from the embed form chooses its Funding
//    Sequence, from the sequences offered for its Preferred Funding Type
//    (GET /common/funding-sequences?funding_type=...); every other one shows
//    its sequence read-only.
// Every backend call is answered here, at the API origin: nothing is saved.
const API_ORIGIN = 'http://127.0.0.1:8000/api/v1'

const HOST_USER = {
  // The edit route is behind "view funding application".
  id: 1, name: 'Host Admin', email: 'host@example.test', user_type: 'Admin', is_host: 1, partner_id: null, permissions: ['view funding application'],
}

const THEME = {
  favicon: null, favicon_full_url: null,
  primary_color: '#2C6ECB', primary_logo: null, primary_logo_full_url: null,
  secondary_color: '#1A1A1A', secondary_logo: null, secondary_logo_full_url: null,
  sidebar_text_color: null, sidebar_icon_color: null, sidebar_text_hover_color: null, sidebar_icon_hover_color: null,
  site_name: 'Four Corner Funding', site_slogan: null,
}

// Application #114: converted from the embed form, no funding request, no sequence yet.
const EMBED_APPLICATION = {
  id: 114,
  funding_request_id: null,
  funding_sequence_id: null,
  is_from_embed_form: true,
  status: 'Draft',
  requested_amount: '4256265.00',
  purpose_of_funds: 'Business Acquisition',
  purpose_note: null,
  approved_funding: null,
  preferred_funding_type: 'Line of Credit',
  additional_funding_types: [],
  timeframe_needed: '1 Month',
  collateral_available: 'Business Assets',
  is_business_info_saved: true,
  is_ownership_info_saved: true,
  is_financial_info_saved: true,
  is_funding_request_saved: true,
}

const BUSINESS = {
  full_name: 'Jane Borrower', business_name: 'Borrower Co', business_email: 'jane@example.test', business_phone_no: '5125550100',
  business_country: 'United States', business_address: '9 Main St', business_city: 'Austin', business_state: 'Texas',
  business_postal_code: '78701', industry_type: 'Retail', entity_type: 'LLC', years_in_business: '5',
}

// The API maps the older "Line of Credit" to "Business Line of Credit".
const SEQUENCES: Record<string, { id: number; name: string }[]> = {
  'Line of Credit': [{ id: 5, name: 'Business Lines of Credit' }, { id: 19, name: 'Fast Credit Lines' }],
}

async function openStep(page: Page, application: Record<string, unknown>) {
  const sent: { body: Record<string, unknown> | null } = { body: null }
  const askedFor: string[] = []

  await page.addInitScript(
    ([user]) => {
      window.localStorage.setItem('auth', JSON.stringify({ state: { token: 'e2e-fake-token', user, rememberMe: true }, version: 0 }))
      document.cookie = 'auth_session_active=true; path=/'
    },
    [HOST_USER]
  )

  const ok = (route: Route, data: unknown) => route.fulfill({ json: { status: true, message: 'ok', data } })
  await page.route(`${API_ORIGIN}/**`, (route) => ok(route, []))
  await page.route(`${API_ORIGIN}/common/partner-theme`, (route) => ok(route, { ...THEME, branding: THEME }))
  await page.route(`${API_ORIGIN}/common/funding-types**`, (route) => ok(route, ['Business Line of Credit', 'Term Loan']))
  await page.route(`${API_ORIGIN}/common/funding-sequences**`, (route) => {
    const type = new URL(route.request().url()).searchParams.get('funding_type') ?? ''
    askedFor.push(type)
    return ok(route, SEQUENCES[type] ?? [])
  })
  // Steps 1-3 are saved and Business Information (open first) is complete, so
  // the wizard lets Step 4 open.
  await page.route(`${API_ORIGIN}/common/funding-application/business-info**`, (route) => ok(route, { ...BUSINESS, id: application.id }))
  await page.route(`${API_ORIGIN}/common/funding-application/funding-request**`, (route) => {
    if (route.request().method() === 'POST') {
      sent.body = route.request().postDataJSON()
      return ok(route, { ...application, ...sent.body })
    }
    return ok(route, application)
  })

  await page.goto(`/intake-review/funding-application/${application.id}/edit`)
  await page.locator('.sidebar-step-btn', { hasText: 'Funding Request' }).filter({ visible: true }).first().click()
  await expect(page.getByText(/Step 4 of \d+: Funding Request/).filter({ visible: true }).first()).toBeVisible()

  return { sent, askedFor }
}

// The wizard keeps a second (mobile) copy of the step in the page: the visible one.
const field = (page: Page, label: string) =>
  page.locator('.col-md-6', { has: page.locator('label', { hasText: label }) }).filter({ visible: true }).first()

test.describe('Edit funding application › Step 4 › Funding Sequence', () => {
  test('converted from the embed form: choose the sequence of the preferred type, and it is saved', async ({ page }) => {
    const { sent, askedFor } = await openStep(page, EMBED_APPLICATION)

    await expect(page.getByText('Approved Funding Product')).toHaveCount(0)

    // Preferred Funding Type: read-only, as saved.
    const preferred = field(page, 'Preferred Funding Type').locator('input')
    await expect(preferred).toHaveValue('Line of Credit')
    await expect(preferred).toHaveAttribute('readonly', '')

    // Funding Sequence: the sequences offered for that type.
    expect(askedFor).toContain('Line of Credit')
    const sequence = field(page, 'Funding Sequence').locator('button.form-select')
    await expect(sequence).toBeEnabled()
    await sequence.click()
    const options = field(page, 'Funding Sequence').locator('.dropdown-menu .dropdown-item, .dropdown-menu button, .dropdown-menu li')
    await expect(options.filter({ hasText: 'Business Lines of Credit' }).first()).toBeVisible()
    await expect(options.filter({ hasText: 'Fast Credit Lines' }).first()).toBeVisible()
    await options.filter({ hasText: 'Business Lines of Credit' }).first().click()
    await expect(sequence).toHaveText(/Business Lines of Credit/)

    // The page header shows the chosen product at once.
    await expect(page.getByRole('heading', { name: /\(Business Lines of Credit\)/ })).toBeVisible()

    await page.getByRole('button', { name: /save & next/i }).filter({ visible: true }).first().click()
    await expect.poll(() => sent.body?.funding_sequence_id).toBe(5)
    expect(sent.body?.approved_funding).toBe('Business Lines of Credit')
    expect(sent.body?.preferred_funding_type).toBe('Line of Credit')
    expect(sent.body?.funding_request_id).toBeNull()
  })

  test('converted from the embed form: Save & Next waits for a sequence', async ({ page }) => {
    await openStep(page, EMBED_APPLICATION)
    await expect(page.getByRole('button', { name: /save & next/i }).filter({ visible: true }).first()).toBeDisabled()
  })

  test('converted from the embed form: says so when no sequence is offered for the type', async ({ page }) => {
    await openStep(page, { ...EMBED_APPLICATION, preferred_funding_type: 'Old Product' })

    await expect(field(page, 'Funding Sequence').getByText('No funding sequence is available for Old Product.')).toBeVisible()
    await expect(field(page, 'Funding Sequence').locator('button.form-select')).toBeDisabled()
  })

  test('from a funding request: the approved sequence is read-only, with no dropdown', async ({ page }) => {
    const { sent, askedFor } = await openStep(page, {
      ...EMBED_APPLICATION, id: 28, funding_request_id: 28, funding_sequence_id: 6, approved_funding: 'Term Loans',
      preferred_funding_type: 'Term Loan', is_from_embed_form: false,
    })

    const sequence = field(page, 'Funding Sequence').locator('input')
    await expect(sequence).toHaveValue('Term Loans')
    await expect(sequence).toHaveAttribute('readonly', '')
    await expect(field(page, 'Funding Sequence').locator('button.form-select')).toHaveCount(0)
    await expect(field(page, 'Preferred Funding Type').locator('input')).toHaveAttribute('readonly', '')
    expect(askedFor).toEqual([])

    await page.getByRole('button', { name: /save & next/i }).filter({ visible: true }).first().click()
    await expect.poll(() => sent.body?.funding_sequence_id).toBe(6)
    expect(sent.body?.approved_funding).toBe('Term Loans')
  })

  test('no funding request but not converted from the embed form: read-only too', async ({ page }) => {
    const { askedFor } = await openStep(page, {
      ...EMBED_APPLICATION, id: 300, funding_sequence_id: 6, approved_funding: 'Term Loans', preferred_funding_type: 'Term Loan', is_from_embed_form: false,
    })

    await expect(field(page, 'Funding Sequence').locator('input')).toHaveValue('Term Loans')
    await expect(field(page, 'Funding Sequence').locator('button.form-select')).toHaveCount(0)
    expect(askedFor).toEqual([])
  })
})
