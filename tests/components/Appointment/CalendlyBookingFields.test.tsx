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
})
