import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../test-utils'
import { server } from '../../mocks/server'
import { toast } from 'react-toastify'
import ReminderTaskStatus from '../../../src/components/Common/ReminderTaskStatus'
import type { ReminderTask } from '../../../src/config/reminders'

vi.mock('react-toastify', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-toastify')>()),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

const TASK: ReminderTask = {
  status: 'open',
  status_label: 'Open',
  priority: 'high',
  priority_label: 'High',
  due_date: '2030-11-07 15:30:00',
  due_date_display: 'Nov 7, 2030 3:30 PM',
  assigned_to_name: 'Partner Colleague',
  assigned_by_name: 'Host Admin',
}

describe('ReminderTaskStatus', () => {
  let sent: Record<string, unknown> | null

  beforeEach(() => {
    sent = null
    vi.mocked(toast.success).mockClear()
    vi.mocked(toast.error).mockClear()
    server.use(
      http.patch('*/common/activity-logs/77/task-status', async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ status: true, message: 'Task status updated successfully.', data: { id: 77 } })
      })
    )
  })

  const statusButton = (name: string) => screen.getByRole('button', { name })

  it('shows who has the task, by when, and its progress', () => {
    renderWithProviders(<ReminderTaskStatus activityLogId={77} task={TASK} canUpdate />)

    const box = screen.getByRole('group', { name: 'Task progress' })
    expect(box).toBeInTheDocument()
    expect(screen.getByText('Partner Colleague')).toBeInTheDocument()
    expect(screen.getByText('Host Admin')).toBeInTheDocument()
    expect(screen.getByText('Nov 7, 2030 3:30 PM')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(statusButton('Open')).toHaveAttribute('aria-pressed', 'true')
    expect(statusButton('In Progress')).toHaveAttribute('aria-pressed', 'false')
    expect(statusButton('Complete')).toHaveAttribute('aria-pressed', 'false')
  })

  const confirm = () => fireEvent.click(screen.getByRole('button', { name: 'Yes, change it' }))

  it('asks to confirm, then saves the new status and reports it', async () => {
    const onChanged = vi.fn()
    renderWithProviders(<ReminderTaskStatus activityLogId={77} task={TASK} canUpdate onChanged={onChanged} summary="Collect bank statements" />)

    fireEvent.click(statusButton('In Progress'))
    expect(screen.getByRole('dialog', { name: 'Change task status?' })).toHaveTextContent('Collect bank statements')
    expect(sent).toBeNull()
    confirm()

    await waitFor(() => expect(sent).toEqual({ task_status: 'in_progress' }))
    await waitFor(() => expect(statusButton('In Progress')).toHaveAttribute('aria-pressed', 'true'))
    expect(onChanged).toHaveBeenCalledWith('in_progress')
    expect(toast.success).toHaveBeenCalledWith('Task status updated successfully.')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('changes nothing when the confirmation is cancelled', () => {
    renderWithProviders(<ReminderTaskStatus activityLogId={77} task={TASK} canUpdate />)

    fireEvent.click(statusButton('Complete'))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(sent).toBeNull()
    expect(statusButton('Open')).toHaveAttribute('aria-pressed', 'true')
  })

  it('draws the box, its buttons and badges with a 4px radius (reminder-task)', () => {
    renderWithProviders(<ReminderTaskStatus activityLogId={77} task={TASK} canUpdate />)

    expect(screen.getByRole('group', { name: 'Task progress' })).toHaveClass('reminder-task')
    expect(screen.getByRole('group', { name: 'Task progress' })).not.toHaveClass('rounded')
  })

  it('does nothing when the current status is picked again', () => {
    renderWithProviders(<ReminderTaskStatus activityLogId={77} task={TASK} canUpdate />)

    fireEvent.click(statusButton('Open'))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(sent).toBeNull()
  })

  it('keeps the status and shows the message when saving fails', async () => {
    server.use(
      http.patch('*/common/activity-logs/77/task-status', () =>
        HttpResponse.json({ status: false, message: 'This activity is not an assigned task.' }, { status: 422 })
      )
    )
    renderWithProviders(<ReminderTaskStatus activityLogId={77} task={TASK} canUpdate />)

    fireEvent.click(statusButton('Complete'))
    confirm()

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('This activity is not an assigned task.'))
    expect(statusButton('Open')).toHaveAttribute('aria-pressed', 'true')
  })

  it('only shows the status to someone who may not change it', () => {
    renderWithProviders(<ReminderTaskStatus activityLogId={77} task={{ ...TASK, status: 'in_progress', status_label: 'In Progress' }} canUpdate={false} />)

    expect(screen.queryByRole('button', { name: 'Complete' })).not.toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })

  it('follows a status that changed elsewhere', () => {
    const { rerender } = renderWithProviders(<ReminderTaskStatus activityLogId={77} task={TASK} canUpdate />)

    rerender(<ReminderTaskStatus activityLogId={77} task={{ ...TASK, status: 'complete', status_label: 'Complete' }} canUpdate />)

    expect(statusButton('Complete')).toHaveAttribute('aria-pressed', 'true')
  })
})
