import { test, expect, dataRows } from '../../support/live/fixtures'
import { API_BASE_URL } from '../../support/live/env'

// BUG-205: archiving the host company from Partners showed "archived
// successfully" while nothing happened. Against the real API: the host's row
// cannot be ticked, and the API refuses an archive or delete naming the host.
test.describe('Partners › the host company (live)', () => {
  test('its row cannot be ticked, and the API refuses to archive or delete it', async ({ page }) => {
    const list = page.waitForResponse((r) => /\/admin\/partners\/fetch-partners$/.test(r.url()) && r.request().method() === 'POST')
    await page.goto('/partners')
    await list

    const search = page.getByPlaceholder('Search here...')
    const searched = page.waitForResponse((r) => /\/admin\/partners\/fetch-partners$/.test(r.url()) && (r.request().postData() || '').includes('Four Corner'))
    await search.fill('Four Corner Holdings')
    await search.press('Enter')
    const rows = (await (await searched).json()).data as { id: number; is_host: boolean; company_name: string }[]
    const host = rows.find((r) => r.is_host)
    expect(host, 'the host company is listed').toBeTruthy()

    const row = dataRows(page).filter({ hasText: host!.company_name }).first()
    await expect(row).toBeVisible()
    await expect(row.locator('input[type="checkbox"]')).toBeDisabled()
    await row.locator('.p-checkbox').click({ force: true })
    await expect(page.getByRole('button', { name: /^Actions$/ })).toHaveCount(0)

    // Even sent straight to the API, the host is refused - and stays as it was.
    const answers = await page.evaluate(async ({ api, id }) => {
      const token = JSON.parse(localStorage.getItem('auth') || '{}')?.state?.token
      const call = async (path: string) => {
        const r = await fetch(`${api}/admin/partners/${path}`, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ ids: [id] }),
        })
        return { status: r.status, message: (await r.json()).message }
      }
      return { archive: await call('archive'), delete: await call('multiple-delete') }
    }, { api: API_BASE_URL, id: host!.id })

    for (const answer of [answers.archive, answers.delete]) {
      expect(answer.status).toBe(422)
      expect(answer.message).toBe('The host company cannot be archived or deleted. Unselect it and try again.')
    }
  })
})
