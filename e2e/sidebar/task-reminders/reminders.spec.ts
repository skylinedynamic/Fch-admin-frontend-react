import { test, expect, type Page, type Request } from '@playwright/test'
import { mockApi, ok, failure, seedSession, expectCall, type ApiMock } from '../../support/helpers'

test.describe('Reminders', () => {
  const FETCH = '/common/reminders/fetch-reminders'
  const REMINDERS = [
    { id: 1301, reference: 'Appointment', reference_type: 'appointment', summary: 'Call the lender', status: 'pending', reminder_date: '2026-04-01 10:00' },
    { id: 1302, reference: 'Activity', reference_type: 'activity', summary: 'Send documents', status: 'dismissed', reminder_date: '2026-03-01 10:00' },
  ]
  const body = (rows: unknown[]) => ok({ reminders: { data: rows, meta: { total: rows.length } } })

  async function open(page: Page, rows: unknown[] = REMINDERS): Promise<ApiMock> {
    await seedSession(page, { permissions: ['view reminders'] })
    const api = await mockApi(page, [{ method: 'POST', match: FETCH, body: body(rows) }])
    await page.goto('/reminders')
    if (rows.length) await expect(page.getByText('Call the lender')).toBeVisible()
    return api
  }
  const confirm = (page: Page) => page.locator('.modal.show')

  test('lists reminders', async ({ page }) => {
    await open(page)
    await expect(page.getByText('Send documents')).toBeVisible()
  })

  test("shows the empty state - for today, the date the list opens on", async ({ page }) => {
    await open(page, [])
    await expect(page.getByText('No reminders for today.')).toBeVisible()
  })

  // BUG-056: the list opens on today's reminders; it says so, and Show all
  // dates lists every reminder - older and dismissed ones included.
  test("says it shows today's reminders, and Show all dates drops the date", async ({ page }) => {
    const api = await open(page, [])
    // The list's own requests - not the one-row "any pending?" check.
    const lastListRequest = () => api.find('POST', FETCH).filter((c) => c.json.per_page !== 1).at(-1)!.json
    await expect(page.getByText('Showing reminders for today.')).toBeVisible()
    expect(lastListRequest()).toHaveProperty('start_date')

    await page.getByRole('button', { name: 'Show all dates' }).click()

    await expect.poll(lastListRequest).not.toHaveProperty('start_date')
    await expect(page.getByText('Showing reminders for today.')).toHaveCount(0)
    await expect(page.getByText('No reminders found')).toBeVisible()
  })

  test('search is sent to the API, empty filters are omitted', async ({ page }) => {
    const api = await open(page)
    await page.getByPlaceholder('Search subject or client...').fill('lender')
    await page.locator('button', { hasText: 'Filters' }).click()
    await expect.poll(() => JSON.stringify(api.find('POST', FETCH).at(-1)?.json ?? {})).toContain('lender')
    const last = api.find('POST', FETCH).at(-1)!.json
    for (const value of Object.values(last)) expect(value === '' || value === null).toBe(false)
  })

  test('Clear empties the search box', async ({ page }) => {
    await open(page)
    await page.getByPlaceholder('Search subject or client...').fill('lender')
    await page.locator('.reminder-toolbar button', { hasText: 'Clear' }).click()
    await expect(page.getByPlaceholder('Search subject or client...')).toHaveValue('')
  })

  test('dismissing the selected reminders posts their ids after confirmation', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: '/common/reminders/bulk-dismiss', body: ok(null) })
    const actions = page.getByRole('button', { name: 'Actions', exact: true })
    await expect(actions).toHaveCount(0)
    await page.locator('.p-datatable-tbody .p-checkbox').first().click()
    await expect(actions).toBeVisible()
    await expect(page.getByText(/\d+ selected/)).toHaveCount(0)
    await actions.click()
    await page.getByRole('menuitem', { name: /dismiss selected/i }).click()
    await expect(confirm(page).getByText('Dismiss Selected Reminders')).toBeVisible()
    await confirm(page).getByRole('button', { name: 'Yes, Dismiss' }).click()
    const call = await expectCall(api, 'POST', '/common/reminders/bulk-dismiss')
    expect(call.json).toEqual({ ids: [1301] })
    await expect(page.getByText('Reminders dismissed successfully')).toBeVisible()
  })

  test('a failed dismiss is reported and the confirmation stays open', async ({ page }) => {
    const api = await open(page)
    api.add({ method: 'POST', match: '/common/reminders/bulk-dismiss', status: 500, body: failure('boom') })
    await page.locator('.p-datatable-tbody .p-checkbox').first().click()
    await page.getByRole('button', { name: 'Actions', exact: true }).click()
    await page.getByRole('menuitem', { name: /dismiss selected/i }).click()
    await confirm(page).getByRole('button', { name: 'Yes, Dismiss' }).click()
    await expect(page.getByText('Failed to dismiss reminders')).toBeVisible()
    await expect(confirm(page)).toBeVisible()
  })

  test('the page is blocked without the view permission', async ({ page }) => {
    await seedSession(page, { permissions: [] })
    await mockApi(page)
    await page.goto('/reminders')
    await expect(page).toHaveURL(/access-denied/)
  })
})

