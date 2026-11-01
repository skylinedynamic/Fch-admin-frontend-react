import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, seedSession, type SessionUser } from './support/helpers'

// SCRUM-286: "Edit Funding Application" is for the host, on any partner's
// application, and for a white-label partner, on its own borrowers' only.
// A certified partner never gets it. Every backend call is mocked.

// Everyone here may open both pages; only the role decides the button.
const PERMISSIONS = ['view funding application', 'view funding request']

const HOST: SessionUser = { id: 1, is_host: 1, partner_id: 1, partner_type: null, permissions: PERMISSIONS }
const WHITE_LABEL: SessionUser = { id: 2, is_host: 0, user_type: 'Partner', partner_id: 2, partner_type: 'White-Label Partner (WL)', permissions: PERMISSIONS }
const OTHER_WHITE_LABEL: SessionUser = { id: 9, is_host: 0, user_type: 'Partner', partner_id: 9, partner_type: 'White-Label Partner (WL)', permissions: PERMISSIONS }
const CERTIFIED: SessionUser = { id: 3, is_host: 0, user_type: 'Partner', partner_id: 2, partner_type: 'Certified Partner', permissions: PERMISSIONS }

// A submitted application of partner 2's borrower, on an approved request, in an editable status.
const APPLICATION = {
  id: 80,
  application_number: 'FUND-80',
  partner_id: 2,
  borrower_id: 3,
  status: 'Pending',
  funding_request_id: 29,
  funding_request_status: 'Approved',
  is_editable: true,
  full_name: 'Michael Chen',
  business_name: 'Alpha Tech Solutions',
  co_borrowers: [],
  documents: [],
}

const REQUEST = {
  id: 29,
  partner_id: 2,
  borrower_id: 3,
  borrower: { id: 3, first_name: 'Michael', last_name: 'Chen', business_name: 'Alpha Tech Solutions' },
  status: 'Approved',
  funding_type: 'Term Loan',
  requested_amount: 50000,
  documents_with_urls: [],
  matched_lenders: [],
  lender_names: [],
  funding_application: { id: 80, status: 'Pending', is_editable: true },
  created_at: '2026-10-01T10:00:00Z',
  updated_at: '2026-10-01T10:00:00Z',
}

async function open(page: Page, user: SessionUser, path: string) {
  await seedSession(page, user)
  await mockApi(page, [
    { method: 'GET', match: /\/common\/request-application\/funding-application\/80$/, body: ok(APPLICATION) },
    { method: 'GET', match: /\/common\/funding-request\/29$/, body: ok(REQUEST) },
  ])
  await page.goto(path)
}

const editLink = (page: Page) => page.getByRole('link', { name: /edit funding application/i })

for (const [where, path, ready] of [
  ['Funding Application Details', '/intake-review/funding-application/80', 'Funding Application Details'],
  ['Funding Request Details', '/intake-review/funding-request/29', 'Go to Client'],
] as const) {
  test.describe(`${where} › Edit Funding Application`, () => {
    test("the host gets it, even on another partner's application", async ({ page }) => {
      await open(page, HOST, path)

      await expect(editLink(page)).toHaveAttribute('href', '/fund-application/29')
    })

    test("a white-label partner gets it on its own borrower's application", async ({ page }) => {
      await open(page, WHITE_LABEL, path)

      await expect(editLink(page)).toHaveAttribute('href', '/fund-application/29')
    })

    test("a white-label partner does not get it on another partner's application", async ({ page }) => {
      await open(page, OTHER_WHITE_LABEL, path)

      await expect(page.getByText(ready).first()).toBeVisible()
      await expect(editLink(page)).toHaveCount(0)
    })

    test('a certified partner never gets it', async ({ page }) => {
      await open(page, CERTIFIED, path)

      await expect(page.getByText(ready).first()).toBeVisible()
      await expect(editLink(page)).toHaveCount(0)
    })
  })
}

test('the host’s Edit Funding Application opens the edit form on the request', async ({ page }) => {
  await open(page, HOST, '/intake-review/funding-application/80')

  await editLink(page).click()

  await expect(page).toHaveURL(/\/fund-application\/29$/)
})
