import { test, expect, type Page, type Route } from '@playwright/test'

// Settings › Email Configuration: a partner verifies each mail provider with a
// code sent through it, and until one is verified its mail goes through the
// platform fallback - which only the host partner's own account manages, one
// configuration per provider like a partner's own. The API side is fch-api's
// tests/Feature/MailConfiguration. Backend calls are intercepted at the API
// origin, holding just enough state to play the flow.
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
      { key: 'aws_access_key', label: 'AWS Access Key', type: 'text', required: true, secret: true, options: [] },
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
        configurations = [{ ...body, id: 21, provider_label: 'SMTP', smtp_password: undefined, has_smtp_password: true, is_verified: false, is_default: false, verified_at: null, verified_to: null, updated_at: '2026-10-17T10:00:00+00:00' }]
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

  test('the host partner adds SES to the fallback without losing SMTP, then switches to it', async ({ page }) => {
    await signIn(page, true)

    // The fallback starts on a verified SMTP; SES is added beside it.
    const fallbacks: Config[] = [{
      id: 1, provider: 'smtp', provider_label: 'SMTP', from_address: 'noreply@fch.test', bcc_emails: null,
      smtp_host: 'smtp.fch.test', smtp_port: 587, smtp_encryption: 'tls', smtp_username: 'platform', has_smtp_password: true,
      is_verified: true, is_default: true, verified_at: '2026-10-17 08:00:00', verified_to: 'host@example.test', updated_at: '2026-10-17T08:00:00+00:00',
    }]
    let fallbackSaves = 0
    // As the API decides it: the verified default, else another verified one.
    const sendingId = () => (fallbacks.find((c) => c.is_default && c.is_verified) ?? fallbacks.find((c) => c.is_verified))?.id ?? null
    const byId = (route: Route) => fallbacks.find((c) => c.id === Number(route.request().url().split('/').slice(-2)[0])) as Config

    await page.route(`${API_ORIGIN}/**`, (route) => ok(route, []))
    await page.route(`${API_ORIGIN}/common/partner-theme`, (route) => ok(route, { ...THEME, branding: THEME }))
    await page.route(MAIL, (route) => ok(route, {
      configurations: [],
      providers: PROVIDERS,
      uses_own_configuration: false,
      fallback: { is_configured: true, is_verified: sendingId() !== null },
      can_manage_fallback: true,
    }))
    await page.route(`${MAIL}/fallback`, (route) => {
      if (route.request().method() === 'POST') {
        fallbackSaves++
        const body = route.request().postDataJSON() as Record<string, unknown>
        const saved: Config = { ...body, id: 2, provider_label: 'Amazon SES', aws_access_key: undefined, aws_secret_key: undefined, has_aws_access_key: true, has_aws_secret_key: true, is_verified: false, is_default: false, verified_at: null, verified_to: null, updated_at: '2026-10-17T11:00:00+00:00' }
        fallbacks.push(saved)
        return ok(route, saved, 'Mail configuration saved.')
      }
      return ok(route, { configurations: fallbacks, providers: PROVIDERS, sending_id: sendingId() })
    })
    await page.route(`${MAIL}/fallback/*/send-code`, (route) => ok(route, null, 'A verification code has been sent to host@example.test.'))
    await page.route(`${MAIL}/fallback/*/verify`, (route) => {
      Object.assign(byId(route), { is_verified: true, verified_at: '2026-10-17 11:05:00', verified_to: 'host@example.test' })
      return ok(route, byId(route), 'Mail configuration verified.')
    })
    await page.route(`${MAIL}/fallback/*/default`, (route) => {
      const chosen = byId(route)
      fallbacks.forEach((c) => { c.is_default = c === chosen })
      return ok(route, chosen, 'Default mail configuration updated.')
    })

    await openEmailConfiguration(page)
    const card = page.getByRole('region', { name: 'Fallback email configuration' })
    const status = card.getByRole('status', { name: 'Fallback delivery status' })
    await expect(status.getByRole('heading', { name: 'Fallback sending with SMTP' })).toBeVisible()

    await chooseProvider(page, card, 'Amazon SES')
    await card.getByLabel('From Address').fill('noreply@fch.test')
    await card.getByLabel('AWS Access Key').fill('AKIAFCH')
    await card.getByLabel('AWS Secret Key').fill('ses-secret')
    await card.getByLabel('AWS Region').fill('us-east-1')
    await card.getByRole('button', { name: 'Save Configuration' }).click()

    // SES is saved but unverified, and mail still goes out with SMTP.
    await expect(card.getByText('Not verified', { exact: true })).toBeVisible()
    expect(fallbackSaves).toBe(1)
    await expect(status.getByRole('heading', { name: 'Fallback sending with SMTP' })).toBeVisible()

    await card.getByRole('button', { name: 'Send verification code' }).click()
    await card.getByLabel('Verification code').fill('975310')
    await card.getByRole('button', { name: 'Verify', exact: true }).click()
    await expect(card.getByText('Verified', { exact: true })).toBeVisible()

    await card.getByRole('button', { name: 'Use this provider' }).click()
    const dialog = page.locator('.modal.show', { hasText: 'Send Mail With This Provider' })
    await dialog.getByRole('button', { name: 'Yes, Send with Amazon SES' }).click()
    await expect(status.getByRole('heading', { name: 'Fallback sending with Amazon SES' })).toBeVisible()

    // SMTP is still there, settings and all, ready to switch back to.
    await chooseProvider(page, card, 'SMTP')
    await expect(card.getByLabel('SMTP Host')).toHaveValue('smtp.fch.test')
    await expect(card.getByText('Verified', { exact: true })).toBeVisible()
  })

  test('Save Configuration waits for a change once the settings are verified', async ({ page }) => {
    await signIn(page, false)
    const verified: Config = {
      id: 11, provider: 'smtp', provider_label: 'SMTP', from_address: 'mail@acme.test', bcc_emails: null,
      smtp_host: 'smtp.acme.test', smtp_port: 587, smtp_encryption: 'tls', smtp_username: 'mailer', has_smtp_password: true,
      is_verified: true, is_default: true, verified_at: '2026-10-17 08:00:00', verified_to: 'pat@example.test', updated_at: '2026-10-17T08:00:00+00:00',
    }
    let saves = 0

    await page.route(`${API_ORIGIN}/**`, (route) => ok(route, []))
    await page.route(`${API_ORIGIN}/common/partner-theme`, (route) => ok(route, { ...THEME, branding: THEME }))
    await page.route(MAIL, (route) => {
      if (route.request().method() === 'POST') saves += 1
      return ok(route, {
        configurations: [verified],
        providers: PROVIDERS,
        uses_own_configuration: true,
        fallback: { is_configured: true, is_verified: true },
        can_manage_fallback: false,
      })
    })

    await openEmailConfiguration(page)
    const card = page.getByRole('region', { name: 'Email configuration' })
    await expect(card.getByText('Verified', { exact: true })).toBeVisible()
    const save = card.getByRole('button', { name: 'Save Configuration' })
    const host = card.getByLabel('SMTP Host')

    // Nothing changed: nothing to save.
    await expect(save).toBeDisabled()

    // A setting edited: it can be saved (and will need verifying again).
    await host.fill('smtp2.acme.test')
    await expect(save).toBeEnabled()
    await expect(card.getByText(/must be verified again/)).toBeVisible()

    // Put back as it was: nothing to save again.
    await host.fill('smtp.acme.test')
    await expect(save).toBeDisabled()

    // A new secret typed counts as a change too.
    await card.getByLabel('SMTP Password').fill('n3w-secret')
    await expect(save).toBeEnabled()
    expect(saves).toBe(0)
  })

  test('Test Mail appears under Email Configuration once the mail configuration is verified', async ({ page }) => {
    // A white-label partner's own account: one of those Test Mail is for.
    await page.addInitScript(
      ([u]) => {
        window.localStorage.setItem('auth', JSON.stringify({ state: { token: 'e2e-fake-token', user: u, rememberMe: true }, version: 0 }))
        document.cookie = 'auth_session_active=true; path=/'
      },
      [{ ...user(false), entity_type: 'Partner', partner_type: 'White-Label Partner (WL)' }]
    )

    let configurations: Config[] = [{
      id: 21, provider: 'smtp', provider_label: 'SMTP', from_address: 'mail@acme.test', bcc_emails: null,
      smtp_host: 'smtp.acme.test', smtp_port: 587, smtp_encryption: 'tls', smtp_username: 'mailer', has_smtp_password: true,
      is_verified: false, is_default: false, verified_at: null, verified_to: null, updated_at: '2026-10-17T10:00:00+00:00',
    }]

    await page.route(`${API_ORIGIN}/**`, (route) => ok(route, []))
    await page.route(`${API_ORIGIN}/common/partner-theme`, (route) => ok(route, { ...THEME, branding: THEME }))
    await page.route(MAIL, (route) => ok(route, {
      configurations,
      providers: PROVIDERS,
      uses_own_configuration: configurations.some((c) => c.is_verified && c.is_default),
      fallback: { is_configured: true, is_verified: true },
      can_manage_fallback: false,
    }))
    await page.route(`${MAIL}/21/send-code`, (route) => ok(route, null, 'A verification code has been sent to pat@example.test.'))
    await page.route(`${MAIL}/21/verify`, (route) => {
      configurations = [{ ...configurations[0], is_verified: true, is_default: true, verified_to: 'pat@example.test' }]
      return ok(route, configurations[0], 'Mail configuration verified.')
    })

    await openEmailConfiguration(page)
    const menu = page.locator('.settings-menu-card .list-group-item')
    const smtp = page.getByRole('region', { name: 'Email configuration' })
    await expect(smtp.getByText('Not verified', { exact: true })).toBeVisible()

    // Nothing of its own to test yet.
    await expect(menu.filter({ hasText: 'Test Mail' })).toHaveCount(0)
    await expect(smtp.getByRole('button', { name: 'Test Mail', exact: true })).toHaveCount(0)

    await smtp.getByRole('button', { name: 'Send verification code' }).click()
    await smtp.getByLabel('Verification code').fill('246810')
    await smtp.getByRole('button', { name: 'Verify', exact: true }).click()
    await expect(smtp.getByText('Verified', { exact: true })).toBeVisible()

    // Right under Email Configuration in the menu.
    const labels = await menu.allTextContents()
    const at = labels.findIndex((l) => l.includes('Email Configuration'))
    expect(labels[at + 1]).toContain('Test Mail')

    // And a button just before Save Configuration that opens it.
    const testMail = smtp.getByRole('button', { name: 'Test Mail', exact: true })
    await expect(testMail).toBeVisible()
    await testMail.click()
    await expect(page.getByRole('heading', { name: 'Test Email Configuration' })).toBeVisible()
  })

  test('every page warns that mail is sent from the fallback address until verified', async ({ page }) => {
    await signIn(page, false)
    await page.route(`${API_ORIGIN}/**`, (route) => ok(route, []))
    await page.route(`${API_ORIGIN}/common/partner-theme`, (route) => ok(route, { ...THEME, branding: THEME }))
    await page.route(MAIL, (route) => ok(route, {
      configurations: [], providers: PROVIDERS, uses_own_configuration: false,
      fallback: { is_configured: true, is_verified: true, from_address: 'noreply@fch.test' },
      can_manage_fallback: false,
    }))

    await page.goto('/dashboard')
    const banner = page.locator('.mail-not-verified-banner')
    await expect(banner).toContainText('Until it is verified, all mail will be sent using noreply@fch.test.')

    await banner.getByRole('link', { name: 'Verify mail' }).click()
    await expect(page).toHaveURL(/\/settings\/email-configuration$/)
  })

  test('the mail banner lines up with the page, with no extra gap, on any kind of page', async ({ page }) => {
    // Pages offset the fixed header in three ways: table pages (Clients) on
    // .main-content, the rest on .page-content's padding (Settings,
    // Notifications) or margin. The banner must sit just under the header and
    // the page must start just under the banner on all of them.
    await page.addInitScript(
      ([u]) => {
        window.localStorage.setItem('auth', JSON.stringify({ state: { token: 'e2e-fake-token', user: u, rememberMe: true }, version: 0 }))
        document.cookie = 'auth_session_active=true; path=/'
      },
      [{ ...user(false), permissions: [...user(false).permissions, 'view clients'] }]
    )
    await page.route(`${API_ORIGIN}/**`, (route) => ok(route, []))
    await page.route(`${API_ORIGIN}/common/partner-theme`, (route) => ok(route, { ...THEME, branding: THEME }))
    await page.route(MAIL, (route) => ok(route, {
      configurations: [], providers: PROVIDERS, uses_own_configuration: false,
      fallback: { is_configured: true, is_verified: true, from_address: 'noreply@fch.test' },
      can_manage_fallback: false,
    }))

    for (const path of ['/clients', '/settings', '/notifications']) {
      await page.goto(path)
      const banner = page.locator('.mail-not-verified-banner')
      await expect(banner).toBeVisible()
      // The page's first line of text, outside the banner.
      await expect.poll(() => page.evaluate(() => document.querySelector('.main-content')!.textContent!.trim().length)).toBeGreaterThan(0)
      const gaps = await page.evaluate(() => {
        const headerBottom = document.querySelector('#page-topbar')!.getBoundingClientRect().bottom
        const b = document.querySelector('.mail-not-verified-banner')!
        const box = b.getBoundingClientRect()
        const walker = document.createTreeWalker(document.querySelector('.main-content')!, NodeFilter.SHOW_TEXT)
        let firstText = Infinity
        while (walker.nextNode()) {
          const node = walker.currentNode as Text
          if (!node.textContent?.trim() || b.contains(node)) continue
          const range = document.createRange()
          range.selectNodeContents(node)
          const rect = range.getBoundingClientRect()
          if (rect.width > 0 && rect.height > 0) firstText = Math.min(firstText, rect.top)
        }
        // The page's own edges: its title and its widest cards.
        const cards = [...document.querySelectorAll('.main-content .card')].map((c) => c.getBoundingClientRect()).filter((r) => r.width > 0)
        const title = document.querySelector('.main-content h4')!.getBoundingClientRect()
        return {
          above: box.top - headerBottom,
          below: firstText - box.bottom,
          left: box.left - title.left,
          right: box.right - Math.max(...cards.map((r) => r.right)),
        }
      })
      // Lined up with the page beneath it.
      expect(Math.abs(gaps.left), `left edge on ${path}`).toBeLessThanOrEqual(1)
      expect(Math.abs(gaps.right), `right edge on ${path}`).toBeLessThanOrEqual(1)
      // The header's 1px bottom border may overlap it.
      expect(gaps.above, `gap above the banner on ${path}`).toBeGreaterThanOrEqual(-1)
      expect(gaps.above, `gap above the banner on ${path}`).toBeLessThanOrEqual(16)
      expect(gaps.below, `gap below the banner on ${path}`).toBeGreaterThanOrEqual(0)
      expect(gaps.below, `gap below the banner on ${path}`).toBeLessThanOrEqual(24)
    }
  })
})
