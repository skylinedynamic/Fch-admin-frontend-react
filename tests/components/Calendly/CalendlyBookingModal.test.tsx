import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, waitFor } from '../../test-utils'
import { api } from '../../pages/pageHarness'
import { server } from '../../mocks/server'

vi.mock('react-toastify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-toastify')>()
  return { ...actual, toast: Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn(), warn: vi.fn() }) }
})

import { toast } from 'react-toastify'
import CalendlyBookingModal from '../../../src/components/Calendly/CalendlyBookingModal'

const EVENT_TYPE = { uri: 'https://api.calendly.com/event_types/ET1', name: '30 Minute Meeting', duration: 30 }
const SLOT = { start_time: '2999-06-15T15:00:00Z', local_time: '2999-06-15 10:00:00', label: '10:00 AM' }

const serve = () => {
  api('get', '/common/calendly/event-types', { status: true, data: [EVENT_TYPE] })
  const times = api('post', '/common/calendly/available-times', { status: true, data: [SLOT] })
  const users = api('post', '/common/appointments/fetch-selectable-users', { status: true, data: [{ id: 5, name: 'Jane Borrower (Borrower)' }] })
  const book = api('post', '/common/calendly/book', { status: true, message: 'Meeting booked in Calendly.', data: { id: 9 } })
  return { times, users, book }
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => server.resetHandlers())

/** Booking a slot in the company Calendly from the partner portal. */
describe('CalendlyBookingModal', () => {
  it('the host picks who it is with, a day and an open slot, and books it in Calendly', async () => {
    const user = userEvent.setup()
    const onBooked = vi.fn()
    const { times, users, book } = serve()

    renderWithProviders(<CalendlyBookingModal show isHost onClose={vi.fn()} onBooked={onBooked} timezone="America/Chicago" />)

    await waitFor(() => expect(users.calls).toBeGreaterThan(0))
    await user.selectOptions(await screen.findByLabelText(/meeting with/i), '5')
    await user.type(screen.getByLabelText(/^date/i), '2999-06-15')
    await user.click(await screen.findByRole('button', { name: '10:00 AM' }))
    await user.type(screen.getByLabelText(/subject/i), 'Funding review')
    await user.click(screen.getByRole('button', { name: /book in calendly/i }))

    await waitFor(() => expect(book.calls).toBe(1))
    expect(times.bodies[times.bodies.length - 1]).toEqual({ event_type_uri: EVENT_TYPE.uri, date: '2999-06-15', timezone: 'America/Chicago', assigned_for: 5 })
    expect(book.bodies[0]).toMatchObject({
      event_type_uri: EVENT_TYPE.uri,
      start_time: SLOT.start_time,
      timezone: 'America/Chicago',
      assigned_for: 5,
      subject: 'Funding review',
    })
    await waitFor(() => expect(onBooked).toHaveBeenCalled())
    expect(toast.success).toHaveBeenCalledWith('Meeting booked in Calendly.')
  })

  it('someone booking with the host does not pick an attendee - they are the invitee', async () => {
    const user = userEvent.setup()
    const { users, book } = serve()

    renderWithProviders(<CalendlyBookingModal show isHost={false} onClose={vi.fn()} onBooked={vi.fn()} timezone="UTC" />)

    await user.type(await screen.findByLabelText(/^date/i), '2999-06-15')
    await user.click(await screen.findByRole('button', { name: '10:00 AM' }))
    await user.click(screen.getByRole('button', { name: /book in calendly/i }))

    await waitFor(() => expect(book.calls).toBe(1))
    expect(screen.queryByLabelText(/meeting with/i)).not.toBeInTheDocument()
    expect(users.calls).toBe(0)
    expect(book.bodies[0]).not.toHaveProperty('assigned_for')
  })

  it('cannot book until a slot is chosen', async () => {
    serve()

    renderWithProviders(<CalendlyBookingModal show isHost={false} onClose={vi.fn()} onBooked={vi.fn()} timezone="UTC" />)

    expect(await screen.findByRole('button', { name: /book in calendly/i })).toBeDisabled()
  })

  it('shows Calendly refusing the booking (e.g. the Free plan daily limit)', async () => {
    const user = userEvent.setup()
    serve()
    api('post', '/common/calendly/book', { status: false, message: "Calendly's booking limit has been reached for today" }, 429)

    renderWithProviders(<CalendlyBookingModal show isHost={false} onClose={vi.fn()} onBooked={vi.fn()} timezone="UTC" />)

    await user.type(await screen.findByLabelText(/^date/i), '2999-06-15')
    await user.click(await screen.findByRole('button', { name: '10:00 AM' }))
    await user.click(screen.getByRole('button', { name: /book in calendly/i }))

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Calendly's booking limit has been reached for today"))
  })

  it('says so when the day has no open slots', async () => {
    const user = userEvent.setup()
    serve()
    api('post', '/common/calendly/available-times', { status: true, data: [] })

    renderWithProviders(<CalendlyBookingModal show isHost={false} onClose={vi.fn()} onBooked={vi.fn()} timezone="UTC" />)

    await user.type(await screen.findByLabelText(/^date/i), '2999-06-15')
    expect(await screen.findByText(/no open times/i)).toBeInTheDocument()
  })

  it('renders nothing when hidden', () => {
    const { container } = renderWithProviders(<CalendlyBookingModal show={false} isHost={false} onClose={vi.fn()} onBooked={vi.fn()} />)

    expect(container.textContent).toBe('')
  })
})

// Defect: when Calendly could not be asked for open times (the connection had
// expired), the form said "No open times on this day" - hiding the reason.
describe('CalendlyBookingModal - open times cannot be loaded', () => {
  it('shows why instead of "no open times"', async () => {
    const user = userEvent.setup()
    serve()
    api('post', '/common/calendly/available-times', { status: false, message: 'The Calendly connection has expired. An administrator needs to connect Calendly again.' }, 422)

    renderWithProviders(<CalendlyBookingModal show isHost={false} onClose={vi.fn()} onBooked={vi.fn()} timezone="UTC" />)

    await user.type(await screen.findByLabelText(/^date/i), '2999-06-15')
    expect(await screen.findByText(/connection has expired/i)).toBeInTheDocument()
    expect(screen.queryByText(/no open times/i)).not.toBeInTheDocument()
  })
})
