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

  // Editing a Calendly meeting shows it stays synced - its new title or time goes to Calendly.
  it('editing a Calendly meeting shows "Sync with Calendly" ticked and locked', async () => {
    const user = userEvent.setup()
    await open(CLIENT_ID, appointment({ is_calendly: true }))

    await user.click(screen.getByRole('button', { name: /edit/i }))

    const tick = await screen.findByLabelText('Sync with Calendly')
    expect(tick).toBeChecked()
    expect(tick).toBeDisabled()
    expect(screen.getByText(/a new title or time is changed there too/i)).toBeInTheDocument()
  })

  // Editing a Calendly meeting is checked against Calendly live, as booking one is.
  it('editing a Calendly meeting to a time Calendly does not offer shows the overlap and keeps Save disabled', async () => {
    const user = userEvent.setup()
    const times = { bodies: [] as any[] }
    await open(CLIENT_ID, appointment({ is_calendly: true }), ALL, () => {
      api('get', '/common/calendly/event-types', { status: true, data: [{ uri: 'https://api.calendly.com/event_types/ET1', name: '30 Minute Meeting', duration: 30 }] })
      server.use(http.post('*/common/calendly/available-times', async ({ request }) => {
        times.bodies.push(await request.json())
        // Calendly's open times that day: 10:00 only (09:00 is this meeting's own).
        return HttpResponse.json({ status: true, data: [{ start_time: '2999-10-28T10:00:00Z', local_time: '2999-10-28 10:00:00', label: '10:00 AM' }] })
      }))
    })

    await user.click(screen.getByRole('button', { name: /edit/i }))
    await screen.findByText(/calendly books 30 min/i)

    // Its own time: no overlap, and the edited meeting is left out of the FCH check.
    await waitFor(() => expect(times.bodies.length).toBeGreaterThan(0))
    expect(times.bodies[times.bodies.length - 1]).toMatchObject({ except_appointment_id: 1 })
    expect(document.querySelector('.calendly-overlap')).not.toBeInTheDocument()

    // Another time Calendly does not offer: the overlap, and Save locked.
    const startDropdown = document.querySelector('.time-slot-container .p-dropdown') as HTMLElement
    await user.click(startDropdown)
    const elevenThirty = await waitFor(() => {
      const item = Array.from(startDropdown.querySelectorAll('.p-dropdown-item')).find((el) => el.textContent?.trim() === '11:30 AM')
      if (!item) throw new Error('no 11:30 AM')
      return item as HTMLElement
    })
    await user.click(elevenThirty)

    const alert = await waitFor(() => {
      const found = document.querySelector('.calendly-overlap') as HTMLElement | null
      if (!found) throw new Error('no overlap alert')
      return found
    })
    expect(alert).toHaveTextContent('Calendly Overlap')
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled()

    // Picking an open time clears it.
    await user.click(within(alert).getByRole('button', { name: '10:00 AM' }))
    await waitFor(() => expect(document.querySelector('.calendly-overlap')).not.toBeInTheDocument())
  })

  // Defect: after opening a meeting you were invited to, Create New hid "Appointment With"
  // (the last meeting's details made you its invitee), so nobody could be picked.
  it('Create New after opening a meeting you were invited to still asks who the meeting is with', async () => {
    const ref = createRef<ModalHandle & { create: (date?: string) => void }>()
    signIn({ id: PARTNER_ID, is_host: 0, permissions: [...ALL, 'create appointments'] })
    allowBackgroundCalls()
    api('get', '/common/appointments/1', { status: true, data: appointment() })
    renderWithProviders(<AppointmentModal ref={ref as never} onSuccess={vi.fn()} />)
    await act(() => ref.current!.show(1))
    await screen.findByText('QA-TEST Run1 WL client booking')

    act(() => ref.current!.create('2999-06-15'))

    expect(await screen.findByText(/^Appointment With/)).toBeInTheDocument()
  })

  it('editing an FCH-only meeting shows no "Sync with Calendly"', async () => {
    const user = userEvent.setup()
    await open(CLIENT_ID)

    await user.click(screen.getByRole('button', { name: /edit/i }))
    await screen.findByPlaceholderText(/enter appointment title/i)

    expect(screen.queryByLabelText('Sync with Calendly')).not.toBeInTheDocument()
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
    // The attendee picker's own label: who it is with.
    await waitFor(() => expect(Array.from(document.querySelectorAll('.p-dropdown-label'), (el) => el.textContent)).toContain('QA-TEST Wanda Client One (Client)'))
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
    const check = availability({
      available: false,
      scheduler_conflicts: [{ id: 99, date: '2999-10-28', start_time: '09:00', end_time: '09:30', duration_minutes: 30 }],
      assignee_conflicts: [],
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
    bodies.forEach((body) => {
      expect(body.assigned_for).toBe(CLIENT_ID)
      expect(body).not.toHaveProperty('entity_id')
    })
    expect(update.bodies[0]).toMatchObject({ assigned_for: CLIENT_ID })
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

/**
 * Booking into the partner's Calendly from "Add Appointment": when Calendly is
 * connected, ticking "Sync with Calendly" books the date and time picked in the
 * usual time slot through Calendly, with the account's active event type - no
 * event type or open time to choose. Calendly's event type sets the length.
 */
describe('AppointmentModal - booking in Calendly from Add Appointment', () => {
  type CreateHandle = { create: (date?: string) => void }
  const NewAppointmentModal = AppointmentModalJsx as unknown as ComponentType<{ ref: Ref<CreateHandle>; onSuccess: () => void }>

  const EVENT_TYPE = { uri: 'https://api.calendly.com/event_types/ET1', name: '30 Minute Meeting', duration: 30 }
  const JANE = { id: 5, name: 'Jane Borrower (Borrower)', entity_type: 'Borrower', entity_id: 12 }
  const NINE = { start_time: '2999-06-15T14:00:00Z', local_time: '2999-06-15 09:00:00', label: '9:00 AM' }
  const TEN = { start_time: '2999-06-15T15:00:00Z', local_time: '2999-06-15 10:00:00', label: '10:00 AM' }
  const LIMIT_REACHED = "Calendly's booking limit has been reached for today"

  const calendly = (status: Record<string, unknown>) => {
    api('get', '/common/calendly/status', { status: true, data: { connected: true, can_manage: true, can_book: true, is_host: true, ...status } })
    api('get', '/common/calendly/event-types', { status: true, data: [EVENT_TYPE] })
    api('post', '/common/appointments/fetch-selectable-users', { status: true, data: [JANE] })
    // Calendly is open at the form's default start (9:00 AM) and 10:00 AM.
    const times = api('post', '/common/calendly/available-times', { status: true, data: [NINE, TEN] })
    const book = api('post', '/common/calendly/book', { status: true, message: 'Meeting booked in Calendly.', data: { id: 9 } })
    const create = api('post', '/common/appointments', { status: true, message: 'Appointment created' })
    return { times, book, create }
  }

  const add = async (status: Record<string, unknown> | null, { isHost = 1 } = {}) => {
    signIn({ id: 1, is_host: isHost, permissions: ['create appointments'] })
    allowBackgroundCalls()
    const calls = status ? calendly(status) : null
    const onSuccess = vi.fn()
    const ref = createRef<CreateHandle>()
    renderWithProviders(<NewAppointmentModal ref={ref} onSuccess={onSuccess} />)
    act(() => ref.current!.create('2999-06-15'))
    await screen.findByRole('button', { name: /confirm appointment/i })
    return { ...calls, onSuccess, user: userEvent.setup() }
  }

  // As the other PrimeReact dropdown tests: open the dropdown, click the panel item.
  const pick = async (user: ReturnType<typeof userEvent.setup>, dropdown: HTMLElement, label: string) => {
    await user.click(dropdown)
    const item = await waitFor(() => {
      const found = Array.from(dropdown.querySelectorAll('.p-dropdown-item')).find((el) => el.textContent?.trim() === label)
      if (!found) throw new Error(`no "${label}" option`)
      return found as HTMLElement
    })
    await user.click(item)
  }
  const dropdownWith = async (placeholder: string) =>
    (await screen.findAllByText(placeholder)).map((el) => el.closest('.p-dropdown')).find(Boolean) as HTMLElement
  const pickJane = async (user: ReturnType<typeof userEvent.setup>) => pick(user, await dropdownWith('Select Users'), JANE.name)

  it('offers no "Sync with Calendly" when Calendly is not connected', async () => {
    await add(null)

    expect(screen.queryByLabelText(/sync with calendly/i)).not.toBeInTheDocument()
  })

  it('offers no "Sync with Calendly" when Calendly is not set up on the server', async () => {
    const { user } = await add({ configured: false, connected: false, can_book: false })

    await user.type(screen.getByPlaceholderText(/enter appointment title/i), 'Funding review')

    expect(screen.queryByLabelText(/sync with calendly/i)).not.toBeInTheDocument()
    expect(document.querySelector('.time-slot-container')).toBeInTheDocument()
  })

  it('offers "Sync with Calendly" when Calendly is connected, unticked', async () => {
    await add({})

    expect(await screen.findByLabelText(/sync with calendly/i)).not.toBeChecked()
  })

  // Ticked: the same date and time slot as any appointment; FCH books it in
  // Calendly with the account's active event type - nothing more to pick.
  it('ticked, keeps the date and time slot, asks for no event type or open time, and books that time in Calendly', async () => {
    const { user, times, book, create, onSuccess } = await add({})

    await user.type(screen.getByPlaceholderText(/enter appointment title/i), 'Funding review')
    await pickJane(user)
    await user.click(await screen.findByLabelText(/sync with calendly/i))

    expect(document.querySelector('.time-slot-container')).toBeInTheDocument()
    expect(screen.queryByText(/calendly event type/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/open times/i)).not.toBeInTheDocument()
    expect(await screen.findByText('Calendly books 30 min (30 Minute Meeting).')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /confirm appointment/i }))

    await waitFor(() => expect(book!.calls).toBe(1))
    expect(book!.bodies[0]).toMatchObject({
      event_type_uri: EVENT_TYPE.uri,
      assigned_for: JANE.id,
      subject: 'Funding review',
      meeting_type: 'Business Review',
    })
    expect(book!.bodies[0].start_time).toBe('2999-06-15 09:00:00')
    expect(book!.bodies[0].timezone).toBeTruthy()
    // The picked time was checked against Calendly first.
    expect(times!.bodies[times!.bodies.length - 1]).toMatchObject({ event_type_uri: EVENT_TYPE.uri, date: '2999-06-15', assigned_for: JANE.id })
    expect(document.querySelector('.calendly-overlap')).not.toBeInTheDocument()
    expect(create!.calls).toBe(0)
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(toast.success).toHaveBeenCalledWith('Meeting booked in Calendly.')
  })

  it('a time that overlaps in Calendly shows the date, the selected time and the open times, and cannot be confirmed', async () => {
    const { user, book } = await add({})
    api('post', '/common/calendly/available-times', { status: true, data: [TEN] })

    await user.type(screen.getByPlaceholderText(/enter appointment title/i), 'Funding review')
    await pickJane(user)
    await user.click(await screen.findByLabelText(/sync with calendly/i))

    const alert = await waitFor(() => {
      const found = document.querySelector('.calendly-overlap') as HTMLElement | null
      if (!found) throw new Error('no overlap alert')
      return found
    })
    expect(alert).toHaveTextContent('Calendly Overlap')
    // Calendly is open 10:00 - 10:30 that day: 9:00 is outside its hours.
    expect(alert).toHaveTextContent("9:00 AM - 9:30 AM on 2999-06-15 is outside Calendly's hours that day (10:00 AM - 10:30 AM)")
    expect(within(alert).getByRole('button', { name: '10:00 AM' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm appointment/i })).toBeDisabled()

    // Picking an open time clears the overlap and books it.
    await user.click(within(alert).getByRole('button', { name: '10:00 AM' }))
    await waitFor(() => expect(document.querySelector('.calendly-overlap')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /confirm appointment/i }))

    await waitFor(() => expect(book!.calls).toBe(1))
    expect(book!.bodies[0].start_time).toBe('2999-06-15 10:00:00')
  })

  // Within Calendly's hours but not offered: another meeting is there - no duplicate is booked.
  it('a time inside Calendly hours that is taken says it is already booked', async () => {
    const { user, book } = await add({})
    const EIGHT_THIRTY = { start_time: '2999-06-15T13:30:00Z', local_time: '2999-06-15 08:30:00', label: '8:30 AM' }
    api('post', '/common/calendly/available-times', { status: true, data: [EIGHT_THIRTY, TEN] })

    await pickJane(user)
    await user.click(await screen.findByLabelText(/sync with calendly/i))

    const alert = await waitFor(() => {
      const found = document.querySelector('.calendly-overlap') as HTMLElement | null
      if (!found) throw new Error('no overlap alert')
      return found
    })
    expect(alert).toHaveTextContent('9:00 AM - 9:30 AM on 2999-06-15 is already booked')
    expect(screen.getByRole('button', { name: /confirm appointment/i })).toBeDisabled()
    expect(book!.calls).toBe(0)
  })

  it('a day with no open times in Calendly offers the next open day, and picking one moves the date', async () => {
    const { user, book } = await add({})
    const NEXT_DAY = { start_time: '2999-06-16T14:00:00Z', local_time: '2999-06-16 09:30:00', label: '9:30 AM' }
    server.use(http.post('*/common/calendly/available-times', async ({ request }) => {
      const body = (await request.json()) as { date: string }
      return HttpResponse.json({ status: true, data: body.date === '2999-06-16' ? [NEXT_DAY] : [] })
    }))

    await user.type(screen.getByPlaceholderText(/enter appointment title/i), 'Funding review')
    await pickJane(user)
    await user.click(await screen.findByLabelText(/sync with calendly/i))

    expect(await screen.findByText(/no open time in calendly/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm appointment/i })).toBeDisabled()
    const next = await waitFor(() => {
      const found = document.querySelector('.calendly-next-open') as HTMLElement | null
      if (!found) throw new Error('no next open day')
      return found
    })
    expect(next).toHaveTextContent('Next open day - 2999-06-16')

    await user.click(within(next).getByRole('button', { name: '9:30 AM' }))
    await waitFor(() => expect(document.querySelector('.calendly-overlap')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /confirm appointment/i }))

    await waitFor(() => expect(book!.calls).toBe(1))
    expect(book!.bodies[0].start_time).toBe('2999-06-16 09:30:00')
  })

  it("the end time follows the Calendly event type's length and is shown, not picked", async () => {
    const { user } = await add({})
    api('get', '/common/calendly/event-types', { status: true, data: [{ ...EVENT_TYPE, name: 'Long call', duration: 60 }] })

    await pickJane(user)
    await user.click(await screen.findByLabelText(/sync with calendly/i))

    expect(await screen.findByText('Calendly books 60 min (Long call).')).toBeInTheDocument()
    // A plain read-only field, not a greyed-out dropdown.
    const end = screen.getByLabelText('End') as HTMLInputElement
    expect(end).toHaveAttribute('readonly')
    expect(document.querySelectorAll('.time-slot-container .p-dropdown')).toHaveLength(1)
    await waitFor(() => expect(end.value).toBe('10:00 AM'))
  })

  // Everyone books into their own Calendly, so everyone picks who they invite.
  it('a partner team member books into their own Calendly and picks who they invite', async () => {
    const { user, book } = await add({ is_host: true, can_manage: true }, { isHost: 0 })

    await user.type(screen.getByPlaceholderText(/enter appointment title/i), 'Talk to Jane')
    await pickJane(user)
    await user.click(await screen.findByLabelText(/sync with calendly/i))
    await screen.findByText(/calendly books 30 min/i)
    await user.click(screen.getByRole('button', { name: /confirm appointment/i }))

    await waitFor(() => expect(book!.calls).toBe(1))
    expect(book!.bodies[0]).toMatchObject({ assigned_for: JANE.id })
  })

  // First who it is with, then Calendly: nothing is checked or shown before the person is chosen.
  it('cannot be ticked, and checks nothing in Calendly, until who it is with is chosen', async () => {
    const { user, times, book } = await add({})

    const tick = await screen.findByLabelText(/sync with calendly/i)
    expect(tick).toBeDisabled()
    expect(screen.getByText(/choose who the meeting is with \("appointment with"\) first/i)).toBeInTheDocument()
    expect(document.querySelector('.calendly-overlap')).not.toBeInTheDocument()
    expect(times!.calls).toBe(0)

    await pickJane(user)
    expect(tick).not.toBeDisabled()
    await user.click(tick)

    await waitFor(() => expect(times!.calls).toBeGreaterThan(0))
    expect(times!.bodies[0]).toMatchObject({ assigned_for: JANE.id })
    // 9:00 AM is open for Jane: said plainly.
    expect(await screen.findByText('Available in Calendly')).toBeInTheDocument()
    expect(book!.calls).toBe(0)
  })

  it('shows Calendly refusing the booking', async () => {
    const { user, onSuccess } = await add({})
    api('post', '/common/calendly/book', { status: false, message: LIMIT_REACHED }, 429)

    await user.type(screen.getByPlaceholderText(/enter appointment title/i), 'Funding review')
    await pickJane(user)
    await user.click(await screen.findByLabelText(/sync with calendly/i))
    await screen.findByText(/calendly books 30 min/i)
    await user.click(screen.getByRole('button', { name: /confirm appointment/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(LIMIT_REACHED))
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it("a time not open in Calendly shows Calendly's open times under the time slot", async () => {
    const { user, onSuccess } = await add({})
    const NOT_OPEN = '9:00 AM is not open in Calendly that day. Open times: 10:00 AM, 10:30 AM.'
    api('post', '/common/calendly/book', { status: false, message: NOT_OPEN, errors: { start_time: [NOT_OPEN] } }, 422)

    await user.type(screen.getByPlaceholderText(/enter appointment title/i), 'Funding review')
    await pickJane(user)
    await user.click(await screen.findByLabelText(/sync with calendly/i))
    await screen.findByText(/calendly books 30 min/i)
    await user.click(screen.getByRole('button', { name: /confirm appointment/i }))

    const shown = await screen.findByText(NOT_OPEN)
    expect(shown.closest('.col-md-6')?.querySelector('.time-slot-container')).toBeTruthy()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  // The API calls the invitee's number from their FCH profile - nothing to type.
  it('a phone-call event type asks for no number and books straight away', async () => {
    const { user, book } = await add({})
    api('get', '/common/calendly/event-types', { status: true, data: [{ ...EVENT_TYPE, location_kind: 'outbound_call', asks_invitee_location: true }] })

    await user.type(screen.getByPlaceholderText(/enter appointment title/i), 'Funding review')
    await pickJane(user)
    await user.click(await screen.findByLabelText(/sync with calendly/i))
    await screen.findByText(/calendly books 30 min/i)

    expect(screen.queryByLabelText(/phone number to call/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /confirm appointment/i }))

    await waitFor(() => expect(book!.calls).toBe(1))
    expect(book!.bodies[0]).not.toHaveProperty('location')
  })

  it('asks for the number only when the person has none in FCH, then books with it', async () => {
    const { user, book } = await add({})
    api('get', '/common/calendly/event-types', { status: true, data: [{ ...EVENT_TYPE, location_kind: 'outbound_call', asks_invitee_location: true }] })
    const MISSING = 'Jane Borrower has no phone number in FCH - enter the number to call.'
    let calls = 0
    server.use(http.post('*/common/calendly/book', async ({ request }) => {
      calls += 1
      const body = (await request.json()) as Record<string, unknown>
      return body.location
        ? HttpResponse.json({ status: true, message: 'Meeting booked in Calendly.', data: { id: 9, location: body.location } })
        : HttpResponse.json({ status: false, message: MISSING, errors: { location: [MISSING] } }, { status: 422 })
    }))

    await user.type(screen.getByPlaceholderText(/enter appointment title/i), 'Funding review')
    await pickJane(user)
    await user.click(await screen.findByLabelText(/sync with calendly/i))
    await screen.findByText(/calendly books 30 min/i)
    await user.click(screen.getByRole('button', { name: /confirm appointment/i }))

    expect(await screen.findByText(MISSING)).toBeInTheDocument()
    await user.type(screen.getByLabelText(/phone number to call/i), '+1 312 555 0100')
    await user.click(screen.getByRole('button', { name: /confirm appointment/i }))

    await waitFor(() => expect(calls).toBe(2))
    expect(book!.calls).toBe(0)
  })

  it('an event type with its own place asks for no location', async () => {
    const { user, book } = await add({})

    await user.type(screen.getByPlaceholderText(/enter appointment title/i), 'Funding review')
    await pickJane(user)
    await user.click(await screen.findByLabelText(/sync with calendly/i))
    await screen.findByText(/calendly books 30 min/i)

    expect(screen.queryByLabelText(/phone number to call/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /confirm appointment/i }))
    await waitFor(() => expect(book!.calls).toBe(1))
    expect(book!.bodies[0]).not.toHaveProperty('location')
  })

  it('says so when the Calendly account has no event type switched on, and cannot be confirmed', async () => {
    const { user } = await add({})
    api('get', '/common/calendly/event-types', { status: true, data: [] })

    await pickJane(user)
    await user.click(await screen.findByLabelText(/sync with calendly/i))

    expect(await screen.findByText(/no event type switched on/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /confirm appointment/i })).toBeDisabled()
  })

  it('an event type offering several places asks which, and books the one picked', async () => {
    const { user, book } = await add({})
    api('get', '/common/calendly/event-types', { status: true, data: [{
      ...EVENT_TYPE,
      location_kind: 'zoom_conference',
      asks_invitee_location: false,
      location_options: [
        { kind: 'zoom_conference', label: 'Zoom', asks_invitee: false },
        { kind: 'outbound_call', label: 'Phone call (we call you)', asks_invitee: true },
      ],
    }] })

    await user.type(screen.getByPlaceholderText(/enter appointment title/i), 'Funding review')
    await pickJane(user)
    await user.click(await screen.findByLabelText(/sync with calendly/i))
    expect(screen.queryByLabelText(/phone number to call/i)).not.toBeInTheDocument()
    await pick(user, await dropdownWith('Zoom'), 'Phone call (we call you)')
    // The number comes from the person's FCH profile.
    expect(screen.queryByLabelText(/phone number to call/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /confirm appointment/i }))

    await waitFor(() => expect(book!.calls).toBe(1))
    expect(book!.bodies[0]).toMatchObject({ location_kind: 'outbound_call' })
  })

  it('"Sync with Calendly" comes after the description', async () => {
    await add({})

    const description = screen.getByText('Description')
    const tick = await screen.findByLabelText(/sync with calendly/i)

    expect(description.compareDocumentPosition(tick) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('with several active event types, the first is used - none is asked for', async () => {
    const { user, book } = await add({})
    const SECOND = { uri: 'https://api.calendly.com/event_types/ET2', name: 'Intro Call', duration: 15 }
    api('get', '/common/calendly/event-types', { status: true, data: [EVENT_TYPE, SECOND] })

    await user.type(screen.getByPlaceholderText(/enter appointment title/i), 'Funding review')
    await pickJane(user)
    await user.click(await screen.findByLabelText(/sync with calendly/i))
    await screen.findByText(/calendly books 30 min/i)
    await user.click(screen.getByRole('button', { name: /confirm appointment/i }))

    await waitFor(() => expect(book!.calls).toBe(1))
    expect(book!.bodies[0]).toMatchObject({ event_type_uri: EVENT_TYPE.uri })
  })
})
