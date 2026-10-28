import { createRef, type ComponentType, type Ref } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { act, renderWithProviders, screen, waitFor, within } from '../../../test-utils'
import { allowBackgroundCalls, api, signIn } from '../../../pages/pageHarness'
import { http, HttpResponse } from 'msw'
import { server } from '../../../mocks/server'
import { toast } from 'react-toastify'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})
vi.mock('bootstrap/js/dist/modal', () => import('../../../mocks/fakeBootstrapModal'))
vi.mock('../../../../src/hooks/useSummernote', () => ({ useSummernote: () => ({ editorRef: () => {} }) }))

import AppointmentModalJsx from '../../../../src/components/Common/Modals/AppointmentModal'

type ModalHandle = { show: (id: number) => Promise<void> }
// A .jsx forwardRef: TypeScript infers no props for it.
const AppointmentModal = AppointmentModalJsx as unknown as ComponentType<{ ref: Ref<ModalHandle>; onSuccess: () => void }>

const CLIENT_ID = 50
const PARTNER_ID = 7
const ALL = ['view appointments', 'update appointments', 'delete appointments']

// BUG-102: a white-label client books a meeting with its partner (Wanda).
const appointment = (extra: Record<string, unknown> = {}) => ({
  id: 1,
  subject: 'QA-TEST Run1 WL client booking',
  appointment_date: '2999-10-28 09:00:00',
  duration_minutes: 30,
  meeting_type: 'Business Review',
  status: 'pending',
  scheduled_by: { id: CLIENT_ID, name: 'QA-TEST Wanda Client One' },
  assigned_for: { id: PARTNER_ID, name: 'Wanda', entity_type: 'Partner', entity_id: 3 },
  ...extra,
})

const open = async (userId: number, apt = appointment(), permissions = ALL, stubs: () => void = () => {}) => {
  signIn({ id: userId, is_host: 0, permissions })
  allowBackgroundCalls()
  stubs()
  api('get', '/common/appointments/1', { status: true, data: apt })
  const update = api('put', '/common/appointments/1', { status: true, message: 'Appointment updated' })
  const onSuccess = vi.fn()
  const ref = createRef<ModalHandle>()
  renderWithProviders(<AppointmentModal ref={ref} onSuccess={onSuccess} />)
  await act(() => ref.current!.show(1))
  await screen.findByText('QA-TEST Run1 WL client booking')
  return { update, onSuccess }
}

beforeEach(() => vi.clearAllMocks())

