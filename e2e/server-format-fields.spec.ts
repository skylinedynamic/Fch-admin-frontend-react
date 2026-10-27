import { test, expect, type Page, type Route } from '@playwright/test'

// Formats are checked by the API only (App\Rules\Ssn, UsPhoneNumber,
// RoutingNumber): the portal writes each value in its usual shape and shows the
// server's answer on the field. Covered here:
//   - Lead -> Contact Info: the full SSN (it used to be "SSN Last 4"), as on a
//     client's profile;
//   - Contacts -> Add: a mobile number the server refuses;
//   - Settings -> Payment Integration -> Bank Transfer: the routing number.
// Backend calls are answered at the API origin; nothing is written.
const API_ORIGIN = 'http://127.0.0.1:8000/api/v1'

const THEME = {
  favicon: null, favicon_full_url: null,
  primary_color: '#2C6ECB', secondary_color: '#1A1A1A',
  site_name: 'Four Corner Funding', site_slogan: null,
}

const HOST = {
  id: 1,
  name: 'Host Admin',
  email: 'host@example.test',
  user_type: 'Admin',
  entity_type: 'Partner',
  is_host: 1,
  partner_id: 1,
  permissions: ['view leads', 'update leads', 'view contacts', 'create contacts', 'update payment settings'],
}

const ok = (route: Route, data: unknown) => route.fulfill({ json: { status: true, message: 'ok', data } })
const refuse = (route: Route, errors: Record<string, string>) =>
  route.fulfill({ status: 422, json: { status: false, message: Object.values(errors)[0], errors } })

async function signIn(page: Page) {
  await page.addInitScript(
    ([u]) => {
      window.localStorage.setItem('auth', JSON.stringify({ state: { token: 'e2e-fake-token', user: u, rememberMe: true }, version: 0 }))
      document.cookie = 'auth_session_active=true; path=/'
    },
    [HOST]
  )
  await page.route(`${API_ORIGIN}/**`, (route) => ok(route, []))
  await page.route(`${API_ORIGIN}/common/partner-theme`, (route) =>
    ok(route, { ...THEME, branding: THEME, status_flags: { is_fresh_email: true, is_fresh_settings: true, is_fresh_payment: true } })
  )
}

const LEAD = {
  id: 7, company_name: 'Lead Co', contact_person: 'Lee Lead', email: 'lee@example.test',
  phone_number: '(555) 234-5678', lead_type: 'Borrower', status: 'New', country: 'United States',
  ssn: '123456789',
  business_ein: '534534534',
  duns_number: '012345678',
}

test.describe('Fields whose format the API checks', () => {
  test('a lead shows its full SSN, sends the digits, and shows the API\'s SSN error', async ({ page }) => {
    await signIn(page)
    const sent: Record<string, unknown>[] = []
    await page.route(`${API_ORIGIN}/common/leads/7`, (route) => ok(route, LEAD))
    await page.route(`${API_ORIGIN}/common/leads/7/contact-info`, (route) => {
      const body = route.request().postDataJSON()
      sent.push(body)
      return body.ssn === '234567890' ? ok(route, { ...LEAD, ssn: body.ssn }) : refuse(route, { ssn: 'Enter a valid 9-digit SSN as XXX-XX-XXXX.' })
    })

    await page.goto('/leads/7?tab=contactInfo')
    const ssn = page.getByLabel('Social Security Number')
    // The one SSN field: masked at rest, the digits on the eye button.
    await expect(ssn).toHaveValue('***-**-6789')
    await page.getByRole('button', { name: 'Show SSN' }).click()
    await expect(ssn).toHaveValue('123-45-6789')
    await expect(page.getByText('SSN Last 4')).toHaveCount(0)

    // An EIN reads XX-XXXXXXX; a D-U-N-S keeps its leading zero.
    await expect(page.locator('input[name="business_ein"]')).toHaveValue('53-4534534')
    await expect(page.locator('input[name="duns_number"]')).toHaveValue('012345678')

    await ssn.fill('6789')
    await page.getByRole('button', { name: /update/i }).click()
    await expect(page.getByText('Enter a valid 9-digit SSN as XXX-XX-XXXX.')).toBeVisible()
    expect(sent[0]).toMatchObject({ ssn: '6789' })

    await ssn.click()
    await ssn.fill('')
    await ssn.pressSequentially('234567890')
    await expect(ssn).toHaveValue('234-56-7890')
    await page.getByRole('button', { name: /update/i }).click()
    await expect.poll(() => sent.length).toBe(2)
    expect(sent[1]).toMatchObject({ ssn: '234567890' })
    expect(sent[1]).not.toHaveProperty('ssn_last_4')
  })

  test('a contact\'s mobile number is sent to the API, whose answer shows on the field', async ({ page }) => {
    await signIn(page)
    let sent: Record<string, unknown> | null = null
    await page.route(`${API_ORIGIN}/common/contacts`, (route) => {
      if (route.request().method() !== 'POST') return ok(route, [])
      sent = route.request().postDataJSON()
      return refuse(route, { mobile_number: 'Enter a valid 10-digit US phone number.' })
    })

    await page.goto('/contacts/create')
    await page.locator('input[name="full_name"]').fill('Nora New')
    await page.locator('input[name="email"]').fill('nora@example.test')
    await page.locator('input[name="mobile_number"]').pressSequentially('55512')
    await page.getByRole('button', { name: /save/i }).click()

    await expect(page.getByText('Enter a valid 10-digit US phone number.')).toBeVisible()
    expect(sent).toMatchObject({ mobile_number: '(555) 12' })
  })

  test('a bank routing number is kept to nine digits and the API\'s error shows under it', async ({ page }) => {
    await signIn(page)
    const bank = { id: 6, name: 'Bank Transfer', slug: 'bank-transfer', logo: null, status: true, is_default: false, is_configured: true }
    const row = {
      id: 1, bank_name: 'First Bank', account_name: 'Acme LLC', account_number: '000123456789', routing_number: '',
      instructions: '', payment_mode: 'sandbox', is_default: true, status: true,
    }
    let sent = null as Record<string, any> | null
    await page.route(`${API_ORIGIN}/common/partner-payment-providers`, (route) => {
      if (route.request().method() !== 'POST') return ok(route, [bank])
      sent = route.request().postDataJSON()
      return refuse(route, { 'bank_details.0.routing_number': 'Enter a 9-digit routing number, e.g. 021000021.' })
    })
    await page.route(`${API_ORIGIN}/common/partner-payment-providers/6`, (route) =>
      ok(route, { id: 3, status: true, is_default: false, payment_mode: 'sandbox', configuration: {}, bank_details: [row] })
    )

    await page.goto('/settings/payment-integration')
    await page.locator('.payment-method-row', { hasText: 'Bank Transfer' }).click()

    const routing = page.getByPlaceholder('Routing Number')
    await routing.pressSequentially('02a1-000 0219999')
    await expect(routing).toHaveValue('021000021')

    await routing.fill('12345')
    await page.getByRole('button', { name: /save configuration/i }).click()

    await expect(page.getByText('Enter a 9-digit routing number, e.g. 021000021.').first()).toBeVisible()
    await expect(routing).toHaveClass(/is-invalid/)
    expect(sent?.bank_details?.[0]?.routing_number).toBe('12345')
  })
})
