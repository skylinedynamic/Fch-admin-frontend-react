import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall, confirmDelete, selectRow, openActionsMenu, pickPrime, type ApiMock } from './helpers'

/**
 * A funding sequence's underwriting logic ("visibility rules"): which lenders
 * may see a request, and the minimums each lender sets. funding.spec.ts covers
 * the sequence list and its display settings.
 */

const ADMIN = '/admin/funding-sequencings'
const SEQ_ID = 201

const RULE = {
  id: 501, lender_id: 61, lender_product_category_id: null,
  min_fico: 640, min_business_credit_score: 80, min_tib_months: 12, min_monthly_revenue: 12000, min_monthly_deposits: 10000,
  min_deposit_count: 4, min_average_daily_balance: 4000, max_nsf_count: 4, max_negative_days: 4, min_dscr: 1.25,
  allowed_states: [], restricted_states: [], allowed_industries: [], restricted_industries: [],
}

const SEQUENCE = {
  id: SEQ_ID, name: 'SBA 7(a)', subtitle: 'Long-term', amount_range: '$50000 - $5000000', terms: '10 years', status: 'Active',
  funding_group_id: 1, funding_type_id: 1, lenders: [], lender_visibilities: [RULE],
}

const LENDERS = [{ id: 61, name: 'First Capital' }, { id: 62, name: 'Second Street' }]

async function open(page: Page, path: string, rules: unknown[] = [RULE], sequence: Record<string, unknown> = SEQUENCE): Promise<ApiMock> {
  await seedSession(page)
  const api = await mockApi(page, [
    { method: 'GET', match: new RegExp(`${ADMIN}/${SEQ_ID}$`), body: ok(sequence) },
    { method: 'GET', match: '/admin/lenders/get/all', body: ok(LENDERS) },
    { method: 'GET', match: '/admin/lenders/product-categories', body: ok([{ id: 1, name: 'Term Loans' }]) },
    { method: 'POST', match: `${ADMIN}/${SEQ_ID}/visibilities/fetch`, body: { status: true, message: 'ok', data: rules, meta: { total: rules.length } } },
  ])
  await page.goto(path)
  return api
}

const lastFetch = (api: ApiMock) => api.find('POST', `${ADMIN}/${SEQ_ID}/visibilities/fetch`).at(-1)?.json

test.describe('Underwriting logic - list', () => {
  test('loads the rules of the sequence and names their lender', async ({ page }) => {
    const api = await open(page, `/funding/visibility-rules/${SEQ_ID}`)
    await expect(page.locator('tr', { hasText: 'First Capital' })).toBeVisible()
    await expect(page.locator('tr', { hasText: 'First Capital' })).toContainText('640')
    expect(lastFetch(api)).toMatchObject({ search: '', lender_id: null, lender_product_category_id: null })
    await expectCall(api, 'GET', '/admin/lenders/get/all')
  })

  test('the ?tab=visibility link opens the same list', async ({ page }) => {
    await open(page, `/funding/${SEQ_ID}?tab=visibility`)
    await expect(page.locator('tr', { hasText: 'First Capital' })).toBeVisible()
  })

  test('a sequence with no rules says so and offers to add one', async ({ page }) => {
    await open(page, `/funding/visibility-rules/${SEQ_ID}`, [], { ...SEQUENCE, lender_visibilities: [] })
    await expect(page.getByText('No Underwriting Logic Configured')).toBeVisible()
    await expect(page.getByRole('button', { name: /add underwriting logic/i })).toBeVisible()
  })

  test('search is sent with the fetch', async ({ page }) => {
    const api = await open(page, `/funding/visibility-rules/${SEQ_ID}`)
    await expect(page.locator('tr', { hasText: 'First Capital' })).toBeVisible()
    await page.getByPlaceholder('Search visibility rules...').fill('first')
    await page.locator('button.btn-warning', { hasText: 'Filters' }).click()
    await expect.poll(() => lastFetch(api)?.search).toBe('first')
  })

  // The filter only offers lenders that already have rules on this sequence.
  test('the lender filter is sent with the fetch', async ({ page }) => {
    const api = await open(page, `/funding/visibility-rules/${SEQ_ID}`)
    await expect(page.locator('tr', { hasText: 'First Capital' })).toBeVisible()
    await pickPrime(page, page.locator('.p-dropdown', { hasText: 'Filter by Lender' }), 'First Capital')
    await page.locator('button.btn-warning', { hasText: 'Filters' }).click()
    await expect.poll(() => String(lastFetch(api)?.lender_id)).toBe('61')
  })

  test('Add Underwriting Logic opens the configuration screen', async ({ page }) => {
    await open(page, `/funding/visibility-rules/${SEQ_ID}`)
    await page.getByRole('button', { name: /add underwriting logic/i }).click()
    await expect(page).toHaveURL(new RegExp(`/funding/visibility-rules/${SEQ_ID}/configuration$`))
    await expect(page.locator('.p-dropdown', { hasText: 'Please select a lender' })).toBeVisible()
  })
})

