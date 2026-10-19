import { test as base, expect, type Page, type Response } from '@playwright/test'
import { API_BASE_URL } from './env'

// Records uncaught page errors and 5xx API responses for the whole test, and
// fails the test if any happened. 4xx is left alone: several screens probe
// endpoints that legitimately answer 403/404 for this account.
export const test = base.extend<{ runtimeErrors: string[] }>({
  runtimeErrors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(`pageerror: ${err.message} @ ${(err.stack || '').split('\n').find((l) => l.trim().startsWith('at')) ?? '?'}`))
      page.on('response', (res) => {
        if (res.status() >= 500 && res.url().startsWith(API_BASE_URL)) {
          errors.push(`${res.status()} ${res.request().method()} ${res.url()}`)
        }
      })
      await use(errors)
      expect(errors, 'uncaught page errors / 5xx API responses').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

export const sidebar = (page: Page) => page.locator('#navbar-nav')

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// A sidebar link, matched by its whole visible label so "Payments" does not
// also match "Payment Method". A trailing badge count is allowed.
export const sidebarLink = (page: Page, label: string) =>
  sidebar(page)
    .locator('a.nav-link')
    .filter({ hasText: new RegExp(`^\\s*${escapeRegExp(label)}\\s*\\d*\\+?\\s*$`) })

// A submenu toggle (Intake & Review, Credit Builder, CMS, Embedded Form).
export const sidebarGroup = (page: Page, label: string) =>
  sidebar(page).locator('button.menu-link').filter({ hasText: new RegExp(`^\\s*${escapeRegExp(label)}\\s*$`) })

// Real rows of the PrimeReact table. While loading, DataTableWrapper renders a
// skeleton table, so a plain row locator can match a placeholder.
export const dataRows = (page: Page) =>
  page
    .locator('.page-content .p-datatable-tbody > tr:not(.p-datatable-emptymessage)')
    .filter({ hasNot: page.locator('.skeleton-line, .p-skeleton') })

export const emptyTableMessage = (page: Page) => page.locator('.page-content .p-datatable-emptymessage')

// Rows or the empty message, whichever the real data gives.
export const tableSettled = (page: Page) => dataRows(page).first().or(emptyTableMessage(page))

// Opens the panel and navigates by clicking the sidebar menu item, like a real
// user (opening its group first), then checks the URL and the active
// highlight. It starts on the light 404 page inside the layout rather than the
// dashboard: `php artisan serve` answers one request at a time, and the
// dashboard's calls would queue in front of the screen under test.
export async function openFromSidebar(page: Page, label: string, url: RegExp, group?: string) {
  await page.goto('/not-found')
  await expect(sidebar(page)).toBeVisible()
  if (group) {
    const toggle = sidebarGroup(page, group)
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click()
  }
  const link = sidebarLink(page, label).first()
  await link.click()
  await expect(page).toHaveURL(url)
  await expect(link).toHaveClass(/active/)
}

// The title every screen renders in its PageHeader.
export const pageHeading = (page: Page, name: string | RegExp) =>
  page.locator('.page-content').getByRole('heading', { name }).first()

// Fails with the status, URL and body of a non-2xx response.
export async function expectOk(res: Response) {
  if (!res.ok()) {
    const body = await res.text().catch(() => '<body no longer available>')
    throw new Error(`${res.status()} ${res.request().method()} ${res.url()}: ${body}`)
  }
}

// Waits for the response of a list endpoint the screen calls.
export const waitForApi = (page: Page, path: string | RegExp, method = 'GET') =>
  page.waitForResponse((r) => r.request().method() === method && (typeof path === 'string' ? r.url().includes(path) : path.test(r.url())))

export type ListScreen = {
  /** Sidebar label, and its group for a submenu item. */
  menu: string
  group?: string
  url: RegExp
  heading: string | RegExp
  /** Column headers, as the table renders them. */
  columns: string[]
  /** Placeholder of the screen's search box. */
  search?: string
  /** Where a click on the first row goes, and the heading there. */
  detail?: { url: RegExp; heading: string | RegExp }
}

// The checks every list screen gets against real data: it opens from the
// sidebar with its heading and columns, a search that matches nothing empties
// the table and clearing it brings the rows back, and the first row opens its
// details. Screen-specific checks go in the spec next to this call.
export function listScreenTests(s: ListScreen) {
  test.beforeEach(async ({ page }) => {
    await openFromSidebar(page, s.menu, s.url, s.group)
  })

  test('opens from the sidebar with its heading and table', async ({ page }) => {
    await expect(pageHeading(page, s.heading)).toBeVisible()
    const head = page.locator('.page-content .p-datatable-thead')
    // Headers are upper-cased by CSS, so match the words in any case.
    for (const col of s.columns) await expect(head.getByText(new RegExp(`^\\s*${escapeRegExp(col)}\\s*$`, 'i')).first()).toBeVisible()
    await expect(tableSettled(page)).toBeVisible()
  })

  if (s.search) {
    const search = s.search
    // Runs with or without records: the search term must reach the API and the
    // table must come back empty; clearing it must restore whatever was there.
    test('a search with no match empties the table, clearing it restores the rows', async ({ page }) => {
      const TERM = 'zz-e2e-no-such-record'
      await expect(tableSettled(page)).toBeVisible()
      const hadRows = !(await emptyTableMessage(page).isVisible())
      const sent = (r: import('@playwright/test').Request) =>
        r.url().startsWith(API_BASE_URL) && (r.url().includes(TERM) || (r.postData() ?? '').includes(TERM))
      const box = page.locator('.page-content').getByPlaceholder(search).first()
      let searched = page.waitForRequest(sent, { timeout: 8_000 }).then(() => true, () => false)
      await box.fill(TERM)
      await box.press('Enter')
      // Some screens search as you type or on Enter; others only when their
      // Filters / Search button is pressed. Button names start with an icon glyph.
      if (!(await searched)) {
        searched = page.waitForRequest(sent, { timeout: 30_000 }).then(() => true, () => false)
        await page.locator('.page-content').getByRole('button', { name: /(^|\W)(Filters|Search|Apply)\s*$/ }).first().click()
        expect(await searched, 'the search term was never sent to the API').toBe(true)
      }
      await expect(emptyTableMessage(page)).toBeVisible()
      await expect(dataRows(page)).toHaveCount(0)

      const clear = page.locator('.page-content').getByRole('button', { name: /(^|\W)Clear\s*$/ }).first()
      if (await clear.isVisible()) {
        await clear.click()
      } else {
        await box.fill('')
        await box.press('Enter')
      }
      await expect(box).toHaveValue('')
      // Clear can also drop a default filter (Task & Reminders starts on today's
      // date range), so an empty start may come back with rows.
      if (hadRows) await expect(dataRows(page).first()).toBeVisible()
      else await expect(tableSettled(page)).toBeVisible()
    })
  }

  if (s.detail) {
    const detail = s.detail
    test('clicking the first row opens its details', async ({ page }) => {
      await expect(tableSettled(page)).toBeVisible()
      test.skip(await emptyTableMessage(page).isVisible(), 'No records in the local database')
      await dataRows(page).first().locator('td').nth(1).click()
      await expect(page).toHaveURL(detail.url)
      await expect(pageHeading(page, detail.heading)).toBeVisible()
    })
  }
}
