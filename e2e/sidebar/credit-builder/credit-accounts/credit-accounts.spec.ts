import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, paginated, failure, seedSession, expectCall, type ApiMock } from '../../../support/helpers'

const BASE = '/admin/credit-builder/credit-accounts'
const ACCOUNTS = [
  { id: 71, card_name: 'Ink Business Cash', issuer: 'Chase', credit_category: 'Business Card', typical_personal_fico_min: 680, time_in_business_min_months: 6, status: 'Active', can_delete: true },
  { id: 72, card_name: 'Spark Classic', issuer: 'Capital One', credit_category: 'Business Card', typical_personal_fico_min: 640, time_in_business_min_months: 0, status: 'Inactive', can_delete: true },
]
// A card a borrower has applied for: kept, so it cannot be selected for deletion.
const APPLIED = { id: 73, card_name: 'Applied Card', issuer: 'Amex', credit_category: 'Business Card', typical_personal_fico_min: 700, time_in_business_min_months: 12, status: 'Active', can_delete: false }
const ALL = ['create credit accounts', 'update credit accounts', 'delete credit accounts']

async function openList(page: Page, permissions: string[] = ALL, rows: object[] = ACCOUNTS): Promise<ApiMock> {
  await seedSession(page, { permissions })
  const api = await mockApi(page, [{ method: 'POST', match: `${BASE}/fetch-accounts`, body: paginated(rows) }])
  await page.goto('/credit-accounts')
  await expect(page.getByRole('link', { name: 'Ink Business Cash' })).toBeVisible()
  return api
}

