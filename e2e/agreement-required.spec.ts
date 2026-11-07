import { test, expect, type Page, type Route } from '@playwright/test'

// The host excuses one partner from the partner agreement (or requires it
// again) from that partner's Agreement tab, while signing stays on for
// everyone else. Backend calls are answered at the API origin.
const API_ORIGIN = 'http://127.0.0.1:8000/api/v1'

const THEME = {
  favicon: null, favicon_full_url: null,
  primary_color: '#2C6ECB', secondary_color: '#1A1A1A',
  site_name: 'Four Corner Funding', site_slogan: null,
}
const COMPLETE = { is_fresh_email: true, is_fresh_settings: true, is_fresh_payment: true }

const HOST_ADMIN = {
  id: 1,
  name: 'Hana Host',
  email: 'hana@example.test',
  user_type: 'Admin',
  entity_type: 'Partner',
  is_host: 1,
  partner_id: 1,
  permissions: ['view partners', 'update partners'],
}

const PARTNER = {
  id: 21,
  user_id: 77,
  company_name: 'Pentagon Funding Group',
  partner_type: 'White-Label Partner (WL)',
  is_host: false,
  has_sign: false,
  agreement_required: true,
}

const ok = (route: Route, data: unknown, message = 'ok') => route.fulfill({ json: { status: true, message, data } })

// GET /required/:userId - whether the host can change it now (Settings › Agreement).
const LOCKS = {
  none: { signing_enabled: true, template_active: true, can_change: true, locked_reason: null },
  global: { signing_enabled: false, template_active: true, can_change: false, locked_reason: 'Agreement signing is turned off in Settings › Agreement.' },
  template: { signing_enabled: true, template_active: false, can_change: false, locked_reason: 'The partner agreement is turned off in Settings › Agreement.' },
}

async function signInAsHost(page: Page, partner: typeof PARTNER) {
  await page.addInitScript(
    ([u]) => {
      window.localStorage.setItem('auth', JSON.stringify({ state: { token: 'e2e-fake-token', user: u, rememberMe: true }, version: 0 }))
      document.cookie = 'auth_session_active=true; path=/'
    },
    [HOST_ADMIN]
  )
  await page.route(`${API_ORIGIN}/**`, (route) => ok(route, []))
  await page.route(`${API_ORIGIN}/common/partner-theme`, (route) => ok(route, { ...THEME, branding: THEME, status_flags: COMPLETE }))
  await page.route(`${API_ORIGIN}/admin/partners-details/${partner.id}`, (route) => ok(route, partner))
}

/** The partner's requirement: GET answers its status, POST saves the switch. */
async function routeRequirement(page: Page, current: typeof PARTNER, lock: keyof typeof LOCKS = 'none') {
  const saved: unknown[] = []
  await page.route(`${API_ORIGIN}/common/agreement-sign/required/${PARTNER.user_id}`, async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { required: boolean }
      saved.push(body)
      current.agreement_required = body.required
      return ok(route, { user_id: PARTNER.user_id, agreement_required: body.required }, 'Agreement requirement updated successfully')
    }
    return ok(route, { user_id: PARTNER.user_id, agreement_required: current.agreement_required, ...LOCKS[lock] })
  })
  return saved
}

const requirementSwitch = (page: Page) => page.getByRole('switch', { name: /require this partner to sign/i })

