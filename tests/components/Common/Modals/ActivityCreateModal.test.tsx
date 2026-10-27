import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../../test-utils'
import { server } from '../../../mocks/server'

// The real hook side-effect-imports 'summernote/dist/summernote-lite.js',
// which does canvas-based font detection at import time and crashes under
// jsdom (no <canvas> implementation). The component only needs an
// editorRef callback to attach to its hidden textarea; nothing under test
// here exercises rich-text editing itself.
vi.mock('../../../../src/hooks/useSummernote', () => ({
  useSummernote: () => ({ editorRef: () => { } }),
}))

const { default: ActivityCreateModal } = await import('../../../../src/components/Common/Modals/ActivityCreateModal')

// The modal reads its create-context (entity id/type, isHost) off
// window._activityEntityContext, populated by ActivitySidebar right before
// the modal is shown, and re-reads it (resetting the form) on the
// Bootstrap `show.bs.modal` event fired on the modal element itself. Real
// Bootstrap JS isn't running in this test, so the modal wrapper keeps its
// static aria-hidden="true" — fine for getByLabelText, but getByRole must
// opt in with { hidden: true } to see inside it.
function openAsContext(ctx: { isHost?: boolean } = {}) {
  ; (window as any)._activityEntityContext = { entityId: 1, entityType: 'Client', ...ctx }
  const modalEl = document.getElementById('activityCreateModal')!
  // fireEvent (not a raw dispatchEvent) so the resulting setState calls are
  // flushed inside act() before the next assertion runs.
  fireEvent(modalEl, new Event('show.bs.modal', { bubbles: true }))
}

describe('ActivityCreateModal visibility radio group', () => {
  beforeEach(() => {
    delete (window as any)._activityEntityContext
  })

  afterEach(() => {
    delete (window as any)._activityEntityContext
  })

  it('defaults to Private (Only Me) with the 3-option (non-host/partner) set before any context is provided', () => {
    renderWithProviders(<ActivityCreateModal entityId={1} entityType="Client" onActivityCreated={undefined} />)

    expect(screen.getByLabelText('Private (Only Me)')).toBeChecked()
    expect(screen.getByLabelText('Internal')).toBeInTheDocument()
    expect(screen.getByLabelText('Everyone (Including Borrower)')).toBeInTheDocument()
    expect(screen.queryByLabelText('Partner')).not.toBeInTheDocument()
  })

  it('shows all 4 options, including Internal and Partner, once opened in a host context', () => {
    renderWithProviders(<ActivityCreateModal entityId={1} entityType="Client" onActivityCreated={undefined} />)

    openAsContext({ isHost: true })

    expect(screen.getByLabelText('Private (Only Me)')).toBeChecked()
    expect(screen.getByLabelText('Internal')).toBeInTheDocument()
    expect(screen.getByLabelText('Partner')).toBeInTheDocument()
    expect(screen.getByLabelText('Everyone (Including Borrower)')).toBeInTheDocument()
  })

  it('renders the 3-option set (Private, Internal, Everyone) once opened in a non-host/partner context', () => {
    renderWithProviders(<ActivityCreateModal entityId={1} entityType="Client" onActivityCreated={undefined} />)

    openAsContext({ isHost: false })

    expect(screen.getByLabelText('Private (Only Me)')).toBeChecked()
    expect(screen.getByLabelText('Internal')).toBeInTheDocument()
    expect(screen.getByLabelText('Everyone (Including Borrower)')).toBeInTheDocument()
    expect(screen.queryByLabelText('Partner')).not.toBeInTheDocument()
  })

  it('submits the selected visibility level in the create request', async () => {
    let receivedVisibility: string | null = null
    server.use(
      http.post('*/common/activity-logs', async ({ request }) => {
        const body = await request.formData()
        receivedVisibility = body.get('visibility') as string
        return HttpResponse.json({ status: true, message: 'Activity created', data: { id: 1, visibility: receivedVisibility } }, { status: 201 })
      })
    )

    renderWithProviders(<ActivityCreateModal entityId={1} entityType="Client" onActivityCreated={undefined} />)
    openAsContext({ isHost: true })

    fireEvent.click(screen.getByLabelText('Everyone (Including Borrower)'))
    expect(screen.getByLabelText('Everyone (Including Borrower)')).toBeChecked()

    fireEvent.click(screen.getByRole('button', { name: /create/i, hidden: true }))

    await waitFor(() => expect(receivedVisibility).toBe('everyone'))
  })
})

