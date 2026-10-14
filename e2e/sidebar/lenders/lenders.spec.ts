import { test, expect, type Page } from '@playwright/test'
import {
  mockApi, ok, paginated, failure, seedSession, expectCall, confirmDelete, cancelDelete,
  selectRow, openActionsMenu, type ApiMock,
} from '../../support/helpers'

const CATEGORIES = [{ id: 1, name: 'Term Loans' }, { id: 2, name: 'Lines of Credit' }]
const LENDERS = [
  { id: 61, name: 'First Capital', legal_name: 'First Capital LLC', product_categories: [1], contact_name: 'Fay First', contact_phone: '(555) 600-0001', iso_status: 'Approved', status: 'Active' },
  { id: 62, name: 'Second Street', legal_name: 'Second Street Inc', product_categories: [2], contact_name: 'Sam Second', contact_phone: '(555) 600-0002', iso_status: 'Pending', status: 'Inactive' },
]

function handlers() {
  return [
    { method: 'GET', match: /\/admin\/lenders(\?|$)/, body: paginated(LENDERS) },
    { method: 'GET', match: '/admin/lenders/product-categories', body: ok(CATEGORIES) },
  ]
}

async function openList(page: Page, permissions: string[] = ['delete lenders']): Promise<ApiMock> {
  await seedSession(page, { permissions })
  const api = await mockApi(page, handlers())
  await page.goto('/lenders')
  await expect(page.getByText('First Capital', { exact: true })).toBeVisible()
  return api
}

test.describe('Lenders list', () => {
  test('renders lenders with their status', async ({ page }) => {
    await openList(page)
    await expect(page.getByText('Second Street', { exact: true })).toBeVisible()
    await expect(page.getByText('First Capital LLC')).toBeVisible()
    await expect(page.locator('tr', { hasText: 'Second Street' }).getByText('Inactive')).toBeVisible()
  })

  test('search is sent as a query parameter', async ({ page }) => {
    const api = await openList(page)
    await page.getByPlaceholder('Search lenders...').fill('second')
    await page.getByRole('button', { name: /filters/i }).click()
    await expect.poll(() => api.find('GET', /\/admin\/lenders\?/).at(-1)?.path ?? '').toContain('search=second')
  })

  test('Clear empties the search box', async ({ page }) => {
    await openList(page)
    await page.getByPlaceholder('Search lenders...').fill('second')
    await page.getByRole('button', { name: /clear/i }).click()
    await expect(page.getByPlaceholder('Search lenders...')).toHaveValue('')
  })

  test('shows the empty state', async ({ page }) => {
    await seedSession(page)
    await mockApi(page, [{ method: 'GET', match: /\/admin\/lenders(\?|$)/, body: paginated([]) }])
    await page.goto('/lenders')
    await expect(page.getByText('No lenders found')).toBeVisible()
  })

  test('a failed load is reported', async ({ page }) => {
    await seedSession(page)
    await mockApi(page, [{ method: 'GET', match: /\/admin\/lenders(\?|$)/, status: 500, body: failure('boom') }])
    await page.goto('/lenders')
    await expect(page.getByText('Failed to load lenders').first()).toBeVisible()
  })

  test('clicking a row opens the lender', async ({ page }) => {
    await openList(page)
    await page.getByText('First Capital LLC').click()
    await expect(page).toHaveURL(/\/lenders\/61$/)
  })

  test('Add Lender opens the create page', async ({ page }) => {
    await openList(page)
    await page.getByRole('button', { name: /add lender/i }).click()
    await expect(page).toHaveURL(/\/lenders\/create/)
  })

  test('non-host users are redirected away from lenders', async ({ page }) => {
    await seedSession(page, { is_host: 0, partner_id: 3 })
    await mockApi(page, handlers())
    await page.goto('/lenders')
    await expect(page).not.toHaveURL(/\/lenders/)
  })
})

