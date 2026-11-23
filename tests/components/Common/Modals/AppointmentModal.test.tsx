import { createRef, type ComponentType, type Ref } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { act, renderWithProviders, screen, waitFor, within } from '../../../test-utils'
import { allowBackgroundCalls, api, invalid, signIn } from '../../../pages/pageHarness'
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

  // Confirm has its own endpoint (it was a PUT with the status): only the person it was
  // booked with may confirm, and the others get "Appointment Confirmed", not "Updated".
  it('Confirm posts to the confirm endpoint, says so, and does not edit the appointment', async () => {
    const user = userEvent.setup()
    const confirm = { calls: 0 }
    const { update, onSuccess } = await open(PARTNER_ID, appointment(), ALL, () => {
      server.use(http.post('*/common/appointments/1/confirm', () => {
        confirm.calls += 1
        return HttpResponse.json({ status: true, message: 'Appointment confirmed.', data: { id: 1, status: 'confirmed' } })
      }))
    })

    await user.click(screen.getByRole('button', { name: /^\W*confirm$/i }))

    await waitFor(() => expect(confirm.calls).toBe(1))
    expect(update.calls).toBe(0)
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Appointment confirmed.'))
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
  })

  it("Confirm shows the API's reason when it is refused, and keeps the appointment open", async () => {
    const user = userEvent.setup()
    const { onSuccess } = await open(PARTNER_ID, appointment(), ALL, () => {
      server.use(http.post('*/common/appointments/1/confirm', () =>
        HttpResponse.json({ status: false, message: 'Only the person an appointment was booked with can confirm it, while it is pending and still ahead.' }, { status: 422 })))
    })

    await user.click(screen.getByRole('button', { name: /^\W*confirm$/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Only the person an appointment was booked with can confirm it, while it is pending and still ahead.'))
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('the organiser sees a confirmed appointment as Confirmed, with nothing to confirm', async () => {
    await open(CLIENT_ID, appointment({ status: 'confirmed' }))

    const hero = screen.getByText('QA-TEST Run1 WL client booking').closest('.apt-hero') as HTMLElement
    expect(within(hero).getByText('Confirmed')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^\W*confirm$/i })).not.toBeInTheDocument()
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

  it('says when the appointment was booked over another one', async () => {
    await open(CLIENT_ID, appointment({ is_calendly: true, had_conflict: true }))

    expect(screen.getByText(/booked at a time .* already had another appointment/i)).toBeInTheDocument()
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

  // `held`: every answer waits until `release()` - so the test, not the
  // runner's speed, decides that Save is clicked before any check has answered.
  const availability = (data: Record<string, unknown>, { held = false } = {}) => {
    const seen = { calls: 0 }
    let release = () => {}
    const answered = held ? new Promise<void>((resolve) => { release = resolve }) : Promise.resolve()
    const stub = () =>
      server.use(
        http.post('*/common/appointments/check-availability', async () => {
          seen.calls += 1
          await answered
          return HttpResponse.json({ status: true, data })
        })
      )
    return { seen, stub, release: () => release() }
  }

  const edit = async (check: { stub: () => void }) => {
    const opened = await open(PARTNER_ID, withClient, ALL, () => {
      serveSelectableUsers()
      check.stub()
    })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /edit/i }))
    // The attendee picker lists who it is with (Calendly v2: one row per person).
    await screen.findByText(/QA-TEST Wanda Client One/)
    return { ...opened, user }
  }

  it('shows the client as who it is with, and does not tick "Meeting with host"', async () => {
    await edit(availability({ available: true }))

    expect(screen.getByLabelText(/meeting with host/i)).not.toBeChecked()
    expect(screen.queryByText('Select Users')).not.toBeInTheDocument()
  })

  /**
   * Defect: flaky in CI. The test clicked Save "straight away", hoping to beat
   * the background check that runs 500ms after Edit. On a loaded runner that
   * check answered first, showed the conflict and disabled Save, so the click
   * did nothing and toast.error was never called. Holding the answers until
   * Save is clicked makes "Save before the check answered" certain.
   */
  it('checks for a conflict before saving, and saves nothing when there is one', async () => {
    // Calendly v2: only the creator's own clash stops a save.
    const check = availability({
      available: false,
      creator_conflicts: [{ id: 99, date: '2999-10-28', start_time: '09:00', end_time: '09:30', duration_minutes: 30 }],
      attendee_conflicts: [],
    }, { held: true })
    const { update, user } = await edit(check)

    // Before any availability check (the 500ms background one included) has answered.
    await user.click(screen.getByRole('button', { name: /save changes/i }))
    check.release()

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Cannot save appointment: Time slot conflicts with another appointment'))
    expect(check.seen.calls).toBeGreaterThan(0)
    expect(update.calls).toBe(0)
    expect(toast.success).not.toHaveBeenCalled()
    expect(screen.getByText('Scheduling Conflict')).toBeInTheDocument()
  })

  /**
   * Defect: R2 BUG-073 - the availability check sent the client's record id
   * (entity_id) as `assigned_for`, so the API refused it ("Assigned user does
   * not exist.") and a clash was only reported after Confirm.
   */
  it('checks availability for the client by user id, the same attendee Save sends', async () => {
    const bodies: Record<string, unknown>[] = []
    const check = {
      stub: () =>
        server.use(
          http.post('*/common/appointments/check-availability', async ({ request }) => {
            bodies.push((await request.json()) as Record<string, unknown>)
            return HttpResponse.json({ status: true, data: { available: true } })
          })
        ),
    }
    const { update, user } = await edit(check)

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(update.calls).toBe(1))
    expect(bodies.length).toBeGreaterThan(0)
    // Calendly v2: the client goes as an attendee, by user id - never the record id.
    bodies.forEach((body) => {
      expect((body.attendees as Array<{ user_id?: number }>)[0].user_id).toBe(CLIENT_ID)
      expect(body).not.toHaveProperty('entity_id')
    })
    expect((update.bodies[0].attendees as Array<{ user_id?: number }>)[0].user_id).toBe(CLIENT_ID)
  })

  it('without a conflict, saves once with the client and says only that it was updated', async () => {
    // The only appointment at that time is this one.
    const check = availability({ available: false, creator_conflicts: [{ id: 1, date: '2999-10-28', start_time: '09:00', end_time: '09:30', duration_minutes: 30 }], attendee_conflicts: [] })
    const { update, user, onSuccess } = await edit(check)

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(update.calls).toBe(1))
    expect(update.bodies[0]).toMatchObject({ meeting_with_host: 0 })
    expect((update.bodies[0].attendees as Array<{ user_id?: number }>)[0].user_id).toBe(CLIENT_ID)
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(toast.success).toHaveBeenCalledTimes(1)
    expect(toast.error).not.toHaveBeenCalled()
  })
})


