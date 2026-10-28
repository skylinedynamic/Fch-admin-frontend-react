import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../test-utils'
import { server } from '../../../mocks/server'

// Summernote crashes under jsdom (no <canvas>); the editor itself is not under test.
vi.mock('../../../../src/hooks/useSummernote', () => ({
  useSummernote: () => ({ editorRef: () => { } }),
}))

const { default: ActivityEditModal } = await import('../../../../src/components/Common/Modals/ActivityEditModal')

const STAFF = [
  { id: 12, name: 'Avery Staff', email: 'avery@example.test', phone_number: null },
  { id: 14, name: 'Blake Ops', email: 'blake@example.test', phone_number: '(222) 333-4444' },
  { id: 15, name: 'Casey Lane', email: 'casey@example.test', phone_number: null },
]

const TASK_ACTIVITY = {
  id: 77,
  reference: 'Task',
  subject: 'Collect bank statements',
  description: '<p>Ask for 3 months</p>',
  activity_date: '2030-11-05 10:00:00',
  visibility: 'private',
  remind_me: false,
  attachments: [],
  properties: { reference: 'Task', subject: 'Collect bank statements' },
  task: {
    assigned_to: 12,
    assigned_user: { id: 12, name: 'Avery Staff' },
    due_date: '2030-11-07',
    priority: 'high',
    priority_label: 'High',
    status: 'open',
    status_label: 'Open',
  },
}

