import { beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../test-utils'
import { server } from '../../../mocks/server'
import { toast } from 'react-toastify'

// Validation errors are shown on the form, never toasted.
vi.mock('react-toastify', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-toastify')>()),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
}))

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
    due_date: '2030-11-07 15:30:00',
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
    expect(document.getElementById('activityEditTaskDueAt')).toHaveValue('07 Nov, 2030 03:30 PM')

    // On a Task, Set Reminder comes after Want to Assign.
    const reminderSwitch = screen.getByRole('switch', { name: 'Set Reminder' })
    expect(assignSwitch()!.compareDocumentPosition(reminderSwitch) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(document.getElementById('activityEditTaskPriority')).toHaveTextContent('High')
    expect(document.getElementById('activityEditTaskStatus')).toHaveTextContent('Open')
  })

  it("lists the record's partner staff and shows the record's own assigned staff member", async () => {
    renderEdit()

    await waitFor(() => expect(usersRequest).toEqual({ partner_id: 2, active_only: true, keep_ids: [12, 14] }))
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
    expect(sent!.get('task_due_date')).toBe('2030-11-07 15:30:00')
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

    pick('activityEditReference', 'Call')
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
    fireEvent.input(document.getElementById('activityEditTaskDueAt')!, { target: { value: '09 Nov, 2030 10:00 AM' } })
    update()

    await waitFor(() => expect(sent).not.toBeNull())
    expect(sent!.get('assign_task')).toBe('1')
    expect(sent!.get('assigned_to')).toBe('14')
    expect(sent!.get('task_due_date')).toBe('2030-11-09 10:00:00')
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

    await waitFor(() => expect(usersRequest).toEqual({ active_only: true, keep_ids: [12] }))
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
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('shows an API error that has no field of its own above the form, not as a toast', async () => {
    server.use(
      http.post('*/common/activity-logs/77', () =>
        HttpResponse.json(
          { status: false, message: 'Validation failed', errors: { category: 'The category is not valid.' } },
          { status: 422 }
        )
      )
    )
    renderEdit()

    update()

    expect(await screen.findByText('The category is not valid.')).toHaveClass('alert-danger')
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('opens with who gets the reminder as saved, and sends a new pick', async () => {
    renderEdit({ ...TASK_ACTIVITY, remind_me: true, remind_at: '2030-11-05 09:30:00', reminder_recipient: 'assignee' })
    await waitFor(() => expect(document.getElementById('activityEditAssignedTo')).not.toBeDisabled())

    expect(screen.getByRole('radiogroup', { name: 'Who gets the reminder' })).toBeInTheDocument()
    expect(screen.getByLabelText('Assignee')).toBeChecked()

    fireEvent.click(screen.getByLabelText('Me'))
    update()

    await waitFor(() => expect(sent).not.toBeNull())
    expect(sent!.get('reminder_recipient')).toBe('creator')
  })

  it('offers no pick while the reminder is off', () => {
    renderEdit()

    expect(screen.queryByRole('radiogroup', { name: 'Who gets the reminder' })).not.toBeInTheDocument()
  })
})

describe('ActivityEditModal looks like New Activity', () => {
  let sent: FormData | null

  const ACTIVITY = {
    id: 78,
    reference: 'Call',
    subject: 'Call about statements',
    description: '<p>Ask for 3 months</p>',
    activity_date: '2030-11-05 10:00:00',
    visibility: 'private',
    remind_me: false,
    attachments: [{ name: 'statement.pdf', path: 'activity-logs/statement.pdf' }],
    properties: { reference: 'Call', subject: 'Call about statements' },
    task: null,
  }

  beforeEach(() => {
    sent = null
    server.use(
      http.post('*/common/activity-logs/78', async ({ request }) => {
        sent = await request.formData()
        return HttpResponse.json({ status: true, message: 'Activity updated', data: ACTIVITY })
      })
    )
  })

  const renderEdit = (activity: Record<string, unknown> = ACTIVITY) =>
    renderWithProviders(<ActivityEditModal activity={activity} show onClose={vi.fn()} onUpdated={vi.fn()} isHost entityType="Client" />)
  const update = () => fireEvent.click(screen.getByRole('button', { name: /update/i }))

  it('uses the same header, pickers, cards and attachment box', () => {
    renderEdit()

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveClass('acm')
    expect(dialog.querySelector('.acm-header')).toHaveTextContent('Edit Activity')
    expect(document.getElementById('activityEditReference')).toHaveTextContent('Call')
    expect(document.getElementById('activityEditDate')).toHaveValue('05 Nov, 2030 10:00 AM')
    expect(screen.getByLabelText('Summary *')).toHaveValue('Call about statements')
    expect(screen.getByLabelText('Private (Only Me)').closest('label')).toHaveClass('acm-visibility__option', 'is-checked')
    expect(screen.getByRole('switch', { name: 'Set Reminder' }).closest('.acm-option')).not.toBeNull()
    expect(document.getElementById('activityEditAttachmentBtn')).toHaveClass('acm-attach')
  })

  it('titles itself Edit Reminder when the activity has one', () => {
    renderEdit({ ...ACTIVITY, remind_me: true, remind_at: '2030-11-05 09:30:00' })

    expect(screen.getByRole('dialog').querySelector('.acm-header')).toHaveTextContent('Edit Reminder')
  })

  it('sets a reminder from the Set Reminder card', async () => {
    renderEdit()

    fireEvent.click(screen.getByRole('switch', { name: 'Set Reminder' }))
    expect(document.getElementById('activityEditReminderPreset')).toHaveTextContent('30 Minutes Before')
    update()

    await waitFor(() => expect(sent).not.toBeNull())
    expect(sent!.get('remind_me')).toBe('1')
    expect(sent!.get('reminder_preset')).toBe('30_minutes')
    expect(sent!.get('remind_at')).toBe('2030-11-05 09:30:00')
  })

  it('lists the saved attachments in the same box and can remove one', async () => {
    renderEdit()

    expect(document.getElementById('activityEditAttachmentList')).toHaveTextContent('statement.pdf')
    fireEvent.click(screen.getByRole('button', { name: 'Remove statement.pdf' }))
    update()

    await waitFor(() => expect(sent).not.toBeNull())
    expect(sent!.get('existing_attachments')).toBe('[]')
  })

  it('replaces the saved attachments with newly added ones', async () => {
    renderEdit()

    const file = new File(['x'], 'bank.pdf', { type: 'application/pdf' })
    fireEvent.change(document.getElementById('activityEditAttachmentInput')!, { target: { files: [file] } })
    const list = document.getElementById('activityEditAttachmentList')!
    expect(list).toHaveTextContent('bank.pdf')
    expect(list).not.toHaveTextContent('statement.pdf')
    update()

    await waitFor(() => expect(sent).not.toBeNull())
    expect(sent!.get('existing_attachments')).toBe('[]')
    // jsdom's multipart round-trip drops the file name, so count what was sent.
    expect(sent!.getAll('attachments[]')).toHaveLength(1)
  })
})