// BUG-004 (QA round 2): the description is stored HTML; it must not run script.
describe('AppointmentModal - the description cannot run script (BUG-004)', () => {
  it('shows the description without the onerror handler', async () => {
    await open(CLIENT_ID, appointment({ description: 'Bring <b>statements</b> <img src=x onerror="window.__xss = 1">' }))

    expect(await screen.findByText('statements')).toBeInTheDocument()
    expect(document.body.querySelector('[onerror]')).toBeNull()
  })
})

/**
 * Round 2 BUG-024: an appointment at 11:30 PM had an empty end list, saved as
 * 0 minutes, and the API's 422 ("Duration must be at least 1 minute.") was
 * shown nowhere - the modal just stayed open.
 */
describe('AppointmentModal - an appointment that ends after midnight (R2 BUG-024)', () => {
  const lateNight = appointment({ appointment_date: '2999-10-28 23:30:00', duration_minutes: 30 })
  const endLabel = () => document.querySelectorAll('.time-slot-container .p-dropdown-label')[1]?.textContent

  const editLateNight = async () => {
    const opened = await open(CLIENT_ID, lateNight)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /edit/i }))
    await screen.findByRole('button', { name: /save changes/i })
    return { ...opened, user }
  }

  it('ends at 12:00 AM the next day, and saves as 30 minutes', async () => {
    const { update, user } = await editLateNight()

    expect(endLabel()).toBe('12:00 AM (next day)')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(update.calls).toBe(1))
    expect(update.bodies[0]).toMatchObject({ appointment_date: '2999-10-28 23:30:00', duration_minutes: 30 })
  })

  it('shows the API refusing the duration beside the time slot', async () => {
    const { user } = await editLateNight()
    api('put', '/common/appointments/1', invalid({ duration_minutes: 'Duration must be at least 1 minute.' }), 422)

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    expect(await screen.findByText('Duration must be at least 1 minute.')).toBeInTheDocument()
  })

  it('shows the reason under the time slot, not as a toast, when the API refuses a field the form has no place for', async () => {
    const { user } = await editLateNight()
    api('put', '/common/appointments/1', invalid({ status: 'The status is not valid.' }), 422)

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    const reason = await screen.findByText('The status is not valid.')
    expect(reason.previousElementSibling).toHaveClass('time-slot-container')
    expect(toast.error).not.toHaveBeenCalled()
  })
})

// 2026-11-23 redesign: the details show the status and type at a glance, and the form is in sections.
describe('AppointmentModal - layout', () => {
  it('shows the status and the meeting type beside the title', async () => {
    await open(CLIENT_ID)

    const hero = screen.getByText('QA-TEST Run1 WL client booking').closest('.apt-hero') as HTMLElement
    expect(hero).not.toBeNull()
    expect(within(hero).getByText('Pending')).toBeInTheDocument()
    expect(within(hero).getByText('Business Review')).toBeInTheDocument()
  })

  it('shows a pending appointment that has passed as expired', async () => {
    await open(CLIENT_ID, appointment({ appointment_date: '2020-10-28 09:00:00' }))

    const hero = screen.getByText('QA-TEST Run1 WL client booking').closest('.apt-hero') as HTMLElement
    expect(within(hero).getByText('Expired')).toBeInTheDocument()
  })

  it('splits the form into Meeting, People, Schedule and Notes sections', async () => {
    await open(CLIENT_ID)
    await userEvent.setup().click(screen.getByRole('button', { name: /edit/i }))

    for (const name of ['Meeting', 'People', 'Schedule', 'Notes']) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument()
    }
  })
})
