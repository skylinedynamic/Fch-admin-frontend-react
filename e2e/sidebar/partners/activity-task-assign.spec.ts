import { test } from '@playwright/test'
import { mockApi, ok, seedSession } from '../../support/helpers'
import { STAFF, openNewEvent, expectAssignSwitchOnlyForTask } from '../../support/activityTaskAssign'

// Partner profile › Activity log › New Event offers "Want to Assign" for a Task.
// The full assign flow is in e2e/sidebar/clients/activity-task-assign.spec.ts (same modal).

const PARTNER = {
  id: 5, entity_id: 5, full_name: 'Wile Coyote', company_name: 'Acme Funding', email: 'wile@acme.test', phone_number: '(444) 444-4444',
  partner_type: 'White-Label Partner (WL)', is_host: 0, status: 'active', country: 'United States', subscriptions: [],
}

test('Partner activity log - "Want to Assign" is offered only for a Task', async ({ page }) => {
  await seedSession(page, { permissions: ['view partners', 'create partners', 'update partners'] })
  await mockApi(page, [
    { method: 'GET', match: '/admin/partners-details/5', body: ok(PARTNER) },
    { method: 'POST', match: '/common/get-all-users', body: ok(STAFF) },
  ])
  await page.goto('/partners/5?tab=statusAgent')
  await openNewEvent(page)
  await expectAssignSwitchOnlyForTask(page)
})
