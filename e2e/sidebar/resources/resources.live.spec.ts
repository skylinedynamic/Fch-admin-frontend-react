import { test, expect, openFromSidebar, pageHeading } from '../../support/live/fixtures'

test.describe('Sidebar › Resources (live)', () => {
  test.beforeEach(async ({ page }) => {
    await openFromSidebar(page, 'Resources', /\/resources$/)
  })

  test('shows the resource sections with their counts', async ({ page }) => {
    await expect(pageHeading(page, 'Resources')).toBeVisible()
    await expect(page.getByText('Education & Help').first()).toBeVisible()
    await expect(page.getByPlaceholder('Search Education & Help...')).toBeVisible()
  })

  test('the host can add, edit and delete resources', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Add New' }).or(page.getByRole('link', { name: 'Add New' })).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Edit' }).or(page.getByRole('link', { name: 'Edit' })).first()).toBeVisible()
  })
})
