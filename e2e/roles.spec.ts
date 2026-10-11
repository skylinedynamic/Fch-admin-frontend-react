import { test, expect, type Page } from '@playwright/test'
import {
  mockApi, ok, failure, seedSession, expectCall, confirmDelete, cancelDelete, type ApiMock,
} from './helpers'

const PERMS = [
  { module: 'users', permissions: [{ id: 1, name: 'view users' }, { id: 2, name: 'create users' }] },
  { module: 'clients', permissions: [{ id: 3, name: 'view clients' }, { id: 4, name: 'delete clients' }] },
]

const ROLES = [
  { id: 1, name: 'Super Admin', description: 'Everything', code: 'super-admin', is_static: true, permissions: ['view users'], users_count: 2 },
  { id: 2, name: 'Agent', description: 'Front desk', code: 'agent', is_static: false, permissions: ['view clients', 'view users'], users_count: 5 },
]

const PERMS_REQUIRED = ['view roles & permissions']

async function openList(page: Page): Promise<ApiMock> {
  await seedSession(page, { permissions: PERMS_REQUIRED })
  const api = await mockApi(page, [{ method: 'GET', match: '/common/roles', body: ok(ROLES) }])
  await page.goto('/roles-permissions')
  await expect(page.getByRole('heading', { name: 'Agent' })).toBeVisible()
  return api
}

test.describe('Roles list', () => {
  test('renders role cards with user counts and permissions', async ({ page }) => {
    await openList(page)
    await expect(page.getByRole('heading', { name: 'Super Admin' })).toBeVisible()
    await expect(page.getByText('5 Users')).toBeVisible()
    await expect(page.getByText('Front desk')).toBeVisible()
    await expect(page.getByText('view clients').first()).toBeVisible()
  })

  test('static roles cannot be deleted, custom roles can', async ({ page }) => {
    await openList(page)
    const cards = page.locator('.role-summary-card')
    await expect(cards.nth(0).locator('.btn-outline-danger')).toHaveCount(0)
    await expect(cards.nth(1).locator('.btn-outline-danger')).toHaveCount(1)
  })

  test('Add Role goes to the create page', async ({ page }) => {
    await openList(page)
    await page.getByRole('link', { name: /add role/i }).click()
    await expect(page).toHaveURL(/\/roles-permissions\/create/)
  })

  test('Edit Role goes to the edit page', async ({ page }) => {
    await openList(page)
    await page.locator('.role-summary-card').nth(1).getByRole('button', { name: /edit role/i }).click()
    await expect(page).toHaveURL(/\/roles-permissions\/edit\/2/)
  })

  test('View Users loads the role detail and lists its users', async ({ page }) => {
    const api = await openList(page)
    api.add({
      method: 'GET', match: '/common/roles/2',
      body: ok({ id: 2, name: 'Agent', permission: ['view clients'], users: [{ id: 9, name: 'Zed Zebra', email: 'zed@example.test', phone_number: '(333) 333-3333' }] }),
    })
    await page.locator('.role-summary-card').nth(1).getByRole('button', { name: /view users/i }).click()
    await expect(page.getByText('Zed Zebra')).toBeVisible()
    await expect(page.getByText('zed@example.test')).toBeVisible()
    await page.getByRole('button', { name: 'Close' }).first().click()
    await expect(page.getByText('Zed Zebra')).toHaveCount(0)
  })

  test('delete asks for confirmation and posts the role id', async ({ page }) => {
    const api = await openList(page)
    api.add({ method: 'POST', match: '/common/roles/destroy', body: ok(null, 'Role deleted successfully.') })
    await page.locator('.role-summary-card').nth(1).locator('.btn-outline-danger').click()
    await confirmDelete(page)
    const call = await expectCall(api, 'POST', '/common/roles/destroy')
    expect(call.json).toEqual({ ids: [2] })
    await expect(page.getByText('Role deleted successfully.').first()).toBeVisible()
  })

  test('closing the delete confirmation keeps the role', async ({ page }) => {
    const api = await openList(page)
    await page.locator('.role-summary-card').nth(1).locator('.btn-outline-danger').click()
    await cancelDelete(page)
    expect(api.find('POST', '/common/roles/destroy')).toHaveLength(0)
  })

  test('a failed delete shows the server message', async ({ page }) => {
    const api = await openList(page)
    api.add({ method: 'POST', match: '/common/roles/destroy', status: 422, body: failure('Role is assigned to users.') })
    await page.locator('.role-summary-card').nth(1).locator('.btn-outline-danger').click()
    await confirmDelete(page)
    await expect(page.getByText('Role is assigned to users.').first()).toBeVisible()
  })
})

