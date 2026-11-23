import { afterEach, describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../mocks/server'
import { renderWithProviders, screen, waitFor } from '../../test-utils'
import CalendlyBookingFields, { EMPTY_CALENDLY_BOOKING, type CalendlyBookingValue } from '../../../src/components/Appointment/CalendlyBookingFields'
import { CALENDLY_BOOKING_MODES } from '../../../src/modules/calendly/types'
import type { AttendeeInput } from '../../../src/modules/appointment/types'

const zoom = { uri: 'ET1', name: '30 Minute Meeting', duration: 30, locations: [{ kind: 'zoom_conference' }], asks_location: false }
const phone = { uri: 'ET2', name: 'Phone call', duration: 15, locations: [{ kind: 'outbound_call' }], asks_location: true }

function options(mode: string, eventTypes = [zoom], host: object | null = { user_id: 1, name: 'Sam Staff' }) {
  server.use(http.post('*/common/calendly/booking-options', () => HttpResponse.json({ status: true, data: { mode, host, event_types: eventTypes } })))
}

function Harness({ attendees = [{ user_id: 1 }], onPickTime = vi.fn(), errors = {}, spy = vi.fn() }: {
  attendees?: AttendeeInput[]
  onPickTime?: (time: string, minutes: number) => void
  errors?: Record<string, string | string[]>
  spy?: (v: CalendlyBookingValue) => void
}) {
  const [value, setValue] = useState<CalendlyBookingValue>(EMPTY_CALENDLY_BOOKING)
  return (
    <CalendlyBookingFields
      attendees={attendees}
      date="2026-11-27"
      timezone="UTC"
      value={value}
      onChange={(v) => { setValue(v); spy(v) }}
      onPickTime={onPickTime}
      errors={errors}
    />
  )
}

afterEach(() => server.resetHandlers())

/** As the form's other PrimeReact dropdowns: open it, click the panel item. */
async function pickEventType(container: ParentNode, option: string) {
  await userEvent.click(container.querySelector('.calendly-event-type-dropdown') as HTMLElement)
  const item = await waitFor(() => {
    const found = Array.from(document.body.querySelectorAll('.p-dropdown-panel .p-dropdown-item')).find((el) => el.textContent?.trim().startsWith(option))
    if (!found) throw new Error(`no "${option}" option`)
    return found as HTMLElement
  })
  await userEvent.click(item)
}

describe('CalendlyBookingFields (Calendly v2)', () => {
  it('shows nothing when nobody who could host it is connected', async () => {
    options(CALENDLY_BOOKING_MODES.NONE, [], null)
    renderWithProviders(<Harness />)

    await waitFor(() => expect(screen.queryByLabelText(/sync with calendly/i)).not.toBeInTheDocument())
  })

  it('is ticked by default in my own Calendly, with its first event type', async () => {
    options(CALENDLY_BOOKING_MODES.OWN)
    const spy = vi.fn()
    renderWithProviders(<Harness spy={spy} />)

    expect(await screen.findByLabelText(/sync with calendly/i)).toBeChecked()
    expect(screen.getByText(/booked in your calendly/i)).toBeInTheDocument()
    await waitFor(() => expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ sync: true, eventTypeUri: 'ET1' })))
  })

  it('says whose Calendly it goes into when it is the attendee\'s', async () => {
    options(CALENDLY_BOOKING_MODES.THEIRS)
    renderWithProviders(<Harness />)

    expect(await screen.findByText(/booked in sam staff's calendly/i)).toBeInTheDocument()
  })

  it('lists Calendly\'s open times and picks one', async () => {
    options(CALENDLY_BOOKING_MODES.OWN)
    server.use(http.post('*/common/calendly/available-times', () => HttpResponse.json({ status: true, data: [
      { start_time: '2026-11-27T09:00:00Z', local_time: '09:00' },
      { start_time: '2026-11-27T10:00:00Z', local_time: '10:00' },
    ] })))
    const onPickTime = vi.fn()
    renderWithProviders(<Harness onPickTime={onPickTime} />)

    await userEvent.click(await screen.findByRole('button', { name: '10:00' }))
    expect(onPickTime).toHaveBeenCalledWith('10:00', 30)
  })

  it('says so when Calendly has no open time that day', async () => {
    options(CALENDLY_BOOKING_MODES.OWN)
    server.use(http.post('*/common/calendly/available-times', () => HttpResponse.json({ status: true, data: [] })))
    renderWithProviders(<Harness />)

    expect(await screen.findByText(/no open times/i)).toBeInTheDocument()
  })

  it('asks for the number when the event type is a phone call', async () => {
    options(CALENDLY_BOOKING_MODES.OWN, [phone])
    server.use(http.post('*/common/calendly/available-times', () => HttpResponse.json({ status: true, data: [] })))
    const spy = vi.fn()
    renderWithProviders(<Harness spy={spy} errors={{ calendly_location: ['This Calendly event type needs a phone number or a place.'] }} />)

    const input = await screen.findByLabelText(/phone number to call/i)
    expect(screen.getByText(/needs a phone number/i)).toBeInTheDocument()
    await userEvent.type(input, '+15551234567')
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ location: '+15551234567', locationKind: 'outbound_call' }))
  })

  it('unticking turns it off', async () => {
    options(CALENDLY_BOOKING_MODES.OWN)
    const spy = vi.fn()
    renderWithProviders(<Harness spy={spy} />)

    await userEvent.click(await screen.findByLabelText(/sync with calendly/i))
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ sync: false }))
  })

  it('marks the open time the form is set to, and says where the meeting is', async () => {
    options(CALENDLY_BOOKING_MODES.OWN)
    server.use(http.post('*/common/calendly/available-times', () => HttpResponse.json({ status: true, data: [
      { start_time: '2026-11-27T09:00:00Z', local_time: '09:00' },
      { start_time: '2026-11-27T10:00:00Z', local_time: '10:00' },
    ] })))
    renderWithProviders(
      <CalendlyBookingFields attendees={[{ user_id: 1 }]} date="2026-11-27" timezone="UTC" selectedTime="10:00"
        value={{ ...EMPTY_CALENDLY_BOOKING, sync: true, eventTypeUri: 'ET1', locationKind: 'zoom_conference' }}
        onChange={vi.fn()} onPickTime={vi.fn()} />
    )

    expect(await screen.findByRole('button', { name: '10:00' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '09:00' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('Zoom')).toBeInTheDocument()
  })

  it('picks the event type from a dropdown when there are several', async () => {
    options(CALENDLY_BOOKING_MODES.OWN, [zoom, phone])
    server.use(http.post('*/common/calendly/available-times', () => HttpResponse.json({ status: true, data: [] })))
    const spy = vi.fn()
    const { container } = renderWithProviders(<Harness spy={spy} />)

    await waitFor(() => expect(container.querySelector('.calendly-event-type-dropdown .p-dropdown-label')?.textContent).toBe('30 Minute Meeting (30 min)'))
    await pickEventType(container, 'Phone call')

    await waitFor(() => expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ eventTypeUri: 'ET2', locationKind: 'outbound_call' })))
  })

  it('names a single event type - no dropdown', async () => {
    options(CALENDLY_BOOKING_MODES.OWN)
    server.use(http.post('*/common/calendly/available-times', () => HttpResponse.json({ status: true, data: [] })))
    const { container } = renderWithProviders(<Harness />)

    expect(await screen.findByText('30 Minute Meeting')).toBeInTheDocument()
    expect(container.querySelector('.calendly-event-type-dropdown')).toBeNull()
  })

  it('tells the form whether its start time is an open time in Calendly, and the event type length', async () => {
    options(CALENDLY_BOOKING_MODES.OWN)
    server.use(http.post('*/common/calendly/available-times', () => HttpResponse.json({ status: true, data: [
      { start_time: '2026-11-27T10:00:00Z', local_time: '10:00' },
    ] })))
    const onCalendlyFit = vi.fn()
    const { rerender } = renderWithProviders(
      <CalendlyBookingFields attendees={[{ user_id: 1 }]} date="2026-11-27" timezone="UTC" selectedTime="09:00"
        value={{ ...EMPTY_CALENDLY_BOOKING, sync: true, eventTypeUri: 'ET1', locationKind: 'zoom_conference' }}
        onChange={vi.fn()} onPickTime={vi.fn()} onCalendlyFit={onCalendlyFit} />
    )

    await waitFor(() => expect(onCalendlyFit).toHaveBeenLastCalledWith({ minutes: 30, open: false }))

    rerender(
      <CalendlyBookingFields attendees={[{ user_id: 1 }]} date="2026-11-27" timezone="UTC" selectedTime="10:00"
        value={{ ...EMPTY_CALENDLY_BOOKING, sync: true, eventTypeUri: 'ET1', locationKind: 'zoom_conference' }}
        onChange={vi.fn()} onPickTime={vi.fn()} onCalendlyFit={onCalendlyFit} />
    )
    await waitFor(() => expect(onCalendlyFit).toHaveBeenLastCalledWith({ minutes: 30, open: true }))
  })

  it('tells the form nothing applies once Sync with Calendly is off', async () => {
    options(CALENDLY_BOOKING_MODES.OWN)
    server.use(http.post('*/common/calendly/available-times', () => HttpResponse.json({ status: true, data: [] })))
    const onCalendlyFit = vi.fn()
    renderWithProviders(
      <CalendlyBookingFields attendees={[{ user_id: 1 }]} date="2026-11-27" timezone="UTC" selectedTime="09:00"
        value={{ ...EMPTY_CALENDLY_BOOKING, sync: false, eventTypeUri: 'ET1' }}
        onChange={vi.fn()} onPickTime={vi.fn()} onCalendlyFit={onCalendlyFit} />
    )

    await waitFor(() => expect(onCalendlyFit).toHaveBeenCalled())
    expect(onCalendlyFit).toHaveBeenLastCalledWith({ minutes: null, open: null })
  })

  it('offers to use the appointment title and length in Calendly - off by default, ticking it turns it on', async () => {
    options(CALENDLY_BOOKING_MODES.OWN)
    server.use(http.post('*/common/calendly/available-times', () => HttpResponse.json({ status: true, data: [] })))
    const spy = vi.fn()
    renderWithProviders(<Harness spy={spy} />)

    const box = await screen.findByRole('checkbox', { name: /use this appointment's title in calendly/i })
    expect(box).not.toBeChecked()
    await userEvent.click(box)

    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ sync: true, useTitle: true }))
    expect(box).toBeChecked()
  })

  it('with the title ticked, the length is the form\'s own: no event type length, no open-time check', async () => {
    options(CALENDLY_BOOKING_MODES.OWN)
    server.use(http.post('*/common/calendly/available-times', () => HttpResponse.json({ status: true, data: [
      { start_time: '2026-11-27T10:00:00Z', local_time: '10:00' },
    ] })))
    const onCalendlyFit = vi.fn()
    renderWithProviders(
      <CalendlyBookingFields attendees={[{ user_id: 1 }]} date="2026-11-27" timezone="UTC" selectedTime="09:00"
        value={{ ...EMPTY_CALENDLY_BOOKING, sync: true, useTitle: true, eventTypeUri: 'ET1', locationKind: 'zoom_conference' }}
        onChange={vi.fn()} onPickTime={vi.fn()} onCalendlyFit={onCalendlyFit} />
    )

    expect(await screen.findByText(/one-time meeting with this title/i)).toBeInTheDocument()
    await waitFor(() => expect(onCalendlyFit).toHaveBeenCalled())
    expect(onCalendlyFit).toHaveBeenLastCalledWith({ minutes: null, open: null })
    expect(screen.queryByText('Open times in Calendly')).not.toBeInTheDocument()
    expect(screen.queryByText('30 min')).not.toBeInTheDocument()
  })

  it('shows the API\'s refusal of the title under the box', async () => {
    options(CALENDLY_BOOKING_MODES.OWN)
    server.use(http.post('*/common/calendly/available-times', () => HttpResponse.json({ status: true, data: [] })))
    renderWithProviders(
      <CalendlyBookingFields attendees={[{ user_id: 1 }]} date="2026-11-27" timezone="UTC"
        value={{ ...EMPTY_CALENDLY_BOOKING, sync: true, useTitle: true, eventTypeUri: 'ET1' }}
        errors={{ calendly_use_title: ['Disconnect and connect Calendly again.'] }}
        onChange={vi.fn()} onPickTime={vi.fn()} />
    )

    expect(await screen.findByText('Disconnect and connect Calendly again.')).toBeInTheDocument()
  })

  it('shows a Calendly refusal at the bottom of the section, after everything in it', async () => {
    options(CALENDLY_BOOKING_MODES.OWN)
    server.use(http.post('*/common/calendly/available-times', () => HttpResponse.json({ status: true, data: [] })))
    renderWithProviders(
      <CalendlyBookingFields attendees={[{ user_id: 1 }]} date="2026-11-27" timezone="UTC"
        value={{ ...EMPTY_CALENDLY_BOOKING, sync: true, eventTypeUri: 'ET1' }}
        errors={{ sync_with_calendly: ["Calendly's booking limit for this account has been reached."] }}
        onChange={vi.fn()} onPickTime={vi.fn()} />
    )

    const error = await screen.findByText("Calendly's booking limit for this account has been reached.")
    const box = await screen.findByRole('checkbox', { name: /use this appointment's title in calendly/i })
    expect(box.compareDocumentPosition(error) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(error.closest('.calendly-booking-fields')?.lastElementChild).toBe(error)
  })

  it('with the title ticked, hides the event type and its place - a short note instead', async () => {
    const meet = { uri: 'ET9', name: 'Strategy session', duration: 45, locations: [{ kind: 'zoom_conference' }], asks_location: false }
    for (const eventTypes of [[zoom], [zoom, meet]]) {
      options(CALENDLY_BOOKING_MODES.OWN, eventTypes)
      server.use(http.post('*/common/calendly/available-times', () => HttpResponse.json({ status: true, data: [] })))
      const { container, unmount } = renderWithProviders(
        <CalendlyBookingFields attendees={[{ user_id: 1 }]} date="2026-11-27" timezone="UTC"
          value={{ ...EMPTY_CALENDLY_BOOKING, sync: true, useTitle: true, eventTypeUri: 'ET1', locationKind: 'zoom_conference' }}
          onChange={vi.fn()} onPickTime={vi.fn()} />
      )

      expect(await screen.findByRole('checkbox', { name: /use this appointment's title in calendly/i })).toBeChecked()
      expect(screen.queryByText('30 Minute Meeting')).not.toBeInTheDocument()
      expect(screen.queryByText(/calendly event type/i)).not.toBeInTheDocument()
      expect(container.querySelector('.calendly-event-type-dropdown')).toBeNull()
      // No place either - just a short note on a warning background, naming no app.
      expect(screen.queryByText(/zoom/i)).not.toBeInTheDocument()
      const note = screen.getByRole('note')
      expect(note).toHaveClass('bg-warning-subtle')
      expect(note).toHaveTextContent('Calendly creates a one-time meeting with this title and the whole time slot.')
      unmount()
    }
  })
})