test.describe('Underwriting logic - delete', () => {
  test('selected rules are deleted by id after confirmation', async ({ page }) => {
    const api = await open(page, `/funding/visibility-rules/${SEQ_ID}`)
    api.add({ method: 'DELETE', match: `${ADMIN}/${SEQ_ID}/visibilities`, body: ok(null) })
    await expect(page.locator('tr', { hasText: 'First Capital' })).toBeVisible()

    await selectRow(page, 0)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await confirmDelete(page)

    const call = await expectCall(api, 'DELETE', `${ADMIN}/${SEQ_ID}/visibilities`)
    expect(call.json).toEqual({ visibility_ids: [501] })
    await expect(page.getByText('Visibility rules removed successfully.')).toBeVisible()
  })

  test('a failed delete shows the API message', async ({ page }) => {
    const api = await open(page, `/funding/visibility-rules/${SEQ_ID}`)
    api.add({ method: 'DELETE', match: `${ADMIN}/${SEQ_ID}/visibilities`, status: 409, body: failure('Rule is in use by an open request.') })
    await expect(page.locator('tr', { hasText: 'First Capital' })).toBeVisible()

    await selectRow(page, 0)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await confirmDelete(page)

    await expect(page.getByText('Rule is in use by an open request.').first()).toBeVisible()
  })
})

test.describe('Underwriting logic - editing one lender', () => {
  const update = (page: Page) => page.locator('button[form="funding-sequencing-form"]')

  test('clicking a rule opens it for that lender and category', async ({ page }) => {
    await open(page, `/funding/visibility-rules/${SEQ_ID}`)
    await page.locator('tr', { hasText: 'First Capital' }).locator('td').nth(1).click()
    await expect(page).toHaveURL(new RegExp(`/funding/visibility-rules/${SEQ_ID}/lender/61`))
    await expect(page.getByPlaceholder('640').first()).toHaveValue('640')
  })

  test('saving a single category posts only that rule to its category endpoint', async ({ page }) => {
    const api = await open(page, `/funding/visibility-rules/${SEQ_ID}/lender/61/category/general`)
    api.add({ method: 'POST', match: `${ADMIN}/${SEQ_ID}/lender/61/category/general/visibility`, body: ok(null) })
    await expect(page.getByPlaceholder('640').first()).toHaveValue('640')

    await page.getByPlaceholder('640').first().fill('660')
    await update(page).click()

    const call = await expectCall(api, 'POST', `${ADMIN}/${SEQ_ID}/lender/61/category/general/visibility`)
    expect(call.json.lender_visibilities).toHaveLength(1)
    expect(call.json.lender_visibilities[0]).toMatchObject({ lender_id: 61, min_fico: '660' })
    await expect(page.getByText('Underwriting logic updated successfully')).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/funding/visibility-rules/${SEQ_ID}$`))
  })

  test('saving a lender posts its rules to the lender endpoint', async ({ page }) => {
    const api = await open(page, `/funding/visibility-rules/${SEQ_ID}/lender/61`)
    api.add({ method: 'POST', match: `${ADMIN}/${SEQ_ID}/lender/61/visibility`, body: ok(null) })
    await expect(page.getByPlaceholder('640').first()).toHaveValue('640')

    await update(page).click()

    const call = await expectCall(api, 'POST', `${ADMIN}/${SEQ_ID}/lender/61/visibility`)
    expect(call.json.lender_visibilities.every((v: { lender_id: number }) => String(v.lender_id) === '61')).toBe(true)
  })

  test('the configuration screen refuses to save until a lender is chosen', async ({ page }) => {
    const api = await open(page, `/funding/visibility-rules/${SEQ_ID}/configuration`)
    await expect(page.locator('.p-dropdown', { hasText: 'Please select a lender' })).toBeVisible()
    await update(page).click()
    await expect(page.getByText('Please select a lender before updating')).toBeVisible()
    expect(api.calls.filter((c) => /\/visibility$/.test(c.path))).toHaveLength(0)
  })

  test('validation errors on a rule are shown against it', async ({ page }) => {
    const api = await open(page, `/funding/visibility-rules/${SEQ_ID}/lender/61/category/general`)
    api.add({
      method: 'POST', match: `${ADMIN}/${SEQ_ID}/lender/61/category/general/visibility`, status: 422,
      body: failure('Invalid', { 'lender_visibilities.0.min_fico': 'The minimum FICO must be at least 300.' }),
    })
    await expect(page.getByPlaceholder('640').first()).toHaveValue('640')
    await page.getByPlaceholder('640').first().fill('100')
    await update(page).click()
    await expect(page.getByText('The minimum FICO must be at least 300.')).toBeVisible()
  })
})