describe('AppointmentModal - who may change an appointment (BUG-102)', () => {
  it('the person who booked it keeps Edit and Delete, and gets no Confirm', async () => {
    await open(CLIENT_ID)

    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^\W*confirm$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancel appointment/i })).not.toBeInTheDocument()
  })

  it('the person it was booked with can reschedule, confirm or cancel it', async () => {
    await open(PARTNER_ID)

    expect(screen.getByRole('button', { name: /reschedule/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^\W*confirm$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel appointment/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  it('Confirm sets the status to confirmed, keeping who it is with', async () => {
    const user = userEvent.setup()
    const { update, onSuccess } = await open(PARTNER_ID)

    await user.click(screen.getByRole('button', { name: /^\W*confirm$/i }))

    await waitFor(() => expect(update.calls).toBe(1))
    expect(update.bodies[0]).toEqual({ assigned_for: PARTNER_ID, status: 'confirmed' })
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })

  it('Cancel appointment asks first, then sets the status to cancelled', async () => {
    const user = userEvent.setup()
    const { update, onSuccess } = await open(PARTNER_ID)

    await user.click(screen.getByRole('button', { name: /cancel appointment/i }))
    expect(update.calls).toBe(0)
    const dialog = (await screen.findByText('Cancel this appointment?')).closest('.modal') as HTMLElement
    await user.click(within(dialog).getByRole('button', { name: /yes, cancel it/i }))

    await waitFor(() => expect(update.calls).toBe(1))
    expect(update.bodies[0]).toEqual({ assigned_for: PARTNER_ID, status: 'cancelled' })
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })

  // Bootstrap reports a closed dialog with `hidden.bs.modal`; the fake modal does not.
  const hidden = (el: HTMLElement) => act(() => { el.dispatchEvent(new Event('hidden.bs.modal')) })
  const details = () => document.getElementById('appointmentModal')!

  it('closing the cancel question goes back to the appointment details', async () => {
    const user = userEvent.setup()
    const { update } = await open(PARTNER_ID)

    await user.click(screen.getByRole('button', { name: /cancel appointment/i }))
    expect(details()).not.toHaveClass('show')
    const dialog = (await screen.findByText('Cancel this appointment?')).closest('.modal') as HTMLElement
    await user.click(within(dialog).getByRole('button', { name: /^close$/i }))
    await hidden(dialog)

    expect(details()).toHaveClass('show')
    expect(update.calls).toBe(0)
  })

  it('once cancelled, the appointment details do not open again', async () => {
    const user = userEvent.setup()
    const { update } = await open(PARTNER_ID)

    await user.click(screen.getByRole('button', { name: /cancel appointment/i }))
    const dialog = (await screen.findByText('Cancel this appointment?')).closest('.modal') as HTMLElement
    await user.click(within(dialog).getByRole('button', { name: /yes, cancel it/i }))
    await waitFor(() => expect(update.calls).toBe(1))
    await hidden(dialog)

    expect(details()).not.toHaveClass('show')
  })

  it('an already confirmed appointment offers no Confirm, but can still be cancelled', async () => {
    await open(PARTNER_ID, appointment({ status: 'confirmed' }))

    expect(screen.queryByRole('button', { name: /^\W*confirm$/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel appointment/i })).toBeInTheDocument()
  })

  it('a cancelled appointment offers neither Confirm nor Cancel', async () => {
    await open(PARTNER_ID, appointment({ status: 'cancelled' }))

    expect(screen.queryByRole('button', { name: /^\W*confirm$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancel appointment/i })).not.toBeInTheDocument()
  })

  it('without the update permission the invitee gets no actions', async () => {
    await open(PARTNER_ID, appointment(), ['view appointments'])

    expect(screen.queryByRole('button', { name: /reschedule/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^\W*confirm$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancel appointment/i })).not.toBeInTheDocument()
  })

  it('Reschedule hides the "Appointment With" picker and saves the new time without changing who it is with', async () => {
    const user = userEvent.setup()
    const { update } = await open(PARTNER_ID)

    await user.click(screen.getByRole('button', { name: /reschedule/i }))

    expect(screen.queryByText('Select Users')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/meeting with host/i)).not.toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(update.calls).toBe(1))
    const body = update.bodies[0]
    expect(body).toMatchObject({ assigned_for: PARTNER_ID, appointment_date: '2999-10-28 09:00:00', duration_minutes: 30 })
    expect(body).not.toHaveProperty('entity_type')
    expect(body).not.toHaveProperty('entity_id')
    expect(body).not.toHaveProperty('meeting_with_host')
  })
})

/**
 * BUG-100: Wanda edited her appointment with her client - the form showed
 * "Meeting with host" ticked and "Appointment With" empty, and Save said
 * "Appointment updated successfully." while a "Scheduling Conflict" alert
 * appeared too: the save went out before the conflict check had answered.
 */
describe('AppointmentModal - a partner editing the appointment it booked with its client (BUG-100)', () => {
  const CLIENT = { id: CLIENT_ID, name: 'QA-TEST Wanda Client One', entity_type: 'Borrower', entity_id: 9 }
  const withClient = appointment({ scheduled_by: { id: PARTNER_ID, name: 'Wanda' }, assigned_for: CLIENT })

  const serveSelectableUsers = () =>
    server.use(
      http.post('*/common/appointments/fetch-selectable-users', async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({
          status: true,
          data: body.meeting_with_host
            ? [{ id: 2, name: 'Host Admin (Host)', entity_type: 'Partner', entity_id: 1 }]
            : [{ ...CLIENT, name: 'QA-TEST Wanda Client One (Client)' }],
        })
      })
    )

  const availability = (data: Record<string, unknown>) => {
    const seen = { calls: 0 }
    const stub = () =>
      server.use(
        http.post('*/common/appointments/check-availability', () => {
          seen.calls += 1
          return HttpResponse.json({ status: true, data })
        })
      )
    return { seen, stub }
  }

  const edit = async (check: { stub: () => void }) => {
    const opened = await open(PARTNER_ID, withClient, ALL, () => {
      serveSelectableUsers()
      check.stub()
    })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /edit/i }))
    // The attendee picker's own label: who it is with.
    await waitFor(() => expect(Array.from(document.querySelectorAll('.p-dropdown-label'), (el) => el.textContent)).toContain('QA-TEST Wanda Client One (Client)'))
    return { ...opened, user }
  }

  it('shows the client as who it is with, and does not tick "Meeting with host"', async () => {
    await edit(availability({ available: true }))

    expect(screen.getByLabelText(/meeting with host/i)).not.toBeChecked()
    expect(screen.queryByText('Select Users')).not.toBeInTheDocument()
  })

  it('checks for a conflict before saving, and saves nothing when there is one', async () => {
    const check = availability({
      available: false,
      scheduler_conflicts: [{ id: 99, date: '2999-10-28', start_time: '09:00', end_time: '09:30', duration_minutes: 30 }],
      assignee_conflicts: [],
    })
    const { update, user } = await edit(check)

    // Straight away - before the background check (500ms after a change) has run.
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Cannot save appointment: Time slot conflicts with another appointment'))
    expect(check.seen.calls).toBeGreaterThan(0)
    expect(update.calls).toBe(0)
    expect(toast.success).not.toHaveBeenCalled()
    expect(screen.getByText('Scheduling Conflict')).toBeInTheDocument()
  })

  it('without a conflict, saves once with the client and says only that it was updated', async () => {
    // The only appointment at that time is this one.
    const check = availability({ available: false, scheduler_conflicts: [{ id: 1, date: '2999-10-28', start_time: '09:00', end_time: '09:30', duration_minutes: 30 }], assignee_conflicts: [] })
    const { update, user, onSuccess } = await edit(check)

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(update.calls).toBe(1))
    expect(update.bodies[0]).toMatchObject({ assigned_for: CLIENT_ID, entity_id: 9, meeting_with_host: 0 })
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(toast.success).toHaveBeenCalledTimes(1)
    expect(toast.error).not.toHaveBeenCalled()
  })
})

