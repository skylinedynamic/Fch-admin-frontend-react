import { test } from '@playwright/test'
import { mockApi, ok, seedSession } from '../../support/helpers'
import { STAFF, openNewEvent, expectAssignSwitchOnlyForTask, expectAssignSetup } from '../../support/activityTaskAssign'

// Lead profile › Activity log › New Event: "Want to Assign" for a Task lists
// the lead's partner's staff, with the Lead Owner above. The full assign and
// edit flows are in e2e/sidebar/clients/activity-task-assign.spec.ts (same modals).

const LEAD = {
  id: 51, contact_person: 'Lena Lead', company_name: 'Lead Works', email: 'lena@example.test', phone_number: '(555) 010-0001',
  lead_type: 'Borrower', status: 'New', country: 'United States', state: 'Texas', city: 'Austin', convert_to: null,
  partner: { id: 2, full_name: 'Owner', company_name: 'WLP Co' }, salesperson_id: 14, salesperson_name: 'Blake Ops',
}

async function openLead(page: import('@playwright/test').Page) {
  await seedSession(page, { permissions: ['view leads', 'update leads'] })
  const api = await mockApi(page, [
    { method: 'GET', match: /\/common\/leads\/51$/, body: ok(LEAD) },
    { method: 'POST', match: '/common/get-all-users', body: ok(STAFF) },
  ])
  await page.goto('/leads/51')
  await openNewEvent(page)
  return api
}

test.describe('Lead activity log - assign a Task', () => {
  test('"Want to Assign" is offered only for a Task', async ({ page }) => {
    await openLead(page)
    await expectAssignSwitchOnlyForTask(page)
  })

  test("it lists the lead's partner's staff, with the Lead Owner above", async ({ page }) => {
    const api = await openLead(page)
    await expectAssignSetup(page, api, { teamRequest: { partner_id: 2 }, ownerLabel: 'Lead Owner', ownerText: 'Blake Ops' })
  })
})
