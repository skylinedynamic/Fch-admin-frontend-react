import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../mocks/fakeBootstrapModal'))
vi.mock('../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import { toast } from 'react-toastify'
import { fireEvent, renderWithProviders, screen, waitFor, within } from '../../test-utils'
import { server } from '../../mocks/server'
import { setAuthState, clearAuthState } from '../../../src/store/auth'
import ReminderList from '../../../src/pages/reminders/ReminderList'

const TASK = {
  status: 'open', status_label: 'Open', priority: 'high', priority_label: 'High',
  due_date: '2030-11-07 15:30:00', due_date_display: 'Nov 7, 2030 3:30 PM',
  assigned_to_name: 'Partner Colleague', assigned_by_name: 'Host Admin',
}

const ROWS = [
  { id: 1, activity_log_id: 77, reference: 'Task', summary: 'Collect bank statements', status: 'pending', task: TASK, task_can_update_status: true },
  { id: 2, activity_log_id: 78, reference: 'Task', summary: 'Review the file', status: 'pending', task: { ...TASK, status: 'in_progress', status_label: 'In Progress' }, task_can_update_status: false },
  // A task assigned to the viewer: they may change its status but not reschedule it
  { id: 5, activity_log_id: 81, reference: 'Task', summary: 'Send the term sheet', status: 'pending', task: TASK, task_can_update_status: true, can_reschedule: false },
  { id: 3, activity_log_id: 79, reference: 'Call', summary: 'Call the lender', status: 'pending', task: null, task_can_update_status: false },
  // The creator's copy of a task only its assignee is reminded of
  { id: 4, activity_log_id: 80, reference: 'Task', summary: 'Chase the signed agreement', status: 'pending', is_reminder: false, is_past_due: true, task: TASK, task_can_update_status: true },
]

describe('Task & Reminders list - task status', () => {
  let sent: { id: string; body: Record<string, unknown> } | null

  beforeEach(() => {
    sent = null
    setAuthState({ token: 't', user: { id: 9 } as any, permissions: ['view reminders'] } as any)
    server.use(
      http.post('*/common/reminders/fetch-reminders', () =>
        HttpResponse.json({ status: true, data: { reminders: { data: ROWS, meta: { total: ROWS.length } } } })
      ),
      http.patch('*/common/activity-logs/:id/task-status', async ({ params, request }) => {
        sent = { id: String(params.id), body: (await request.json()) as Record<string, unknown> }
        return HttpResponse.json({ status: true, message: 'Task status updated successfully.', data: { id: 77 } })
      })
    )
    return () => clearAuthState()
  })

  it('shows no task status in the table - it is changed in Task & Reminder Details', async () => {
    renderWithProviders(<ReminderList />, { route: '/reminders' })
    await screen.findByText('Collect bank statements')

    expect(screen.queryByRole('columnheader', { name: 'Task' })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: /Task status for/ })).not.toBeInTheDocument()
  })

  it('saves a new status from Task & Reminder Details, after confirming', async () => {
    renderWithProviders(<ReminderList />, { route: '/reminders' })

    fireEvent.click(await screen.findByText('Collect bank statements'))
    const progress = await screen.findByRole('group', { name: 'Task progress' })
    fireEvent.click(within(progress).getByRole('button', { name: 'Complete' }))
    expect(sent).toBeNull()
    fireEvent.click(await screen.findByRole('button', { name: 'Yes, change it' }))

    await waitFor(() => expect(sent).toEqual({ id: '77', body: { task_status: 'complete' } }))
    await waitFor(() => expect(within(progress).getByRole('button', { name: 'Complete' })).toHaveAttribute('aria-pressed', 'true'))
    expect(toast.success).toHaveBeenCalledWith('Task status updated successfully.')
  })

  it('lists a task you assigned without a popup of your own, marked No Popup', async () => {
    renderWithProviders(<ReminderList />, { route: '/reminders' })

    const row = (await screen.findByText('Chase the signed agreement')).closest('tr')!
    expect(within(row).getByText('No Popup')).toBeInTheDocument()
    expect(within(row).queryByText('Missed')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Chase the signed agreement'))
    expect(await screen.findByText(/You won't get a popup for this task/)).toBeInTheDocument()
  })

  it("offers no Reschedule in Task & Reminder Details for a task assigned to the viewer", async () => {
    renderWithProviders(<ReminderList />, { route: '/reminders' })

    fireEvent.click(await screen.findByText('Send the term sheet'))

    expect(await screen.findByRole('group', { name: 'Task progress' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reschedule/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /snooze/i })).toBeInTheDocument()
  })
})
