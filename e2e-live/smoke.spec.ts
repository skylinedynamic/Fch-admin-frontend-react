import { test, expect } from '@playwright/test'
import { requireCredentials, trackServerErrors } from './env'

/**
 * Opens each list screen against the real backend. The mocked suite proves
 * the UI logic; this proves the screens still work with what the API really
 * returns: the request succeeds, the page renders, and nothing 5xx'd on the way.
 *
 * `request` is the list call the screen must make. A screen the signed-in
 * account has no permission for is skipped, not failed.
 */
const SCREENS: Array<{ name: string; path: string; request: string; heading: RegExp }> = [
  { name: 'Users', path: '/users', request: '/common/users/fetch-users', heading: /^Users$/ },
  { name: 'Roles & permissions', path: '/roles-permissions', request: '/common/roles', heading: /Roles & Permissions/ },
  { name: 'Clients', path: '/clients', request: '/common/borrowers/fetch-all-borrowers', heading: /^Clients$/ },
  { name: 'Partners', path: '/partners', request: '/admin/partners/fetch-partners', heading: /^Partners$/ },
  { name: 'Employees', path: '/employees', request: '/common/employees/fetch-employees', heading: /^Employees$/ },
  { name: 'Contacts', path: '/contacts', request: '/common/contacts/fetch-contacts', heading: /^Contacts$/ },
  { name: 'Leads', path: '/leads', request: '/common/leads/fetch-leads', heading: /^Leads$/ },
  { name: 'Lenders', path: '/lenders', request: '/admin/lenders', heading: /^Lenders$/ },
  { name: 'Funding sequences', path: '/funding', request: '/common/funding-sequencings/fetch', heading: /^Funding$/ },
  { name: 'Tiers', path: '/tiers', request: '/admin/credit-builder/tiers/fetch-tiers', heading: /Manage Tier/ },
  { name: 'Credit accounts', path: '/credit-accounts', request: '/admin/credit-builder/credit-accounts/fetch-accounts', heading: /Credit Accounts/ },
  { name: 'Capital access', path: '/capital-access', request: '/common/capital-accesses/fetch-all', heading: /Capital Access/ },
  { name: 'Verification center', path: '/verification-center', request: '/common/credit-builder/verification-center-fetch-all', heading: /Verification Center/ },
  { name: 'Pre-qualification', path: '/intake-review/pre-qualification', request: '/common/request-application/pre-qualification', heading: /Pre-Qualification Applications/ },
  { name: 'Funding applications', path: '/intake-review/funding-application', request: '/common/request-application/funding-application', heading: /Funding Applications/ },
  { name: 'Funding requests', path: '/intake-review/funding-request', request: '/common/funding-request', heading: /Funding Requests/ },
  { name: 'Change requests', path: '/intake-review/change-requests', request: '/admin/change-requests', heading: /Change Requests/ },
  { name: 'Payments', path: '/payments', request: '/common/payments/fetch-payments', heading: /^Payments$/ },
  { name: 'Invoices', path: '/invoices', request: '/common/invoices/fetch-invoices', heading: /^Invoices$/ },
  { name: 'Subscriptions', path: '/subscriptions', request: '/common/subscriptions/fetch-all', heading: /^Subscriptions$/ },
  { name: 'Upcoming billing', path: '/billing', request: '/common/billing/fetch-upcoming', heading: /Upcoming Billings/ },
  { name: 'Commissions', path: '/commissions', request: '/common/commissions', heading: /^Commissions$/ },
  { name: 'Blogs', path: '/cms/blogs', request: '/admin/cms/blogs/fetch', heading: /^Blogs$/ },
  { name: 'SEO settings', path: '/cms/seo-settings', request: '/admin/cms/seo-settings', heading: /SEO Settings/ },
  { name: 'Reminders', path: '/reminders', request: '/common/reminders/fetch-reminders', heading: /Task & Reminder Events/ },
  { name: 'Loan applications', path: '/embed-form/loan-applications', request: '/common/embed-forms/submissions/fetch', heading: /Loan Applications/ },
]

// 'php artisan serve' handles one request at a time, and a screen fires several on load, so the
// list call can sit in the queue for a while on a developer machine.
const LIST_TIMEOUT = Number(process.env.E2E_LIVE_TIMEOUT_MS || 60_000)

test.describe('Live - list screens load real data', () => {
  test.beforeEach(() => requireCredentials())
  test.setTimeout(LIST_TIMEOUT + 30_000)

  for (const screen of SCREENS) {
    test(`${screen.name} loads from the real API`, async ({ page }) => {
      const serverErrors = trackServerErrors(page)
      const listResponse = page
        .waitForResponse((r) => r.url().includes(screen.request) && r.request().method() !== 'OPTIONS', { timeout: LIST_TIMEOUT })
        .catch(() => null)

      await page.goto(screen.path)

      // Guards send the user elsewhere when the account lacks the permission
      // (or is not the host): that is configuration, not a defect.
      await page.waitForLoadState('domcontentloaded')
      const landed = new URL(page.url()).pathname
      test.skip(landed !== screen.path, `The signed-in account cannot open ${screen.path} (landed on ${landed}).`)

      const response = await listResponse
      expect(response, `${screen.path} never called ${screen.request}`).not.toBeNull()
      expect(response!.status(), `${screen.request} responded ${response!.status()}`).toBe(200)

      const body = await response!.json()
      expect(body, `${screen.request} did not return the ApiResponse envelope`).toHaveProperty('status')
      expect(body.status, body.message).toBe(true)

      await expect(page.getByRole('heading', { name: screen.heading }).first()).toBeVisible()
      expect(serverErrors, `Server errors while loading ${screen.path}: ${JSON.stringify(serverErrors)}`).toEqual([])
    })
  }
})

test.describe('Live - dashboard', () => {
  test.beforeEach(() => requireCredentials())

  test('the dashboard loads for the signed-in user', async ({ page }) => {
    const serverErrors = trackServerErrors(page)
    const dashboard = page.waitForResponse((r) => r.url().includes('/common/dashboard'))
    await page.goto('/')
    expect((await dashboard).status()).toBe(200)
    await expect(page.getByText(/^Welcome, /)).toBeVisible()
    expect(serverErrors).toEqual([])
  })
})