test.describe('Excusing one partner from the agreement', () => {
  test('the host turns signing off for this partner, and the page shows it', async ({ page }) => {
    const current = { ...PARTNER }
    await signInAsHost(page, current)
    const saved = await routeRequirement(page, current)

    await page.goto(`/partners/${PARTNER.id}`)
    await page.getByRole('tab', { name: 'Agreement' }).click()
    await expect(requirementSwitch(page)).toBeEnabled()
    await expect(requirementSwitch(page)).toBeChecked()
    await expect(page.getByText('This partner is asked to sign the partner agreement.')).toBeVisible()

    await requirementSwitch(page).click()

    await expect(page.locator('.Toastify__toast', { hasText: 'Agreement requirement updated successfully' })).toBeVisible()
    expect(saved).toEqual([{ required: false }])
    await expect(requirementSwitch(page)).not.toBeChecked()
    await expect(page.getByText(/This partner is not asked to sign the partner agreement/)).toBeVisible()
  })

  test('the host requires it again for a partner who was excused', async ({ page }) => {
    const current = { ...PARTNER, agreement_required: false }
    await signInAsHost(page, current)
    const saved = await routeRequirement(page, current)

    await page.goto(`/partners/${PARTNER.id}`)
    await page.getByRole('tab', { name: 'Agreement' }).click()
    await expect(requirementSwitch(page)).toBeEnabled()
    await expect(requirementSwitch(page)).not.toBeChecked()

    await requirementSwitch(page).click()

    await expect(page.locator('.Toastify__toast', { hasText: 'Agreement requirement updated successfully' })).toBeVisible()
    await expect(requirementSwitch(page)).toBeChecked()
    await expect(page.getByText('This partner is asked to sign the partner agreement.')).toBeVisible()
    expect(saved).toEqual([{ required: true }])
  })

  test('while signing is off in Settings, the switch is locked and says where to turn it on', async ({ page }) => {
    const current = { ...PARTNER }
    await signInAsHost(page, current)
    await routeRequirement(page, current, 'global')

    await page.goto(`/partners/${PARTNER.id}`)
    await page.getByRole('tab', { name: 'Agreement' }).click()

    await expect(page.getByText('Agreement signing is turned off in Settings › Agreement.')).toBeVisible()
    await expect(requirementSwitch(page)).toBeDisabled()
    await expect(requirementSwitch(page)).not.toBeChecked()
  })

  test('while the partner agreement is off in Settings, the switch is locked with that reason', async ({ page }) => {
    const current = { ...PARTNER }
    await signInAsHost(page, current)
    const saved = await routeRequirement(page, current, 'template')

    await page.goto(`/partners/${PARTNER.id}`)
    await page.getByRole('tab', { name: 'Agreement' }).click()

    await expect(page.getByText('The partner agreement is turned off in Settings › Agreement.')).toBeVisible()
    await expect(page.getByText('Agreement off')).toBeVisible()
    await expect(requirementSwitch(page)).toBeDisabled()
    await expect(requirementSwitch(page)).not.toBeChecked()
    expect(saved).toEqual([])
  })
})

// The partner's side: the portal is open when the host requires the agreement.
// The API flags the partner (is_refresh); their next call refreshes the user
// and the sign modal opens - no full reload.
test.describe('A partner the host requires to sign while they use the portal', () => {
  test('sees the sign modal after their next page change', async ({ page }) => {
    const partnerUser = { ...HOST_ADMIN, id: 77, name: 'Pat Partner', is_host: 0, partner_id: 21, permissions: ['view clients'] }
    await page.addInitScript(
      ([u]) => {
        window.localStorage.setItem('auth', JSON.stringify({ state: { token: 'e2e-fake-token', user: u, rememberMe: true }, version: 0 }))
        document.cookie = 'auth_session_active=true; path=/'
      },
      [partnerUser]
    )
    let required = false
    let refreshed = 0
    await page.route(`${API_ORIGIN}/**`, (route) => ok(route, []))
    await page.route(`${API_ORIGIN}/common/partner-theme`, (route) => ok(route, { ...THEME, branding: THEME, status_flags: COMPLETE }))
    await page.route(`${API_ORIGIN}/common/user-details`, (route) =>
      ok(route, { user: { ...partnerUser, is_agreement_signed: false, is_refresh: required && refreshed === 0 } })
    )
    await page.route(`${API_ORIGIN}/common/refresh-user`, (route) => {
      refreshed += 1
      return ok(route, { ...partnerUser, is_agreement_signed: false })
    })
    await page.route(`${API_ORIGIN}/common/agreement-sign/check`, (route) =>
      ok(route, required
        ? { needs_sign: true, template: { id: 5, slug: 'partner', version_id: 1, version: 1, template_html: '<p>Partner terms</p>' } }
        : { needs_sign: false })
    )

    await page.goto('/dashboard')
    await expect(page.getByTitle('Agreement Content')).toHaveCount(0)

    // The host turns signing on for this partner.
    required = true
    await page.evaluate(() => {
      window.history.pushState({}, '', '/clients')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    await expect(page.getByTitle('Agreement Content')).toBeVisible()
    expect(refreshed).toBe(1)
  })
})
