import { test, expect, type Page } from '@playwright/test'
import {
  mockApi, ok, paginated, failure, seedSession, expectCall, confirmDelete, cancelDelete,
  selectRow, openActionsMenu, type ApiMock,
} from '../../../support/helpers'

const BASE = '/admin/credit-builder'
const TIERS = [
  { id: 1, name: 'Tier 0', title: 'Business Foundation', subtitle: 'Get set up', order: 1, code: 'T0', status: 'active', description: 'Foundation tier' },
  { id: 2, name: 'Tier 1', title: 'Vendor Credit', subtitle: 'Net-30 accounts', order: 2, code: 'T1', status: 'active', description: 'Vendor tier' },
]
const TASKS = [
  { id: 11, title: 'Open a vendor account', subtitle: 'Net-30', estimated_completion_days: 7, order: 1, manual_verification: true },
  { id: 12, title: 'Pay first invoice', subtitle: 'On time', estimated_completion_days: 30, order: 2, manual_verification: true },
]

// Add/Delete on the tier list are reserved for the Developer role on top of the permission.
const DEVELOPER = { role_name: 'Developer', permissions: ['update tier'] }

async function openList(page: Page, user: Record<string, unknown> = DEVELOPER): Promise<ApiMock> {
  await seedSession(page, user)
  const api = await mockApi(page, [{ method: 'POST', match: `${BASE}/tiers/fetch-tiers`, body: paginated(TIERS) }])
  await page.goto('/tiers')
  await expect(page.getByText('Business Foundation')).toBeVisible()
  return api
}

test.describe('Tiers list', () => {
  test('loads order asc, and the first header click asks for ascending (BUG-010)', async ({ page }) => {
    const api = await openList(page)
    expect(api.find('POST', `${BASE}/tiers/fetch-tiers`)[0].json).toMatchObject({ sort_field: 'order', sort_order: 'asc' })

    await page.getByRole('columnheader', { name: /^Name/ }).locator('.p-column-title').click()
    await expect.poll(() => api.find('POST', `${BASE}/tiers/fetch-tiers`).at(-1)?.json).toMatchObject({ sort_field: 'name', sort_order: 'asc' })
  })

  // BUG-007: the empty table said "No available options".
  test('an empty result shows a proper empty message', async ({ page }) => {
    await seedSession(page, DEVELOPER)
    await mockApi(page, [{ method: 'POST', match: `${BASE}/tiers/fetch-tiers`, body: paginated([]) }])
    await page.goto('/tiers')
    await expect(page.getByText('No tiers found')).toBeVisible()
    await expect(page.getByText('No available options')).toHaveCount(0)
  })

  test('renders tiers from the API', async ({ page }) => {
    await openList(page)
    await expect(page.getByText('Vendor Credit')).toBeVisible()
    await expect(page.getByText('Net-30 accounts')).toBeVisible()
  })

  test('search is sent to the API', async ({ page }) => {
    const api = await openList(page)
    await page.getByPlaceholder('Search here...').fill('vendor')
    await page.getByRole('button', { name: /filters/i }).click()
    await expect.poll(() => api.find('POST', `${BASE}/tiers/fetch-tiers`).at(-1)?.json.search).toBe('vendor')
  })

  test('Clear empties the search box', async ({ page }) => {
    await openList(page)
    await page.getByPlaceholder('Search here...').fill('vendor')
    await page.getByRole('button', { name: /clear/i }).click()
    await expect(page.getByPlaceholder('Search here...')).toHaveValue('')
  })

  test('clicking a row opens the tier', async ({ page }) => {
    await openList(page)
    await page.getByText('Net-30 accounts').click()
    await expect(page).toHaveURL(/\/tiers\/2$/)
  })

  test('Add Tier is offered to a Developer with the update permission', async ({ page }) => {
    await openList(page)
    await page.getByRole('link', { name: /add tier/i }).click()
    await expect(page).toHaveURL(/\/tiers\/create/)
  })

  test('Add Tier and row selection are hidden for other roles', async ({ page }) => {
    await openList(page, { role_name: 'Admin', permissions: ['update tier'] })
    await expect(page.getByRole('link', { name: /add tier/i })).toHaveCount(0)
    await expect(page.locator('.p-datatable-tbody .p-checkbox')).toHaveCount(0)
  })

  test('Add Tier is hidden for a Developer without the permission', async ({ page }) => {
    await openList(page, { role_name: 'Developer', permissions: [] })
    await expect(page.getByRole('link', { name: /add tier/i })).toHaveCount(0)
  })

  test('non-host users cannot reach the tiers page', async ({ page }) => {
    await seedSession(page, { ...DEVELOPER, is_host: 0, partner_id: 4 })
    await mockApi(page)
    await page.goto('/tiers')
    await expect(page).not.toHaveURL(/\/tiers/)
  })
})

