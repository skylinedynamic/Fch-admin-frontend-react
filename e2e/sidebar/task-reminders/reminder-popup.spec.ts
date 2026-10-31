import { test, expect, type Page } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall, type ApiMock } from '../../support/helpers'

/**
 * The reminder popup every signed-in page shows for reminders that are due:
 * it asks for them once on load, then lets the user dismiss, snooze or
 * dismiss all. account.spec.ts covers the /reminders list page (where the
 * popup deliberately stays hidden).
 */

const soon = new Date(Date.now() + 60 * 60 * 1000)
const iso = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ')

const reminder = (id: number, title: string) => ({
  id, title, summary: title, status: 'pending', reference_type: 'Call', message: '<p>Bring the bank statements</p>',
  reminder_date_time: iso(new Date()), set_date_time: iso(soon), activity_log_id: null, activity_can_edit: false,
})

async function openWithDue(page: Page, due: unknown[]): Promise<ApiMock> {
  await seedSession(page, { permissions: ['view reminders'] })
  const api = await mockApi(page, [
    { method: 'GET', match: '/common/reminders/due', body: ok({ reminders: due }) },
  ])
  await page.goto('/account')
  return api
}

const popup = (page: Page) => page.locator('.modal.show .reminder-modal-content')

test.describe('Reminder popup - one due reminder', () => {
  test('asks for due reminders on load and shows the one that is due', async ({ page }) => {
    const api = await openWithDue(page, [reminder(9, 'Call Jane about the SBA loan')])
    await expectCall(api, 'GET', '/common/reminders/due')
    await expect(popup(page)).toContainText('Call Jane about the SBA loan')
  })

  test('nothing pops up when nothing is due', async ({ page }) => {
    const api = await openWithDue(page, [])
    await expectCall(api, 'GET', '/common/reminders/due')
    await expect(popup(page)).toHaveCount(0)
  })

  test('cancelled reminders are left out', async ({ page }) => {
    await openWithDue(page, [{ ...reminder(9, 'Old call'), status: 'cancelled' }])
    await page.waitForLoadState('networkidle')
    await expect(popup(page)).toHaveCount(0)
  })

  test('Dismiss dismisses the reminder and closes the popup', async ({ page }) => {
    const api = await openWithDue(page, [reminder(9, 'Call Jane about the SBA loan')])
    api.add({ method: 'POST', match: '/common/reminders/9/dismiss', body: ok(null, 'Reminder dismissed successfully') })
    await popup(page).getByRole('button', { name: /Dismiss\s*$/ }).click()
    await expectCall(api, 'POST', '/common/reminders/9/dismiss')
    await expect(page.getByText('Reminder dismissed successfully')).toBeVisible()
    await expect(popup(page)).toHaveCount(0)
  })

  test('a failed dismiss keeps the reminder and shows the message', async ({ page }) => {
    const api = await openWithDue(page, [reminder(9, 'Call Jane about the SBA loan')])
    api.add({ method: 'POST', match: '/common/reminders/9/dismiss', status: 500, body: failure('Could not dismiss.') })
    await popup(page).getByRole('button', { name: /Dismiss\s*$/ }).click()
    await expect(page.getByText('Could not dismiss.').first()).toBeVisible()
    await expect(popup(page)).toContainText('Call Jane about the SBA loan')
  })

  test('Snooze sends the chosen minutes and the note', async ({ page }) => {
    const api = await openWithDue(page, [reminder(9, 'Call Jane about the SBA loan')])
    api.add({ method: 'POST', match: '/common/reminders/9/snooze', body: ok(null, 'Reminder snoozed successfully') })
    await popup(page).getByRole('button', { name: /Snooze\s*$/ }).click()
    await page.locator('#reminder-snooze-for').selectOption('30')
    await page.getByPlaceholder('Why are you snoozing this?').fill('Client asked to call later')
    await page.locator('.reminder-snooze-panel button', { hasText: /Snooze 30/ }).click()
    const call = await expectCall(api, 'POST', '/common/reminders/9/snooze')
    expect(call.json).toEqual({ minutes: 30, note: 'Client asked to call later' })
    await expect(page.getByText('Reminder snoozed successfully')).toBeVisible()
  })

  test('a custom snooze must be a whole number of minutes in range', async ({ page }) => {
    const api = await openWithDue(page, [reminder(9, 'Call Jane about the SBA loan')])
    await popup(page).getByRole('button', { name: /Snooze\s*$/ }).click()
    await page.locator('#reminder-snooze-for').selectOption('custom')
    await page.locator('#reminder-snooze-minutes').fill('0')
    await expect(page.getByText(/Enter a whole number of minutes between 1 and/).first()).toBeVisible()
    await expect(page.locator('.reminder-snooze-panel button', { hasText: /Snooze/ })).toBeDisabled()
    expect(api.find('POST', '/snooze')).toHaveLength(0)
  })

  test('snooze errors from the API are shown on the form', async ({ page }) => {
    const api = await openWithDue(page, [reminder(9, 'Call Jane about the SBA loan')])
    api.add({ method: 'POST', match: '/common/reminders/9/snooze', status: 422, body: failure('Invalid', { minutes: 'The snooze is too long for this activity.' }) })
    await popup(page).getByRole('button', { name: /Snooze\s*$/ }).click()
    await page.locator('.reminder-snooze-panel button', { hasText: /Snooze \d/ }).click()
    await expect(page.locator('.reminder-snooze-panel')).toContainText('The snooze is too long for this activity.')
  })

  test('Cancel closes the snooze form without sending anything', async ({ page }) => {
    const api = await openWithDue(page, [reminder(9, 'Call Jane about the SBA loan')])
    await popup(page).getByRole('button', { name: /Snooze\s*$/ }).click()
    await page.locator('.reminder-snooze-panel').getByRole('button', { name: 'Cancel' }).click()
    await expect(page.locator('.reminder-snooze-panel')).toHaveCount(0)
    expect(api.find('POST', '/snooze')).toHaveLength(0)
  })

  test('closing with X only hides the popup', async ({ page }) => {
    const api = await openWithDue(page, [reminder(9, 'Call Jane about the SBA loan')])
    await page.getByRole('button', { name: 'Close reminder' }).click()
    await expect(popup(page)).toHaveCount(0)
    expect(api.find('POST', '/common/reminders/')).toHaveLength(0)
  })
})

