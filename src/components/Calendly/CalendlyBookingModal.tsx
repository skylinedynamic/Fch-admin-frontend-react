import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { queryKeys } from '../../lib/query'
import { APPOINTMENT_TYPE_OPTIONS } from '../../config/appointmentTypeOptions'
import { fetchSelectableUsers } from '../../modules/appointment/services'
import type { Appointment } from '../../modules/appointment/types'
import { useCalendlyAvailableTimes, useCalendlyEventTypes } from '../../modules/calendly/queries'
import { bookCalendlyAppointment } from '../../modules/calendly/services'
import type { CalendlyBookingPayload } from '../../modules/calendly/types'

type Props = {
  show: boolean
  /** The signed-in user owns the Calendly account: they pick who the meeting is with. */
  isHost: boolean
  onClose: () => void
  onBooked: (appointment: Appointment) => void
  /** The zone the slots are shown and booked in; the browser's by default. */
  timezone?: string
}

type Attendee = { id: number; name: string }

const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

const today = () => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Everyone the host may book with: their own people and other partners. */
const fetchAttendees = async (): Promise<Attendee[]> => {
  const lists = await Promise.all([fetchSelectableUsers({}), fetchSelectableUsers({ meeting_with: 1 })])
  const byId = new Map<number, Attendee>()
  lists.flatMap((list) => list?.data ?? []).forEach((user: Attendee) => byId.set(user.id, user))
  return [...byId.values()]
}

/**
 * Books a meeting into the company Calendly: an event type, a day, one of the
 * open slots Calendly offers, and - for the host - who it is with. The
 * booking is made in Calendly, so both people get Calendly's invitation.
 */
export default function CalendlyBookingModal({ show, isHost, onClose, onBooked, timezone = browserZone() }: Props) {
  const queryClient = useQueryClient()
  const [eventTypeUri, setEventTypeUri] = useState('')
  const [attendeeId, setAttendeeId] = useState('')
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState('')
  const [subject, setSubject] = useState('')
  const [meetingType, setMeetingType] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { data: eventTypes = [], isLoading: loadingTypes } = useCalendlyEventTypes(show)
  const { data: attendees = [] } = useQuery({
    queryKey: [...queryKeys.calendly.all, 'attendees'],
    queryFn: fetchAttendees,
    enabled: show && isHost,
  })

  useEffect(() => {
    if (!eventTypeUri && eventTypes.length > 0) {
      setEventTypeUri(eventTypes[0].uri)
    }
  }, [eventTypes, eventTypeUri])

  const timesPayload = useMemo(() => {
    if (!show || !eventTypeUri || !date || (isHost && !attendeeId)) return null
    return {
      event_type_uri: eventTypeUri,
      date,
      timezone,
      ...(isHost ? { assigned_for: Number(attendeeId) } : {}),
    }
  }, [show, eventTypeUri, date, timezone, isHost, attendeeId])

  const { data: slots = [], isFetching: loadingSlots, error: slotsError } = useCalendlyAvailableTimes(timesPayload)
  // Why Calendly could not be asked (e.g. the connection expired) - not "no open times".
  const slotsErrorMessage = slotsError
    ? (slotsError as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Calendly open times could not be loaded'
    : ''

  useEffect(() => setSlot(''), [eventTypeUri, date, attendeeId])

  if (!show) {
    return null
  }

  const canSubmit = Boolean(eventTypeUri && slot && (!isHost || attendeeId)) && !submitting

  const submit = async () => {
    if (!canSubmit) return

    const payload: CalendlyBookingPayload = { event_type_uri: eventTypeUri, start_time: slot, timezone }
    if (isHost) payload.assigned_for = Number(attendeeId)
    if (subject.trim()) payload.subject = subject.trim()
    if (meetingType) payload.meeting_type = meetingType
    if (description.trim()) payload.description = description.trim()

    setSubmitting(true)
    try {
      const response = await bookCalendlyAppointment(payload)
      toast.success(response.message || 'Meeting booked in Calendly')
      queryClient.invalidateQueries({ queryKey: queryKeys.calendly.all })
      onBooked(response.data)
      onClose()
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(message || 'Calendly could not book this meeting')
      queryClient.invalidateQueries({ queryKey: [...queryKeys.calendly.all, 'available-times'] })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal fade show d-block calendly-booking-modal" role="dialog" aria-modal="true" aria-labelledby="calendly-booking-title" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="calendly-booking-title">Book via Calendly</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {loadingTypes && <p className="text-muted">Loading Calendly…</p>}

            {eventTypes.length > 1 && (
              <div className="mb-3">
                <label className="form-label" htmlFor="calendly-event-type">Event type</label>
                <select id="calendly-event-type" className="form-select" value={eventTypeUri} onChange={(e) => setEventTypeUri(e.target.value)}>
                  {eventTypes.map((type) => (
                    <option key={type.uri} value={type.uri}>{type.name} ({type.duration} min)</option>
                  ))}
                </select>
              </div>
            )}
            {eventTypes.length === 1 && (
              <p className="mb-3"><span className="fw-medium">{eventTypes[0].name}</span> · {eventTypes[0].duration} min</p>
            )}

            {isHost && (
              <div className="mb-3">
                <label className="form-label" htmlFor="calendly-attendee">Meeting with</label>
                <select id="calendly-attendee" className="form-select" value={attendeeId} onChange={(e) => setAttendeeId(e.target.value)}>
                  <option value="">Select a person</option>
                  {attendees.map((attendee) => (
                    <option key={attendee.id} value={attendee.id}>{attendee.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="mb-3">
              <label className="form-label" htmlFor="calendly-date">Date</label>
              <input id="calendly-date" type="date" className="form-control" min={today()} value={date} onChange={(e) => setDate(e.target.value)} />
              <small className="text-muted">Times are shown in {timezone}.</small>
            </div>

            {timesPayload && (
              <div className="mb-3">
                <span className="form-label d-block">Open times</span>
                {loadingSlots && <p className="text-muted mb-0">Checking Calendly…</p>}
                {!loadingSlots && slotsErrorMessage && <p className="text-danger mb-0" role="alert">{slotsErrorMessage}</p>}
                {!loadingSlots && !slotsErrorMessage && slots.length === 0 && <p className="text-muted mb-0">No open times on this day - try another day.</p>}
                <div className="d-flex flex-wrap gap-2">
                  {!loadingSlots && slots.map((s) => (
                    <button
                      key={s.start_time}
                      type="button"
                      className={`btn btn-sm ${slot === s.start_time ? 'btn-primary' : 'btn-outline-primary'}`}
                      aria-pressed={slot === s.start_time}
                      onClick={() => setSlot(s.start_time)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label" htmlFor="calendly-subject">Subject (optional)</label>
                <input id="calendly-subject" type="text" className="form-control" maxLength={255} value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label" htmlFor="calendly-meeting-type">Meeting type (optional)</label>
                <select id="calendly-meeting-type" className="form-select" value={meetingType} onChange={(e) => setMeetingType(e.target.value)}>
                  <option value="">-</option>
                  {APPOINTMENT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-0">
              <label className="form-label" htmlFor="calendly-description">Description (optional)</label>
              <textarea id="calendly-description" className="form-control" rows={3} maxLength={5000} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-light" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-primary" disabled={!canSubmit} onClick={submit}>
              {submitting ? 'Booking…' : 'Book in Calendly'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
