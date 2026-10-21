import { test, expect, type Page } from '@playwright/test'
import { mockApi, paginated, seedSession, selectRow, openActionsMenu } from '../../support/helpers'

// The "Lead Cannot Be Deleted" modal's note - "Unselect this lead to delete the
// other selected leads." - shows its icon beside the text, so a wrapped line
// starts under the text, not under the icon. The note is the shared
// DeleteBlockedModal's, so clients, partners, lenders and funding sequences lay
// out the same.
const OPEN = { id: 11, contact_person: 'Ann Open', company_name: 'Alpha Co', email: 'ann@example.test', status: 'New Lead', lead_type: 'Borrower', convert_to: null }
const CONVERTED = { id: 13, contact_person: 'Cara Done', company_name: 'Gamma Co', email: 'cara@example.test', status: 'Lead Completed', lead_type: 'Borrower', convert_to: 'Borrower' }

async function openBlockedModal(page: Page) {
  await seedSession(page, { permissions: ['view leads', 'delete leads'] })
  await mockApi(page, [{ method: 'POST', match: '/common/leads/fetch-leads', body: paginated([OPEN, CONVERTED]) }])
  await page.goto('/leads')
  await expect(page.getByText('Ann Open')).toBeVisible()

  await selectRow(page, 0)
  await selectRow(page, 1)
  await openActionsMenu(page)
  await page.getByRole('button', { name: /delete selected/i }).click()

  const dialog = page.getByRole('dialog', { name: 'Lead Cannot Be Deleted' })
  await expect(dialog).toBeVisible()
  return dialog
}

for (const width of [390, 1280]) {
  test(`the note's icon sits beside its text, every line starting under the text (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const dialog = await openBlockedModal(page)

    const note = dialog.getByTestId('blocked-others')
    await expect(note).toHaveText('Unselect this lead to delete the other selected leads.')
    // Measured once the modal's opening animation has settled.
    await expect.poll(async () => (await note.boundingBox())?.width ?? 0).toBeGreaterThan(0)

    const lines = await note.locator('span').evaluate((span) => {
      const range = document.createRange()
      range.selectNodeContents(span)
      return Array.from(range.getClientRects()).map((r) => ({ left: Math.round(r.left), top: Math.round(r.top) }))
    })
    const icon = await note.locator('i').boundingBox()

    // Every line of the text starts at the same x, right of the icon.
    const lefts = [...new Set(lines.map((l) => l.left))]
    expect(lefts).toHaveLength(1)
    expect(lefts[0]).toBeGreaterThanOrEqual(Math.floor(icon!.x + icon!.width))
    // The icon lines up with the first line, not floating mid-box.
    expect(Math.abs(icon!.y - lines[0].top)).toBeLessThan(6)

    expect(await note.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe('4px')
  })
}
