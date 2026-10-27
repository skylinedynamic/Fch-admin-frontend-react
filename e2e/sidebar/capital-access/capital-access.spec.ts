import { test, expect, type Page } from '@playwright/test'
import {
  mockApi, ok, paginated, failure, seedSession, expectCall, confirmDelete, cancelDelete,
  selectRow, openActionsMenu, type ApiMock,
} from '../../support/helpers'

const BASE = '/common/capital-accesses'
const PROGRAMS = [
  { id: 81, name: 'Foundation 100 Play', sub_title: 'Build your base', target_exposure_min: 75000, target_exposure_max: 150000, status: 'Active', credit_accounts: [] },
  { id: 82, name: 'Growth 250 Play', sub_title: 'Scale up', target_exposure_min: 150000, target_exposure_max: 250000, status: 'Inactive', credit_accounts: [] },
]
const ALL = ['create credit accounts', 'update credit accounts', 'delete credit accounts']

async function openList(page: Page, permissions: string[] = ALL): Promise<ApiMock> {
  await seedSession(page, { permissions })
  const api = await mockApi(page, [{ method: 'POST', match: `${BASE}/fetch-all`, body: paginated(PROGRAMS) }])
  await page.goto('/capital-access')
  await expect(page.getByText('Foundation 100 Play')).toBeVisible()
  return api
}

test.describe('Capital access list', () => {
  test('loads id desc, and the first header click asks for ascending (BUG-010)', async ({ page }) => {
    const api = await openList(page)
    expect(api.find('POST', `${BASE}/fetch-all`)[0].json).toMatchObject({ sort_field: 'id', sort_order: 'desc' })

    await page.getByRole('columnheader', { name: /^Program Name/ }).locator('.p-column-title').click()
    await expect.poll(() => api.find('POST', `${BASE}/fetch-all`).at(-1)?.json).toMatchObject({ sort_field: 'name', sort_order: 'asc' })
  })

  test('renders programs with their status', async ({ page }) => {
    await openList(page)
    await expect(page.getByText('Growth 250 Play')).toBeVisible()
    await expect(page.locator('tr', { hasText: 'Growth 250 Play' }).getByText('Inactive')).toBeVisible()
  })

  test('search is sent to the API', async ({ page }) => {
    const api = await openList(page)
    await page.getByPlaceholder('Search capital programs...').fill('growth')
    await page.getByRole('button', { name: /filters/i }).click()
    await expect.poll(() => JSON.stringify(api.find('POST', `${BASE}/fetch-all`).at(-1)?.json ?? {})).toContain('growth')
  })

  test('Clear empties the search box', async ({ page }) => {
    await openList(page)
    await page.getByPlaceholder('Search capital programs...').fill('growth')
    await page.getByRole('button', { name: /clear/i }).click()
    await expect(page.getByPlaceholder('Search capital programs...')).toHaveValue('')
  })

  test('shows the empty state', async ({ page }) => {
    await seedSession(page, { permissions: ALL })
    await mockApi(page, [{ method: 'POST', match: `${BASE}/fetch-all`, body: paginated([]) }])
    await page.goto('/capital-access')
    await expect(page.getByText('No capital programs found')).toBeVisible()
  })

  test('Add Capital Program needs the create permission', async ({ page }) => {
    await openList(page, [])
    await expect(page.getByRole('link', { name: /add capital program/i })).toHaveCount(0)
    await expect(page.locator('.p-datatable-tbody .p-checkbox')).toHaveCount(0)
  })

  test('Add Capital Program opens the create page', async ({ page }) => {
    await openList(page)
    await page.getByRole('link', { name: /add capital program/i }).click()
    await expect(page).toHaveURL(/\/capital-access\/create/)
  })

  test('clicking the status badge toggles the status without opening the row', async ({ page }) => {
    const api = await openList(page)
    api.add({ method: 'PATCH', match: `${BASE}/81/status`, body: ok({ ...PROGRAMS[0], status: 'Inactive' }) })
    await page.locator('tr', { hasText: 'Foundation 100 Play' }).getByTitle('Click to change status').click()
    const call = await expectCall(api, 'PATCH', `${BASE}/81/status`)
    expect(call.json).toMatchObject({ status: 'Inactive' })
    await expect(page.getByText('Status updated to Inactive')).toBeVisible()
    await expect(page).toHaveURL(/\/capital-access$/)
  })

  test('a failed status change is reported', async ({ page }) => {
    const api = await openList(page)
    api.add({ method: 'PATCH', match: `${BASE}/81/status`, status: 500, body: failure('boom') })
    await page.locator('tr', { hasText: 'Foundation 100 Play' }).getByTitle('Click to change status').click()
    await expect(page.getByText('Failed to update status')).toBeVisible()
  })
})