test.describe('Reminder popup - where it shows', () => {
  test('stays hidden on the reminders page itself', async ({ page }) => {
    await seedSession(page, { permissions: ['view reminders'] })
    const api = await mockApi(page, [{ method: 'GET', match: '/common/reminders/due', body: ok({ reminders: [reminder(9, 'Call Jane about the SBA loan')] }) }])
    await page.goto('/reminders')
    await expectCall(api, 'GET', '/common/reminders/due')
    await expect(page.getByText('Task & Reminder Events').first()).toBeVisible()
    await expect(popup(page)).toHaveCount(0)
  })
})

test.describe('Reminder popup - several due reminders', () => {
  const DUE = [reminder(9, 'Call Jane about the SBA loan'), reminder(10, 'Email Bob the term sheet')]

  test('lists them all', async ({ page }) => {
    await openWithDue(page, DUE)
    await expect(popup(page)).toContainText('Call Jane about the SBA loan')
    await expect(popup(page)).toContainText('Email Bob the term sheet')
  })

  test('Dismiss All dismisses every reminder at once', async ({ page }) => {
    const api = await openWithDue(page, DUE)
    api.add({ method: 'POST', match: '/common/reminders/dismiss-all', body: ok(null) })
    await popup(page).getByRole('button', { name: /Dismiss All/ }).click()
    await expectCall(api, 'POST', '/common/reminders/dismiss-all')
    await expect(page.getByText('All reminders dismissed successfully')).toBeVisible()
    await expect(popup(page)).toHaveCount(0)
  })

  test('a failed Dismiss All is reported', async ({ page }) => {
    const api = await openWithDue(page, DUE)
    api.add({ method: 'POST', match: '/common/reminders/dismiss-all', status: 500, body: failure('boom') })
    await popup(page).getByRole('button', { name: /Dismiss All/ }).click()
    await expect(page.getByText('Failed to dismiss reminders')).toBeVisible()
  })

  test('each reminder can be snoozed from the list', async ({ page }) => {
    const api = await openWithDue(page, DUE)
    api.add({ method: 'POST', match: '/common/reminders/10/snooze', body: ok(null) })
    await popup(page).locator('.reminder-list-action', { hasText: 'Snooze' }).nth(1).click()
    await page.locator('.reminder-snooze-panel button', { hasText: /Snooze \d/ }).click()
    const call = await expectCall(api, 'POST', '/common/reminders/10/snooze')
    expect(call.json.minutes).toBeGreaterThan(0)
  })

  test('All Reminders goes to the reminder list', async ({ page }) => {
    await seedSession(page, { permissions: ['view reminders'] })
    await mockApi(page, [{ method: 'GET', match: '/common/reminders/due', body: ok({ reminders: DUE }) }])
    await page.goto('/account')
    await popup(page).getByRole('link', { name: /All Reminders/ }).click()
    await expect(page).toHaveURL(/\/reminders$/)
  })
})