test.describe('Lenders bulk delete', () => {
  test('deletes every selected lender after confirmation', async ({ page }) => {
    const api = await openList(page)
    api.add({ method: 'DELETE', match: /\/admin\/lenders\/\d+$/, body: ok(null) })
    await selectRow(page, 0)
    await selectRow(page, 1)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await confirmDelete(page)
    await expect(page.getByText('Selected lenders deleted successfully')).toBeVisible()
    expect(api.find('DELETE', /\/admin\/lenders\/\d+$/).map((c) => c.path).sort()).toEqual(['/admin/lenders/61', '/admin/lenders/62'])
  })

  test('closing the confirmation cancels the delete', async ({ page }) => {
    const api = await openList(page)
    await selectRow(page, 0)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await cancelDelete(page)
    expect(api.find('DELETE', /\/admin\/lenders\//)).toHaveLength(0)
  })

  test('a failed delete shows the server message', async ({ page }) => {
    const api = await openList(page)
    api.add({ method: 'DELETE', match: /\/admin\/lenders\/\d+$/, status: 409, body: failure('Lender is used by a funding sequence.') })
    await selectRow(page, 0)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await confirmDelete(page)
    await expect(page.getByText('Lender is used by a funding sequence.').first()).toBeVisible()
  })
})

test.describe('Lender create', () => {
  const CREATE = /\/admin\/lenders$/

  async function openCreate(page: Page) {
    await seedSession(page)
    const api = await mockApi(page, handlers())
    await page.goto('/lenders/create')
    await expect(page.getByPlaceholder('Enter lender name')).toBeVisible()
    return api
  }

  test('server validation errors are shown under the fields', async ({ page }) => {
    const api = await openCreate(page)
    api.add({
      method: 'POST', match: CREATE, status: 422,
      body: failure('Invalid', {
        name: ['The lender name field is required.'],
        legal_name: ['The legal name field is required.'],
        product_categories: ['Select at least one product category.'],
      }),
    })
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText('The lender name field is required.')).toBeVisible()
    await expect(page.getByText('The legal name field is required.')).toBeVisible()
    await expect(page.getByText('Select at least one product category.')).toBeVisible()
    await expect(page).toHaveURL(/\/lenders\/create/)
  })

  test('empty fields are sent as null, filled ones as typed', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: CREATE, body: ok({ id: 70 }) })
    await page.getByPlaceholder('Enter lender name').fill('Third Bank')
    await page.getByPlaceholder('Enter legal name').fill('Third Bank NA')
    await page.getByPlaceholder('Enter contact name').fill('Tia Third')
    await page.getByRole('button', { name: /save/i }).click()
    const call = await expectCall(api, 'POST', CREATE)
    expect(call.json).toMatchObject({ name: 'Third Bank', legal_name: 'Third Bank NA', contact_name: 'Tia Third' })
    expect(call.json.contact_email).toBeNull()
    await expect(page.getByText('Lender created successfully')).toBeVisible()
    await expect(page).toHaveURL(/\/lenders$/)
  })

  test('a general failure is toasted', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: CREATE, status: 500, body: failure('Lender service is down.') })
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText('Lender service is down.').first()).toBeVisible()
  })

  test('Back returns to the list', async ({ page }) => {
    await openCreate(page)
    await page.getByRole('button', { name: /back/i }).click()
    await expect(page).toHaveURL(/\/lenders$/)
  })
})

