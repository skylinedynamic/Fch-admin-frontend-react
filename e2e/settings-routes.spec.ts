import { test, expect, type Page, type Route } from '@playwright/test'

// Settings: each menu section is a route of its own, and the "Configuration
// Incomplete" list opens the exact section a missing setting lives in. Backend
// calls are answered at the API origin.
const API_ORIGIN = 'http://127.0.0.1:8000/api/v1'

const THEME = {
  favicon: null, favicon_full_url: null,
  primary_color: '#2C6ECB', secondary_color: '#1A1A1A',
  site_name: 'Four Corner Funding', site_slogan: null,
}

const PARTNER = {
  id: 1,
  name: 'Wendy White-Label',
  email: 'wendy@example.test',
  user_type: 'Partner',
  entity_type: 'Partner',
  partner_type: 'White-Label Partner (WL)',
  is_host: 0,
  partner_id: 2,
  permissions: ['update payment settings', 'update email configuration settings', 'update branding settings', 'view clients'],
}

function ok(route: Route, data: unknown) {
  return route.fulfill({ json: { status: true, message: 'ok', data } })
}

async function signIn(page: Page, flags: Record<string, boolean>) {
  await page.addInitScript(
    ([u]) => {
      window.localStorage.setItem('auth', JSON.stringify({ state: { token: 'e2e-fake-token', user: u, rememberMe: true }, version: 0 }))
      document.cookie = 'auth_session_active=true; path=/'
    },
    [PARTNER]
  )
  await page.route(`${API_ORIGIN}/**`, (route) => ok(route, []))
  await page.route(`${API_ORIGIN}/common/partner-theme`, (route) => ok(route, { ...THEME, branding: THEME, status_flags: flags }))
  await page.route(`${API_ORIGIN}/common/mail-configurations`, (route) => ok(route, {
    configurations: [], providers: [], uses_own_configuration: true,
    fallback: { is_configured: true, is_verified: true, from_address: 'noreply@fch.test' },
    can_manage_fallback: false,
  }))
}

const COMPLETE = { is_fresh_email: true, is_fresh_settings: true, is_fresh_payment: true }

test.describe('Settings routes', () => {
  test('each menu section has a path of its own', async ({ page }) => {
    await signIn(page, COMPLETE)

    await page.goto('/settings')
    await expect(page).toHaveURL(/\/settings\/payment-integration$/)

    await page.locator('.settings-menu-card .list-group-item', { hasText: 'Email Configuration' }).click()
    await expect(page).toHaveURL(/\/settings\/email-configuration$/)
    await expect(page.locator('.settings-menu-card .list-group-item.active')).toContainText('Email Configuration')
    await expect(page.locator('.breadcrumb-item.active')).toHaveText('Email Configuration')

    // A section's path opens it directly, and back goes to the one before.
    await page.goto('/settings/branding')
    await expect(page.locator('.settings-menu-card .list-group-item.active')).toContainText('Branding')
    await page.goBack()
    await expect(page).toHaveURL(/\/settings\/email-configuration$/)
  })

  test('the Configuration Incomplete list opens the exact section that is missing', async ({ page }) => {
    await signIn(page, { ...COMPLETE, is_fresh_settings: false, is_fresh_email: false })

    await page.goto('/clients')
    const modal = page.locator('.cgm-modal')
    await expect(modal.getByText('Configuration Incomplete')).toBeVisible()

    await modal.getByRole('button', { name: /Branding Configuration/ }).click()
    await expect(page).toHaveURL(/\/settings\/branding$/)
    await expect(page.locator('.settings-menu-card .list-group-item.active')).toContainText('Branding')

    // Email configuration is not one of the required sections.
    await page.goto('/clients')
    await expect(modal.getByText('Configuration Incomplete')).toBeVisible()
    await expect(modal.getByRole('button', { name: /Email Configuration/ })).toHaveCount(0)
  })

  test('a white-label partner without mail settings is not stopped - the banner is enough', async ({ page }) => {
    await signIn(page, { ...COMPLETE, is_fresh_email: false })
    // Its own mail is not verified: the fallback sends meanwhile.
    await page.route(`${API_ORIGIN}/common/mail-configurations`, (route) => ok(route, {
      configurations: [], providers: [], uses_own_configuration: false,
      fallback: { is_configured: true, is_verified: true, from_address: 'noreply@fch.test' },
      can_manage_fallback: false,
    }))

    await page.goto('/clients')

    await expect(page.locator('.mail-not-verified-banner')).toContainText('noreply@fch.test')
    await expect(page.locator('.cgm-modal')).toHaveCount(0)
  })
})
