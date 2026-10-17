import { test, expect, type Page, type Route } from '@playwright/test'

// Settings › Email Configuration: a partner verifies each mail provider with a
// code sent through it, and until one is verified its mail goes through the
// platform fallback - which only the host partner's own account manages. The
// API side is fch-api's tests/Feature/MailConfiguration. Backend calls are
// intercepted at the API origin, holding just enough state to play the flow.
const API_ORIGIN = 'http://127.0.0.1:8000/api/v1'
const MAIL = `${API_ORIGIN}/common/mail-configurations`

const THEME = {
  favicon: null, favicon_full_url: null,
  primary_color: '#2C6ECB', secondary_color: '#1A1A1A',
  site_name: 'Four Corner Funding', site_slogan: null,
}

const PROVIDERS = [
  {
    value: 'smtp', label: 'SMTP',
    fields: [
      { key: 'smtp_host', label: 'SMTP Host', type: 'text', required: true, secret: false, options: [] },
      { key: 'smtp_port', label: 'SMTP Port', type: 'number', required: true, secret: false, options: [] },
      { key: 'smtp_encryption', label: 'Encryption', type: 'select', required: true, secret: false,
        options: [{ value: 'tls', label: 'TLS' }, { value: 'ssl', label: 'SSL' }, { value: 'none', label: 'None' }] },
      { key: 'smtp_username', label: 'SMTP Username', type: 'text', required: true, secret: false, options: [] },
      { key: 'smtp_password', label: 'SMTP Password', type: 'password', required: true, secret: true, options: [] },
    ],
  },
  {
    value: 'aws_ses', label: 'Amazon SES',
    fields: [
      { key: 'aws_access_key', label: 'AWS Access Key', type: 'text', required: true, secret: false, options: [] },
      { key: 'aws_secret_key', label: 'AWS Secret Key', type: 'password', required: true, secret: true, options: [] },
      { key: 'aws_region', label: 'AWS Region', type: 'text', required: true, secret: false, options: [] },
    ],
  },
]

type Config = Record<string, unknown> & { id: number; is_verified: boolean; is_default: boolean }

function user(isHostOwner: boolean) {
  return {
    id: 1,
    name: isHostOwner ? 'Host Owner' : 'Pat Partner',
    email: isHostOwner ? 'host@example.test' : 'pat@example.test',
    user_type: 'Partner',
    entity_type: 'App\\Models\\Partner\\Partner',
    is_host: isHostOwner ? 1 : 0,
    partner_id: isHostOwner ? 1 : 2,
    permissions: ['update payment settings', 'update email configuration settings'],
  }
}

async function signIn(page: Page, isHostOwner: boolean) {
  await page.addInitScript(
    ([u]) => {
      window.localStorage.setItem('auth', JSON.stringify({ state: { token: 'e2e-fake-token', user: u, rememberMe: true }, version: 0 }))
      document.cookie = 'auth_session_active=true; path=/'
    },
    [user(isHostOwner)]
  )
}

function ok(route: Route, data: unknown, message = 'ok') {
  return route.fulfill({ json: { status: true, message, data } })
}

/**
 * Picks an option from a card's PrimeReact dropdown (its panel opens in <body>)
 * and confirms the switch, as the modal asks.
 */
async function chooseProvider(page: Page, card: ReturnType<Page['getByRole']>, option: string) {
  await card.locator('.p-dropdown').first().click()
  await page.locator('.p-dropdown-panel .p-dropdown-item', { hasText: option }).click()
  const modal = page.locator('.modal.show', { hasText: 'Confirm Provider Change' })
  await expect(modal).toBeVisible()
  await modal.getByRole('button', { name: `Yes, Change to ${option}` }).click()
  await expect(modal).toBeHidden()
}

async function openEmailConfiguration(page: Page) {
  await page.goto('/settings')
  await page.getByRole('button', { name: 'Email Configuration' }).click()
}

