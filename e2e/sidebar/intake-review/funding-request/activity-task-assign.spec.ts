import { test } from '@playwright/test'
import { mockApi, ok, seedSession } from '../../../support/helpers'
import { STAFF, openNewEvent, expectAssignSwitchOnlyForTask, expectAssignSetup } from '../../../support/activityTaskAssign'

// Intake & Review › Funding Request › Activity log › New Event: "Want to
// Assign" for a Task lists the request's partner's staff, with its
// borrower's Assign to above ("Borrower Assign to"). The full assign and
// edit flows are in e2e/sidebar/clients/activity-task-assign.spec.ts (same modals).

const REVIEW = {
  id: 501, status: 'Pending', partner_id: 5, borrower_id: 7,
  borrower: { id: 7, first_name: 'Jane', last_name: 'Doe', email: 'jane@example.test', assign_id: 14 },
  partner: { full_name: 'Acme Funding', email: 'acme@example.test' },
  funding_sequence: { name: 'Working capital' }, use_of_funds: 'Inventory', funding_type: 'Term Loan',
  requested_amount: 50000, estimated_speed: '2 weeks', matched_lenders: [], assign_lender: null, documents: [],
}

async function openRequest(page: import('@playwright/test').Page) {
  await seedSession(page, { permissions: ['view funding request', 'update funding request'] })
  const api = await mockApi(page, [
    { method: 'GET', match: /\/common\/funding-request\/501$/, body: ok(REVIEW) },
    { method: 'POST', match: '/common/get-all-users', body: ok(STAFF) },
  ])
  await page.goto('/intake-review/funding-request/501')
  await openNewEvent(page)
  return api
}

test.describe('Funding request activity log - assign a Task', () => {
  test('"Want to Assign" is offered only for a Task', async ({ page }) => {
    await openRequest(page)
    await expectAssignSwitchOnlyForTask(page)
  })

  test("it lists the request's partner's staff, with the borrower's Assign to above", async ({ page }) => {
    const api = await openRequest(page)
    await expectAssignSetup(page, api, { teamRequest: { partner_id: 5 }, ownerLabel: 'Borrower Assign to', ownerText: 'Blake Ops' })
  })
})
