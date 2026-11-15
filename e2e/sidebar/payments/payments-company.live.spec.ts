import { test, expect, dataRows } from '../../support/live/fixtures'

// BUG-195 (decision D8): the COMPANY column showed "-" on every row. Against
// the real API: each row with a company in the list response shows it in its
// COMPANY cell, and the list has at least one such row.
test.describe('Payments › COMPANY column (live)', () => {
  test("shows the payer's company", async ({ page }) => {
    const list = page.waitForResponse((r) => /\/payments\/fetch-payments$/.test(r.url()) && r.request().method() === 'POST')
    await page.goto('/payments')
    const res = await list
    expect(res.status()).toBe(200)
    const rows = (await res.json()).data as { company: string | null }[]

    const companies = rows.map((r) => r.company).filter((c): c is string => !!c)
    expect(companies.length).toBeGreaterThan(0)

    const headers = await page.locator('.page-content .p-datatable thead th').allInnerTexts()
    const col = headers.findIndex((h) => /^company$/i.test(h.trim()))
    expect(col).toBeGreaterThanOrEqual(0)

    await expect(dataRows(page)).toHaveCount(rows.length)
    for (const [i, row] of rows.entries()) {
      await expect(dataRows(page).nth(i).locator('td').nth(col)).toHaveText(row.company || '-')
    }
  })
})