test.describe('Capital access bulk delete', () => {
  test('deletes each selected program after confirmation', async ({ page }) => {
    const api = await openList(page)
    api.add({ method: 'DELETE', match: new RegExp(`${BASE}/\\d+$`), body: ok(null) })
    await selectRow(page, 0)
    await selectRow(page, 1)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await confirmDelete(page)
    await expect(page.getByText('Capital programs deleted successfully')).toBeVisible()
    expect(api.find('DELETE', BASE).map((c) => c.path)).toEqual([`${BASE}/81`, `${BASE}/82`])
  })

  test('closing the confirmation cancels the delete', async ({ page }) => {
    const api = await openList(page)
    await selectRow(page, 0)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await cancelDelete(page)
    expect(api.find('DELETE', BASE)).toHaveLength(0)
  })

  test('a failed delete is reported', async ({ page }) => {
    const api = await openList(page)
    api.add({ method: 'DELETE', match: new RegExp(`${BASE}/\\d+$`), status: 500, body: failure('boom') })
    await selectRow(page, 0)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await confirmDelete(page)
    await expect(page.getByText('Failed to delete capital programs')).toBeVisible()
  })
})

test.describe('Capital program create', () => {
  const CREATE = new RegExp(`${BASE}$`)

  async function openCreate(page: Page, permissions: string[] = ALL) {
    await seedSession(page, { permissions })
    const api = await mockApi(page)
    await page.goto('/capital-access/create')
    await expect(page.locator('#programName')).toBeVisible()
    return api
  }

  test('server validation errors mark the fields', async ({ page }) => {
    const api = await openCreate(page)
    api.add({
      method: 'POST', match: CREATE, status: 422,
      // This endpoint returns the first message as a plain string per field.
      body: { status: false, message: 'Invalid', errors: { name: 'The name field is required.', sub_title: ['The sub title field is required.'] } },
    })
    await page.getByRole('button', { name: /save program/i }).click()
    await expect(page.locator('#programName')).toHaveClass(/is-invalid/)
    await expect(page.locator('#programSubTitle')).toHaveClass(/is-invalid/)
    await expect(page.getByText('The name field is required.')).toBeVisible()
    await expect(page).toHaveURL(/\/capital-access\/create/)
  })

  test('numeric fields are posted as numbers and blanks as null', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: CREATE, body: ok({ id: 90 }) })
    await page.locator('#programName').fill('Starter Play')
    await page.locator('#programSubTitle').fill('First steps')
    await page.getByPlaceholder('Min (e.g. 75000)').fill('50000')
    await page.getByPlaceholder('Max (e.g. 150000)').fill('90000')
    await page.locator('#minFico').fill('680')
    await page.getByRole('button', { name: /save program/i }).click()
    const call = await expectCall(api, 'POST', CREATE)
    expect(call.json).toMatchObject({
      name: 'Starter Play', sub_title: 'First steps',
      target_exposure_min: 50000, target_exposure_max: 90000, minimum_fico_requirement: 680,
    })
    expect(call.json.difficulty_modifier).toBeNull()
    await expect(page.getByText('Capital Program created successfully')).toBeVisible()
    await expect(page).toHaveURL(/\/capital-access$/)
  })

  test('a general failure is toasted', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: CREATE, status: 500, body: failure('boom') })
    await page.getByRole('button', { name: /save program/i }).click()
    await expect(page.getByText('Failed to save capital program')).toBeVisible()
  })

  test('the save button is hidden without the create permission', async ({ page }) => {
    await openCreate(page, [])
    await expect(page.getByRole('button', { name: /save program/i })).toHaveCount(0)
  })

  test('Back returns to the list', async ({ page }) => {
    await openCreate(page)
    await page.getByRole('link', { name: /back/i }).click()
    await expect(page).toHaveURL(/\/capital-access$/)
  })
})

test.describe('Capital program edit', () => {
  async function openEdit(page: Page, permissions: string[] = ALL) {
    await seedSession(page, { permissions })
    const api = await mockApi(page, [{ method: 'GET', match: new RegExp(`${BASE}/81$`), body: ok(PROGRAMS[0]) }])
    await page.goto('/capital-access/81')
    await expect(page.locator('#programName')).toHaveValue('Foundation 100 Play')
    return api
  }

  test('loads the program into the form', async ({ page }) => {
    await openEdit(page)
    await expect(page.locator('#programSubTitle')).toHaveValue('Build your base')
    await expect(page.getByPlaceholder('Min (e.g. 75000)')).toHaveValue('75000')
  })

  test('Save Changes PUTs the update', async ({ page }) => {
    const api = await openEdit(page)
    api.add({ method: 'PUT', match: new RegExp(`${BASE}/81$`), body: ok(PROGRAMS[0]) })
    await page.locator('#programSubTitle').fill('Build a stronger base')
    await page.getByRole('button', { name: /save changes/i }).click()
    const call = await expectCall(api, 'PUT', new RegExp(`${BASE}/81$`))
    expect(call.json).toMatchObject({ name: 'Foundation 100 Play', sub_title: 'Build a stronger base' })
    await expect(page.getByText('Capital Program updated successfully')).toBeVisible()
  })

  test('Save Changes is hidden without the update permission', async ({ page }) => {
    await openEdit(page, ['create credit accounts'])
    await expect(page.getByRole('button', { name: /save changes/i })).toHaveCount(0)
  })
})
