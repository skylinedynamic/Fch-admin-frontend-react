import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall, type ApiMock } from '../../support/helpers'

// QA round 2, Funding Sequence > Underwriting Logic:
// - R2 BUG-009: a Min FICO of 851 was saved. The field takes 300-850 and the
//   API refuses anything outside it.
// - R2 BUG-010: Texas could be both an allowed and a restricted state (and an
//   industry both allowed and restricted). A value picked in one list is not
//   offered in the other.
// - R2 BUG-030: a rule whose lender was set to Inactive showed "Unknown Lender".

const ADMIN = '/admin/funding-sequencings'
const SEQ_ID = 201
const CATEGORY_URL = `/funding/visibility-rules/${SEQ_ID}/lender/61/category/general`

const RULE = {
  id: 501, lender_id: 61, lender_product_category_id: null,
  min_fico: 640, min_business_credit_score: 80, min_tib_months: 12, min_monthly_revenue: 12000, min_monthly_deposits: 10000,
  min_deposit_count: 4, min_average_daily_balance: 4000, max_nsf_count: 4, max_negative_days: 4, min_dscr: 1.25,
  allowed_states: ['TX'], restricted_states: [], allowed_industries: [], restricted_industries: [],
}

const SEQUENCE = {
  id: SEQ_ID, name: 'SBA 7(a)', subtitle: 'Long-term', amount_range: '$50000 - $5000000', terms: '10 years', status: 'Active',
  funding_group_id: 1, funding_type_id: 1, lenders: [], lender_visibilities: [RULE],
}

// The active-lender list: an Inactive lender is not in it.
const LENDERS = [{ id: 61, name: 'First Capital' }]

const LOCATIONS = [{
  name: 'United States', code: 'USA', phone_code: '+1',
  states: [{ name: 'Alabama', code: 'AL', cities: [] }, { name: 'Texas', code: 'TX', cities: [] }],
}]

async function open(page: Page, path: string, rules: unknown[] = [RULE]): Promise<ApiMock> {
  await seedSession(page, { permissions: ['view funding', 'create funding', 'update funding'] })
  const api = await mockApi(page, [
    { method: 'GET', match: new RegExp(`${ADMIN}/${SEQ_ID}$`), body: ok({ ...SEQUENCE, lender_visibilities: rules }) },
    { method: 'GET', match: '/admin/lenders/get/all', body: ok(LENDERS) },
    // The state lists are built from the locations the API serves.
    { method: 'GET', match: '/common/locations', body: ok(LOCATIONS) },
    { method: 'GET', match: '/admin/lenders/product-categories', body: ok([{ id: 1, name: 'Term Loans' }]) },
    { method: 'POST', match: `${ADMIN}/${SEQ_ID}/visibilities/fetch`, body: { status: true, message: 'ok', data: rules, meta: { total: rules.length } } },
  ])
  await page.goto(path)
  return api
}

const update = (page: Page) => page.locator('button[form="funding-sequencing-form"]')
const minFico = (page: Page) => page.getByPlaceholder('640').first()
const saves = (api: ApiMock) => api.calls.filter((c) => c.method === 'POST' && /\/visibility$/.test(c.path))

test.describe('Underwriting Logic › Min FICO (R2 BUG-009)', () => {
  test('the field takes 300 to 850, so 851 is held back and nothing is saved', async ({ page }) => {
    const api = await open(page, CATEGORY_URL)
    await expect(minFico(page)).toHaveValue('640')
    await expect(minFico(page)).toHaveAttribute('min', '300')
    await expect(minFico(page)).toHaveAttribute('max', '850')

    await minFico(page).fill('851')
    await update(page).click()

    expect(await minFico(page).evaluate((input: HTMLInputElement) => input.validity.rangeOverflow)).toBe(true)
    await page.waitForTimeout(500)
    expect(saves(api)).toHaveLength(0)
  })

  test('850 is accepted and saved', async ({ page }) => {
    const api = await open(page, CATEGORY_URL)
    api.add({ method: 'POST', match: `${ADMIN}/${SEQ_ID}/lender/61/category/general/visibility`, body: ok(null) })
    await expect(minFico(page)).toHaveValue('640')

    await minFico(page).fill('850')
    await update(page).click()

    const call = await expectCall(api, 'POST', `${ADMIN}/${SEQ_ID}/lender/61/category/general/visibility`)
    expect(call.json.lender_visibilities[0]).toMatchObject({ min_fico: '850' })
    await expect(page.getByText('Underwriting logic updated successfully')).toBeVisible()
  })

  test("the API's refusal is shown on the field", async ({ page }) => {
    const api = await open(page, CATEGORY_URL)
    api.add({
      method: 'POST', match: `${ADMIN}/${SEQ_ID}/lender/61/category/general/visibility`, status: 422,
      body: failure('Invalid', { 'lender_visibilities.0.min_fico': 'The minimum FICO must be between 300 and 850.' }),
    })
    await expect(minFico(page)).toHaveValue('640')

    await update(page).click()

    await expect(page.getByText('The minimum FICO must be between 300 and 850.')).toBeVisible()
  })
})

test.describe('Underwriting Logic › a state in both lists (R2 BUG-010)', () => {
  test('a state already allowed is not offered as restricted', async ({ page }) => {
    await open(page, CATEGORY_URL)
    await expect(minFico(page)).toHaveValue('640')

    await page.locator('.p-multiselect', { hasText: 'Blocked states' }).first().click()
    const panel = page.locator('.p-multiselect-panel')
    await expect(panel).toBeVisible()
    await expect(panel.getByRole('option', { name: 'Alabama' })).toBeVisible()
    await expect(panel.getByRole('option', { name: 'Texas', exact: true })).toHaveCount(0)
  })

  test("the API's refusal is shown on the field", async ({ page }) => {
    const api = await open(page, CATEGORY_URL)
    api.add({
      method: 'POST', match: `${ADMIN}/${SEQ_ID}/lender/61/category/general/visibility`, status: 422,
      body: failure('Invalid', { 'lender_visibilities.0.restricted_states': 'A state cannot be both allowed and restricted: Texas.' }),
    })
    await expect(minFico(page)).toHaveValue('640')

    await update(page).click()

    await expect(page.getByText('A state cannot be both allowed and restricted: Texas.')).toBeVisible()
  })
})

test.describe('Underwriting Logic › a lender set to Inactive (R2 BUG-030)', () => {
  test('its rule keeps the lender name, tagged Inactive, instead of "Unknown Lender"', async ({ page }) => {
    const inactiveRule = { ...RULE, id: 502, lender_id: 63, lender: { id: 63, name: 'Old Harbor Capital', status: 'Inactive' } }
    await open(page, `/funding/visibility-rules/${SEQ_ID}`, [RULE, inactiveRule])

    await expect(page.locator('tr', { hasText: 'First Capital' })).toBeVisible()
    await expect(page.locator('tr', { hasText: 'Old Harbor Capital (Inactive)' })).toBeVisible()
    await expect(page.getByText('Unknown Lender')).toHaveCount(0)
  })
})
