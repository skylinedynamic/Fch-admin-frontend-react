import { test, expect, type Page } from '@playwright/test'
import {
  mockApi, ok, paginated, failure, seedSession, expectCall, confirmDelete, cancelDelete,
  selectRow, openActionsMenu, type ApiMock,
} from '../../support/helpers'

const CLIENTS = [
  { id: 1, first_name: 'Johnathan', last_name: 'Smithfield', full_name: 'Johnathan Smithfield', business_name: 'Smithfield Bakery LLC', email: 'john@example.test', phone_number: '(222) 222-2222', status: 'active', is_archived: false },
  { id: 2, first_name: 'Mara', last_name: 'Quill', full_name: 'Mara Quill', business_name: 'Quill Ink Co', email: 'mara@example.test', phone_number: '(333) 333-3333', status: 'active', is_archived: true },
]
const LIST = '/common/borrowers/fetch-all-borrowers'

async function openList(page: Page, permissions: string[]): Promise<ApiMock> {
  await seedSession(page, { permissions })
  const api = await mockApi(page, [{ method: 'POST', match: LIST, body: paginated(CLIENTS) }])
  await page.goto('/clients')
  await expect(page.getByText('Johnathan Smithfield')).toBeVisible()
  return api
}

test.describe('Clients list', () => {
  test('renders clients and marks archived ones', async ({ page }) => {
    await openList(page, ['view clients'])
    await expect(page.getByText('Smithfield Bakery LLC')).toBeVisible()
    await expect(page.getByText('mara@example.test')).toBeVisible()
    await expect(page.locator('tr', { hasText: 'Mara Quill' }).getByText('Archived')).toBeVisible()
  })

  test('search is sent to the API when Filters is clicked', async ({ page }) => {
    const api = await openList(page, ['view clients'])
    await page.getByPlaceholder('Search here...').fill('quill')
    await page.getByRole('button', { name: /filters/i }).click()
    await expect.poll(() => api.find('POST', LIST).at(-1)?.json.search).toBe('quill')
  })

  test('Clear resets the search', async ({ page }) => {
    const api = await openList(page, ['view clients'])
    await page.getByPlaceholder('Search here...').fill('quill')
    await page.getByRole('button', { name: /filters/i }).click()
    await expect.poll(() => api.find('POST', LIST).at(-1)?.json.search).toBe('quill')
    await page.getByRole('button', { name: /clear/i }).click()
    await expect(page.getByPlaceholder('Search here...')).toHaveValue('')
    await expect.poll(() => api.find('POST', LIST).at(-1)?.json.search).toBe('')
  })

  test('shows the empty state', async ({ page }) => {
    await seedSession(page, { permissions: ['view clients'] })
    await mockApi(page, [{ method: 'POST', match: LIST, body: paginated([]) }])
    await page.goto('/clients')
    await expect(page.getByText('No clients found')).toBeVisible()
  })

  test('clicking a row opens the client profile', async ({ page }) => {
    await openList(page, ['view clients'])
    await page.getByText('Smithfield Bakery LLC').click()
    await expect(page).toHaveURL(/\/clients\/1$/)
  })

  test('Add Client is hidden without the create permission', async ({ page }) => {
    await openList(page, ['view clients'])
    await expect(page.getByRole('button', { name: /add client/i })).toHaveCount(0)
  })

  test('Add Client opens the create page', async ({ page }) => {
    await openList(page, ['view clients', 'create clients'])
    await page.getByRole('button', { name: /add client/i }).click()
    await expect(page).toHaveURL(/\/clients\/create/)
  })

  test('a view-only user cannot select rows', async ({ page }) => {
    await openList(page, ['view clients'])
    await expect(page.locator('.p-datatable-tbody .p-checkbox')).toHaveCount(0)
  })
})

