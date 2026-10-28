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
function openAsContext(ctx: Record<string, unknown> = {}) {
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
    { id: 12, name: 'Avery Staff', email: 'avery@example.test', phone_number: '(222) 111-2222' },
    { id: 14, name: 'Blake Ops', email: 'blake@example.test', phone_number: null },
  ]
  let usersRequest: Record<string, unknown> | null = null

  beforeEach(() => {
    delete (window as any)._activityEntityContext
    usersRequest = null
    server.use(
      http.post('*/common/get-all-users', async ({ request }) => {
        usersRequest = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ status: true, data: STAFF })
      })
    )
  })

  afterEach(() => {
    delete (window as any)._activityEntityContext
  })

  // The custom dropdowns: a combobox button whose options open in a list
  // portalled to <body>.
  const pick = (id: string, label: string) => {
    fireEvent.click(document.getElementById(id)!)
    fireEvent.click(screen.getByRole('option', { name: new RegExp(`^${label}`), hidden: true }))
  }
  const pickReference = (label: string) => pick('activityReference', label)
  // The date defaults to now (BUG-057), and a Task must be in the future.
  const typeFutureActivityDate = () =>
    fireEvent.input(document.getElementById('activityDate')!, { target: { value: '01 Nov, 2030 10:00 AM' } })
  const assignSwitch = () => screen.queryByRole('switch', { name: 'Want to Assign', hidden: true })

  function renderOpen(ctx: Record<string, unknown> = {}) {
    // A page's own entityType prop wins over the context's.
    const entityType = (ctx.entityType as string | undefined) ?? 'Client'
    renderWithProviders(<ActivityCreateModal entityId={1} entityType={entityType} onActivityCreated={undefined} />)
    openAsContext({ isHost: true, partnerId: 2, ...ctx })
  }

  function captureCreate() {
    const sent: { body: FormData | null } = { body: null }
    server.use(
      http.post('*/common/activity-logs', async ({ request }) => {
        sent.body = await request.formData()
        return HttpResponse.json({ status: true, message: 'Activity created', data: { id: 1 } }, { status: 201 })
      })
    )
    return sent
  }

  it('offers the switch only when the Reference is Task', () => {
    renderOpen()

    expect(assignSwitch()).not.toBeInTheDocument()

    pickReference('Task')
    expect(assignSwitch()).not.toBeChecked()

    pickReference('Meeting')
    expect(assignSwitch()).not.toBeInTheDocument()
  })

  it('opens Assigned To, Due Date, Priority and Status below the reminder, with the defaults from config', async () => {
    renderOpen()
    pickReference('Task')

    expect(document.getElementById('activityAssignedTo')).toBeNull()
    fireEvent.click(assignSwitch()!)

    const assignedTo = document.getElementById('activityAssignedTo')!
    await waitFor(() => expect(assignedTo).toHaveTextContent('Select staff member'))
    expect(document.getElementById('activityTaskDueAt')).toHaveAttribute('placeholder', 'Select due date')
    expect(document.getElementById('activityTaskPriority')).toHaveTextContent('Medium')
    expect(document.getElementById('activityTaskStatus')).toHaveTextContent('Open')

    const reminderSwitch = screen.getByRole('switch', { name: 'Set Reminder', hidden: true })
    expect(reminderSwitch.compareDocumentPosition(assignedTo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('lists the staff of the partner that owns the record', async () => {
    renderOpen()
    pickReference('Task')
    fireEvent.click(assignSwitch()!)

    await waitFor(() => expect(usersRequest).toEqual({ partner_id: 2 }))
    await waitFor(() => expect(document.getElementById('activityAssignedTo')).not.toBeDisabled())
    fireEvent.click(document.getElementById('activityAssignedTo')!)
    expect(screen.getAllByRole('option', { hidden: true }).map((o) => o.textContent)).toEqual([
      expect.stringContaining('Avery Staff'),
      expect.stringContaining('Blake Ops'),
    ])
  })

  it("on a Partner's page asks for no partner, so the host's own staff are listed", async () => {
    renderOpen({ entityType: 'Partner', partnerId: 5 })
    pickReference('Task')
    fireEvent.click(assignSwitch()!)

    await waitFor(() => expect(usersRequest).toEqual({}))
  })

  it("shows the record's own assigned staff member above Assigned To", async () => {
    renderOpen({ taskOwner: { id: 12, name: null } })
    pickReference('Task')
    fireEvent.click(assignSwitch()!)

    await waitFor(() => expect(document.getElementById('activityTaskOwner')).toHaveTextContent('Avery Staff'))
    const owner = document.getElementById('activityTaskOwner')!
    expect(owner).toHaveTextContent('Client Assigned To')
    expect(owner).toHaveTextContent('avery@example.test')
    expect(owner).toHaveTextContent('(222) 111-2222')
  })

  it('says so when nobody is assigned to the record yet', () => {
    renderOpen({ taskOwner: null })
    pickReference('Task')
    fireEvent.click(assignSwitch()!)

    const owner = document.getElementById('activityTaskOwner')!
    expect(owner).toHaveTextContent('Client Assigned To')
    expect(owner).toHaveTextContent('No one has been assigned yet')
  })

  it('titles the owner "Borrower Assign to" on funding records', async () => {
    renderOpen({ entityType: 'Funding Application', taskOwner: { id: 14 } })
    pickReference('Task')
    fireEvent.click(assignSwitch()!)

    await waitFor(() => expect(document.getElementById('activityTaskOwner')).toHaveTextContent('Blake Ops'))
    expect(document.getElementById('activityTaskOwner')).toHaveTextContent('Borrower Assign to')
  })

  it('sends who, the due day, priority and status with the new Task', async () => {
    const sent = captureCreate()

    renderOpen()
    pickReference('Task')
    typeFutureActivityDate()
    fireEvent.change(document.getElementById('activitySummary')!, { target: { name: 'summary', value: 'Collect bank statements' } })
    fireEvent.click(assignSwitch()!)
    await waitFor(() => expect(document.getElementById('activityAssignedTo')).not.toBeDisabled())

    pick('activityAssignedTo', 'Blake Ops')
    pick('activityTaskPriority', 'High')
    pick('activityTaskStatus', 'In Progress')
    // Typed the way the picker displays it (dd M, yy) - a day, no time.
    fireEvent.input(document.getElementById('activityTaskDueAt')!, { target: { value: '02 Nov, 2030' } })

    fireEvent.click(screen.getByRole('button', { name: /create/i, hidden: true }))

    await waitFor(() => expect(sent.body).not.toBeNull())
    expect(sent.body!.get('task_due_date')).toBe('2030-11-02')
    expect(sent.body!.get('reference')).toBe('Task')
    expect(sent.body!.get('assign_task')).toBe('1')
    expect(sent.body!.get('assigned_to')).toBe('14')
    expect(sent.body!.get('task_priority')).toBe('high')
    expect(sent.body!.get('task_status')).toBe('in_progress')
  })

  it('sends no task fields once the Reference is changed away from Task', async () => {
    const sent = captureCreate()

    renderOpen()
    pickReference('Task')
    fireEvent.click(assignSwitch()!)
    pickReference('Call')

    fireEvent.click(screen.getByRole('button', { name: /create/i, hidden: true }))

    await waitFor(() => expect(sent.body).not.toBeNull())
    expect(sent.body!.has('assign_task')).toBe(false)
    expect(sent.body!.has('assigned_to')).toBe(false)
    expect(sent.body!.has('task_priority')).toBe(false)
  })

  it("shows the API's validation messages under each task field", async () => {
    server.use(
      http.post('*/common/activity-logs', () =>
        HttpResponse.json(
          {
            status: false,
            message: 'Validation failed',
            errors: {
              assigned_to: 'Please select who the task is assigned to.',
              task_due_date: 'Please select when the task is due.',
            },
          },
          { status: 422 }
        )
      )
    )

    renderOpen()
    pickReference('Task')
    typeFutureActivityDate()
    fireEvent.click(assignSwitch()!)
    fireEvent.click(screen.getByRole('button', { name: /create/i, hidden: true }))

    expect(await screen.findByText('Please select who the task is assigned to.')).toBeInTheDocument()
    expect(screen.getByText('Please select when the task is due.')).toBeInTheDocument()
    expect(document.getElementById('activityAssignedTo')).toHaveClass('is-invalid')
  })
})
