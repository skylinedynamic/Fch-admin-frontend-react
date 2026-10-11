import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall, type ApiMock } from './helpers'

/**
 * Settings > Custom Domain (a partner's own tenant config) and the branding
 * the sign-in screen loads. settings.spec.ts covers which sections are listed,
 * test mail and the email configuration.
 */

const MINE = '/common/partner/tenant-config'
const CONFIG = { active_custom_url: true, partner_domain: 'portal.acme.test', borrower_domain: 'apply.acme.test' }
// The /settings route itself also needs one of its route permissions (see settings.spec.ts).
const WL_PARTNER = { permissions: ['update payment settings', 'update domain configuration settings'], is_host: 0, partner_id: 5, entity_type: 'Partner', entity_id: 5 }

async function openDomain(page: Page, handlers: Parameters<typeof mockApi>[1] = [{ method: 'GET', match: MINE, body: ok(CONFIG) }]): Promise<ApiMock> {
  await seedSession(page, WL_PARTNER)
  const api = await mockApi(page, handlers)
  await page.goto('/settings')
  await page.locator('.settings-page-wrapper span.fw-medium').getByText('Custom Domain', { exact: true }).click()
  return api
}
const submit = (page: Page) => page.locator('#tenant-domain-config-form button[type="submit"]')

test.describe('Settings - Custom Domain', () => {
  test('loads the partner own domain configuration', async ({ page }) => {
    const api = await openDomain(page)
    await expectCall(api, 'GET', MINE)
    await expect(page.locator('input[name="partner_domain"]')).toHaveValue('portal.acme.test')
    await expect(page.locator('input[name="borrower_domain"]')).toHaveValue('apply.acme.test')
    await expect(page.locator('#active_custom_url')).toBeChecked()
  })

  test('Update Configuration posts the domains', async ({ page }) => {
    const api = await openDomain(page)
    api.add({ method: 'POST', match: MINE, body: ok(CONFIG) })
    await expect(page.locator('input[name="borrower_domain"]')).toHaveValue('apply.acme.test')
    await page.locator('input[name="borrower_domain"]').fill('loans.acme.test')
    await submit(page).click()
    const call = await expectCall(api, 'POST', MINE)
    expect(call.json).toMatchObject({ active_custom_url: true, partner_domain: 'portal.acme.test', borrower_domain: 'loans.acme.test' })
    await expect(page.getByText('Domain configuration updated successfully')).toBeVisible()
  })

  test('validation errors are shown against the field', async ({ page }) => {
    const api = await openDomain(page)
    api.add({ method: 'POST', match: MINE, status: 422, body: failure('Invalid', { borrower_domain: 'The borrower domain format is invalid.' }) })
    await expect(page.locator('input[name="borrower_domain"]')).toHaveValue('apply.acme.test')
    await submit(page).click()
    await expect(page.getByText('The borrower domain format is invalid.').first()).toBeVisible()
  })

  test('a failed save shows the API message', async ({ page }) => {
    const api = await openDomain(page)
    api.add({ method: 'POST', match: MINE, status: 500, body: failure('Domain service unavailable.') })
    await expect(page.locator('input[name="borrower_domain"]')).toHaveValue('apply.acme.test')
    await submit(page).click()
    await expect(page.getByText('Domain service unavailable.').first()).toBeVisible()
  })

  test('a failed load is reported', async ({ page }) => {
    await openDomain(page, [{ method: 'GET', match: MINE, status: 500, body: failure('boom') }])
    await expect(page.getByText('Failed to fetch domain configuration')).toBeVisible()
  })

  test('the section is not offered without its permission', async ({ page }) => {
    await seedSession(page, { ...WL_PARTNER, permissions: ['update payment settings'] })
    await mockApi(page)
    await page.goto('/settings')
    await expect(page.locator('.settings-page-title')).toBeVisible()
    await expect(page.locator('.settings-page-wrapper span.fw-medium').getByText('Custom Domain', { exact: true })).toHaveCount(0)
  })
})

test.describe('Sign-in branding', () => {
  // /common/branding answers {success, data: {branding, css_vars}}, not the usual {status} envelope.
  const BRANDING = {
    success: true,
    data: { branding: { site_name: 'Acme Capital', logo_sidebar_full_url: 'https://example.test/acme-logo.png', logo_mobile_full_url: 'null' }, css_vars: {}, css_vars_version: 1 },
  }

  test('the sign-in screen loads the branding and shows its name and logo', async ({ page }) => {
    await page.context().route('https://example.test/**', (route) => route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.alloc(0) }))
    const api = await mockApi(page, [{ method: 'GET', match: '/common/branding', body: BRANDING }])
    await page.goto('/login')
    await expectCall(api, 'GET', '/common/branding')
    await expect(page).toHaveTitle('Acme Capital')
    await expect(page.locator('.auth-page-wrapper img[src="https://example.test/acme-logo.png"]').first()).toBeAttached()
  })

  test('without branding no broken logo is rendered and sign-in still works', async ({ page }) => {
    await mockApi(page, [{ method: 'GET', match: '/common/branding', status: 500, body: failure('boom') }])
    await page.goto('/login')
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    await expect(page.locator('.auth-logo img')).toHaveCount(0)
  })

  test('a logo sent as the string "null" is ignored', async ({ page }) => {
    await mockApi(page, [{ method: 'GET', match: '/common/branding', body: { success: true, data: { branding: { site_name: 'Acme Capital', logo_sidebar_full_url: 'null' }, css_vars: {} } } }])
    await page.goto('/login')
    await expect(page.locator('.auth-logo')).toContainText('Acme Capital')
    await expect(page.locator('.auth-logo img')).toHaveCount(0)
  })
})