test.describe('Credit accounts list', () => {
  test('loads id desc, and the first header click asks for ascending (BUG-010)', async ({ page }) => {
    const api = await openList(page)
    expect(api.find('POST', `${BASE}/fetch-accounts`)[0].json).toMatchObject({ sort_field: 'id', sort_order: 'desc' })

    await page.getByRole('columnheader', { name: /^Name/ }).locator('.p-column-title').click()
    await expect.poll(() => api.find('POST', `${BASE}/fetch-accounts`).at(-1)?.json).toMatchObject({ sort_field: 'card_name', sort_order: 'asc' })
  })

  // BUG-007: the empty table said "No available options".
  test('an empty result shows a proper empty message', async ({ page }) => {
    await seedSession(page, { permissions: ALL })
    await mockApi(page, [{ method: 'POST', match: `${BASE}/fetch-accounts`, body: paginated([]) }])
    await page.goto('/credit-accounts')
    await expect(page.getByText('No credit accounts found')).toBeVisible()
    await expect(page.getByText('No available options')).toHaveCount(0)
  })

  test('renders accounts with issuer and status', async ({ page }) => {
    await openList(page)
    await expect(page.getByRole('link', { name: 'Spark Classic' })).toBeVisible()
    await expect(page.getByText('Capital One')).toBeVisible()
    await expect(page.locator('tr', { hasText: 'Spark Classic' }).getByText('Inactive')).toBeVisible()
  })

  test('search is sent to the API', async ({ page }) => {
    const api = await openList(page)
    await page.getByPlaceholder('Search here...').fill('spark')
    await page.getByRole('button', { name: /filters/i }).click()
    await expect.poll(() => api.find('POST', `${BASE}/fetch-accounts`).at(-1)?.json.search).toBe('spark')
  })

  test('Clear empties the search box', async ({ page }) => {
    await openList(page)
    await page.getByPlaceholder('Search here...').fill('spark')
    await page.getByRole('button', { name: /clear/i }).click()
    await expect(page.getByPlaceholder('Search here...')).toHaveValue('')
  })

  test('the name links to the edit page', async ({ page }) => {
    await openList(page)
    await page.getByRole('link', { name: 'Ink Business Cash' }).click()
    await expect(page).toHaveURL(/\/credit-accounts\/71$/)
  })

  test('Add Account needs the create permission', async ({ page }) => {
    await openList(page, [])
    await expect(page.getByRole('link', { name: /add account/i })).toHaveCount(0)
  })

  test('Add Account opens the create page', async ({ page }) => {
    await openList(page)
    await page.getByRole('link', { name: /add account/i }).click()
    await expect(page).toHaveURL(/\/credit-accounts\/create/)
  })

  // BUG-042: status is set on the details page; the list's badge is a label.
  test('the status badge is a label - clicking it changes nothing', async ({ page }) => {
    const api = await openList(page)
    const badge = page.locator('tr', { hasText: 'Ink Business Cash' }).getByText('Active', { exact: true })
    await expect(badge).not.toHaveAttribute('title', /.+/)
    await badge.click()
    await page.waitForTimeout(300)
    expect(api.find('PATCH', '/status')).toHaveLength(0)
  })

  // BUG-042: cards are deleted from the list, several at once.
  const rowCheckbox = (page: Page, name: string) => page.locator('tr', { hasText: name }).locator('.p-checkbox').first()

  test('the selected cards are deleted together, then the list reloads', async ({ page }) => {
    const api = await openList(page)
    api.add({ method: 'POST', match: `${BASE}/multiple-delete`, body: ok({ deleted: 2 }, 'Credit accounts deleted successfully.') })
    await rowCheckbox(page, 'Ink Business Cash').click()
    await rowCheckbox(page, 'Spark Classic').click()
    const loadsBefore = api.find('POST', `${BASE}/fetch-accounts`).length

    // As on the other lists: once rows are checked, Actions replaces Add Account.
    await expect(page.getByRole('link', { name: /add account/i })).toHaveCount(0)
    await page.locator('.btn-group .dropdown-toggle-split').click()
    await page.getByRole('button', { name: /delete selected/i }).click()
    await page.getByRole('button', { name: /yes, delete it/i }).click()

    const call = await expectCall(api, 'POST', `${BASE}/multiple-delete`)
    expect(call.json).toEqual({ ids: [71, 72] })
    await expect(page.getByText('Credit accounts deleted successfully.')).toBeVisible()
    await expect.poll(() => api.find('POST', `${BASE}/fetch-accounts`).length).toBeGreaterThan(loadsBefore)
  })

  const deleteSelected = async (page: Page) => {
    await page.locator('.btn-group .dropdown-toggle-split').click()
    await page.getByRole('button', { name: /delete selected/i }).click()
  }

  test('Delete Selected with a card a borrower applied for says it cannot be deleted', async ({ page }) => {
    const api = await openList(page, ALL, [...ACCOUNTS, APPLIED])
    await rowCheckbox(page, 'Ink Business Cash').click()
    await rowCheckbox(page, 'Applied Card').click()
    await deleteSelected(page)

    const blocked = page.getByRole('dialog', { name: /cannot be deleted/i })
    await expect(blocked).toContainText('Applied Card')
    await expect(blocked).toContainText(/inactive/i)
    await expect(page.getByRole('button', { name: /yes, delete it/i })).toHaveCount(0)
    expect(api.find('POST', `${BASE}/multiple-delete`)).toHaveLength(0)
  })

  test('Open card on that message goes to the card, to switch it to Inactive', async ({ page }) => {
    const api = await openList(page, ALL, [...ACCOUNTS, APPLIED])
    api.add({ method: 'GET', match: new RegExp(`${BASE}/73$`), body: ok(APPLIED) })
    await rowCheckbox(page, 'Applied Card').click()
    await deleteSelected(page)

    await page.getByRole('dialog', { name: /cannot be deleted/i }).getByRole('button', { name: /open card/i }).click()

    await expect(page).toHaveURL(new RegExp('/credit-accounts/73$'))
    await expect(page.locator('#card_name')).toHaveValue('Applied Card')
  })

  test('a delete refused because a borrower applied names the card', async ({ page }) => {
    const api = await openList(page)
    api.add({
      method: 'POST', match: `${BASE}/multiple-delete`, status: 422,
      body: { status: false, message: 'This card has borrower applications.', errors: { applied: [{ id: 71, name: 'Ink Business Cash' }] } },
    })
    await rowCheckbox(page, 'Ink Business Cash').click()
    await page.locator('.btn-group .dropdown-toggle-split').click()
    await page.getByRole('button', { name: /delete selected/i }).click()
    await page.getByRole('button', { name: /yes, delete it/i }).click()

    const blocked = page.getByRole('dialog', { name: /cannot be deleted/i })
    await expect(blocked).toContainText('Ink Business Cash')
  })

  test('without the delete permission there are no checkboxes', async ({ page }) => {
    await openList(page, ['update credit accounts'])
    await expect(page.locator('tr', { hasText: 'Ink Business Cash' }).locator('.p-checkbox')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /delete selected/i })).toHaveCount(0)
  })

  test('non-host users cannot reach credit accounts', async ({ page }) => {
    await seedSession(page, { permissions: ALL, is_host: 0, partner_id: 2 })
    await mockApi(page)
    await page.goto('/credit-accounts')
    await expect(page).not.toHaveURL(/\/credit-accounts/)
  })
})