describe('ActivityCreateModal "Want to Assign" (Task)', () => {
  const STAFF = [
    { id: 12, name: 'Avery Staff', email: 'avery@example.test' },
    { id: 14, name: 'Blake Ops', email: 'blake@example.test' },
  ]

  beforeEach(() => {
    delete (window as any)._activityEntityContext
    server.use(http.post('*/common/get-all-users', () => HttpResponse.json({ status: true, data: STAFF })))
  })

  afterEach(() => {
    delete (window as any)._activityEntityContext
  })

  const reference = () => document.getElementById('activityReference') as HTMLSelectElement
  const pickReference = (value: string) => fireEvent.change(reference(), { target: { name: 'reference', value } })

  function renderOpen() {
    renderWithProviders(<ActivityCreateModal entityId={1} entityType="Client" onActivityCreated={undefined} />)
    openAsContext({ isHost: true })
  }

  it('offers the switch only when the Reference is Task', () => {
    renderOpen()

    expect(screen.queryByLabelText('Want to Assign')).not.toBeInTheDocument()

    pickReference('Task')
    expect(screen.getByLabelText('Want to Assign')).not.toBeChecked()

    pickReference('Meeting')
    expect(screen.queryByLabelText('Want to Assign')).not.toBeInTheDocument()
  })

  it('opens the assignment section below the reminder with the eligible staff, priorities and statuses', async () => {
    renderOpen()
    pickReference('Task')

    expect(screen.queryByLabelText(/^Assigned To/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Want to Assign'))

    const assignedTo = screen.getByLabelText(/^Assigned To/) as HTMLSelectElement
    await waitFor(() => expect(screen.getByRole('option', { name: 'Avery Staff', hidden: true })).toBeInTheDocument())
    expect(Array.from(assignedTo.options).map((o) => o.text)).toEqual(['Select staff member', 'Avery Staff', 'Blake Ops'])

    expect(screen.getByLabelText(/^Due Date \/ Time/)).toBeInTheDocument()

    const priority = screen.getByLabelText(/^Priority/) as HTMLSelectElement
    expect(Array.from(priority.options).map((o) => o.text)).toEqual(['Low', 'Medium', 'High'])
    expect(priority.value).toBe('medium')

    const status = screen.getByLabelText(/^Status/) as HTMLSelectElement
    expect(Array.from(status.options).map((o) => o.text)).toEqual(['Open', 'In Progress', 'Complete'])
    expect(status.value).toBe('open')

    // The section sits after the "Set Reminder" switch.
    const reminderSwitch = screen.getByLabelText('Set Reminder')
    expect(reminderSwitch.compareDocumentPosition(assignedTo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('sends who, when, priority and status with the new Task', async () => {
    let body: FormData | null = null
    server.use(
      http.post('*/common/activity-logs', async ({ request }) => {
        body = await request.formData()
        return HttpResponse.json({ status: true, message: 'Activity created', data: { id: 1 } }, { status: 201 })
      })
    )

    renderOpen()
    pickReference('Task')
    fireEvent.change(document.getElementById('activitySummary')!, { target: { name: 'summary', value: 'Collect bank statements' } })
    fireEvent.click(screen.getByLabelText('Want to Assign'))
    await waitFor(() => expect(screen.getByRole('option', { name: 'Blake Ops', hidden: true })).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText(/^Assigned To/), { target: { name: 'assigned_to', value: '14' } })
    fireEvent.change(screen.getByLabelText(/^Priority/), { target: { name: 'task_priority', value: 'high' } })
    fireEvent.change(screen.getByLabelText(/^Status/), { target: { name: 'task_status', value: 'in_progress' } })
    // Typed the way the picker displays it (dd M, yy hh:mm a).
    fireEvent.input(screen.getByLabelText(/^Due Date \/ Time/), { target: { value: '02 Nov, 2030 03:30 PM' } })

    fireEvent.click(screen.getByRole('button', { name: /create/i, hidden: true }))

    await waitFor(() => expect(body).not.toBeNull())
    // Sent as wall-clock time in the viewer's timezone, separate from the activity date.
    expect(body!.get('task_due_at')).toBe('2030-11-02 15:30:00')
    expect(body!.get('task_due_at')).not.toBe(body!.get('activity_date'))
    expect(body!.get('reference')).toBe('Task')
    expect(body!.get('assign_task')).toBe('1')
    expect(body!.get('assigned_to')).toBe('14')
    expect(body!.get('task_priority')).toBe('high')
    expect(body!.get('task_status')).toBe('in_progress')
  })

  it('sends no task fields once the Reference is changed away from Task', async () => {
    let body: FormData | null = null
    server.use(
      http.post('*/common/activity-logs', async ({ request }) => {
        body = await request.formData()
        return HttpResponse.json({ status: true, message: 'Activity created', data: { id: 1 } }, { status: 201 })
      })
    )

    renderOpen()
    pickReference('Task')
    fireEvent.click(screen.getByLabelText('Want to Assign'))
    pickReference('Call')

    fireEvent.click(screen.getByRole('button', { name: /create/i, hidden: true }))

    await waitFor(() => expect(body).not.toBeNull())
    expect(body!.has('assign_task')).toBe(false)
    expect(body!.has('assigned_to')).toBe(false)
    expect(body!.has('task_priority')).toBe(false)
  })

  it('shows the API\'s validation messages under each task field', async () => {
    server.use(
      http.post('*/common/activity-logs', () =>
        HttpResponse.json(
          {
            status: false,
            message: 'Validation failed',
            errors: {
              assigned_to: 'Please select who the task is assigned to.',
              task_due_at: 'Please select when the task is due.',
            },
          },
          { status: 422 }
        )
      )
    )

    renderOpen()
    pickReference('Task')
    fireEvent.click(screen.getByLabelText('Want to Assign'))
    fireEvent.click(screen.getByRole('button', { name: /create/i, hidden: true }))

    expect(await screen.findByText('Please select who the task is assigned to.')).toBeInTheDocument()
    expect(screen.getByText('Please select when the task is due.')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Assigned To/)).toHaveClass('is-invalid')
  })
})
