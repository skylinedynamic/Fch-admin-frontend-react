import { test } from '@playwright/test'
import { mockApi, ok, seedSession } from '../../support/helpers'
import { STAFF, openNewEvent, expectAssignSwitchOnlyForTask } from '../../support/activityTaskAssign'

// Lead profile › Activity log › New Event offers "Want to Assign" for a Task.
// The full assign flow is in e2e/sidebar/clients/activity-task-assign.spec.ts (same modal).

const LEAD = {
  id: 51, contact_person: 'Lena Lead', company_name: 'Lead Works', email: 'lena@example.test', phone_number: '(555) 010-0001',
  lead_type: 'Borrower', status: 'New', country: 'United States', state: 'Texas', city: 'Austin', convert_to: null,
}

test('Lead activity log - "Want to Assign" is offered only for a Task', async ({ page }) => {
  await seedSession(page, { permissions: ['view leads', 'update leads'] })
  await mockApi(page, [
    { method: 'GET', match: /\/common\/leads\/51$/, body: ok(LEAD) },
    { method: 'POST', match: '/common/get-all-users', body: ok(STAFF) },
  ])
  await page.goto('/leads/51')
  await openNewEvent(page)
  await expectAssignSwitchOnlyForTask(page)
})