test.describe('Credit account create', () => {
  const CREATE = new RegExp(`${BASE}$`)

  async function openCreate(page: Page) {
    await seedSession(page, { permissions: ALL })
    const api = await mockApi(page)
    await page.goto('/credit-accounts/create')
    await expect(page.locator('#card_name')).toBeVisible()
    return api
  }

  test('server validation errors mark the fields', async ({ page }) => {
    const api = await openCreate(page)
    api.add({
      method: 'POST', match: CREATE, status: 422,
      body: failure('Invalid', { card_name: ['The card name field is required.'], issuer: ['The issuer field is required.'] }),
    })
    await page.getByRole('button', { name: /create account/i }).click()
    await expect(page.locator('#card_name')).toHaveClass(/is-invalid/)
    await expect(page.locator('#issuer')).toHaveClass(/is-invalid/)
    await expect(page).toHaveURL(/\/credit-accounts\/create/)
  })

  test('a malformed reference URL is blocked by the browser before any request', async ({ page }) => {
    const api = await openCreate(page)
    await page.locator('#card_name').fill('Test Card')
    await page.locator('#reference_url').fill('not a url')
    await page.getByRole('button', { name: /create account/i }).click()
    await page.waitForTimeout(300)
    expect(api.find('POST', CREATE)).toHaveLength(0)
    expect(await page.locator('#reference_url').evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(false)
  })

  test('a valid account is posted and the list opens', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: CREATE, body: ok({ id: 80 }) })
    await page.locator('#card_name').fill('Test Card')
    await page.locator('#issuer').fill('Test Bank')
    await page.locator('#reference_url').fill('https://example.test/card')
    await page.locator('input[name="typical_personal_fico_min"]').fill('700')
    await page.getByRole('button', { name: /create account/i }).click()
    const call = await expectCall(api, 'POST', CREATE)
    expect(call.json).toMatchObject({ card_name: 'Test Card', issuer: 'Test Bank', reference_url: 'https://example.test/card', typical_personal_fico_min: '700' })
    await expect(page.getByText('Credit Account created successfully')).toBeVisible()
    await expect(page).toHaveURL(/\/credit-accounts$/)
  })

  test('a general failure is toasted', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: CREATE, status: 500, body: failure('Credit catalogue is read-only.') })
    await page.getByRole('button', { name: /create account/i }).click()
    await expect(page.getByText('Credit catalogue is read-only.').first()).toBeVisible()
  })

  test('Back returns to the list', async ({ page }) => {
    await openCreate(page)
    await page.getByRole('link', { name: /back/i }).click()
    await expect(page).toHaveURL(/\/credit-accounts$/)
  })

  test('the save button is hidden without create/update permissions', async ({ page }) => {
    await seedSession(page, { permissions: [] })
    await mockApi(page)
    await page.goto('/credit-accounts/create')
    await expect(page.locator('#card_name')).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toHaveCount(0)
  })
})

test.describe('Credit account edit', () => {
  async function openEdit(page: Page) {
    await seedSession(page, { permissions: ALL })
    const api = await mockApi(page, [{ method: 'GET', match: new RegExp(`${BASE}/71$`), body: ok(ACCOUNTS[0]) }])
    await page.goto('/credit-accounts/71')
    await expect(page.locator('#card_name')).toHaveValue('Ink Business Cash')
    return api
  }

  test('loads the account into the form', async ({ page }) => {
    await openEdit(page)
    await expect(page.locator('#issuer')).toHaveValue('Chase')
    await expect(page.locator('input[name="typical_personal_fico_min"]')).toHaveValue('680')
  })

  test('Save Changes PUTs the update', async ({ page }) => {
    const api = await openEdit(page)
    api.add({ method: 'PUT', match: new RegExp(`${BASE}/71$`), body: ok(ACCOUNTS[0]) })
    await page.locator('#issuer').fill('JPMorgan Chase')
    await page.getByRole('button', { name: /save changes/i }).click()
    const call = await expectCall(api, 'PUT', new RegExp(`${BASE}/71$`))
    expect(call.json).toMatchObject({ card_name: 'Ink Business Cash', issuer: 'JPMorgan Chase' })
    await expect(page.getByText('Credit Account updated successfully')).toBeVisible()
    await expect(page).toHaveURL(/\/credit-accounts$/)
  })

  // BUG-042: status is set here.
  test('the status is changed on the details page', async ({ page }) => {
    const api = await openEdit(page)
    api.add({ method: 'PUT', match: new RegExp(`${BASE}/71$`), body: ok({ ...ACCOUNTS[0], status: 'Inactive' }) })
    const status = page.getByRole('switch', { name: 'Active' })
    await expect(status).toBeChecked()
    await status.click()
    await expect(status).not.toBeChecked()
    await expect(page.getByText(/no longer offered to borrowers/i)).toBeVisible()

    await page.getByRole('button', { name: /save changes/i }).click()
    const call = await expectCall(api, 'PUT', new RegExp(`${BASE}/71$`))
    expect(call.json).toMatchObject({ status: 'Inactive' })
  })

  test('an account that fails to load returns to the list', async ({ page }) => {
    await seedSession(page, { permissions: ALL })
    await mockApi(page, [{ method: 'GET', match: `${BASE}/999`, status: 404, body: failure('Not found') }])
    await page.goto('/credit-accounts/999')
    await expect(page.getByText('Failed to load account details').first()).toBeVisible()
    await expect(page).toHaveURL(/\/credit-accounts$/)
  })
})
