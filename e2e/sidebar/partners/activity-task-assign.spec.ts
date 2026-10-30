import { test, expect } from '@playwright/test'
import { mockApi, ok, seedSession } from '../../support/helpers'
import { STAFF, activityModal, openNewEvent, expectAssignSwitchOnlyForTask, expectAssignSetup } from '../../support/activityTaskAssign'

// Partner profile › Activity log › New Event: "Want to Assign" for a Task
// lists the host's own staff (no partner is sent), with the partner's Agent
// above. The full assign and edit flows are in
// e2e/sidebar/clients/activity-task-assign.spec.ts (same modals).

const PARTNER = {
  id: 5, entity_id: 5, full_name: 'Wile Coyote', company_name: 'Acme Funding', email: 'wile@acme.test', phone_number: '(444) 444-4444',
  partner_type: 'White-Label Partner (WL)', is_host: 0, status: 'active', country: 'United States', subscriptions: [],
  assigned_user_id: 14,
}

async function openPartner(page: import('@playwright/test').Page, partner: Record<string, unknown> = PARTNER) {
  await seedSession(page, { permissions: ['view partners', 'create partners', 'update partners'] })
  const api = await mockApi(page, [
    { method: 'GET', match: '/admin/partners-details/5', body: ok(partner) },
    { method: 'POST', match: '/common/get-all-users', body: ok(STAFF) },
  ])
  await page.goto('/partners/5?tab=statusAgent')
  await openNewEvent(page)
  return api
}

test.describe('Partner activity log - assign a Task', () => {
  test('"Want to Assign" is offered only for a Task', async ({ page }) => {
    await openPartner(page)
    await expectAssignSwitchOnlyForTask(page)
  })

  test("it lists the host's own staff, with the partner's Agent above", async ({ page }) => {
    const api = await openPartner(page)
    await expectAssignSetup(page, api, { teamRequest: { active_only: true, keep_ids: [14] }, ownerLabel: 'Partner Agent', ownerText: 'Blake Ops' })
  })

  test('says so when the partner has no Agent yet', async ({ page }) => {
    const api = await openPartner(page, { ...PARTNER, assigned_user_id: null })
    await expectAssignSetup(page, api, { teamRequest: { active_only: true }, ownerLabel: 'Partner Agent', ownerText: 'No one has been assigned yet' })
    await expect(activityModal(page).locator('#activityTaskOwner')).toHaveClass(/is-empty/)
  })
})

test.describe('Partner Agent - active staff only', () => {
  test("asks for active staff, keeping the partner's saved Agent", async ({ page }) => {
    const api = await openPartner(page)

    await expect
      .poll(() => api.find('POST', '/common/get-all-users').map((c) => JSON.stringify(c.json ?? {})))
      .toContain(JSON.stringify({ active_only: true, keep_ids: [14] }))
  })
})
