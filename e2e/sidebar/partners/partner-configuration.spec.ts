import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, seedSession, expectCall, type ApiMock } from '../../support/helpers'

/**
 * Partner profile › Configuration: the host edits a partner's Email, SMS,
 * Branding, Agreement and Payment settings with the partner's own Settings screens. Every
 * call names the partner (`partner_id`), so the host's own settings are never
 * touched. Shown only to a host user with `manage partner configuration`.
 */

const WL = 'White-Label Partner (WL)'
const PARTNER = {
  id: 5, entity_id: 5, full_name: 'Wile Coyote', company_name: 'Acme Funding', email: 'wile@acme.test', phone_number: '(444) 444-4444',
  partner_type: WL, is_host: 0, status: 'active', country: 'United States', subscriptions: [],
}
const STATS = { total_meetings: 0, total_clients: 0, total_invoice: 0, enrollment_type: 'Monthly', total_tickets: 0 }
// Email, SMS and Payment also need their own settings permission (the API's configurePartner Gate).
const PERMS = [
  'view partners', 'update partners', 'manage partner configuration',
  'update email configuration settings', 'update sms configuration settings', 'update payment settings',
  'update partner agreement settings',
]
const BORROWER_AGREEMENT = { id: 7, slug: 'borrower', is_active: true, template_html: '<p>Acme terms</p>', template_json: null }

const SMS_OPTIONS = { countries: [{ value: 'USA', label: 'United States', providers: [{ value: 'twilio', label: 'Twilio' }] }] }
const SMS_SAVED = {
  country: 'USA', provider: 'twilio', is_enabled: true, from_number: '+15005550006',
  account_sid: 'AC0123456789abcdef0123456789abcdef', auth_token: '••••••••', messaging_service_sid: null,
  updated_at: '2026-10-05T10:00:00+00:00',
}

async function openProfile(page: Page, permissions = PERMS, tab = 'statusAgent'): Promise<ApiMock> {
  await seedSession(page, { permissions })
  const api = await mockApi(page, [
    { method: 'GET', match: '/admin/partners-details/5', body: ok(PARTNER) },
    { method: 'POST', match: '/admin/partners-profile-states-details-count/5', body: ok(STATS) },
    { method: 'GET', match: '/common/sms-configuration', body: ok({ configuration: SMS_SAVED, options: SMS_OPTIONS }) },
    { method: 'POST', match: /\/common\/sms-configuration$/, body: ok({ configuration: SMS_SAVED, options: SMS_OPTIONS }, 'SMS settings saved.') },
    { method: 'GET', match: '/common/mail-configurations', body: ok({ configurations: [], uses_own_configuration: false, can_manage_fallback: false, fallback: {}, providers: [] }) },
    { method: 'POST', match: /\/common\/app-configurations$/, body: ok({ primary_color: '#2C6ECB' }) },
    { method: 'POST', match: '/common/app-configurations/save', body: ok(null, 'Brand settings saved') },
    { method: 'GET', match: '/common/partner-payment-providers', body: ok([]) },
    { method: 'GET', match: '/common/agreement-templates', body: ok([BORROWER_AGREEMENT]) },
    { method: 'POST', match: '/common/agreement-templates/show', body: ok(BORROWER_AGREEMENT) },
    { method: 'POST', match: '/common/agreement-templates/update-status/7', body: ok({ ...BORROWER_AGREEMENT, is_active: false }, 'Status updated') },
    { method: 'POST', match: '/common/agreement-templates/save/7', body: ok(BORROWER_AGREEMENT, 'Saved') },
  ])
  await page.goto(`/partners/5?tab=${tab}`)
  await expect(page.getByText('Acme Funding').first()).toBeVisible()
  return api
}

const configurationTab = (page: Page) => page.locator('.card-header-tabs .nav-link', { hasText: /^\s*Configuration\s*$/ })

test.describe('Partner profile - Configuration', () => {
  test('a host with the permission sees the tab and the partner\'s sections', async ({ page }) => {
    await openProfile(page)
    await configurationTab(page).click()

    for (const section of ['Email Configuration', 'SMS Configuration', 'Branding', 'Agreement', 'Payment Integration']) {
      await expect(page.getByRole('tab', { name: section })).toBeVisible()
    }
    await expect(page.getByText('Changes apply to Acme Funding straight away.')).toBeVisible()

    const details = page.getByRole('region', { name: 'Partner details' })
    await expect(details).toContainText('Acme Funding')
    await expect(details).toContainText('wile@acme.test')
    await expect(details).toContainText('White-Label')
  })

  test('the partner\'s SMS settings are read and saved with its partner_id', async ({ page }) => {
    const api = await openProfile(page)
    await configurationTab(page).click()
    await page.getByRole('tab', { name: 'SMS Configuration' }).click()

    await expect(page.getByLabel(/from number/i)).toHaveValue('+15005550006')
    const read = await expectCall(api, 'GET', '/common/sms-configuration')
    expect(read.path).toContain('partner_id=5')

    await page.getByLabel(/from number/i).fill('+15005550007')
    await page.getByRole('button', { name: /save/i }).last().click()

    await expect.poll(() => api.find('POST', /\/common\/sms-configuration$/).at(-1)?.json).toMatchObject({
      partner_id: 5, from_number: '+15005550007',
    })
  })

  test('the partner\'s branding is loaded for it', async ({ page }) => {
    const api = await openProfile(page)
    await configurationTab(page).click()
    await page.getByRole('tab', { name: 'Branding' }).click()

    await expect.poll(() => api.find('POST', /\/common\/app-configurations$/).at(-1)?.json).toMatchObject({
      module: 'branding', partner_id: 5,
    })
  })

  test('the partner\'s borrower agreement is switched and saved with its partner_id', async ({ page }) => {
    const api = await openProfile(page)
    await configurationTab(page).click()
    await page.getByRole('tab', { name: /^Agreement/ }).click()

    await expect(page.getByText('Borrower Agreement Paper')).toBeVisible()
    await expect(page.getByText('Partner Agreement Paper')).toHaveCount(0)
    await expect(page.getByText('Agreement Signing Feature')).toHaveCount(0)
    const list = await expectCall(api, 'GET', '/common/agreement-templates')
    expect(list.path).toContain('partner_id=5')

    await page.getByRole('switch').click()
    await expect.poll(() => api.find('POST', '/common/agreement-templates/update-status/7').at(-1)?.json).toMatchObject({
      is_active: false, partner_id: 5,
    })

    await page.getByRole('button', { name: /Edit Agreement/ }).click()
    await expect.poll(() => api.find('POST', '/common/agreement-templates/show').at(-1)?.json).toEqual({ slug: 'borrower', partner_id: 5 })
    await page.getByRole('button', { name: 'Save Template' }).click()
    await expect.poll(() => api.find('POST', '/common/agreement-templates/save/7').at(-1)?.json).toMatchObject({
      slug: 'borrower', partner_id: 5,
    })
  })

  test('the partner profile\'s own Save button is not shown on this tab', async ({ page }) => {
    await openProfile(page)
    await configurationTab(page).click()

    await expect(page.locator('.page-actions, .page-title-box').getByRole('button', { name: /^save/i })).toHaveCount(0)
  })

  test('the tab is hidden without the permission', async ({ page }) => {
    await openProfile(page, ['view partners', 'update partners'])

    await expect(page.getByText('Acme Funding').first()).toBeVisible()
    await expect(configurationTab(page)).toHaveCount(0)
  })
})