describe('ActivityEditModal "Want to Assign"', () => {
  let usersRequest: Record<string, unknown> | null
  let sent: FormData | null

  beforeEach(() => {
    usersRequest = null
    sent = null
    server.use(
      http.post('*/common/get-all-users', async ({ request }) => {
        usersRequest = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ status: true, data: STAFF })
      }),
      http.post('*/common/activity-logs/77', async ({ request }) => {
        sent = await request.formData()
        return HttpResponse.json({ status: true, message: 'Activity updated', data: TASK_ACTIVITY })
      })
    )
  })

  function renderEdit(activity: Record<string, unknown> = TASK_ACTIVITY, props: Record<string, unknown> = {}) {
    const onUpdated = vi.fn()
    const onClose = vi.fn()
    renderWithProviders(
      <ActivityEditModal
        activity={activity}
        show
        onClose={onClose}
        onUpdated={onUpdated}
        isHost
        entityType="Client"
        partnerId={2}
        taskOwner={{ id: 14, name: 'Blake Ops' }}
        {...props}
      />
    )
    return { onUpdated, onClose }
  }

  const assignSwitch = () => screen.queryByRole('switch', { name: 'Want to Assign' })
  const pick = (id: string, label: string) => {
    fireEvent.click(document.getElementById(id)!)
    fireEvent.click(screen.getByRole('option', { name: new RegExp(`^${label}`) }))
  }
  const update = () => fireEvent.click(screen.getByRole('button', { name: /update/i }))

  it("opens with the task's saved assignee, due date, priority and status", async () => {
    renderEdit()

    expect(assignSwitch()).toBeChecked()
    await waitFor(() => expect(document.getElementById('activityEditAssignedTo')).toHaveTextContent('Avery Staff'))
    expect(document.getElementById('activityEditTaskDueAt')).toHaveValue('07 Nov, 2030')
    expect(document.getElementById('activityEditTaskPriority')).toHaveTextContent('High')
    expect(document.getElementById('activityEditTaskStatus')).toHaveTextContent('Open')
  })

  it("lists the record's partner staff and shows the record's own assigned staff member", async () => {
    renderEdit()

    await waitFor(() => expect(usersRequest).toEqual({ partner_id: 2 }))
    const owner = await screen.findByText('Client Assigned To')
    expect(owner.closest('#activityEditTaskOwner')).toHaveTextContent('Blake Ops')
    expect(owner.closest('#activityEditTaskOwner')).toHaveTextContent('(222) 333-4444')
  })

  it('sends the new assignee and task details on Update', async () => {
    const { onUpdated, onClose } = renderEdit()
    await waitFor(() => expect(document.getElementById('activityEditAssignedTo')).not.toBeDisabled())

    pick('activityEditAssignedTo', 'Casey Lane')
    pick('activityEditTaskPriority', 'Low')
    pick('activityEditTaskStatus', 'Complete')
    update()

    await waitFor(() => expect(sent).not.toBeNull())
    expect(sent!.get('assign_task')).toBe('1')
    expect(sent!.get('assigned_to')).toBe('15')
    expect(sent!.get('task_due_date')).toBe('2030-11-07')
    expect(sent!.get('task_priority')).toBe('low')
    expect(sent!.get('task_status')).toBe('complete')
    await waitFor(() => expect(onUpdated).toHaveBeenCalled())
    expect(onClose).toHaveBeenCalled()
  })

  it('un-assigns the task when the switch is turned off', async () => {
    renderEdit()

    fireEvent.click(assignSwitch()!)
    expect(document.getElementById('activityEditAssignedTo')).toBeNull()
    update()

    await waitFor(() => expect(sent).not.toBeNull())
    expect(sent!.get('assign_task')).toBe('0')
    expect(sent!.has('assigned_to')).toBe(false)
  })

  it('un-assigns the task when the Reference is no longer Task', async () => {
    renderEdit()

    fireEvent.change(document.querySelector('select[name="reference"]')!, { target: { name: 'reference', value: 'Call' } })
    expect(assignSwitch()).not.toBeInTheDocument()
    update()

    await waitFor(() => expect(sent).not.toBeNull())
    expect(sent!.get('reference')).toBe('Call')
    expect(sent!.get('assign_task')).toBe('0')
  })

  it('lets an unassigned Task be assigned from Edit', async () => {
    renderEdit({ ...TASK_ACTIVITY, task: null })

    expect(assignSwitch()).not.toBeChecked()
    fireEvent.click(assignSwitch()!)
    await waitFor(() => expect(document.getElementById('activityEditAssignedTo')).not.toBeDisabled())
    pick('activityEditAssignedTo', 'Blake Ops')
    fireEvent.input(document.getElementById('activityEditTaskDueAt')!, { target: { value: '09 Nov, 2030' } })
    update()

    await waitFor(() => expect(sent).not.toBeNull())
    expect(sent!.get('assign_task')).toBe('1')
    expect(sent!.get('assigned_to')).toBe('14')
    expect(sent!.get('task_due_date')).toBe('2030-11-09')
    // The config defaults for a new assignment
    expect(sent!.get('task_priority')).toBe('medium')
    expect(sent!.get('task_status')).toBe('open')
  })

  it('offers no switch on an activity that is not a Task', () => {
    renderEdit({ ...TASK_ACTIVITY, reference: 'Call', properties: { reference: 'Call' }, task: null })

    expect(assignSwitch()).not.toBeInTheDocument()
  })

  it("on a Partner's page lists the host's own staff", async () => {
    renderEdit(TASK_ACTIVITY, { entityType: 'Partner', partnerId: 5, taskOwner: null })

    await waitFor(() => expect(usersRequest).toEqual({}))
    expect(screen.getByText('Partner Agent')).toBeInTheDocument()
    expect(screen.getByText('No one has been assigned yet')).toBeInTheDocument()
  })

  it("shows the API's validation messages under the task fields", async () => {
    server.use(
      http.post('*/common/activity-logs/77', () =>
        HttpResponse.json(
          {
            status: false,
            message: 'Validation failed',
            errors: {
              assigned_to: 'The selected staff member cannot be assigned this task.',
              task_due_date: 'The due date cannot be in the past.',
            },
          },
          { status: 422 }
        )
      )
    )
    renderEdit()

    update()

    expect(await screen.findByText('The selected staff member cannot be assigned this task.')).toBeInTheDocument()
    expect(screen.getByText('The due date cannot be in the past.')).toBeInTheDocument()
    expect(document.getElementById('activityEditAssignedTo')).toHaveClass('is-invalid')
  })
})