test.describe('Tiers bulk delete', () => {
  const DELETE = `${BASE}/tiers-multiple-delete`

  test('deletes the selected tiers after confirmation', async ({ page }) => {
    const api = await openList(page)
    api.add({ method: 'POST', match: DELETE, body: ok(null) })
    await selectRow(page, 1)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await confirmDelete(page)
    const call = await expectCall(api, 'POST', DELETE)
    expect(call.json).toEqual({ ids: [2] })
    await expect(page.getByText('Tier(s) deleted successfully')).toBeVisible()
  })

  test('closing the confirmation cancels the delete', async ({ page }) => {
    const api = await openList(page)
    await selectRow(page, 0)
    await openActionsMenu(page)
    await page.getByRole('button', { name: /delete selected/i }).click()
    await cancelDelete(page)
    expect(api.find('POST', DELETE)).toHaveLength(0)
  })
})

test.describe('Tier create', () => {
  const CREATE = new RegExp(`${BASE}/tiers$`)

  async function openCreate(page: Page) {
    await seedSession(page, DEVELOPER)
    const api = await mockApi(page)
    await page.goto('/tiers/create')
    await expect(page.locator('input[name="name"]')).toBeVisible()
    return api
  }

  test('server validation errors are shown inline', async ({ page }) => {
    const api = await openCreate(page)
    api.add({
      method: 'POST', match: CREATE, status: 422,
      body: failure('Invalid', { name: ['The name field is required.'], title: ['The title field is required.'] }),
    })
    await page.getByRole('button', { name: /update|save/i }).click()
    await expect(page.getByText('The name field is required.')).toBeVisible()
    await expect(page.getByText('The title field is required.')).toBeVisible()
    await expect(page).toHaveURL(/\/tiers\/create/)
  })

  test('a new tier is posted and the task tab of the new tier opens', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: CREATE, body: ok({ id: 9 }, 'Tier created successfully') })
    api.add({ method: 'GET', match: `${BASE}/tiers/9`, body: ok({ ...TIERS[1], id: 9, name: 'Tier 9' }) })
    await page.locator('input[name="name"]').fill('Tier 9')
    await page.locator('input[name="title"]').fill('Advanced Credit')
    await page.locator('input[name="subtitle"]').fill('Bigger limits')
    await page.getByRole('button', { name: /update|save/i }).click()
    const call = await expectCall(api, 'POST', CREATE)
    expect(call.json).toMatchObject({ name: 'Tier 9', title: 'Advanced Credit', subtitle: 'Bigger limits' })
    await expect(page.getByText('Tier created successfully')).toBeVisible()
    await expect(page).toHaveURL(/\/tiers\/9$/)
  })

  test('Back returns to the list', async ({ page }) => {
    await openCreate(page)
    await page.getByRole('link', { name: /back/i }).click()
    await expect(page).toHaveURL(/\/tiers$/)
  })
})

