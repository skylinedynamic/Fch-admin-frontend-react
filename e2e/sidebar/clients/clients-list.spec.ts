import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, seedSession, pickPrime, type ApiMock } from '../../support/helpers'

/**
 * The borrower (client) list in depth: every filter, sorting, paging, the
 * statistics cards and how the screen differs for a partner. clients.spec.ts
 * covers the basics (rows, search, row actions, bulk actions).
 */

const LIST = '/common/borrowers/fetch-all-borrowers'

const client = (id: number, over: Record<string, unknown> = {}) => ({
  id, first_name: `First${id}`, last_name: `Last${id}`, full_name: `First${id} Last${id}`,
  business_name: `Business ${id}`, email: `client${id}@example.test`, phone_number: '(555) 000-0000',
  assign_name: 'Sam Sales', partner_name: 'Acme Funding', current_tier_name: 'Tier 1', status: 'Active', is_archived: false, ...over,
})

const page1 = Array.from({ length: 10 }, (_, i) => client(i + 1))
const STATS = { active_borrowers: 18, new_this_month: 4, total_borrowers: 25, inactive_borrowers: 7 }

const listBody = (rows: unknown[], total = rows.length) => ({
  status: true, message: 'ok', data: rows,
  meta: { total, current_page: 1, last_page: Math.ceil(total / 10), per_page: 10 },
  statistics: STATS,
})

const HOST = { permissions: ['view clients'] }
const PARTNER = { permissions: ['view clients'], is_host: 0, partner_id: 5, entity_type: 'Partner' }

async function open(page: Page, user: Record<string, unknown> = HOST, rows: unknown[] = page1, total = 25): Promise<ApiMock> {
  await seedSession(page, user)
  const api = await mockApi(page, [
    { method: 'POST', match: LIST, body: listBody(rows, total) },
    { method: 'POST', match: '/admin/partners/fetch-partners', body: ok([{ id: 5, full_name: 'Wile Coyote', company_name: 'Acme Funding' }]) },
    { method: 'POST', match: '/common/get-all-users', body: ok([{ id: 9, name: 'Sam Sales' }]) },
    { method: 'POST', match: '/common/tiers/fetch-all-tiers', body: ok([{ id: 1, name: 'Tier 0' }, { id: 2, name: 'Tier 1' }]) },
  ])
  await page.goto('/clients')
  if (rows.length) await expect(page.getByText('First1 Last1', { exact: true })).toBeVisible()
  return api
}

const lastRequest = (api: ApiMock) => api.find('POST', LIST).at(-1)!.json
const applyFilters = (page: Page) => page.locator('button.btn-warning', { hasText: 'Filters' }).click()
const dropdown = (page: Page, placeholder: string) => page.locator('.p-dropdown', { hasText: placeholder }).first()

test.describe('Borrower list - first request', () => {
  test('asks for page 1, newest first, with no filters', async ({ page }) => {
    const api = await open(page)
    expect(api.find('POST', LIST)[0].json).toMatchObject({
      search: '', partner_id: '', assigned_user_id: '', current_tier: '', status: '', is_free_trail: '', archived: '',
      page: 1, per_page: 10, sort_field: 'id', sort_order: 'desc',
    })
  })
})

test.describe('Borrower list - columns', () => {
  test('shows every column for the host, including the partner', async ({ page }) => {
    await open(page)
    for (const header of ['Full Name', 'Company Name', 'Email', 'Phone Number', 'Assigned To', 'Partner Name', 'Current Tier', 'Status']) {
      await expect(page.getByRole('columnheader', { name: new RegExp(`^${header}`) })).toBeVisible()
    }
  })

  test('renders each row value in its column', async ({ page }) => {
    await open(page)
    const row = page.locator('tr', { hasText: 'First1 Last1' }).first()
    await expect(row.getByText('Business 1')).toBeVisible()
    await expect(row.getByText('client1@example.test')).toBeVisible()
    await expect(row.getByText('Sam Sales')).toBeVisible()
    await expect(row.getByText('Acme Funding')).toBeVisible()
    await expect(row.getByText('Tier 1')).toBeVisible()
    await expect(row.getByText('Active', { exact: true })).toBeVisible()
  })

  test('falls back to first + last name when full_name is missing, and N/A for no tier', async ({ page }) => {
    await open(page, HOST, [client(1, { full_name: null, current_tier_name: null })], 1)
    const row = page.locator('tbody tr').first()
    await expect(row.getByText('First1 Last1')).toBeVisible()
    await expect(row.getByText('N/A')).toBeVisible()
  })

  test('a partner does not get the partner filter', async ({ page }) => {
    await open(page, PARTNER)
    await expect(dropdown(page, 'All Partners')).toHaveCount(0)
    await expect(dropdown(page, 'All Sales Person')).toHaveCount(1)
  })

  test('a partner never chooses the partner: the request carries no partner id and the API scopes by the token', async ({ page }) => {
    const api = await open(page, PARTNER)
    expect(api.find('POST', LIST)[0].json.partner_id).toBe('')
    // The partner list is a host-only lookup and must not even be requested.
    expect(api.find('POST', '/admin/partners/fetch-partners')).toHaveLength(0)
  })
})