test.describe('Settings › Email Configuration', () => {
  test('a partner saves SMTP, verifies it with the emailed code, and stops using the fallback', async ({ page }) => {
    await signIn(page, false)

    let configurations: Config[] = []
    const posted: Record<string, unknown>[] = []

    await page.route(`${API_ORIGIN}/**`, (route) => ok(route, []))
    await page.route(`${API_ORIGIN}/common/partner-theme`, (route) => ok(route, { ...THEME, branding: THEME }))
    await page.route(MAIL, async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON() as Record<string, unknown>
        posted.push(body)
        configurations = [{ ...body, id: 21, provider_label: 'SMTP', smtp_password: '••••••••', is_verified: false, is_default: false, verified_at: null, verified_to: null, updated_at: '2026-10-17T10:00:00+00:00' }]
        return ok(route, configurations[0], 'Mail configuration saved. Verify it to start sending with it.')
      }
      return ok(route, {
        configurations,
        providers: PROVIDERS,
        uses_own_configuration: configurations.some((c) => c.is_verified && c.is_default),
        fallback: { is_configured: true, is_verified: true },
        can_manage_fallback: false,
      })
    })
    await page.route(`${MAIL}/21/send-code`, (route) => ok(route, null, 'A verification code has been sent to pat@example.test.'))
    await page.route(`${MAIL}/21/verify`, (route) => {
      const { code } = route.request().postDataJSON() as { code: string }
      if (code !== '246810') {
        return route.fulfill({ status: 422, json: { message: 'The code is incorrect or has expired. Please request a new one.', errors: { code: ['The code is incorrect or has expired. Please request a new one.'] } } })
      }
      configurations = [{ ...configurations[0], is_verified: true, is_default: true, verified_to: 'pat@example.test', updated_at: '2026-10-17T10:05:00+00:00' }]
      return ok(route, configurations[0], 'Mail configuration verified.')
    })

    await openEmailConfiguration(page)
    const warning = page.getByRole('alert').filter({ hasText: 'Until the mail configuration is verified, all mail will be sent using the fallback mail configuration.' })
    await expect(warning).toBeVisible()
    await expect(warning).toHaveClass(/alert-danger/)
    // Only the host partner sees the fallback.
    await expect(page.getByRole('region', { name: 'Fallback email configuration' })).toHaveCount(0)

    const smtp = page.getByRole('region', { name: 'Email configuration' })
    await expect(smtp.getByText('Not saved', { exact: true })).toBeVisible()
    await smtp.getByLabel('From Address').fill('mail@acme.test')
    await smtp.getByLabel('SMTP Host').fill('smtp.acme.test')
    await smtp.getByLabel('SMTP Port').fill('587')
    await smtp.getByLabel('SMTP Username').fill('mailer')
    await smtp.getByLabel('SMTP Password').fill('smtp-secret')
    await smtp.getByRole('button', { name: 'Save Configuration' }).click()

    await expect(smtp.getByText('Not verified', { exact: true })).toBeVisible()
    expect(posted[0]).toMatchObject({ provider: 'smtp', smtp_host: 'smtp.acme.test', smtp_port: 587, smtp_encryption: 'tls', smtp_password: 'smtp-secret' })

    await smtp.getByRole('button', { name: 'Send verification code' }).click()
    await expect(smtp.getByText('A verification code has been sent to pat@example.test.')).toBeVisible()

    await smtp.getByLabel('Verification code').fill('111111')
    await smtp.getByRole('button', { name: 'Verify', exact: true }).click()
    await expect(smtp.getByText(/incorrect or has expired/)).toBeVisible()

    await smtp.getByLabel('Verification code').fill('246810')
    await smtp.getByRole('button', { name: 'Verify', exact: true }).click()

    await expect(smtp.getByText('Verified', { exact: true })).toBeVisible()
    await expect(smtp.getByText('Default', { exact: true })).toBeVisible()
    const status = page.getByRole('status', { name: 'Mail delivery status' })
    await expect(status.getByRole('heading', { name: 'Sending with SMTP' })).toBeVisible()
    await expect(status).toContainText('From mail@acme.test')
  })

  test('the host partner manages the one fallback for every partner', async ({ page }) => {
    await signIn(page, true)

    let fallback: Config | null = null
    let fallbackSaves = 0

    await page.route(`${API_ORIGIN}/**`, (route) => ok(route, []))
    await page.route(`${API_ORIGIN}/common/partner-theme`, (route) => ok(route, { ...THEME, branding: THEME }))
    await page.route(MAIL, (route) => ok(route, {
      configurations: [],
      providers: PROVIDERS,
      uses_own_configuration: false,
      fallback: { is_configured: fallback !== null, is_verified: Boolean(fallback?.is_verified) },
      can_manage_fallback: true,
    }))
    await page.route(`${MAIL}/fallback`, (route) => {
      if (route.request().method() === 'POST') {
        fallbackSaves++
        const body = route.request().postDataJSON() as Record<string, unknown>
        fallback = { ...body, id: 1, provider_label: 'Amazon SES', aws_secret_key: '••••••••', is_verified: false, is_default: false, verified_at: null, verified_to: null, updated_at: '2026-10-17T11:00:00+00:00' }
      }
      return ok(route, { configuration: fallback, providers: PROVIDERS })
    })
    await page.route(`${MAIL}/fallback/send-code`, (route) => ok(route, null, 'A verification code has been sent to host@example.test.'))
    await page.route(`${MAIL}/fallback/verify`, (route) => {
      fallback = { ...(fallback as Config), is_verified: true, verified_to: 'host@example.test', updated_at: '2026-10-17T11:05:00+00:00' }
      return ok(route, { configuration: fallback, providers: PROVIDERS }, 'Mail configuration verified.')
    })

    await openEmailConfiguration(page)
    await expect(page.getByText(/no verified fallback mail configuration yet/i)).toBeVisible()

    const card = page.getByRole('region', { name: 'Fallback email configuration' })
    await expect(card.getByText(/used for every partner/i)).toBeVisible()
    await expect(card.getByRole('alert').getByRole('heading', { name: 'No fallback mail configuration' })).toBeVisible()

    await chooseProvider(page, card, 'Amazon SES')
    await card.getByLabel('From Address').fill('noreply@fch.test')
    await card.getByLabel('AWS Access Key').fill('AKIAFCH')
    await card.getByLabel('AWS Secret Key').fill('ses-secret')
    await card.getByLabel('AWS Region').fill('us-east-1')
    await card.getByRole('button', { name: 'Save Configuration' }).click()

    await expect(card.getByText('Not verified', { exact: true })).toBeVisible()
    expect(fallbackSaves).toBe(1)

    await card.getByRole('button', { name: 'Send verification code' }).click()
    await card.getByLabel('Verification code').fill('975310')
    await card.getByRole('button', { name: 'Verify', exact: true }).click()

    await expect(card.getByText('Verified', { exact: true })).toBeVisible()
    await expect(card.getByRole('alert')).toHaveCount(0)
    await expect(card.getByRole('status', { name: 'Fallback delivery status' }).getByRole('heading', { name: 'Fallback sending with Amazon SES' })).toBeVisible()
  })
})