test.describe('Clients bulk actions', () => {
  test('Archive Selected posts the ids without a confirmation step', async ({ page }) => {
    const api = await openList(page, ['view clients', 'update clients'])
    api.add({ method: 'POST', match: '/common/borrowers/archive', body: ok(null, 'Client(s) archived.') })
    await selectRow(page, 0)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /archive selected/i }).click()
    const call = await expectCall(api, 'POST', '/common/borrowers/archive')
    expect(call.json).toEqual({ ids: [1] })
    await expect(page.getByText('Client(s) archived.')).toBeVisible()
  })

  test('Restore Selected posts to unarchive', async ({ page }) => {
    const api = await openList(page, ['view clients', 'update clients'])
    api.add({ method: 'POST', match: '/common/borrowers/unarchive', body: ok(null, 'Client(s) restored.') })
    await selectRow(page, 1)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /restore selected/i }).click()
    const call = await expectCall(api, 'POST', '/common/borrowers/unarchive')
    expect(call.json).toEqual({ ids: [2] })
  })

  test('update-only users do not get Delete Selected', async ({ page }) => {
    await openList(page, ['view clients', 'update clients'])
    await selectRow(page, 0)
    await openActionsMenu(page)
    await expect(page.getByRole('button', { name: /archive selected/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /delete selected/i })).toHaveCount(0)
  })

  test('delete-only users do not get archive actions', async ({ page }) => {
    await openList(page, ['view clients', 'delete clients'])
    await selectRow(page, 0)
    await openActionsMenu(page)
    await expect(page.getByRole('button', { name: /delete selected/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /archive selected/i })).toHaveCount(0)
  })

  test('Delete Selected deletes after confirmation', async ({ page }) => {
    const api = await openList(page, ['view clients', 'delete clients'])
    api.add({ method: 'POST', match: '/common/borrowers-multiple-delete', body: ok(null) })
    await selectRow(page, 0)
    await selectRow(page, 1)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await confirmDelete(page)
    const call = await expectCall(api, 'POST', '/common/borrowers-multiple-delete')
    expect(call.json).toEqual({ ids: [1, 2] })
    await expect(page.getByText('Client(s) deleted successfully.')).toBeVisible()
  })

  test('closing the confirmation cancels the delete', async ({ page }) => {
    const api = await openList(page, ['view clients', 'delete clients'])
    await selectRow(page, 0)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await cancelDelete(page)
    expect(api.find('POST', '/common/borrowers-multiple-delete')).toHaveLength(0)
  })

  test('a failed delete shows the server message', async ({ page }) => {
    const api = await openList(page, ['view clients', 'delete clients'])
    api.add({ method: 'POST', match: '/common/borrowers-multiple-delete', status: 409, body: failure('Client has an active funding application.') })
    await selectRow(page, 0)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await confirmDelete(page)
    await expect(page.getByText('Client has an active funding application.')).toBeVisible()
  })
})

