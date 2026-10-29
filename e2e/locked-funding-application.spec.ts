import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, seedSession, type SessionUser } from './support/helpers'

// SCRUM-331: a funding application whose status isn't in the API's editable
// list tells every viewer - host, white-label partner, certified partner - that
// it can't be edited and why: on the details page, and on the edit form if its
// URL is opened directly. Every backend call is mocked.

const PERMISSIONS = ['view funding application', 'view funding request']

const HOST: SessionUser = { id: 1, is_host: 1, partner_id: 1, partner_type: null, permissions: PERMISSIONS }
const WHITE_LABEL: SessionUser = { id: 2, is_host: 0, user_type: 'Partner', partner_id: 2, partner_type: 'White-Label Partner (WL)', permissions: PERMISSIONS }
const CERTIFIED: SessionUser = { id: 3, is_host: 0, user_type: 'Partner', partner_id: 2, partner_type: 'Certified Partner', permissions: PERMISSIONS }

const reasonFor = (status: string) =>
  `This application can no longer be edited because it is "${status}". Contact your funding advisor if something needs to change.`

const applicationAt = (status: string) => ({
  id: 80,
  application_number: 'FUND-80',
  partner_id: 2,
  borrower_id: 3,
  status,
  funding_request_id: 29,
  funding_request_status: 'Approved',
  is_editable: false,
  locked_reason: reasonFor(status),
  full_name: 'Michael Chen',
  business_name: 'Alpha Tech Solutions',
  co_borrowers: [],
  documents: [],
})

async function openDetails(page: Page, user: SessionUser, status: string) {
  await seedSession(page, user)
  await mockApi(page, [
    { method: 'GET', match: /\/common\/request-application\/funding-application\/80$/, body: ok(applicationAt(status)) },
  ])
  await page.goto('/intake-review/funding-application/80')
  await expect(page.getByText('Funding Application Details').first()).toBeVisible()
}

for (const [who, user] of [['the host', HOST], ['a white-label partner', WHITE_LABEL], ['a certified partner', CERTIFIED]] as const) {
  test.describe(`Funding Application Details › locked › ${who}`, () => {
    for (const status of ['Matched to Lender', 'Funded', 'Withdrawn', 'Closed - Error']) {
      test(`is told it can't be edited at ${status}`, async ({ page }) => {
        await openDetails(page, user, status)

        await expect(page.getByRole('link', { name: /edit funding application/i })).toHaveCount(0)
        await expect(page.getByRole('button', { name: /can't edit funding application/i })).toBeDisabled()
        await expect(page.getByRole('status').filter({ hasText: reasonFor(status) })).toBeVisible()
      })
    }
  })
}

test.describe('Edit form › opened on a locked application', () => {
  for (const [who, user] of [['the host', HOST], ['a white-label partner', WHITE_LABEL]] as const) {
    test(`${who} sees why instead of the form`, async ({ page }) => {
      await seedSession(page, user)
      await mockApi(page, [
        { match: '/common/funding-sequencings/grouped', body: ok({ groups: [] }) },
        {
          method: 'GET',
          match: '/common/funding-application/funding-request',
          body: ok({ id: 80, funding_request_id: 29, status: 'Withdrawn', is_editable: false, is_locked: true, locked_reason: reasonFor('Withdrawn') }),
        },
      ])
      await page.goto('/fund-application/29')

      await expect(page.getByRole('heading', { name: "Can't Edit Funding Application" })).toBeVisible()
      await expect(page.getByText(reasonFor('Withdrawn'))).toBeVisible()
      await expect(page.getByText(/Step \d+ of \d+:/).filter({ visible: true })).toHaveCount(0)
    })
  }
})
