import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, paginated, failure, seedSession, expectCall, type ApiMock } from './helpers'

const BASE = '/admin/credit-builder/credit-accounts'
const ACCOUNTS = [
  { id: 71, card_name: 'Ink Business Cash', issuer: 'Chase', credit_category: 'Business Card', typical_personal_fico_min: 680, time_in_business_min_months: 6, status: 'Active' },
  { id: 72, card_name: 'Spark Classic', issuer: 'Capital One', credit_category: 'Business Card', typical_personal_fico_min: 640, time_in_business_min_months: 0, status: 'Inactive' },
]
const ALL = ['create credit accounts', 'update credit accounts', 'delete credit accounts']

async function openList(page: Page, permissions: string[] = ALL): Promise<ApiMock> {
  await seedSession(page, { permissions })
  const api = await mockApi(page, [{ method: 'POST', match: `${BASE}/fetch-accounts`, body: paginated(ACCOUNTS) }])
  await page.goto('/credit-accounts')
  await expect(page.getByRole('link', { name: 'Ink Business Cash' })).toBeVisible()
  return api
}

test.describe('Credit accounts list', () => {
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

  test('clicking the status badge toggles the status', async ({ page }) => {
    const api = await openList(page)
    api.add({ method: 'PATCH', match: `${BASE}/71/status`, body: ok({ ...ACCOUNTS[0], status: 'Inactive' }) })
    await page.locator('tr', { hasText: 'Ink Business Cash' }).getByTitle('Click to change status').click()
    const call = await expectCall(api, 'PATCH', `${BASE}/71/status`)
    expect(call.json).toEqual({ status: 'Inactive' })
    await expect(page.getByText('Status updated to Inactive')).toBeVisible()
  })

  test('an inactive account toggles back to Active', async ({ page }) => {
    const api = await openList(page)
    api.add({ method: 'PATCH', match: `${BASE}/72/status`, body: ok(ACCOUNTS[1]) })
    await page.locator('tr', { hasText: 'Spark Classic' }).getByTitle('Click to change status').click()
    const call = await expectCall(api, 'PATCH', `${BASE}/72/status`)
    expect(call.json).toEqual({ status: 'Active' })
  })

  test('a failed status change is reported', async ({ page }) => {
    const api = await openList(page)
    api.add({ method: 'PATCH', match: `${BASE}/71/status`, status: 500, body: failure('boom') })
    await page.locator('tr', { hasText: 'Ink Business Cash' }).getByTitle('Click to change status').click()
    await expect(page.getByText('Failed to update status')).toBeVisible()
  })

  test('the status badge is inert without the update permission', async ({ page }) => {
    const api = await openList(page, [])
    await page.locator('tr', { hasText: 'Ink Business Cash' }).getByText('Active', { exact: true }).click()
    await page.waitForTimeout(300)
    expect(api.find('PATCH', '/status')).toHaveLength(0)
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

  test('an account that fails to load returns to the list', async ({ page }) => {
    await seedSession(page, { permissions: ALL })
    await mockApi(page, [{ method: 'GET', match: `${BASE}/999`, status: 404, body: failure('Not found') }])
    await page.goto('/credit-accounts/999')
    await expect(page.getByText('Failed to load account details')).toBeVisible()
    await expect(page).toHaveURL(/\/credit-accounts$/)
  })
})
