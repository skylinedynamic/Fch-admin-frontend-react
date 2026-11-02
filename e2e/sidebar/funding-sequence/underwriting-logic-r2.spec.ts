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
  /**
   * Defect: the browser held 851 back with its own "Value must be less than or
   * equal to 850." popup, so the API never checked it. The API is what
   * validates: 851 is sent, and the API's refusal is shown under the field.
   */
  test('851 is sent to the API and its refusal is shown under the field, not a browser popup', async ({ page }) => {
    const api = await open(page, CATEGORY_URL)
    api.add({
      method: 'POST', match: `${ADMIN}/${SEQ_ID}/lender/61/category/general/visibility`, status: 422,
      body: failure('Invalid', { 'lender_visibilities.0.min_fico': 'Enter a FICO score as a whole number between 300 and 850.' }),
    })
    await expect(minFico(page)).toHaveValue('640')

    await minFico(page).fill('851')
    await update(page).click()

    const call = await expectCall(api, 'POST', `${ADMIN}/${SEQ_ID}/lender/61/category/general/visibility`)
    expect(call.json.lender_visibilities[0]).toMatchObject({ min_fico: '851' })
    await expect(page.getByText('Enter a FICO score as a whole number between 300 and 850.')).toBeVisible()
    await expect(minFico(page)).toHaveClass(/is-invalid/)
    expect(saves(api)).toHaveLength(1)
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

test.describe('Underwriting Logic › money fields', () => {
  /**
   * Defect: Min Monthly Revenue, Min Monthly Deposits and Min Avg Daily Bal
   * showed "$" run into the value ("$   4000.00"); the line between the "$"
   * box and the value only appeared once the field had an error. The line is
   * always there now.
   */
  test('the "$" box is set off from the value by a line, with or without an error', async ({ page }) => {
    await open(page, CATEGORY_URL)
    await expect(minFico(page)).toHaveValue('640')

    for (const placeholder of ['12000.00', '4000.00']) {
      for (const input of await page.getByPlaceholder(placeholder, { exact: true }).all()) {
        await expect(input).not.toHaveClass(/border-start-0/)
        await expect(input.locator('xpath=preceding-sibling::span[1]')).not.toHaveClass(/border-end-0/)
      }
    }
    await expect(page.getByPlaceholder('12000.00', { exact: true })).toHaveCount(2)
  })
})

test.describe('Underwriting Logic › switching lender', () => {
  /**
   * Defect: picking another lender in the "Lender:" dropdown navigated twice
   * and showed a half-second loading skeleton for rules already on the page,
   * so the table flashed and the page seemed to refresh several times; Back
   * then needed two presses.
   */
  test('the other lender\'s rules show at once, with no loading flash, and one Back returns', async ({ page }) => {
    const LENDER_B = { id: 62, name: 'Second Bank' }
    const ruleB = { ...RULE, id: 503, lender_id: 62, min_fico: 700 }
    await seedSession(page, { permissions: ['view funding', 'create funding', 'update funding'] })
    await mockApi(page, [
      { method: 'GET', match: new RegExp(`${ADMIN}/${SEQ_ID}$`), body: ok({ ...SEQUENCE, lender_visibilities: [RULE, ruleB] }) },
      { method: 'GET', match: '/admin/lenders/get/all', body: ok([...LENDERS, LENDER_B]) },
      { method: 'GET', match: '/common/locations', body: ok(LOCATIONS) },
      { method: 'GET', match: '/admin/lenders/product-categories', body: ok([{ id: 1, name: 'Term Loans' }]) },
      { method: 'POST', match: `${ADMIN}/${SEQ_ID}/visibilities/fetch`, body: { status: true, message: 'ok', data: [RULE, ruleB], meta: { total: 2 } } },
    ])
    await page.goto(`/funding/visibility-rules/${SEQ_ID}/lender/61`)
    await expect(minFico(page)).toHaveValue('640')

    // Count every loading skeleton that appears from here on, and any change to the sidebar.
    await page.evaluate(() => {
      const w = window as any
      w.__skeletons = 0
      w.__sidebarChanges = 0
      new MutationObserver(() => {
        if (document.querySelector('.skeleton-table-cell')) w.__skeletons++
      }).observe(document.body, { childList: true, subtree: true })
      const sidebar = document.querySelector('.app-menu')
      if (sidebar) {
        new MutationObserver((m) => { w.__sidebarChanges += m.length })
          .observe(sidebar, { childList: true, subtree: true, attributes: true, characterData: true })
      }
    })
    const historyBefore = await page.evaluate(() => history.length)

    await page.locator('.p-dropdown', { hasText: 'First Capital' }).first().click()
    await page.locator('.p-dropdown-item', { hasText: 'Second Bank' }).click()

    await expect(page).toHaveURL(new RegExp(`/funding/visibility-rules/${SEQ_ID}/lender/62$`))
    await expect(page.getByPlaceholder('640').first()).toHaveValue('700')
    expect(await page.evaluate(() => (window as any).__skeletons)).toBe(0)
    expect(await page.evaluate(() => (window as any).__sidebarChanges)).toBe(0)
    expect(await page.evaluate(() => history.length)).toBe(historyBefore + 1)

    await page.goBack()
    await expect(page).toHaveURL(new RegExp(`/funding/visibility-rules/${SEQ_ID}/lender/61$`))
  })

  /**
   * Defect: on "add underwriting logic" (/configuration), picking a lender with
   * no rules yet showed "Rules Not Initialized" until a timer added its rows a
   * moment later - another flash. The rows now come with the pick. Nothing
   * outside the grid changes: the sidebar is not touched.
   */
  test('picking a lender with no rules yet on Configuration shows its empty rows at once, sidebar untouched', async ({ page }) => {
    const LENDER_B = { id: 62, name: 'Second Bank' }
    await seedSession(page, { permissions: ['view funding', 'create funding', 'update funding'] })
    await mockApi(page, [
      { method: 'GET', match: new RegExp(`${ADMIN}/${SEQ_ID}$`), body: ok({ ...SEQUENCE, lender_visibilities: [RULE] }) },
      { method: 'GET', match: '/admin/lenders/get/all', body: ok([...LENDERS, LENDER_B]) },
      { method: 'GET', match: '/common/locations', body: ok(LOCATIONS) },
      { method: 'GET', match: '/admin/lenders/product-categories', body: ok([{ id: 1, name: 'Term Loans' }]) },
      { method: 'POST', match: `${ADMIN}/${SEQ_ID}/visibilities/fetch`, body: { status: true, message: 'ok', data: [RULE], meta: { total: 1 } } },
    ])
    await page.goto(`/funding/visibility-rules/${SEQ_ID}/configuration`)
    const picker = page.locator('.p-dropdown', { hasText: 'Please select a lender' }).first()
    await expect(picker).toBeVisible()

    await page.evaluate(() => {
      const w = window as any
      w.__notInitialized = 0
      w.__sidebarChanges = 0
      new MutationObserver(() => {
        if (document.body.innerText.includes('Rules Not Initialized')) w.__notInitialized++
      }).observe(document.body, { childList: true, subtree: true, characterData: true })
      const sidebar = document.querySelector('.app-menu')
      if (sidebar) {
        new MutationObserver((m) => { w.__sidebarChanges += m.length })
          .observe(sidebar, { childList: true, subtree: true, attributes: true, characterData: true })
      }
    })

    await picker.click()
    await page.locator('.p-dropdown-item', { hasText: 'Second Bank' }).click()

    await expect(page).toHaveURL(new RegExp(`/funding/visibility-rules/${SEQ_ID}/lender/62$`))
    await expect(minFico(page)).toHaveValue('')
    await page.waitForTimeout(300)
    expect(await page.evaluate(() => (window as any).__notInitialized)).toBe(0)
    expect(await page.evaluate(() => (window as any).__sidebarChanges)).toBe(0)
  })

  /**
   * Defect: every lender switch changed the URL, which re-ran the page's load
   * effect (it depended on `navigate`, renewed on each URL change): the whole
   * sequence and five lists were fetched again and the form was reset - the
   * page flashed, and an edit not yet saved on the other lender was lost.
   */
  test('switching lender loads nothing again and keeps an edit not yet saved', async ({ page }) => {
    const LENDER_B = { id: 62, name: 'Second Bank' }
    const ruleB = { ...RULE, id: 503, lender_id: 62, min_fico: 700 }
    await seedSession(page, { permissions: ['view funding', 'create funding', 'update funding'] })
    const api = await mockApi(page, [
      { method: 'GET', match: new RegExp(`${ADMIN}/${SEQ_ID}$`), body: ok({ ...SEQUENCE, lender_visibilities: [RULE, ruleB] }) },
      { method: 'GET', match: '/admin/lenders/get/all', body: ok([...LENDERS, LENDER_B]) },
      { method: 'GET', match: '/common/locations', body: ok(LOCATIONS) },
      { method: 'GET', match: '/admin/lenders/product-categories', body: ok([{ id: 1, name: 'Term Loans' }]) },
      { method: 'POST', match: `${ADMIN}/${SEQ_ID}/visibilities/fetch`, body: { status: true, message: 'ok', data: [RULE, ruleB], meta: { total: 2 } } },
    ])
    await page.goto(`/funding/visibility-rules/${SEQ_ID}/lender/61`)
    await expect(minFico(page)).toHaveValue('640')
    const sequenceLoads = () => api.calls.filter((c) => c.method === 'GET' && new RegExp(`${ADMIN}/${SEQ_ID}$`).test(c.path)).length
    const loadsBefore = sequenceLoads()

    await minFico(page).fill('655')
    await page.locator('.p-dropdown', { hasText: 'First Capital' }).first().click()
    await page.locator('.p-dropdown-item', { hasText: 'Second Bank' }).click()
    await expect(page.getByPlaceholder('640').first()).toHaveValue('700')
    await page.locator('.p-dropdown', { hasText: 'Second Bank' }).first().click()
    await page.locator('.p-dropdown-item', { hasText: 'First Capital' }).click()

    await expect(minFico(page)).toHaveValue('655')
    await page.waitForTimeout(500)
    expect(sequenceLoads()).toBe(loadsBefore)
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
