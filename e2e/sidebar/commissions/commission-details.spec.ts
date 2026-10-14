import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall, type ApiMock } from '../../support/helpers'

test.describe('Commission details', () => {
  const DETAIL = '/common/commissions/1201'
  const PAYOUT = '/admin/commission/1201/payout'

  const payout = (over: Record<string, unknown> = {}) => ({
    payee: { id: 5, type: 'partner', name: 'Acme Funding', email: 'acme@example.test' },
    paid_by: null, service: null, payout_type: 'Commission', rate: 60,
    base_label: 'Total Commission', base_amount: 4500, amount: 2700,
    is_paid: false, paid_at: null, payment_method: null, can_pay: true, ...over,
  })
  const commission = (over: Record<string, unknown> = {}) => ({
    id: 1201, partner_id: 5, partner_name: 'Acme Funding', partner_company_name: 'Acme LLC',
    partner_phone_number: '555-0100', partner_email: 'acme@example.test', partner_logo: null,
    borrower_id: 7, borrower_name: 'Johnathan Smithfield', borrower_business_name: 'Smithfield Bakery',
    borrower_business_email: 'bakery@example.test', borrower_business_phone_no: '555-0199',
    borrower_business_address: '1 Main St', borrower_business_city: 'Austin', borrower_business_state: 'TX',
    business_postal_code: '73301', borrower_business_country: 'US',
    funding_requested_amount: 100000, funded_amount: 90000, funding_status: 'Funded', funded_date: '2026-03-01',
    funding_industry_type: 'Retail', funding_entity_type: 'LLC', funding_preferred_funding_type: 'Term Loan',
    funding_purpose_of_funds: 'Equipment',
    total_commission: 5, total_commission_amount: 4500, admin_commission: 2, admin_commission_amount: 1800,
    partner_commission: 3, partner_commission_amount: 2700,
    commission_status: 'Approved', commission_payment_status: 'Unpaid', commission_note: 'Pay after closing',
    currency_symbol: '$', conversion_rate: '1', payout: payout(), ...over,
  })

  async function open(page: Page, body: unknown = ok(commission()), user: Record<string, unknown> = { permissions: ['view commission'] }, status = 200): Promise<ApiMock> {
    await seedSession(page, user)
    const api = await mockApi(page, [{ method: 'GET', match: DETAIL, body, status }])
    await page.goto('/commissions/1201')
    return api
  }

  test('requests the commission and shows its partner, borrower and funding details', async ({ page }) => {
    const api = await open(page)
    await expectCall(api, 'GET', DETAIL)
    await expect(page.getByRole('heading', { name: 'Commission Details' }).first()).toBeVisible()
    await expect(page.getByText('Acme LLC')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Johnathan Smithfield' })).toHaveAttribute('href', '/clients/7')
    await expect(page.getByText('Smithfield Bakery')).toBeVisible()
    await expect(page.getByText('1 Main St, Austin, TX 73301, US')).toBeVisible()
    await expect(page.getByText('Pay after closing')).toBeVisible()
    await expect(page.getByRole('link', { name: /View Profile/ })).toHaveAttribute('href', '/partners/5')
  })

  test('a host sees the commission breakdown with all three shares', async ({ page }) => {
    await open(page)
    await expect(page.getByText('Commission Breakdown')).toBeVisible()
    await expect(page.getByText('Success Fee')).toBeVisible()
    await expect(page.getByText('Admin Commission')).toBeVisible()
    await expect(page.getByText('Partner Commission')).toBeVisible()
    await expect(page.getByText('Total Commission', { exact: true }).first()).toBeVisible()
  })

  test('a partner sees only their own commission and no breakdown or payout', async ({ page }) => {
    await open(page, ok(commission()), { permissions: ['view commission'], is_host: false, partner_id: 5 })
    await expect(page.getByText('Your Commission')).toBeVisible()
    await expect(page.getByText('Commission Breakdown')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Make Payment/ })).toHaveCount(0)
  })

  test('no note shows the empty notes message', async ({ page }) => {
    await open(page, ok(commission({ commission_note: null })))
    await expect(page.getByText('No notes available.')).toBeVisible()
  })

  test('a failed load shows the error page', async ({ page }) => {
    await open(page, failure('Not found'), undefined, 404)
    await expect(page.getByText('Page Not Found')).toBeVisible()
  })

  test('the page is blocked without the view permission', async ({ page }) => {
    await open(page, ok(commission()), { permissions: [] })
    await expect(page).toHaveURL(/access-denied/)
  })

  test.describe('Payout', () => {
    test('payment cannot be made before the funding is closed', async ({ page }) => {
      await open(page, ok(commission({ payout: payout({ can_pay: false }) })))
      await expect(page.getByText('Payment can be made once the funding is closed.')).toBeVisible()
      await expect(page.getByRole('button', { name: /Make Payment/ })).toHaveCount(0)
    })

    test('a payee with no share explains why there is nothing to pay', async ({ page }) => {
      await open(page, ok(commission({ payout: payout({ amount: null }) })))
      await expect(page.getByText('Acme Funding has no commission share for this deal.')).toBeVisible()
    })

    test('no payee explains that nobody is assigned', async ({ page }) => {
      await open(page, ok(commission({ payout: payout({ payee: null }) })))
      await expect(page.getByText('No user is assigned to this client.')).toBeVisible()
    })

    test('a paid payout shows when and how it was paid', async ({ page }) => {
      await open(page, ok(commission({ payout: payout({ is_paid: true, paid_at: '2026-04-02', payment_method: 'Cheque', can_pay: false }) })))
      await expect(page.getByText('2026-04-02')).toBeVisible()
      await expect(page.getByText('Cheque')).toBeVisible()
      await expect(page.getByRole('button', { name: /Make Payment/ })).toHaveCount(0)
    })

    test('Make Payment posts the chosen method and note', async ({ page }) => {
      const api = await open(page)
      api.add({ method: 'POST', match: PAYOUT, body: ok() })
      await page.getByRole('button', { name: /Make Payment/ }).click()
      const modal = page.locator('.modal.show')
      await expect(modal.getByText('Payout to Acme Funding')).toBeVisible()
      await modal.locator('textarea').fill('April run')
      await modal.getByRole('button', { name: /Confirm Payout/ }).click()
      const call = await expectCall(api, 'POST', PAYOUT)
      expect(call.json).toEqual({ partner_payment_method: 'Cash', note: 'April run' })
      await expect(page.getByText('Payment made successfully')).toBeVisible()
    })

    test('Cancel closes the payout dialog without posting', async ({ page }) => {
      const api = await open(page)
      await page.getByRole('button', { name: /Make Payment/ }).click()
      const modal = page.locator('.modal.show')
      await modal.getByRole('button', { name: 'Cancel' }).click()
      await expect(modal).toBeHidden()
      expect(api.find('POST', PAYOUT)).toHaveLength(0)
    })

    test('a refused payout shows the server reason', async ({ page }) => {
      const api = await open(page)
      api.add({ method: 'POST', match: PAYOUT, status: 422, body: { status: false, message: 'Invalid', errors: { payout: ['The funding is not closed yet.'] } } })
      await page.getByRole('button', { name: /Make Payment/ }).click()
      await page.locator('.modal.show').getByRole('button', { name: /Confirm Payout/ }).click()
      await expect(page.getByText('The funding is not closed yet.')).toBeVisible()
    })
  })
})