test.describe('Borrower list - statistics cards', () => {
  test('show the totals from the API', async ({ page }) => {
    await open(page)
    for (const [title, value] of [['Active Clients', '18'], ['New This Month', '4'], ['Total Clients', '25'], ['Inactive Clients', '7']]) {
      const card = page.locator('.card', { hasText: title }).first()
      await expect(card).toContainText(value)
    }
  })

  test('do not change when the list is filtered', async ({ page }) => {
    const api = await open(page)
    // Same statistics come back for the narrower result, as the API scopes them to the partner, not the search.
    api.add({ method: 'POST', match: LIST, body: listBody([client(1)], 1) })
    await page.getByPlaceholder('Search here...').fill('First1')
    await applyFilters(page)
    await expect(page.locator('tbody tr')).toHaveCount(1)
    await expect(page.locator('.card', { hasText: 'Total Clients' }).first()).toContainText('25')
  })
})

test.describe('Borrower list - filters', () => {
  test('partner filter sends the partner id', async ({ page }) => {
    const api = await open(page)
    await pickPrime(page, dropdown(page, 'All Partners'), /Wile Coyote/)
    await applyFilters(page)
    await expect.poll(() => lastRequest(api).partner_id).toBe(5)
  })

  test('sales person filter sends the user id', async ({ page }) => {
    const api = await open(page)
    await pickPrime(page, dropdown(page, 'All Sales Person'), 'Sam Sales')
    await applyFilters(page)
    await expect.poll(() => lastRequest(api).assigned_user_id).toBe(9)
  })

  test('tier filter sends the tier name', async ({ page }) => {
    const api = await open(page)
    await pickPrime(page, dropdown(page, 'All Tiers'), 'Tier 0')
    await applyFilters(page)
    await expect.poll(() => lastRequest(api).current_tier).toBe('Tier 0')
  })

  test('status filter sends the status', async ({ page }) => {
    const api = await open(page)
    await pickPrime(page, dropdown(page, 'All Status'), 'Suspended')
    await applyFilters(page)
    await expect.poll(() => lastRequest(api).status).toBe('Suspended')
  })

  test('plan filter sends is_free_trail', async ({ page }) => {
    const api = await open(page)
    await pickPrime(page, dropdown(page, 'All Plans'), 'Free Plan')
    await applyFilters(page)
    await expect.poll(() => lastRequest(api).is_free_trail).toBe('1')
  })

  test('archive filter can show archived only or all records', async ({ page }) => {
    const api = await open(page)
    await pickPrime(page, dropdown(page, 'Active Only'), 'Archived Only')
    await applyFilters(page)
    await expect.poll(() => lastRequest(api).archived).toBe('1')
    await pickPrime(page, dropdown(page, 'Archived Only'), 'All Records')
    await applyFilters(page)
    await expect.poll(() => lastRequest(api).archived).toBe('all')
  })

  test('choosing a filter does nothing until Filters is pressed', async ({ page }) => {
    const api = await open(page)
    const before = api.find('POST', LIST).length
    await pickPrime(page, dropdown(page, 'All Status'), 'Inactive')
    await page.waitForTimeout(400)
    expect(api.find('POST', LIST).length).toBe(before)
  })

  test('filters combine in one request and reset the page to 1', async ({ page }) => {
    const api = await open(page)
    await page.getByPlaceholder('Search here...').fill('acme')
    await pickPrime(page, dropdown(page, 'All Status'), 'Active')
    await pickPrime(page, dropdown(page, 'All Tiers'), 'Tier 1')
    await applyFilters(page)
    await expect.poll(() => lastRequest(api).search).toBe('acme')
    expect(lastRequest(api)).toMatchObject({ search: 'acme', status: 'Active', current_tier: 'Tier 1', page: 1 })
  })

  test('pressing Enter in the search box applies the filters', async ({ page }) => {
    const api = await open(page)
    await page.getByPlaceholder('Search here...').fill('quill')
    await page.getByPlaceholder('Search here...').press('Enter')
    await expect.poll(() => lastRequest(api).search).toBe('quill')
  })

  test('Clear resets every filter and the sort order', async ({ page }) => {
    const api = await open(page)
    await page.getByPlaceholder('Search here...').fill('acme')
    await pickPrime(page, dropdown(page, 'All Status'), 'Inactive')
    await pickPrime(page, dropdown(page, 'Active Only'), 'All Records')
    await applyFilters(page)
    await expect.poll(() => lastRequest(api).status).toBe('Inactive')

    await page.locator('button', { hasText: 'Clear' }).click()

    await expect(page.getByPlaceholder('Search here...')).toHaveValue('')
    await expect.poll(() => lastRequest(api).status).toBe('')
    expect(lastRequest(api)).toMatchObject({
      search: '', partner_id: '', assigned_user_id: '', current_tier: '', status: '', is_free_trail: '', archived: '',
      page: 1, sort_field: 'id', sort_order: 'desc',
    })
  })
})

