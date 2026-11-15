import { test, expect } from '../../../support/live/fixtures'
import { API_BASE_URL } from '../../../support/live/env'

// BUG-192 (decision D7): Add Post opened as Published, and the button said
// "Publish" even with Draft chosen. Against the real API: a new post starts as
// a Draft, the button follows the switch, and saving untouched stores a draft.
// The post it creates is deleted again.
test.describe('CMS › Blogs › Add Post (live)', () => {
  test('a new post starts as a draft and is saved as one', async ({ page }) => {
    await page.goto('/cms/blogs/create')
    const title = page.getByPlaceholder('Enter post title')
    await expect(title).toBeVisible()

    const status = page.getByRole('checkbox', { name: /publish status/i })
    const action = page.locator('button[form="blog-form"]')
    await expect(status).not.toBeChecked()
    await expect(action).toHaveText(/save draft/i)

    // The button follows the switch.
    await status.click()
    await expect(action).toHaveText(/^\s*publish\s*$/i)
    await status.click()
    await expect(action).toHaveText(/save draft/i)

    await title.fill(`QA-TEST E2E BUG-192 draft ${Date.now()}`)
    await page.locator('.ck-editor__editable').click()
    await page.keyboard.type('Draft body')

    const created = page.waitForResponse((r) => /\/admin\/cms\/blogs$/.test(r.url()) && r.request().method() === 'POST')
    await action.click()
    const res = await created
    expect(res.status()).toBe(201)
    const id = (await res.json()).data.id as number

    try {
      await expect(page).toHaveURL(/\/cms\/blogs$/)
      const saved = await page.evaluate(async ({ api, id }) => {
        const token = JSON.parse(localStorage.getItem('auth') || '{}')?.state?.token
        const r = await fetch(`${api}/admin/cms/blogs/${id}`, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } })
        return (await r.json()).data
      }, { api: API_BASE_URL, id })
      expect(Boolean(saved.is_published)).toBe(false)
      expect(saved.published_at ?? null).toBeNull()
    } finally {
      await page.evaluate(async ({ api, id }) => {
        const token = JSON.parse(localStorage.getItem('auth') || '{}')?.state?.token
        await fetch(`${api}/admin/cms/blogs-multiple-delete`, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ids: [id] }),
        })
      }, { api: API_BASE_URL, id })
    }
  })
})
