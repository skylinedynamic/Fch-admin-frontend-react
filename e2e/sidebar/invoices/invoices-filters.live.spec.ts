import { test, expect } from '../../support/live/fixtures'
import type { Page, Response } from '@playwright/test'

/**
 * Invoices list filters against the real API and local DB (host signed in).
 * - Type: every row the list returns has the picked type.
 * - Borrower Only (BUG-178): no borrower fee (the partner pays it) and no
 *   commission payout (paid to a partner or a host user).
 */

type Row = { type: string; entity_type?: string; customer_name?: string }

const TYPES = ['Enrollment', 'Down Payment', 'Installment', 'Platform Fee', 'Borrower Fee', 'User Seat', 'Commission Payout']

const list = (page: Page) =>
  page.waitForResponse((r: Response) => r.url().includes('/common/invoices/fetch-invoices') && r.request().method() === 'POST')

async function rowsOf(res: Response): Promise<{ total: number; rows: Row[]; sent: Record<string, unknown> }> {
  expect(res.status()).toBe(200)
  const body = await res.json()
  return { total: body.meta?.total ?? 0, rows: body.data as Row[], sent: JSON.parse(res.request().postData() ?? '{}') }
}

async function pick(page: Page, current: string, option: string) {
  await page.locator('.employee-filter-dropdown').filter({ hasText: current }).click()
  await page.locator('.p-dropdown-panel .p-dropdown-item').filter({ hasText: new RegExp(`^${option}$`) }).click()
}

async function apply(page: Page) {
  const res = list(page)
  await page.getByRole('button', { name: /^\W*Filters$/ }).click()
  return rowsOf(await res)
}

test.describe('Invoices filters (live)', () => {
  test.beforeEach(async ({ page }) => {
    const first = list(page)
    await page.goto('/invoices')
    await first
    await page.locator('select[name], .p-paginator').first().waitFor({ state: 'attached' }).catch(() => {})
  })

  test('Type: every listed invoice has the picked type', async ({ page }) => {
    const all = await apply(page)
    let current = 'All Types'

    for (const label of TYPES) {
      await pick(page, current, label)
      current = label
      const { rows, sent, total } = await apply(page)

      expect(sent.type, `${label} is sent`).toBeTruthy()
      expect(total, `${label} total`).toBeLessThanOrEqual(all.total)
      for (const row of rows) {
        expect(row.type, `${label} row`).toMatch(new RegExp(`^${label}`))
      }
    }

    await pick(page, current, 'All Types')
    const back = await apply(page)
    expect(back.sent.type ?? null).toBeNull()
    expect(back.total).toBe(all.total)
  })

  test('Borrower Only lists no borrower fee and no commission payout', async ({ page }) => {
    await page.getByRole('combobox').first().waitFor().catch(() => {})
    await pick(page, 'All Invoice', 'Borrower Only')
    const { rows, sent } = await apply(page)

    expect(sent.is_mine).toBe(false)
    for (const row of rows) {
      expect(row.type).not.toMatch(/^Borrower Fee|^Commission Payout/)
    }
  })

  test('Partner Only lists every borrower fee', async ({ page }) => {
    await pick(page, 'All Types', 'Borrower Fee')
    const allFees = await apply(page)

    await pick(page, 'All Invoice', 'Partner Only')
    const partnerFees = await apply(page)

    expect(partnerFees.sent).toMatchObject({ is_mine: true, type: 'borrower_fee' })
    expect(partnerFees.total).toBe(allFees.total)
  })
})