test.describe('Client create', () => {
  async function openCreate(page: Page, permissions = ['view clients', 'create clients']) {
    await seedSession(page, { permissions })
    const api = await mockApi(page)
    await page.goto('/clients/create')
    await expect(page.locator('#first_name')).toBeVisible()
    return api
  }

  test('server validation errors are shown under each field, without navigating', async ({ page }) => {
    const api = await openCreate(page)
    api.add({
      method: 'POST', match: /\/common\/borrowers$/, status: 422,
      body: failure('Invalid', {
        first_name: ['The first name field is required.'],
        last_name: ['The last name field is required.'],
        email: ['The email field is required.'],
        phone_number: ['The phone number field is required.'],
      }),
    })
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText('The first name field is required.')).toBeVisible()
    await expect(page.getByText('The last name field is required.')).toBeVisible()
    await expect(page.getByText('The email field is required.')).toBeVisible()
    await expect(page.getByText('The phone number field is required.')).toBeVisible()
    await expect(page.locator('#first_name')).toHaveClass(/is-invalid/)
    await expect(page).toHaveURL(/\/clients\/create/)
  })

  test('a duplicate email is reported on the email field', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: /\/common\/borrowers$/, status: 422, body: failure('Invalid', { email: ['The email has already been taken.'] }) })
    await page.locator('#first_name').fill('New')
    await page.locator('#last_name').fill('Client')
    await page.locator('#email').fill('john@example.test')
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText('The email has already been taken.')).toBeVisible()
  })

  test('a non-validation failure is shown as a toast', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: /\/common\/borrowers$/, status: 500, body: failure('Client limit reached for your plan.') })
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText('Client limit reached for your plan.').first()).toBeVisible()
  })

  test('a valid client is posted and the new profile opens', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: /\/common\/borrowers$/, body: ok({ id: 77 }) })
    api.add({ method: 'GET', match: '/common/borrowers/77', body: ok({ ...CLIENTS[0], id: 77, first_name: 'New', last_name: 'Client' }) })
    await page.locator('#first_name').fill('New')
    await page.locator('#last_name').fill('Client')
    await page.locator('#phone_number').fill('5555555555')
    await page.locator('#email').fill('new.client@example.test')
    await page.getByRole('button', { name: /save/i }).click()
    const call = await expectCall(api, 'POST', /\/common\/borrowers$/)
    expect(call.json).toMatchObject({ first_name: 'New', last_name: 'Client', email: 'new.client@example.test' })
    await expect(page).toHaveURL(/\/clients\/77$/)
  })

  test('Back returns to the list', async ({ page }) => {
    await openCreate(page)
    await page.getByRole('link', { name: /back/i }).click()
    await expect(page).toHaveURL(/\/clients$/)
  })
})

test.describe('Client profile - edit', () => {
  async function openProfile(page: Page, permissions = ['view clients', 'update clients']) {
    await seedSession(page, { permissions })
    const api = await mockApi(page, [{ method: 'GET', match: /\/common\/borrowers\/1$/, body: ok(CLIENTS[0]) }])
    await page.goto('/clients/1')
    await expect(page.locator('#first_name')).toHaveValue('Johnathan')
    return api
  }

  test('loads the client into the personal form', async ({ page }) => {
    await openProfile(page)
    await expect(page.locator('#last_name')).toHaveValue('Smithfield')
    await expect(page.locator('#email')).toHaveValue('john@example.test')
  })

  test('Update posts the edited personal details', async ({ page }) => {
    const api = await openProfile(page)
    api.add({ method: 'POST', match: /\/common\/borrowers\/1$/, body: ok({ ...CLIENTS[0], first_name: 'Jon' }) })
    await page.locator('#first_name').fill('Jon')
    await page.getByRole('button', { name: /update/i }).click()
    const call = await expectCall(api, 'POST', /\/common\/borrowers\/1$/)
    expect(call.json).toMatchObject({ first_name: 'Jon', last_name: 'Smithfield' })
    await expect(page.getByText('Client personal details updated successfully')).toBeVisible()
  })

  test('422 errors on update are rendered inline', async ({ page }) => {
    const api = await openProfile(page)
    api.add({ method: 'POST', match: /\/common\/borrowers\/1$/, status: 422, body: failure('Invalid', { last_name: ['The last name field is required.'] }) })
    await page.locator('#last_name').fill('')
    await page.getByRole('button', { name: /update/i }).click()
    await expect(page.getByText('The last name field is required.')).toBeVisible()
    await expect(page.locator('#last_name')).toHaveClass(/is-invalid/)
  })

  test('a server failure on update is toasted', async ({ page }) => {
    const api = await openProfile(page)
    api.add({ method: 'POST', match: /\/common\/borrowers\/1$/, status: 500, body: failure('Server exploded.') })
    await page.getByRole('button', { name: /update/i }).click()
    await expect(page.getByText('Server exploded.').first()).toBeVisible()
  })

  test('the header Update button is hidden for view-only users', async ({ page }) => {
    await openProfile(page, ['view clients'])
    await expect(page.locator('.btn.btn-primary.w-lg', { hasText: 'Update' })).toHaveCount(0)
  })
})
