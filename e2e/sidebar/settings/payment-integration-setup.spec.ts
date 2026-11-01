import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall, type ApiMock } from '../../support/helpers'

// Settings -> Payment Integration. A payment method switched on but not set up
// for its mode (Stripe without usable keys, Bank Transfer without an account)
// is no longer offered to payers. The list marks its row "Not configured"; the
// method's own page says what is missing. Saving Stripe keys asks Stripe
// whether they work, and its "no" lands under the key.
// Backend calls are mocked; nothing is written.
const HOST_PARTNER = { is_host: 1, entity_type: 'Partner', entity_id: 1, partner_id: 1, permissions: ['update payment settings'] }

const PK_MISSING = 'The Production publishable key is missing or is not a Stripe publishable key (it starts with pk_live_ or pk_test_).'
const SECRET_REJECTED = 'Stripe did not accept the Production secret key. Copy it again from your Stripe dashboard (Developers > API keys).'

const provider = (overrides: Record<string, unknown>) => ({
  slug: 'x', logo: null, status: true, is_default: false, is_configured: true, payment_mode: 'sandbox', publishable_key: null, setup_issues: [],
  ...overrides,
})
const STRIPE_BROKEN = provider({ id: 1, name: 'Stripe', payment_mode: 'production', setup_issues: [PK_MISSING] })
const CASH = provider({ id: 7, name: 'Cash Payment' })
const STRIPE_DETAILS = {
  id: 3, status: true, is_default: false, payment_mode: 'production',
  configuration: { production: { publishable_key: '', secret_key: 'sk_live_abc' } }, bank_details: [], setup_issues: [PK_MISSING],
}

async function open(page: Page, providers: unknown[]): Promise<ApiMock> {
  await seedSession(page, HOST_PARTNER)
  const api = await mockApi(page, [
    { method: 'GET', match: /^\/common\/partner-payment-providers$/, body: ok(providers) },
    {
      method: 'GET',
      match: '/common/partner-payment-providers/1',
      body: ok(STRIPE_DETAILS),
    },
  ])
  await page.goto('/settings/payment-integration')
  return api
}

test.describe('Settings › Payment Integration — methods that are not set up', () => {
  test('the list marks a method that is not set up, without an alert', async ({ page }) => {
    await open(page, [STRIPE_BROKEN, CASH])

    await expect(page.locator('.payment-method-row', { hasText: 'Stripe' }).getByText('Not configured')).toBeVisible()
    await expect(page.locator('.payment-method-row', { hasText: 'Cash Payment' }).getByText('Not configured')).toHaveCount(0)
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(page.getByText(PK_MISSING)).toHaveCount(0)
  })

  test('nothing is flagged when every active method is set up', async ({ page }) => {
    await open(page, [provider({ id: 1, name: 'Stripe' }), CASH])

    await expect(page.locator('.payment-method-row', { hasText: 'Stripe' })).toBeVisible()
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(page.getByText('Not configured')).toHaveCount(0)
  })

  test("a key Stripe rejects is shown under it on the method's page", async ({ page }) => {
    const api = await open(page, [STRIPE_BROKEN, CASH])
    api.add({
      method: 'POST',
      match: /^\/common\/partner-payment-providers$/,
      status: 422,
      body: failure(SECRET_REJECTED, { 'configuration.production.secret_key': SECRET_REJECTED }),
    })

    await page.locator('.payment-method-row', { hasText: 'Stripe' }).click()
    await expect(page.getByText('Stripe Integration')).toBeVisible()

    const publishable = page.getByPlaceholder(/pk_/i)
    await publishable.fill('pk_live_abc')
    await page.getByRole('button', { name: /save configuration/i }).click()

    const saved = await expectCall(api, 'POST', '/common/partner-payment-providers')
    expect(saved.json.configuration.production).toMatchObject({ publishable_key: 'pk_live_abc', secret_key: 'sk_live_abc' })
    await expect(page.getByText(SECRET_REJECTED).first()).toBeVisible()
    await expect(page.locator('input[name="stripe_secret_production"]')).toHaveClass(/is-invalid/)
  })

  test("the method's own page says what is missing, and stops once a save fixes it", async ({ page }) => {
    const api = await open(page, [STRIPE_BROKEN, CASH])
    api.add({ method: 'POST', match: /^\/common\/partner-payment-providers$/, body: ok({ ...STRIPE_DETAILS, setup_issues: [] }) })

    await page.locator('.payment-method-row', { hasText: 'Stripe' }).click()
    const alert = page.getByRole('alert').filter({ hasText: "Stripe can't take payments yet" })
    await expect(alert).toBeVisible()
    await expect(alert).toContainText(PK_MISSING)

    await page.getByPlaceholder(/pk_/i).fill('pk_live_abc')
    await page.getByRole('button', { name: /save configuration/i }).click()

    await expectCall(api, 'POST', '/common/partner-payment-providers')
    await expect(alert).toHaveCount(0)
  })

  test("a gateway with no credentials is marked, and its page says what is missing", async ({ page }) => {
    const NO_APP_ID = 'The Sandbox Application ID is missing.'
    const NO_TOKEN = 'The Sandbox Access Token is missing.'
    const square = provider({ id: 4, name: 'Square', setup_issues: [NO_APP_ID, NO_TOKEN], can_take_payments: true })
    const api = await open(page, [square, CASH])
    api.add({
      method: 'GET',
      match: '/common/partner-payment-providers/4',
      body: ok({ id: 9, status: true, is_default: false, payment_mode: 'sandbox', configuration: {}, bank_details: [], setup_issues: [NO_APP_ID, NO_TOKEN], can_take_payments: true }),
    })

    await expect(page.locator('.payment-method-row', { hasText: 'Square' }).getByText('Not configured')).toBeVisible()
    await page.locator('.payment-method-row', { hasText: 'Square' }).click()

    const alert = page.getByRole('alert').filter({ hasText: "Square isn't fully set up" })
    await expect(alert).toBeVisible()
    await expect(alert).toContainText(NO_APP_ID)
    await expect(alert).toContainText(NO_TOKEN)
    await expect(alert).not.toContainText("aren't offered")
  })
})
