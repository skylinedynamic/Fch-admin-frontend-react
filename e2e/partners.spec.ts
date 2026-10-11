import { test, expect, type Page } from '@playwright/test'
import {
  mockApi, ok, paginated, failure, seedSession, expectCall, confirmDelete, cancelDelete,
  selectRow, openActionsMenu, type ApiMock,
} from './helpers'

const PARTNERS = [
  { id: 5, company_name: 'Acme Funding', full_name: 'Wile Coyote', email: 'wile@acme.test', phone_number: '(444) 444-4444', contact_person: 'Road Runner', partner_type: 'White Label', status: 'active', is_archived: false },
  { id: 6, company_name: 'Globex Capital', full_name: 'Hank Scorpio', email: 'hank@globex.test', phone_number: '(555) 555-5555', contact_person: 'Homer', partner_type: 'Certified', status: 'inactive', is_archived: true },
]
const LIST = '/admin/partners/fetch-partners'

async function openList(page: Page, permissions: string[]): Promise<ApiMock> {
  await seedSession(page, { permissions })
  const api = await mockApi(page, [{ method: 'POST', match: LIST, body: paginated(PARTNERS) }])
  await page.goto('/partners')
  await expect(page.getByText('Acme Funding')).toBeVisible()
  return api
}

test.describe('Partners list', () => {
  test('renders partners from the API', async ({ page }) => {
    await openList(page, ['view partners'])
    await expect(page.getByText('Globex Capital')).toBeVisible()
    await expect(page.getByText('wile@acme.test')).toBeVisible()
    await expect(page.locator('tr', { hasText: 'Globex Capital' }).getByText('Archived')).toBeVisible()
  })

  test('search is applied through the Filters button', async ({ page }) => {
    const api = await openList(page, ['view partners'])
    await page.getByPlaceholder('Search here...').fill('globex')
    await page.getByRole('button', { name: /filters/i }).click()
    await expect.poll(() => api.find('POST', LIST).at(-1)?.json.search).toBe('globex')
  })

  test('Clear empties the search box', async ({ page }) => {
    await openList(page, ['view partners'])
    await page.getByPlaceholder('Search here...').fill('globex')
    await page.getByRole('button', { name: /clear/i }).click()
    await expect(page.getByPlaceholder('Search here...')).toHaveValue('')
  })

  test('shows the empty state', async ({ page }) => {
    await seedSession(page, { permissions: ['view partners'] })
    await mockApi(page, [{ method: 'POST', match: LIST, body: paginated([]) }])
    await page.goto('/partners')
    await expect(page.getByText('No partners found')).toBeVisible()
  })

  test('a failed list request is reported', async ({ page }) => {
    await seedSession(page, { permissions: ['view partners'] })
    await mockApi(page, [{ method: 'POST', match: LIST, body: failure('Partners are unavailable.') }])
    await page.goto('/partners')
    await expect(page.getByText('Partners are unavailable.').first()).toBeVisible()
  })

  test('clicking a row opens the partner profile', async ({ page }) => {
    await openList(page, ['view partners'])
    await page.getByText('wile@acme.test').click()
    await expect(page).toHaveURL(/\/partners\/5$/)
  })

  test('Add Partner needs the create permission', async ({ page }) => {
    await openList(page, ['view partners'])
    await expect(page.getByRole('button', { name: /add partner/i })).toHaveCount(0)
  })

  test('Add Partner opens the create page', async ({ page }) => {
    await openList(page, ['view partners', 'create partners'])
    await page.getByRole('button', { name: /add partner/i }).click()
    await expect(page).toHaveURL(/\/partners\/create/)
  })

  test('view-only users cannot select rows', async ({ page }) => {
    await openList(page, ['view partners'])
    await expect(page.locator('.p-datatable-tbody .p-checkbox')).toHaveCount(0)
  })
})

