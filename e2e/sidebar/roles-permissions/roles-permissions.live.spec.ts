import { test, expect, openFromSidebar, pageHeading } from '../../support/live/fixtures'

test.describe('Sidebar › Roles & Permissions (live)', () => {
  test.beforeEach(async ({ page }) => {
    await openFromSidebar(page, 'Roles & Permissions', /\/roles-permissions$/)
  })

  test('lists the roles with their actions', async ({ page }) => {
    await expect(pageHeading(page, 'Roles & Permissions')).toBeVisible()
    await expect(page.locator('.page-content').getByRole('heading', { name: 'Admin', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add Role' }).or(page.getByRole('link', { name: 'Add Role' })).first()).toBeVisible()
  })

  test('Edit Role opens the role with its permissions', async ({ page }) => {
    await page.getByText('Edit Role').first().click()
    await expect(page).toHaveURL(/\/roles-permissions\/edit\/\d+$/)
    await expect(page.locator('.page-content input[type="checkbox"]').first()).toBeVisible()
  })

  // R2 BUG-011: the seeded Admin role is static, so it opens read-only.
  test('the Admin role opens read-only, with no Update', async ({ page }) => {
    const admin = page.locator('.role-summary-card').filter({ has: page.getByRole('heading', { name: 'Admin', exact: true }) })
    await admin.getByRole('button', { name: /view role/i }).click()
    await expect(page).toHaveURL(/\/roles-permissions\/edit\/\d+$/)
    await expect(page.getByText('This is a system role. Its name and permissions cannot be changed.')).toBeVisible()
    await expect(page.getByPlaceholder('Enter a role name')).toBeDisabled()
    await expect(page.getByRole('button', { name: /update/i })).toHaveCount(0)
  })

  test('Add Role opens an empty role form', async ({ page }) => {
    await page.getByText('Add Role').first().click()
    await expect(page).toHaveURL(/\/roles-permissions\/create$/)
    await expect(page.getByPlaceholder('Enter a role name')).toHaveValue('')
  })
})
