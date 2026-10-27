import { test } from '@playwright/test'
import { mockApi, ok, seedSession } from '../../../support/helpers'
import { STAFF, openNewEvent, expectAssignSwitchOnlyForTask } from '../../../support/activityTaskAssign'

// Intake & Review › Funding Application › Activity log › New Event offers
// "Want to Assign" for a Task. The full assign flow is in
// e2e/sidebar/clients/activity-task-assign.spec.ts (same modal).

const APPLICATION = {
  id: 80, application_number: 'FUND-80', partner_id: 2, borrower_id: 3, status: 'Pending',
  funding_request_id: 29, funding_request_status: 'Approved', is_editable: true,
  full_name: 'Michael Chen', business_name: 'Alpha Tech Solutions', co_borrowers: [], documents: [],
}

test('Funding application activity log - "Want to Assign" is offered only for a Task', async ({ page }) => {
  await seedSession(page, { id: 1, is_host: 1, partner_id: 1, permissions: ['view funding application', 'view funding request'] })
  await mockApi(page, [
    { method: 'GET', match: /\/common\/request-application\/funding-application\/80$/, body: ok(APPLICATION) },
    { method: 'POST', match: '/common/get-all-users', body: ok(STAFF) },
  ])
  await page.goto('/intake-review/funding-application/80')
  await openNewEvent(page)
  await expectAssignSwitchOnlyForTask(page)
})
