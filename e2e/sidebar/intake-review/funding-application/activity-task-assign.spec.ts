import { test } from '@playwright/test'
import { mockApi, ok, seedSession } from '../../../support/helpers'
import { STAFF, openNewEvent, expectAssignSwitchOnlyForTask, expectAssignSetup } from '../../../support/activityTaskAssign'

// Intake & Review › Funding Application › Activity log › New Event:
// "Want to Assign" for a Task lists the application's partner's staff, with
// its borrower's Assign to above ("Borrower Assign to"). The full assign and
// edit flows are in e2e/sidebar/clients/activity-task-assign.spec.ts (same modals).

const APPLICATION = {
  id: 80, application_number: 'FUND-80', partner_id: 2, borrower_id: 3, status: 'Pending',
  funding_request_id: 29, funding_request_status: 'Approved', is_editable: true,
  full_name: 'Michael Chen', business_name: 'Alpha Tech Solutions', co_borrowers: [], documents: [],
  borrower: { id: 3, email: 'michael@example.test', assign_id: 14 },
}

async function openApplication(page: import('@playwright/test').Page) {
  await seedSession(page, { id: 1, is_host: 1, partner_id: 1, permissions: ['view funding application', 'view funding request'] })
  const api = await mockApi(page, [
    { method: 'GET', match: /\/common\/request-application\/funding-application\/80$/, body: ok(APPLICATION) },
    { method: 'POST', match: '/common/get-all-users', body: ok(STAFF) },
  ])
  await page.goto('/intake-review/funding-application/80')
  await openNewEvent(page)
  return api
}

test.describe('Funding application activity log - assign a Task', () => {
  test('"Want to Assign" is offered only for a Task', async ({ page }) => {
    await openApplication(page)
    await expectAssignSwitchOnlyForTask(page)
  })

  test("it lists the application's partner's staff, with the borrower's Assign to above", async ({ page }) => {
    const api = await openApplication(page)
    await expectAssignSetup(page, api, { teamRequest: { partner_id: 2 }, ownerLabel: 'Borrower Assign to', ownerText: 'Blake Ops' })
  })
})
