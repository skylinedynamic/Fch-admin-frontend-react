import { test, expect } from '../../support/live/fixtures'

// BUG-181: Add Resource saved a Training Academy item without its link, and a
// new resource opened as Published. Against the real API: the save is refused
// with every missing field at once, and nothing is created.
test.describe('Resources › Add Resource validation (live)', () => {
  test('a Training Academy resource needs its link and starts Unpublished', async ({ page }) => {
    await page.goto('/manage-resources')
    await page.getByRole('button', { name: 'Training Academy' }).click()
    await page.getByRole('button', { name: /add resource/i }).click()
    await expect(page).toHaveURL(/\/resources\/create/)

    const title = page.locator('#title')
    const link = page.locator('#link')
    await expect(title).toBeVisible()
    await expect(page.getByText('Unpublished', { exact: true })).toBeVisible()

    // Empty form: title and link are both reported by the first Save.
    const empty = page.waitForResponse((r) => /\/admin\/resources$/.test(r.url()) && r.request().method() === 'POST')
    await page.getByRole('button', { name: /save/i }).click()
    expect((await empty).status()).toBe(422)
    await expect(title).toHaveClass(/is-invalid/)
    await expect(link).toHaveClass(/is-invalid/)
    await expect(page.getByText('The Resource Link is required.')).toBeVisible()

    // A title alone is still refused for the missing link.
    await title.fill('QA-TEST E2E BUG-181 no link')
    const titleOnly = page.waitForResponse((r) => /\/admin\/resources$/.test(r.url()) && r.request().method() === 'POST')
    await page.getByRole('button', { name: /save/i }).click()
    const res = await titleOnly
    expect(res.status()).toBe(422)
    expect(Object.keys((await res.json()).errors)).toEqual(['link'])
    await expect(page).toHaveURL(/\/resources\/create/)
  })
})