test.describe('Tier edit', () => {
  async function openEdit(page: Page, user: Record<string, unknown> = DEVELOPER) {
    await seedSession(page, user)
    const api = await mockApi(page, [
      { method: 'GET', match: new RegExp(`${BASE}/tiers/2$`), body: ok(TIERS[1]) },
      { method: 'POST', match: `${BASE}/tier-tasks/fetch-tasks`, body: paginated(TASKS) },
    ])
    await page.goto('/tiers/2')
    await expect(page.locator('input[name="name"]')).toHaveValue('Tier 1')
    return api
  }

  test('loads the tier into the form', async ({ page }) => {
    await openEdit(page)
    await expect(page.locator('input[name="title"]')).toHaveValue('Vendor Credit')
    await expect(page.locator('input[name="subtitle"]')).toHaveValue('Net-30 accounts')
  })

  test('Update PUTs the changes', async ({ page }) => {
    const api = await openEdit(page)
    api.add({ method: 'PUT', match: new RegExp(`${BASE}/tiers/2$`), body: ok(TIERS[1], 'Tier updated successfully') })
    await page.locator('input[name="title"]').fill('Vendor Credit Plus')
    await page.getByRole('button', { name: /update/i }).click()
    const call = await expectCall(api, 'PUT', new RegExp(`${BASE}/tiers/2$`))
    expect(call.json).toMatchObject({ name: 'Tier 1', title: 'Vendor Credit Plus', status: 'Active' })
    await expect(page.getByText('Tier updated successfully')).toBeVisible()
  })

  test('validation errors on update are shown inline', async ({ page }) => {
    const api = await openEdit(page)
    api.add({ method: 'PUT', match: new RegExp(`${BASE}/tiers/2$`), status: 422, body: failure('Invalid', { name: ['The name has already been taken.'] }) })
    await page.getByRole('button', { name: /update/i }).click()
    await expect(page.getByText('The name has already been taken.')).toBeVisible()
  })

  test('Update is hidden without the update permission', async ({ page }) => {
    await openEdit(page, { role_name: 'Developer', permissions: [] })
    await expect(page.locator('button.btn-primary.w-lg')).toHaveCount(0)
  })

  test('a tier that fails to load returns to the list', async ({ page }) => {
    await seedSession(page, DEVELOPER)
    await mockApi(page, [{ method: 'GET', match: `${BASE}/tiers/404`, status: 404, body: failure('Not found') }])
    await page.goto('/tiers/404')
    await expect(page.getByText('Failed to load tier details').first()).toBeVisible()
    await expect(page).toHaveURL(/\/tiers$/)
  })

  test.describe('Task Information tab', () => {
    async function openTasks(page: Page) {
      const api = await openEdit(page)
      await page.getByText('Task Information').click()
      await expect(page.getByText('Open a vendor account')).toBeVisible()
      return api
    }

    test('lists the tier tasks', async ({ page }) => {
      await openTasks(page)
      await expect(page.getByText('Pay first invoice')).toBeVisible()
    })

    test('task search is sent to the API', async ({ page }) => {
      const api = await openTasks(page)
      await page.getByPlaceholder('Search tasks...').fill('invoice')
      await page.getByRole('button', { name: /filters/i }).click()
      await expect.poll(() => JSON.stringify(api.find('POST', `${BASE}/tier-tasks/fetch-tasks`).at(-1)?.json ?? {})).toContain('invoice')
    })

    test('Add Task opens the task dialog and Cancel closes it', async ({ page }) => {
      await openTasks(page)
      await page.getByRole('button', { name: /add task/i }).click()
      await expect(page.getByText('Add New Task')).toBeVisible()
      await page.getByRole('button', { name: 'Cancel' }).click()
      await expect(page.getByText('Add New Task')).toBeHidden()
    })

    test('the row edit button opens the dialog pre-filled', async ({ page }) => {
      await openTasks(page)
      await page.locator('tr', { hasText: 'Open a vendor account' }).locator('.btn-soft-primary').click()
      await expect(page.getByText('Edit Task')).toBeVisible()
      await expect(page.getByPlaceholder('Enter task title')).toHaveValue('Open a vendor account')
    })

    test('deleting a task from its row asks for confirmation', async ({ page }) => {
      const api = await openTasks(page)
      await page.locator('tr', { hasText: 'Open a vendor account' }).locator('.btn-soft-danger').click()
      await cancelDelete(page)
      expect(api.calls.filter((c) => c.path.includes('tier-tasks') && /delete/i.test(c.method + c.path))).toHaveLength(0)
    })
  })
})