test.describe('Reminder popup - assigned task', () => {
  const TASK = {
  status: 'open', status_label: 'Open', priority: 'high', priority_label: 'High',
  due_date: '2030-11-07 15:30:00', due_date_display: 'Nov 7, 2030 3:30 PM',
  assigned_to_name: 'Partner Colleague', assigned_by_name: 'Host Admin',
}

  test("the task's creator or assignee moves it to In Progress from the popup", async ({ page }) => {
    const api = await openWithDue(page, [{
      ...reminder(9, 'Collect bank statements'), reference_type: 'Task', activity_log_id: 77, task: TASK, task_can_update_status: true,
    }])
    api.add({ method: 'PATCH', match: '/common/activity-logs/77/task-status', body: ok({ id: 77 }, 'Task status updated successfully.') })

    const progress = popup(page).getByRole('group', { name: 'Task progress' })
    await expect(progress).toContainText('Partner Colleague')
    await expect(progress).toContainText('Nov 7, 2030 3:30 PM')
    await progress.getByRole('button', { name: 'In Progress' }).click()
    await page.getByRole('button', { name: 'Yes, change it' }).click()

    const call = await expectCall(api, 'PATCH', '/common/activity-logs/77/task-status')
    expect(call.json).toEqual({ task_status: 'in_progress' })
    await expect(progress.getByRole('button', { name: 'In Progress' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Task status updated successfully.')).toBeVisible()
  })

  test('anyone else only sees the status', async ({ page }) => {
    await openWithDue(page, [{
      ...reminder(9, 'Collect bank statements'), reference_type: 'Task', activity_log_id: 77, task: TASK, task_can_update_status: false,
    }])

    const progress = popup(page).getByRole('group', { name: 'Task progress' })
    await expect(progress).toContainText('Open')
    await expect(progress.getByRole('button', { name: 'Complete' })).toHaveCount(0)
  })

  test("the assignee can snooze or dismiss but not reschedule the task's reminder", async ({ page }) => {
    await openWithDue(page, [{
      ...reminder(9, 'Collect bank statements'), reference_type: 'Task', activity_log_id: 77, task: TASK, task_can_update_status: true, can_reschedule: false,
    }])

    await expect(popup(page).getByRole('button', { name: /Snooze\s*$/ })).toBeVisible()
    await expect(popup(page).getByRole('button', { name: /Dismiss\s*$/ })).toBeVisible()
    await expect(popup(page).getByRole('button', { name: /Reschedule\s*$/ })).toHaveCount(0)
  })
})