test.describe('Lender edit', () => {
  async function openEdit(page: Page) {
    await seedSession(page)
    const api = await mockApi(page, [...handlers(), { method: 'GET', match: /\/admin\/lenders\/61$/, body: ok(LENDERS[0]) }])
    await page.goto('/lenders/61')
    await expect(page.getByPlaceholder('Enter lender name')).toHaveValue('First Capital')
    return api
  }

  test('loads the lender into the form', async ({ page }) => {
    await openEdit(page)
    await expect(page.getByPlaceholder('Enter legal name')).toHaveValue('First Capital LLC')
    await expect(page.getByPlaceholder('Enter contact name')).toHaveValue('Fay First')
  })

  test('Update PUTs the changes and returns to the list', async ({ page }) => {
    const api = await openEdit(page)
    api.add({ method: 'PUT', match: /\/admin\/lenders\/61$/, body: ok(LENDERS[0]) })
    await page.getByPlaceholder('Enter contact name').fill('Fay Renamed')
    await page.getByRole('button', { name: /update/i }).click()
    const call = await expectCall(api, 'PUT', /\/admin\/lenders\/61$/)
    expect(call.json).toMatchObject({ name: 'First Capital', contact_name: 'Fay Renamed' })
    await expect(page.getByText('Lender updated successfully')).toBeVisible()
    await expect(page).toHaveURL(/\/lenders$/)
  })

  test('a lender that fails to load sends the user back to the list', async ({ page }) => {
    await seedSession(page)
    await mockApi(page, [...handlers(), { method: 'GET', match: /\/admin\/lenders\/999$/, status: 404, body: failure('Not found') }])
    await page.goto('/lenders/999')
    await expect(page.getByText('Failed to load lender details').first()).toBeVisible()
    await expect(page).toHaveURL(/\/lenders$/)
  })
})

test.describe('Lender product categories', () => {
  const CATS = '/admin/lenders/product-categories'

  async function openModal(page: Page) {
    await seedSession(page)
    const api = await mockApi(page, handlers())
    await page.goto('/lenders/create')
    await page.getByRole('button', { name: 'Add New' }).click()
    const dialog = page.getByRole('dialog', { name: 'Manage Product Categories' })
    await expect(dialog).toBeVisible()
    return { api, dialog }
  }

  test('lists the existing categories', async ({ page }) => {
    const { dialog } = await openModal(page)
    await expect(dialog.getByText('Term Loans')).toBeVisible()
    await expect(dialog.getByText('Lines of Credit')).toBeVisible()
  })

  test('adds a category with a trimmed name', async ({ page }) => {
    const { api, dialog } = await openModal(page)
    api.add({ method: 'POST', match: CATS, body: ok({ id: 3, name: 'Equipment' }) })
    await dialog.locator('#categoryName').fill('  Equipment  ')
    await dialog.getByRole('button', { name: /add/i }).click()
    const call = await expectCall(api, 'POST', CATS)
    expect(call.json).toEqual({ name: 'Equipment' })
    await expect(page.getByText('Product category added successfully')).toBeVisible()
    await expect(dialog.locator('#categoryName')).toHaveValue('')
  })

  test('a duplicate name shows the validation message inline', async ({ page }) => {
    const { api, dialog } = await openModal(page)
    api.add({ method: 'POST', match: CATS, status: 422, body: failure('Invalid', { name: 'The name has already been taken.' } as never) })
    await dialog.locator('#categoryName').fill('Term Loans')
    await dialog.getByRole('button', { name: /add/i }).click()
    await expect(dialog.getByText('The name has already been taken.')).toBeVisible()
  })

  test('deletes a category after confirmation', async ({ page }) => {
    const { api, dialog } = await openModal(page)
    api.add({ method: 'DELETE', match: /product-categories\/\d+$/, body: ok(null) })
    await dialog.getByTitle('Delete').first().click()
    await confirmDelete(page)
    await expectCall(api, 'DELETE', '/admin/lenders/product-categories/1')
    await expect(page.getByText('Product category deleted successfully')).toBeVisible()
  })

  test('renames a category', async ({ page }) => {
    const { api, dialog } = await openModal(page)
    api.add({ method: 'PUT', match: /product-categories\/\d+$/, body: ok({ id: 1, name: 'Term Loans Plus' }) })
    await dialog.getByTitle('Edit').first().click()
    const editor = dialog.locator('.bg-light input').first()
    await editor.fill('Term Loans Plus')
    await editor.press('Enter')
    const call = await expectCall(api, 'PUT', '/admin/lenders/product-categories/1')
    expect(call.json).toMatchObject({ name: 'Term Loans Plus' })
  })

  test('Close dismisses the dialog', async ({ page }) => {
    const { dialog } = await openModal(page)
    await dialog.getByRole('button', { name: /close/i }).last().click()
    await expect(dialog).toBeHidden()
  })
})
