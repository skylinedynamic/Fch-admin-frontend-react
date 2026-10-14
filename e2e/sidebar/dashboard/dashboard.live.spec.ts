import { test, expect, openFromSidebar, pageHeading } from '../../support/live/fixtures'

test.describe('Sidebar › Dashboard (live)', () => {
  test.beforeEach(async ({ page }) => {
    await openFromSidebar(page, 'Dashboard', /\/$/)
  })

  test('greets the signed-in user by name', async ({ page }) => {
    const name = await page.evaluate(() => JSON.parse(localStorage.getItem('auth') || '{}')?.state?.user?.name || '')
    expect(name, 'the stored session has the user name').not.toBe('')
    await expect(pageHeading(page, `Welcome, ${name.split(' ')[0]}!`)).toBeVisible()
  })
})
