import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, seedSession, expectCall, type ApiMock } from '../../support/helpers'
import {
  STAFF,
  activityModal,
  editModal,
  openNewEvent,
  pickOption,
  pickReference,
  assignSwitch,
  expectAssignSwitchOnlyForTask,
  expectAssignSetup,
} from '../../support/activityTaskAssign'

/**
 * Client detail › Activity log: a Task can be assigned to one of the client's
 * partner's staff with a due day, priority and status - on New Event, and
 * changed or removed on Edit. The other pages that open these modals check
 * their own setup in their own folders; the API rules, notifications and
 * reminders are covered by fch-api's ActivityLogTask*Test.
 */

const CLIENT = {
  id: 1, first_name: 'Johnathan', last_name: 'Smithfield', business_name: 'Smithfield Bakery LLC',
  email: 'borrower@example.test', phone_number: '(222) 222-2222', partner_id: 2, status: 'active',
  assign_id: 14, assign_name: 'Blake Ops',
}

const TASK_ROW = {
  id: 77, log_name: 'activity', log_type_raw: 'activity', reference: 'Task', subject: 'Collect bank statements',
  event: 'Collect bank statements', event_label: 'Collect bank statements', description: '<p>Ask for 3 months</p>',
  activity_date: '2030-11-05 10:00:00', visibility: 'private', is_manual: true, is_owner: true, can_edit: true, can_delete: true,
  causer_name: 'Host Admin', created_at: '2026-10-28 10:00:00', updated_at: '2026-10-28 10:00:00', attachments: [], remind_me: false,
  properties: { reference: 'Task', subject: 'Collect bank statements' },
  task: { assigned_to: 12, assigned_user: { id: 12, name: 'Avery Staff' }, due_date: '2030-11-07 15:30:00', priority: 'high', priority_label: 'High', status: 'open', status_label: 'Open' },
}

async function openClient(page: Page, activities: unknown[] = []): Promise<ApiMock> {
  await seedSession(page, { permissions: ['view clients', 'create clients', 'update clients'] })
  const api = await mockApi(page, [
    { method: 'GET', match: /\/common\/borrowers\/1$/, body: ok(CLIENT) },
    { method: 'POST', match: '/common/get-all-users', body: ok(STAFF) },
    { method: 'POST', match: '/common/activity-logs/fetch-all-activities', body: ok(activities) },
  ])
  await page.goto('/clients/1')
  return api
}

