import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, paginated, failure, seedSession, expectCall, type ApiMock } from '../../support/helpers'

/**
 * Converting a lead into a borrower (the plans it loads, the fee a partner
 * charges, the payload it sends) and the stats strip on a lead's profile.
 * leads.spec.ts covers the list, create / edit and the missing-info step.
 */

const LEAD = {
  id: 51, contact_person: 'Lena Lead', company_name: 'Lead Works', email: 'lena@example.test', phone_number: '(555) 010-0001',
  lead_type: 'Borrower', status: 'New', country: 'United States', state: 'Texas', city: 'Austin', convert_to: null,
}
const ONE_TIME = { id: 21, enrollment_type: 'One Time', total_amount: '1200.00', platform_fee: '0.00', total_installments_count: 1 }
const MONTHLY = { id: 22, enrollment_type: 'Monthly', total_amount: '150.00', platform_fee: '0.00', total_installments_count: 1 }

async function openConvert(page: Page, user: Record<string, unknown>, extra: Parameters<typeof mockApi>[1] = []): Promise<ApiMock> {
  await seedSession(page, { permissions: ['view leads'], ...user })
  const api = await mockApi(page, [
    { method: 'POST', match: '/common/leads/fetch-leads', body: paginated([LEAD]) },
    { method: 'GET', match: '/common/borrower-plans', body: ok([ONE_TIME, MONTHLY]) },
    { method: 'GET', match: '/common/partner-plans', body: ok([]) },
    { method: 'GET', match: '/common/subscriptions/partner-borrower-fee', body: ok({ borrower_fee_amount: 450 }) },
    ...(extra ?? []),
  ])
  await page.goto('/leads')
  await page.locator('tr', { hasText: 'Lena Lead' }).getByRole('button', { name: /convert to borrower/i }).click()
  await expect(dialog(page)).toBeVisible()
  return api
}

const dialog = (page: Page) => page.locator('.modal.show', { hasText: 'Convert Lead to Borrower' })
const convert = (page: Page) => dialog(page).getByRole('button', { name: 'Convert to Borrower' })
const PARTNER_USER = { is_host: 0, partner_id: 5, entity_type: 'Partner', entity_id: 5 }

test.describe('Lead conversion - borrower', () => {
  test('loads the borrower and partner plans', async ({ page }) => {
    const api = await openConvert(page, {})
    await expectCall(api, 'GET', '/common/borrower-plans')
    await expectCall(api, 'GET', '/common/partner-plans')
    await expect(dialog(page)).toContainText('Select Enrollment Type')
  })

  test('a host is not charged a partner borrower fee', async ({ page }) => {
    const api = await openConvert(page, {})
    await expect(dialog(page)).toContainText('Select Enrollment Type')
    expect(api.find('GET', '/common/subscriptions/partner-borrower-fee')).toHaveLength(0)
  })

  test('a partner loads the borrower fee it charges', async ({ page }) => {
    const api = await openConvert(page, PARTNER_USER)
    await expectCall(api, 'GET', '/common/subscriptions/partner-borrower-fee')
  })

  test('converting sends the first plan with its enrollment type', async ({ page }) => {
    const api = await openConvert(page, {})
    api.add({ method: 'POST', match: '/common/leads/51/convert', body: ok({ id: 900 }) })
    await expect(dialog(page)).toContainText('Select Enrollment Type')
    await convert(page).click()
    const call = await expectCall(api, 'POST', '/common/leads/51/convert')
    expect(call.json).toMatchObject({ is_free_trail: false, plan_id: 21, enrollment_type: 'One Time' })
    await expect(page.getByText('Lead successfully converted to Borrower')).toBeVisible()
  })

  test('the free plan switch converts without a plan', async ({ page }) => {
    const api = await openConvert(page, {})
    api.add({ method: 'POST', match: '/common/leads/51/convert', body: ok({ id: 900 }) })
    await dialog(page).locator('#is_free_trail_borrower').check()
    await expect(dialog(page)).not.toContainText('Select Enrollment Type')
    await convert(page).click()
    const call = await expectCall(api, 'POST', '/common/leads/51/convert')
    expect(call.json).toEqual({ is_free_trail: true })
  })

  test('validation errors from the API are shown in the dialog', async ({ page }) => {
    const api = await openConvert(page, {})
    api.add({ method: 'POST', match: '/common/leads/51/convert', status: 422, body: failure('Invalid', { enrollment_amount: 'The enrollment amount must be at least 1.' }) })
    await expect(dialog(page)).toContainText('Select Enrollment Type')
    await convert(page).click()
    await expect(dialog(page)).toContainText('The enrollment amount must be at least 1.')
  })

  test('a general failure is toasted and the dialog stays open', async ({ page }) => {
    const api = await openConvert(page, {})
    api.add({ method: 'POST', match: '/common/leads/51/convert', status: 500, body: { status: false, message: 'Lead already converted.' } })
    await expect(dialog(page)).toContainText('Select Enrollment Type')
    await convert(page).click()
    await expect(page.getByText('Lead already converted.').first()).toBeVisible()
    await expect(dialog(page)).toBeVisible()
  })

  test('Cancel closes the dialog without converting', async ({ page }) => {
    const api = await openConvert(page, {})
    await dialog(page).getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog(page)).toBeHidden()
    expect(api.find('POST', '/convert')).toHaveLength(0)
  })
})

test.describe('Lead profile - stats', () => {
  // BUG-016: the strip showed the signed-in partner's own numbers (the same on
  // every lead). A lead has no meetings, clients, invoices or tickets of its
  // own, so there is no strip and nothing is fetched for it.
  test('no partner-wide stats strip is shown or fetched on a lead', async ({ page }) => {
    await seedSession(page, { permissions: ['view leads', 'update leads'] })
    const api = await mockApi(page, [
      { method: 'GET', match: /\/common\/leads\/51$/, body: ok(LEAD) },
      { method: 'POST', match: '/common/stats', body: ok({ total_meetings: 4, total_clients: 0, total_invoice: 1, enrollment_type: 'N/A', total_tickets: 6 }) },
    ])
    await page.goto('/leads/51')
    await expectCall(api, 'GET', '/common/leads/51')
    await expect(page.locator('input[name="contact_person"]').first()).toHaveValue('Lena Lead')
    await expect(page.locator('.metrics-strip')).toHaveCount(0)
    expect(api.find('POST', '/common/stats')).toHaveLength(0)
  })
})