test.describe('Reminders - task status', () => {
  const FETCH = '/common/reminders/fetch-reminders'
  const TASK = {
  status: 'open', status_label: 'Open', priority: 'high', priority_label: 'High',
  due_date: '2030-11-07 15:30:00', due_date_display: 'Nov 7, 2030 3:30 PM',
  assigned_to_name: 'Partner Colleague', assigned_by_name: 'Host Admin',
}
  const ROWS = [
    { id: 1, activity_log_id: 77, reference: 'Task', reference_type: 'Task', summary: 'Collect bank statements', status: 'pending', task: TASK, task_can_update_status: true },
    { id: 2, activity_log_id: 79, reference: 'Call', reference_type: 'Call', summary: 'Call the lender', status: 'pending', task: null, task_can_update_status: false },
    // A task the viewer assigned with only the assignee reminded: listed, no popup
    { id: 3, activity_log_id: 80, reference: 'Task', reference_type: 'Task', summary: 'Chase the signed agreement', status: 'pending', is_reminder: false, is_past_due: true, task: TASK, task_can_update_status: true },
  ]

  async function open(page: Page): Promise<ApiMock> {
    // Like the API: a saved status shows in the list when it reloads
    let savedStatus = TASK.status
    const rows = () => ROWS.map((r) => (r.activity_log_id === 77 ? { ...r, task: { ...TASK, status: savedStatus } } : r))
    await seedSession(page, { permissions: ['view reminders'] })
    const api = await mockApi(page, [{ method: 'POST', match: FETCH, body: () => ok({ reminders: { data: rows(), meta: { total: ROWS.length } } }) }])
    api.add({
      method: 'PATCH',
      match: /\/common\/activity-logs\/77\/task-status$/,
      body: (req: Request) => {
        savedStatus = (JSON.parse(req.postData() || '{}') as { task_status: string }).task_status
        return ok({ id: 77 }, 'Task status updated successfully.')
      },
    })
    await page.goto('/reminders')
    await expect(page.getByText('Collect bank statements')).toBeVisible()
    return api
  }

  test('the table has no task status - it is changed in Task & Reminder Details', async ({ page }) => {
    await open(page)

    await expect(page.getByRole('columnheader', { name: 'Task', exact: true })).toHaveCount(0)
    await expect(page.getByRole('combobox', { name: /Task status for/ })).toHaveCount(0)
  })

  test('clicking a row opens its details without ticking its checkbox; only the checkbox selects', async ({ page }) => {
    await open(page)

    const row = page.locator('.p-datatable-tbody tr', { hasText: 'Call the lender' })
    await row.getByText('Call the lender').click()
    await expect(page.locator('.modal.show')).toContainText('Task & Reminder Details')
    await expect(row.locator('.p-checkbox input')).not.toBeChecked()
    await expect(page.getByRole('button', { name: 'Actions', exact: true })).toHaveCount(0)
  })

  test('the status is changed from Task & Reminder Details, after confirming', async ({ page }) => {
    const api = await open(page)

    await page.getByText('Collect bank statements').click()
    const progress = page.locator('.modal.show').getByRole('group', { name: 'Task progress' })
    await progress.getByRole('button', { name: 'In Progress' }).click()
    await expect(page.getByRole('dialog', { name: 'Change task status?' })).toContainText('Collect bank statements')
    await page.getByRole('button', { name: 'Yes, change it' }).click()

    const call = await expectCall(api, 'PATCH', /\/common\/activity-logs\/77\/task-status$/)
    expect(call.json).toEqual({ task_status: 'in_progress' })
    await expect(progress.getByRole('button', { name: 'In Progress' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('a task you assigned without a popup of your own is still listed, marked No Popup', async ({ page }) => {
    await open(page)

    const row = page.locator('tr', { hasText: 'Chase the signed agreement' })
    await expect(row.getByText('No Popup')).toBeVisible()

    await row.getByText('Chase the signed agreement').click()
    await expect(page.locator('.modal.show')).toContainText("You won't get a popup for this task")
  })

  test('the status tabs filter the list, and an empty result offers to clear the filters', async ({ page }) => {
    const api = await open(page)

    await page.getByRole('tablist', { name: 'Reminder status' }).getByRole('tab', { name: 'Missed', exact: true }).click()
    await expect.poll(() => api.find('POST', FETCH).map((c) => (c.json as { status?: string }).status)).toContain('missed')
  })

  test('cancelling the confirmation leaves the task status as it was', async ({ page }) => {
    const api = await open(page)

    await page.getByText('Collect bank statements').click()
    const progress = page.locator('.modal.show').getByRole('group', { name: 'Task progress' })
    await progress.getByRole('button', { name: 'Complete' }).click()
    await page.getByRole('dialog', { name: 'Change task status?' }).getByRole('button', { name: 'Cancel' }).click()

    await expect(page.getByRole('dialog', { name: 'Change task status?' })).toHaveCount(0)
    await expect(progress.getByRole('button', { name: 'Open' })).toHaveAttribute('aria-pressed', 'true')
    expect(api.find('PATCH', /task-status$/)).toHaveLength(0)
  })
})
