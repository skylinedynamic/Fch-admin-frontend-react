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
 * Booking into the company Calendly from "Add Appointment": when Calendly is
 * connected, a "Sync with Calendly" tick swaps the time slot for Calendly's
 * open times and books through Calendly - replacing the separate
 * "Book via Calendly" form.
 */
describe('AppointmentModal - booking in Calendly from Add Appointment', () => {
  type CreateHandle = { create: (date?: string) => void }
  const NewAppointmentModal = AppointmentModalJsx as unknown as ComponentType<{ ref: Ref<CreateHandle>; onSuccess: () => void }>

  const EVENT_TYPE = { uri: 'https://api.calendly.com/event_types/ET1', name: '30 Minute Meeting', duration: 30 }
  const SLOT = { start_time: '2999-06-15T15:00:00Z', local_time: '2999-06-15 10:00:00', label: '10:00 AM' }
  const JANE = { id: 5, name: 'Jane Borrower (Borrower)', entity_type: 'Borrower', entity_id: 12 }
  const LIMIT_REACHED = "Calendly's booking limit has been reached for today"

  const calendly = (status: Record<string, unknown>) => {
    api('get', '/common/calendly/status', { status: true, data: { connected: true, can_manage: true, can_book: true, is_host: true, ...status } })
    api('get', '/common/calendly/event-types', { status: true, data: [EVENT_TYPE] })
    api('post', '/common/appointments/fetch-selectable-users', { status: true, data: [JANE] })
    const times = api('post', '/common/calendly/available-times', { status: true, data: [SLOT] })
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
  const pickOpenTime = async (user: ReturnType<typeof userEvent.setup>, label = SLOT.label) =>
    pick(user, await dropdownWith('Select an open time'), label)
  const eventTypeDropdown = () => document.querySelector('.calendly-event-type .p-dropdown') as HTMLElement

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

  it('ticked, shows Calendly open times instead of the time slot and books the chosen one in Calendly', async () => {
    const { user, times, book, create, onSuccess } = await add({})

    await user.type(screen.getByPlaceholderText(/enter appointment title/i), 'Funding review')
    await pickJane(user)
    await user.click(await screen.findByLabelText(/sync with calendly/i))

    expect(document.querySelector('.time-slot-container')).not.toBeInTheDocument()
    await pickOpenTime(user)
    await user.click(screen.getByRole('button', { name: /confirm appointment/i }))

    await waitFor(() => expect(book!.calls).toBe(1))
    expect(times!.bodies[times!.bodies.length - 1]).toMatchObject({ event_type_uri: EVENT_TYPE.uri, date: '2999-06-15', assigned_for: JANE.id })
    expect(book!.bodies[0]).toMatchObject({
      event_type_uri: EVENT_TYPE.uri,
      start_time: SLOT.start_time,
      assigned_for: JANE.id,
      subject: 'Funding review',
      meeting_type: 'Business Review',
    })
    expect(book!.bodies[0].timezone).toBeTruthy()
    expect(create!.calls).toBe(0)
    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(toast.success).toHaveBeenCalledWith('Meeting booked in Calendly.')
  })

  it('cannot be confirmed until an open time is chosen', async () => {
    const { user } = await add({})

    await user.type(screen.getByPlaceholderText(/enter appointment title/i), 'Funding review')
    await pickJane(user)
    await user.click(await screen.findByLabelText(/sync with calendly/i))
    await screen.findAllByText('Select an open time')

    expect(screen.getByRole('button', { name: /confirm appointment/i })).toBeDisabled()
  })

  // Everyone books into their own Calendly, so everyone picks who they invite
  // (was: someone booking with the company Calendly's owner was the invitee).
  it('a partner team member books into their own Calendly and picks who they invite', async () => {
    const { user, book } = await add({ is_host: true, can_manage: true }, { isHost: 0 })

    await user.type(screen.getByPlaceholderText(/enter appointment title/i), 'Talk to Jane')
    await pickJane(user)
    await user.click(await screen.findByLabelText(/sync with calendly/i))
    await pickOpenTime(user)
    await user.click(screen.getByRole('button', { name: /confirm appointment/i }))

    await waitFor(() => expect(book!.calls).toBe(1))
    expect(book!.bodies[0]).toMatchObject({ assigned_for: JANE.id })
  })

  it('without picking who it is with, says so instead of booking', async () => {
    const { user, book } = await add({})

    await user.type(screen.getByPlaceholderText(/enter appointment title/i), 'Funding review')
    await user.click(await screen.findByLabelText(/sync with calendly/i))
    await pickOpenTime(user)
    await user.click(screen.getByRole('button', { name: /confirm appointment/i }))

    expect(await screen.findByText('Choose who the meeting is with')).toBeInTheDocument()
    expect(book!.calls).toBe(0)
  })

  it('shows Calendly refusing the booking', async () => {
    const { user, onSuccess } = await add({})
    api('post', '/common/calendly/book', { status: false, message: LIMIT_REACHED }, 429)

    await user.type(screen.getByPlaceholderText(/enter appointment title/i), 'Funding review')
    await pickJane(user)
    await user.click(await screen.findByLabelText(/sync with calendly/i))
    await pickOpenTime(user)
    await user.click(screen.getByRole('button', { name: /confirm appointment/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(LIMIT_REACHED))
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('says so when the day has no open times', async () => {
    const { user } = await add({})
    api('post', '/common/calendly/available-times', { status: true, data: [] })

    await pickJane(user)
    await user.click(await screen.findByLabelText(/sync with calendly/i))

    expect(await screen.findByText(/no open times/i)).toBeInTheDocument()
  })

  it('shows why open times could not be loaded instead of "no open times"', async () => {
    const { user } = await add({})
    api('post', '/common/calendly/available-times', { status: false, message: 'The Calendly connection has expired. An administrator needs to connect Calendly again.' }, 422)

    await pickJane(user)
    await user.click(await screen.findByLabelText(/sync with calendly/i))

    expect(await screen.findByText(/connection has expired/i)).toBeInTheDocument()
    expect(screen.queryByText(/no open times/i)).not.toBeInTheDocument()
  })

  it('a phone-call event type asks for the number to call and books with it', async () => {
    const { user, book } = await add({})
    api('get', '/common/calendly/event-types', { status: true, data: [{ ...EVENT_TYPE, location_kind: 'outbound_call', asks_invitee_location: true }] })

    await user.type(screen.getByPlaceholderText(/enter appointment title/i), 'Funding review')
    await pickJane(user)
    await user.click(await screen.findByLabelText(/sync with calendly/i))
    await pickOpenTime(user)

    // Calendly refuses a phone-call booking without the number.
    expect(screen.getByRole('button', { name: /confirm appointment/i })).toBeDisabled()
    await user.type(screen.getByLabelText(/phone number to call/i), '+1 312 555 0100')
    await user.click(screen.getByRole('button', { name: /confirm appointment/i }))

    await waitFor(() => expect(book!.calls).toBe(1))
    expect(book!.bodies[0]).toMatchObject({ location: '+1 312 555 0100' })
  })

  it('an event type with its own place asks for no location', async () => {
    const { user, book } = await add({})

    await user.type(screen.getByPlaceholderText(/enter appointment title/i), 'Funding review')
    await pickJane(user)
    await user.click(await screen.findByLabelText(/sync with calendly/i))
    await pickOpenTime(user)

    expect(screen.queryByLabelText(/phone number to call/i)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /confirm appointment/i }))
    await waitFor(() => expect(book!.calls).toBe(1))
    expect(book!.bodies[0]).not.toHaveProperty('location')
  })

  it('says so when the Calendly account has no event types, with the event type dropdown disabled', async () => {
    const { user } = await add({})
    api('get', '/common/calendly/event-types', { status: true, data: [] })

    await user.click(await screen.findByLabelText(/sync with calendly/i))

    expect(await screen.findByText(/no event types/i)).toBeInTheDocument()
    expect(eventTypeDropdown()).toHaveClass('p-disabled')
  })

  // The open times come as soon as an event type and a date are chosen - not
  // only once the person is picked (the dropdown looked broken until then).
  it('loads the open times before who it is with is picked', async () => {
    const { user, times } = await add({})

    await user.click(await screen.findByLabelText(/sync with calendly/i))

    await waitFor(() => expect(times!.calls).toBeGreaterThan(0))
    expect(times!.bodies[0]).toMatchObject({ event_type_uri: EVENT_TYPE.uri, date: '2999-06-15' })
    expect(times!.bodies[0]).not.toHaveProperty('assigned_for')
    await pickOpenTime(user)
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
    await pickOpenTime(user)
    expect(screen.queryByLabelText(/phone number to call/i)).not.toBeInTheDocument()
    await pick(user, await dropdownWith('Zoom'), 'Phone call (we call you)')
    await user.type(screen.getByLabelText(/phone number to call/i), '+1 312 555 0100')
    await user.click(screen.getByRole('button', { name: /confirm appointment/i }))

    await waitFor(() => expect(book!.calls).toBe(1))
    expect(book!.bodies[0]).toMatchObject({ location_kind: 'outbound_call', location: '+1 312 555 0100' })
  })

  it('"Sync with Calendly" comes after the description', async () => {
    await add({})

    const description = screen.getByText('Description')
    const tick = await screen.findByLabelText(/sync with calendly/i)

    expect(description.compareDocumentPosition(tick) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('the event type is a dropdown, the only one chosen already', async () => {
    const { user } = await add({})

    await user.click(await screen.findByLabelText(/sync with calendly/i))

    await waitFor(() => expect(eventTypeDropdown()?.querySelector('.p-dropdown-label')?.textContent).toBe('30 Minute Meeting (30 min)'))
  })

  it('with several event types, the one picked from the dropdown is asked about and booked', async () => {
    const { user, times, book } = await add({})
    const SECOND = { uri: 'https://api.calendly.com/event_types/ET2', name: 'Intro Call', duration: 15 }
    api('get', '/common/calendly/event-types', { status: true, data: [EVENT_TYPE, SECOND] })

    await user.type(screen.getByPlaceholderText(/enter appointment title/i), 'Funding review')
    await pickJane(user)
    await user.click(await screen.findByLabelText(/sync with calendly/i))
    await waitFor(() => expect(eventTypeDropdown()).toBeTruthy())
    await pick(user, eventTypeDropdown(), 'Intro Call (15 min)')
    await pickOpenTime(user)
    await user.click(screen.getByRole('button', { name: /confirm appointment/i }))

    await waitFor(() => expect(book!.calls).toBe(1))
    expect(times!.bodies[times!.bodies.length - 1]).toMatchObject({ event_type_uri: SECOND.uri })
    expect(book!.bodies[0]).toMatchObject({ event_type_uri: SECOND.uri })
  })
})
