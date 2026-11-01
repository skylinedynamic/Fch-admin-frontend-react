import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall } from '../../support/helpers'

// R2 BUG-011: the seeded Admin role opened fully editable (name, every
// permission, Administrator Access), so the only admin could untick their
// own access. A system role now opens read-only with a notice; only its
// description can change, and the API refuses anything else.

const PERMS = [
  { module: 'users', permissions: [{ id: 1, name: 'view users' }, { id: 2, name: 'create users' }] },
  { module: 'clients', permissions: [{ id: 3, name: 'view clients' }, { id: 4, name: 'delete clients' }] },
]

async function openEdit(page: Page, role: Record<string, unknown>) {
  await seedSession(page, { permissions: ['view roles & permissions'] })
  const api = await mockApi(page, [
    { method: 'POST', match: '/common/permissions', body: ok(PERMS) },
    { method: 'GET', match: `/common/roles/${role.id}`, body: ok(role) },
  ])
  await page.goto(`/roles-permissions/edit/${role.id}`)
  await expect(page.getByPlaceholder('Enter a role name')).toHaveValue(String(role.name))
  return api
}

const ADMIN = { id: 1, name: 'Admin', description: 'Everything', is_static: true, permission: { 1: 'view users', 2: 'create users', 3: 'view clients', 4: 'delete clients' }, users: [] }

test.describe('Edit role › a system role (R2 BUG-011)', () => {
  test('opens read-only with a notice: name, Administrator Access and every permission locked', async ({ page }) => {
    await openEdit(page, ADMIN)

    await expect(page.getByText(/This is a system role/)).toBeVisible()
    await expect(page.getByPlaceholder('Enter a role name')).toBeDisabled()
    await expect(page.getByLabel('Administrator Access')).toBeDisabled()
    await expect(page.locator('input[id^="perm-"]:checked')).toHaveCount(4)
    for (const box of await page.locator('input[id^="perm-"], input[id^="selectAll-"]').all()) {
      await expect(box).toBeDisabled()
    }
    await expect(page.getByPlaceholder('Enter role description')).toBeEnabled()
  })

  test('Update saves the new description with the name and permissions it already has', async ({ page }) => {
    const api = await openEdit(page, ADMIN)
    api.add({ method: 'PUT', match: '/common/roles/1', body: ok({ id: 1 }, 'Role updated successfully.') })

    await page.getByPlaceholder('Enter role description').fill('All access, always')
    await page.getByRole('button', { name: /update/i }).click()

    const call = await expectCall(api, 'PUT', '/common/roles/1')
    expect(call.json).toMatchObject({ name: 'Admin', description: 'All access, always' })
    expect([...call.json.permission_ids].sort()).toEqual([1, 2, 3, 4])
    await expect(page).toHaveURL(/\/roles-permissions$/)
  })

  test('shows the API refusal on the permissions if one ever comes back', async ({ page }) => {
    const api = await openEdit(page, ADMIN)
    api.add({
      method: 'PUT', match: '/common/roles/1', status: 422,
      body: failure('Invalid', { permission_ids: 'This is a system role: its name and permissions cannot be changed.' }),
    })

    await page.getByRole('button', { name: /update/i }).click()

    await expect(page.getByText('This is a system role: its name and permissions cannot be changed.')).toBeVisible()
    await expect(page).toHaveURL(/\/roles-permissions\/edit\/1$/)
  })

  test('a custom role stays editable', async ({ page }) => {
    await openEdit(page, { id: 2, name: 'Agent', description: 'Front desk', is_static: false, permission: { 3: 'view clients' }, users: [] })

    await expect(page.getByText(/This is a system role/)).toHaveCount(0)
    await expect(page.getByPlaceholder('Enter a role name')).toBeEnabled()
    await expect(page.getByLabel('Administrator Access')).toBeEnabled()
  })
})
