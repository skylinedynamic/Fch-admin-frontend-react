import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, seedSession, expectCall, type ApiMock } from '../../support/helpers'
import { STAFF, activityModal, openNewEvent, pickReference, assignSwitch, expectAssignSwitchOnlyForTask } from '../../support/activityTaskAssign'

/**
 * Client detail › Activity log › New Event: a Task can be assigned to a staff
 * member with its own due date, priority and status. The other pages that
 * open this modal check the switch in their own folders; the API rules are
 * covered by fch-api's ActivityLogTaskAssignmentTest.
 */

const CLIENT = {
  id: 1, first_name: 'Johnathan', last_name: 'Smithfield', business_name: 'Smithfield Bakery LLC',
  email: 'borrower@example.test', phone_number: '(222) 222-2222', partner_id: 2, status: 'active',
}

async function openClient(page: Page): Promise<ApiMock> {
  await seedSession(page, { permissions: ['view clients', 'create clients', 'update clients'] })
  const api = await mockApi(page, [
    { method: 'GET', match: /\/common\/borrowers\/1$/, body: ok(CLIENT) },
    { method: 'POST', match: '/common/get-all-users', body: ok(STAFF) },
  ])
  await page.goto('/clients/1')
  await openNewEvent(page)
  return api
}

const field = (page: Page, label: RegExp) => activityModal(page).getByLabel(label)

test.describe('Client activity log - assign a Task', () => {
  test('the "Want to Assign" switch is offered only for a Task', async ({ page }) => {
    await openClient(page)
    await expectAssignSwitchOnlyForTask(page)
  })

  test('switching it on opens Assigned To, Due Date / Time, Priority and Status below the reminder', async ({ page }) => {
    const api = await openClient(page)
    await pickReference(page, 'Task')

    await expect(field(page, /^Assigned To/)).toHaveCount(0)
    await assignSwitch(page).check()
    await expectCall(api, 'POST', '/common/get-all-users')

    await expect(field(page, /^Assigned To/).locator('option')).toHaveText(['Select staff member', 'Avery Staff', 'Blake Ops'])
    await expect(field(page, /^Due Date \/ Time/)).toBeVisible()
    await expect(field(page, /^Priority/).locator('option')).toHaveText(['Low', 'Medium', 'High'])
    await expect(field(page, /^Priority/)).toHaveValue('medium')
    await expect(field(page, /^Status/).locator('option')).toHaveText(['Open', 'In Progress', 'Complete'])
    await expect(field(page, /^Status/)).toHaveValue('open')

    // Below the reminder switch.
    const reminderBox = await activityModal(page).getByLabel('Set Reminder').boundingBox()
    const sectionBox = await activityModal(page).locator('#activityTaskAssignment').boundingBox()
    expect(sectionBox!.y).toBeGreaterThan(reminderBox!.y)
  })

  test('creating the Task sends the assignee, due date, priority and status', async ({ page }) => {
    const api = await openClient(page)
    api.add({ method: 'POST', match: /\/common\/activity-logs$/, status: 201, body: ok({ id: 9 }, 'Activity created successfully') })

    await pickReference(page, 'Task')
    await activityModal(page).locator('#activitySummary').fill('Collect bank statements')
    await assignSwitch(page).check()
    await field(page, /^Assigned To/).selectOption({ label: 'Blake Ops' })
    await field(page, /^Due Date \/ Time/).fill('02 Nov, 2030 03:30 PM')
    await field(page, /^Priority/).selectOption('high')
    await field(page, /^Status/).selectOption('in_progress')

    await activityModal(page).getByRole('button', { name: 'Create' }).click()

    const call = await expectCall(api, 'POST', /\/common\/activity-logs$/)
    expect(call.json).toMatchObject({
      reference: 'Task',
      assign_task: '1',
      assigned_to: '14',
      task_due_at: '2030-11-02 15:30:00',
      task_priority: 'high',
      task_status: 'in_progress',
    })
    await expect(page.getByText('Activity created successfully').first()).toBeVisible()
  })

  test('the API\'s validation messages appear under the task fields', async ({ page }) => {
    const api = await openClient(page)
    api.add({
      method: 'POST',
      match: /\/common\/activity-logs$/,
      status: 422,
      body: {
        status: false,
        message: 'Validation failed',
        errors: {
          assigned_to: 'Please select who the task is assigned to.',
          task_due_at: 'Please select when the task is due.',
        },
      },
    })

    await pickReference(page, 'Task')
    await activityModal(page).locator('#activitySummary').fill('Collect bank statements')
    await assignSwitch(page).check()
    await activityModal(page).getByRole('button', { name: 'Create' }).click()

    const modal = activityModal(page)
    await expect(modal.getByText('Please select who the task is assigned to.')).toBeVisible()
    await expect(modal.getByText('Please select when the task is due.')).toBeVisible()
    await expect(field(page, /^Assigned To/)).toHaveClass(/is-invalid/)
  })
})