test.describe('Borrower list - sorting', () => {
  test('clicking a column header sorts ascending, then descending', async ({ page }) => {
    const api = await open(page)
    const header = page.getByRole('columnheader', { name: /^Email/ })

    await header.click()
    await expect.poll(() => lastRequest(api).sort_field).toBe('email')
    expect(lastRequest(api).sort_order).toBe('asc')

    await header.click()
    await expect.poll(() => lastRequest(api).sort_order).toBe('desc')
    expect(lastRequest(api).sort_field).toBe('email')
  })

  for (const [label, field] of [['Full Name', 'full_name'], ['Company Name', 'business_name'], ['Phone Number', 'phone_number'], ['Assigned To', 'assign_name'], ['Status', 'status']]) {
    test(`sorting by ${label} sends sort_field=${field}`, async ({ page }) => {
      const api = await open(page)
      await page.getByRole('columnheader', { name: new RegExp(`^${label}`) }).click()
      await expect.poll(() => lastRequest(api).sort_field).toBe(field)
    })
  }
})

test.describe('Borrower list - paging', () => {
  test('shows the total and moves to the next page', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: LIST, body: listBody(Array.from({ length: 10 }, (_, i) => client(i + 11)), 25) })

    await page.locator('.p-paginator-next').click()

    await expect.poll(() => lastRequest(api).page).toBe(2)
    await expect(page.getByText('First11 Last11', { exact: true })).toBeVisible()
  })

  test('jumps straight to a page number', async ({ page }) => {
    const api = await open(page)
    await page.locator('.p-paginator-page', { hasText: '3' }).click()
    await expect.poll(() => lastRequest(api).page).toBe(3)
  })

  test('changing rows per page requests that many rows', async ({ page }) => {
    const api = await open(page)
    await page.locator('.p-paginator .p-dropdown').click()
    await page.locator('.p-dropdown-panel').getByRole('option', { name: '25' }).click()
    await expect.poll(() => lastRequest(api).per_page).toBe(25)
  })

  test('the next button is disabled on a single page of results', async ({ page }) => {
    await open(page, HOST, page1.slice(0, 3), 3)
    await expect(page.locator('.p-paginator-next')).toBeDisabled()
  })

  test('applying a filter from a later page returns to page 1', async ({ page }) => {
    const api = await open(page)
    await page.locator('.p-paginator-next').click()
    await expect.poll(() => lastRequest(api).page).toBe(2)
    await page.getByPlaceholder('Search here...').fill('acme')
    await applyFilters(page)
    await expect.poll(() => lastRequest(api).search).toBe('acme')
    expect(lastRequest(api).page).toBe(1)
  })
})

test.describe('Borrower list - failure', () => {
  test('a failed request is reported and leaves an empty table', async ({ page }) => {
    test.setTimeout(90_000)
    await seedSession(page, HOST)
    await mockApi(page, [{ method: 'POST', match: LIST, status: 500, body: { status: false, message: 'Borrower list is unavailable.' } }])
    await page.goto('/clients')
    // The list query retries before it gives up, so the message takes a few seconds to appear.
    await expect(page.getByText('Borrower list is unavailable.').first()).toBeVisible({ timeout: 45_000 })
    await expect(page.getByText('No clients found')).toBeVisible()
  })

  test('an empty result shows the empty message', async ({ page }) => {
    await open(page, HOST, [], 0)
    await expect(page.getByText('No clients found')).toBeVisible()
  })
})