test.describe('Create role', () => {
  async function openCreate(page: Page) {
    await seedSession(page, { permissions: PERMS_REQUIRED })
    const api = await mockApi(page, [
      { method: 'POST', match: '/common/permissions', body: ok(PERMS) },
      { method: 'GET', match: '/common/roles', body: ok(ROLES) },
    ])
    await page.goto('/roles-permissions/create')
    await expect(page.getByPlaceholder('Enter a role name')).toBeVisible()
    return api
  }

  test('an empty name does not call the API', async ({ page }) => {
    const api = await openCreate(page)
    await page.getByRole('button', { name: /save/i }).click()
    await page.waitForTimeout(300)
    expect(api.find('POST', /\/common\/roles$/)).toHaveLength(0)
  })

  test('Select All toggles every permission in a module', async ({ page }) => {
    await openCreate(page)
    const all = page.locator('#selectAll-users')
    await all.check()
    await expect(page.locator('#perm-users-view_users, #perm-users-view-users').first()).toBeChecked()
    await all.uncheck()
    await expect(page.locator('#perm-users-view_users, #perm-users-view-users').first()).not.toBeChecked()
  })

  test('saves the selected permission ids', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: /\/common\/roles$/, body: ok({ id: 9 }, 'Role created successfully.') })
    await page.getByPlaceholder('Enter a role name').fill('Reviewer')
    await page.getByPlaceholder('Enter role description').fill('Reads things')
    await page.locator('#selectAll-clients').check()
    await page.getByRole('button', { name: /save/i }).click()
    const call = await expectCall(api, 'POST', /\/common\/roles$/)
    expect(call.json).toMatchObject({ name: 'Reviewer', description: 'Reads things' })
    expect([...call.json.permission_ids].sort()).toEqual([3, 4])
    await expect(page).toHaveURL(/\/roles-permissions$/)
  })

  test('Administrator Access sends every permission id', async ({ page }) => {
    const api = await openCreate(page)
    api.add({ method: 'POST', match: /\/common\/roles$/, body: ok({ id: 9 }) })
    await page.getByPlaceholder('Enter a role name').fill('Root')
    await page.locator('#adminAccessToggle').check()
    await page.getByRole('button', { name: /save/i }).click()
    const call = await expectCall(api, 'POST', /\/common\/roles$/)
    expect([...call.json.permission_ids].sort()).toEqual([1, 2, 3, 4])
  })

  test('server validation errors render under the fields', async ({ page }) => {
    const api = await openCreate(page)
    api.add({
      method: 'POST', match: /\/common\/roles$/, status: 422,
      body: failure('Invalid', { name: ['The name has already been taken.'], permission_ids: ['Select at least one permission.'] }),
    })
    await page.getByPlaceholder('Enter a role name').fill('Agent')
    await page.getByRole('button', { name: /save/i }).click()
    await expect(page.getByText('The name has already been taken.')).toBeVisible()
    await expect(page.getByText('Select at least one permission.')).toBeVisible()
    await expect(page).toHaveURL(/\/roles-permissions\/create/)
  })
})

test.describe('Edit role', () => {
  async function openEdit(page: Page) {
    await seedSession(page, { permissions: PERMS_REQUIRED })
    const api = await mockApi(page, [
      { method: 'POST', match: '/common/permissions', body: ok(PERMS) },
      { method: 'GET', match: '/common/roles/2', body: ok({ id: 2, name: 'Agent', description: 'Front desk', permission: { 3: 'view clients' }, users: [] }) },
    ])
    await page.goto('/roles-permissions/edit/2')
    await expect(page.getByPlaceholder('Enter a role name')).toHaveValue('Agent')
    return api
  }

  test('loads the role and pre-checks its permissions', async ({ page }) => {
    await openEdit(page)
    await expect(page.getByPlaceholder('Enter role description')).toHaveValue('Front desk')
    await expect(page.locator('input[id^="perm-clients-"]:checked')).toHaveCount(1)
  })

  test('Update PUTs the changed role', async ({ page }) => {
    const api = await openEdit(page)
    api.add({ method: 'PUT', match: '/common/roles/2', body: ok({ id: 2 }, 'Role updated successfully.') })
    await page.getByPlaceholder('Enter a role name').fill('Senior Agent')
    await page.getByRole('button', { name: /update/i }).click()
    const call = await expectCall(api, 'PUT', '/common/roles/2')
    expect(call.json).toMatchObject({ name: 'Senior Agent' })
    expect(call.json.permission_ids).toContain(3)
    await expect(page).toHaveURL(/\/roles-permissions$/)
  })

  test('clearing the name blocks the update', async ({ page }) => {
    const api = await openEdit(page)
    await page.getByPlaceholder('Enter a role name').fill('')
    await page.getByRole('button', { name: /update/i }).click()
    await page.waitForTimeout(300)
    expect(api.find('PUT', '/common/roles/2')).toHaveLength(0)
  })
})