test.describe('Client activity log - assign a Task (New Event)', () => {
  test('the "Want to Assign" switch is offered only for a Task', async ({ page }) => {
    await openClient(page)
    await openNewEvent(page)
    await expectAssignSwitchOnlyForTask(page)
  })

  test("it lists the client's partner's staff and shows who the client is assigned to", async ({ page }) => {
    const api = await openClient(page)
    await openNewEvent(page)

    await expectAssignSetup(page, api, { teamRequest: { partner_id: 2, active_only: true, keep_ids: [14] }, ownerLabel: 'Client Assigned To', ownerText: 'Blake Ops' })
    await expect(activityModal(page).locator('#activityTaskOwner')).toContainText('blake@example.test')
  })

  test('the section sits above the reminder with the config defaults', async ({ page }) => {
    await openClient(page)
    const modal = await openNewEvent(page)
    await pickReference(page, 'Task')
    await assignSwitch(modal).check()

    await expect(modal.locator('#activityAssignedTo')).toContainText('Select staff member')
    await expect(modal.locator('#activityTaskDueAt')).toHaveAttribute('placeholder', 'Select due date & time')
    await expect(modal.locator('#activityTaskPriority')).toContainText('Medium')
    await expect(modal.locator('#activityTaskStatus')).toContainText('Open')

    const reminderBox = await modal.getByRole('switch', { name: 'Set Reminder' }).boundingBox()
    const sectionBox = await modal.locator('#activityTaskAssignment').boundingBox()
    expect(reminderBox!.y).toBeGreaterThan(sectionBox!.y)
  })

  test('creating the Task sends the assignee, due date and time, priority and status', async ({ page }) => {
    const api = await openClient(page)
    api.add({ method: 'POST', match: /\/common\/activity-logs$/, status: 201, body: ok({ id: 9 }, 'Activity created successfully') })
    const modal = await openNewEvent(page)

    await pickReference(page, 'Task')
    await modal.locator('#activitySummary').fill('Collect bank statements')
    await assignSwitch(modal).check()
    await pickOption(page, modal, 'activityAssignedTo', 'Blake Ops')
    await modal.locator('#activityTaskDueAt').fill('02 Nov, 2030 03:30 PM')
    // Close the calendar by clicking away (Escape would close the whole modal).
    await modal.locator('.modal-title').click()
    await pickOption(page, modal, 'activityTaskPriority', 'High')
    await pickOption(page, modal, 'activityTaskStatus', 'In Progress')

    await modal.getByRole('button', { name: 'Create' }).click()

    const call = await expectCall(api, 'POST', /\/common\/activity-logs$/)
    expect(call.json).toMatchObject({
      reference: 'Task',
      assign_task: '1',
      assigned_to: '14',
      task_due_date: '2030-11-02 15:30:00',
      task_priority: 'high',
      task_status: 'in_progress',
    })
    await expect(page.getByText('Activity created successfully').first()).toBeVisible()
  })

  test('the reminder of an assigned Task goes to whoever is picked', async ({ page }) => {
    const api = await openClient(page)
    api.add({ method: 'POST', match: /\/common\/activity-logs$/, status: 201, body: ok({ id: 9 }, 'Activity created successfully') })
    const modal = await openNewEvent(page)

    await pickReference(page, 'Task')
    await modal.locator('#activitySummary').fill('Collect bank statements')
    await assignSwitch(modal).check()
    await pickOption(page, modal, 'activityAssignedTo', 'Blake Ops')
    await modal.locator('#activityTaskDueAt').fill('02 Nov, 2030 03:30 PM')
    await modal.locator('.modal-title').click()
    await modal.getByRole('switch', { name: 'Set Reminder' }).check()

    const recipients = modal.getByRole('radiogroup', { name: 'Who gets the reminder' })
    await expect(recipients.getByLabel('Both')).toBeChecked()
    await recipients.getByLabel('Assignee').check()

    await modal.getByRole('button', { name: 'Create' }).click()

    const call = await expectCall(api, 'POST', /\/common\/activity-logs$/)
    expect(call.json).toMatchObject({ remind_me: '1', reminder_recipient: 'assignee' })
  })

  test("the API's validation messages appear under the task fields", async ({ page }) => {
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
          task_due_date: 'Please select when the task is due.',
        },
      },
    })
    const modal = await openNewEvent(page)

    await pickReference(page, 'Task')
    await modal.locator('#activitySummary').fill('Collect bank statements')
    await assignSwitch(modal).check()
    await modal.getByRole('button', { name: 'Create' }).click()

    await expect(modal.getByText('Please select who the task is assigned to.')).toBeVisible()
    await expect(modal.getByText('Please select when the task is due.')).toBeVisible()
    await expect(modal.locator('#activityAssignedTo')).toHaveClass(/is-invalid/)
    // Shown on the form only - validation is never toasted.
    await expect(page.locator('.Toastify__toast')).toHaveCount(0)
  })

  test('a Task can be dated in the past', async ({ page }) => {
    const api = await openClient(page)
    api.add({ method: 'POST', match: /\/common\/activity-logs$/, status: 201, body: ok({ id: 9 }, 'Activity created successfully') })
    const modal = await openNewEvent(page)

    await pickReference(page, 'Task')
    await modal.locator('#activityDate').fill('01 Jan, 2020 10:00 AM')
    // Close the calendar by clicking away (Escape would close the whole modal).
    await modal.locator('.modal-title').click()
    await modal.locator('#activitySummary').fill('Follow up on the call')

    await expect(modal.getByText(/must be in the future/)).toHaveCount(0)
    await modal.getByRole('button', { name: 'Create' }).click()

    const call = await expectCall(api, 'POST', /\/common\/activity-logs$/)
    expect(String(call.json.activity_date)).toMatch(/^2020-01-01 /)
    await expect(page.getByText('Activity created successfully').first()).toBeVisible()
  })
})