test.describe('Partners bulk actions', () => {
  test('Archive Selected posts the selected ids', async ({ page }) => {
    const api = await openList(page, ['view partners', 'update partners'])
    api.add({ method: 'POST', match: '/admin/partners/archive', body: ok(null, 'Partner(s) archived.') })
    await selectRow(page, 0)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /archive selected/i }).click()
    const call = await expectCall(api, 'POST', '/admin/partners/archive')
    expect(call.json).toEqual({ ids: [5] })
    await expect(page.getByText('Partner(s) archived.')).toBeVisible()
  })

  test('Restore Selected posts to unarchive', async ({ page }) => {
    const api = await openList(page, ['view partners', 'update partners'])
    api.add({ method: 'POST', match: '/admin/partners/unarchive', body: ok(null, 'Partner(s) restored.') })
    await selectRow(page, 1)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /restore selected/i }).click()
    const call = await expectCall(api, 'POST', '/admin/partners/unarchive')
    expect(call.json).toEqual({ ids: [6] })
  })

  test('a failed archive shows the server message', async ({ page }) => {
    const api = await openList(page, ['view partners', 'update partners'])
    api.add({ method: 'POST', match: '/admin/partners/archive', status: 422, body: failure('Partner has active borrowers.') })
    await selectRow(page, 0)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /archive selected/i }).click()
    await expect(page.getByText('Partner has active borrowers.').first()).toBeVisible()
  })

  test('Delete Selected is only offered with the delete permission', async ({ page }) => {
    await openList(page, ['view partners', 'update partners'])
    await selectRow(page, 0)
    await openActionsMenu(page)
    await expect(page.getByRole('button', { name: /delete selected/i })).toHaveCount(0)
  })

  test('Delete Selected deletes after confirmation', async ({ page }) => {
    const api = await openList(page, ['view partners', 'delete partners'])
    api.add({ method: 'POST', match: '/admin/partners/multiple-delete', body: ok(null) })
    await selectRow(page, 0)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await confirmDelete(page)
    const call = await expectCall(api, 'POST', '/admin/partners/multiple-delete')
    expect(call.json).toEqual({ ids: [5] })
    await expect(page.getByText('Partners deleted successfully')).toBeVisible()
  })

  test('closing the confirmation cancels the delete', async ({ page }) => {
    const api = await openList(page, ['view partners', 'delete partners'])
    await selectRow(page, 0)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await cancelDelete(page)
    expect(api.find('POST', '/admin/partners/multiple-delete')).toHaveLength(0)
  })
})

test.describe('Partner create', () => {
  const CREATE = /\/admin\/partners$/

  async function openCreate(page: Page) {
    await seedSession(page, { permissions: ['view partners', 'create partners'] })
    const api = await mockApi(page)
    await page.goto('/partners/create')
    await expect(page.getByPlaceholder('Enter full name')).toBeVisible()
    return api
  }

  test('server validation errors mark the fields and keep the user on the form', async ({ page }) => {
    const api = await openCreate(page)
    api.add({
      method: 'POST', match: CREATE, status: 422,
      body: failure('Invalid', { full_name: ['The full name field is required.'], email: ['The email field is required.'] }),
    })
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText('The email field is required.')).toBeVisible()
    await expect(page.getByPlaceholder('Enter full name')).toHaveClass(/is-invalid/)
    await expect(page).toHaveURL(/\/partners\/create/)
  })

  test('a general failure is shown as a toast', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: CREATE, status: 500, body: failure('Partner quota exceeded.') })
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText('Partner quota exceeded.').first()).toBeVisible()
  })

  test('the entered details are posted and success is confirmed', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: CREATE, body: ok({ id: 42 }) })
    await page.getByPlaceholder('Enter full name').fill('Peter Partner')
    await page.getByPlaceholder('Enter company name').fill('Partner Co')
    await page.getByPlaceholder('Enter email address').fill('peter@partner.test')
    await page.getByRole('button', { name: /save/i }).click()
    const call = await expectCall(api, 'POST', CREATE)
    expect(call.body).toContain('Peter Partner')
    expect(call.body).toContain('peter@partner.test')
    await expect(page.getByText('Partner created successfully')).toBeVisible()
  })

  test('Back returns to the list', async ({ page }) => {
    await openCreate(page)
    await page.getByRole('link', { name: /back/i }).click()
    await expect(page).toHaveURL(/\/partners$/)
  })
})

test.describe('Partner create - access', () => {
  test('the create page is blocked without the create permission', async ({ page }) => {
    await seedSession(page, { permissions: ['view partners'] })
    await mockApi(page)
    await page.goto('/partners/create')
    await expect(page).toHaveURL(/access-denied/)
  })
})