test.describe('Client activity log - change a Task assignment (Edit)', () => {
  async function openEdit(page: Page) {
    const api = await openClient(page, [TASK_ROW])
    await page.getByRole('button', { name: 'Edit activity' }).first().click()
    const modal = editModal(page)
    await expect(assignSwitch(modal)).toBeChecked()
    return { api, modal }
  }

  test("opens with the saved assignment and the client's partner's staff", async ({ page }) => {
    const { api, modal } = await openEdit(page)

    // The same design as New Activity: header, Reference picker, visibility cards, option cards
    await expect(modal).toHaveClass(/\bacm\b/)
    await expect(modal.locator('.acm-header')).toContainText('Edit Activity')
    await expect(modal.locator('#activityEditReference')).toContainText('Task')
    await expect(modal.locator('label[for="activityEditVisibility_private"]')).toHaveClass(/is-checked/)
    await expect(modal.locator('.acm-option', { has: page.getByRole('switch', { name: 'Set Reminder' }) })).toBeVisible()
    await expect(modal.locator('#activityEditAssignedTo')).toContainText('Avery Staff')
    await expect(modal.locator('#activityEditTaskDueAt')).toHaveValue('07 Nov, 2030 03:30 PM')
    await expect(modal.locator('#activityEditTaskPriority')).toContainText('High')
    await expect(modal.locator('#activityEditTaskStatus')).toContainText('Open')
    await expect(modal.locator('#activityEditTaskOwner')).toContainText('Blake Ops')
    await expect
      .poll(() => api.find('POST', '/common/get-all-users').map((c) => JSON.stringify(c.json ?? {})))
      .toContain(JSON.stringify({ partner_id: 2, active_only: true, keep_ids: [12, 14] }))
  })

  test('hands the task to someone else', async ({ page }) => {
    const { api, modal } = await openEdit(page)
    api.add({ method: 'POST', match: '/common/activity-logs/77', body: ok(TASK_ROW, 'Activity updated') })

    await pickOption(page, modal, 'activityEditAssignedTo', 'Casey Lane')
    await pickOption(page, modal, 'activityEditTaskStatus', 'In Progress')
    await modal.getByRole('button', { name: /update/i }).click()

    const call = await expectCall(api, 'POST', '/common/activity-logs/77')
    expect(call.json).toMatchObject({
      assign_task: '1',
      assigned_to: '15',
      task_due_date: '2030-11-07 15:30:00',
      task_priority: 'high',
      task_status: 'in_progress',
    })
  })

  test('un-assigns it when the switch is turned off', async ({ page }) => {
    const { api, modal } = await openEdit(page)
    api.add({ method: 'POST', match: '/common/activity-logs/77', body: ok(TASK_ROW, 'Activity updated') })

    await assignSwitch(modal).uncheck()
    await expect(modal.locator('#activityEditAssignedTo')).toHaveCount(0)
    await modal.getByRole('button', { name: /update/i }).click()

    const call = await expectCall(api, 'POST', '/common/activity-logs/77')
    expect(call.json.assign_task).toBe('0')
    expect(call.json).not.toHaveProperty('assigned_to')
  })

  test("shows the API's message when the new assignee is not on the team", async ({ page }) => {
    const { api, modal } = await openEdit(page)
    api.add({
      method: 'POST',
      match: '/common/activity-logs/77',
      status: 422,
      body: { status: false, message: 'Validation failed', errors: { assigned_to: 'The selected staff member cannot be assigned this task.' } },
    })

    await modal.getByRole('button', { name: /update/i }).click()

    await expect(modal.getByText('The selected staff member cannot be assigned this task.')).toBeVisible()
    await expect(modal.locator('#activityEditAssignedTo')).toHaveClass(/is-invalid/)
  })
})

test.describe('Client Assign to - active staff only', () => {
  test("asks for active staff, keeping the client's saved assignee", async ({ page }) => {
    const api = await openClient(page)

    await expect
      .poll(() => api.find('POST', '/common/get-all-users').map((c) => JSON.stringify(c.json ?? {})))
      .toContain(JSON.stringify({ active_only: true, keep_ids: [14] }))
  })
})
