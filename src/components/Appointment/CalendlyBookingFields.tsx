import { useEffect } from 'react'
import EventTypeDropdown from './EventTypeDropdown'
import calendlyLogo from '../../../assets/images/integrations/calendly.svg'
import '../../../assets/css/calendly-appointments.css'
import type { AttendeeInput } from '../../modules/appointment/types'
import { useCalendlyAvailableTimes, useCalendlyBookingOptions } from '../../modules/calendly/queries'
import {
  CALENDLY_BOOKING_MODES,
  CALENDLY_INVITEE_LOCATION_KINDS,
  CALENDLY_LOCATION_DISPLAY,
  CALENDLY_LOCATION_KINDS,
  type CalendlyEventType,
} from '../../modules/calendly/types'

export interface CalendlyBookingValue {
  sync: boolean
  /** Booked under the appointment's own title and length (the API makes a one-off event type). */
  useTitle: boolean
  eventTypeUri: string
  locationKind: string
  location: string
}

export const EMPTY_CALENDLY_BOOKING: CalendlyBookingValue = { sync: false, useTitle: false, eventTypeUri: '', locationKind: '', location: '' }

/** What the form needs from Calendly: the event type's length, and whether the start is an open time (null: not known / not syncing). */
export interface CalendlyFit {
  minutes: number | null
  open: boolean | null
}

interface Props {
  attendees: AttendeeInput[]
  date: string
  timezone: string
  value: CalendlyBookingValue
  onChange: (value: CalendlyBookingValue) => void
  /** A Calendly open time was picked: its start (HH:mm) and the event type's length. */
  onPickTime: (time: string, minutes: number) => void
  /** The start time the form is set to (HH:mm) - that open time shows as picked. */
  selectedTime?: string
  errors?: Record<string, string | string[]>
  /** Told the event type's length and whether the start time is open in Calendly. */
  onCalendlyFit?: (fit: CalendlyFit) => void
}

const first = (message?: string | string[]): string | undefined => (Array.isArray(message) ? message[0] : message)

/** The place to ask the invitee for, when the event type's chosen place needs one. */
export const askedLocation = (type: CalendlyEventType | undefined, kind: string) => {
  const chosen = type?.locations.find((l) => l.kind === kind) ?? type?.locations[0]
  return chosen?.kind && CALENDLY_INVITEE_LOCATION_KINDS.includes(chosen.kind) ? chosen.kind : null
}

/**
 * "Sync with Calendly" in Add Appointment (Calendly v2). The API says whose
 * Calendly it would go into; ticked by default whenever someone can host it.
 */
export default function CalendlyBookingFields({ attendees, date, timezone, value, onChange, onPickTime, selectedTime, errors = {}, onCalendlyFit }: Props) {
  const { data: options } = useCalendlyBookingOptions(attendees, true)
  const mode = options?.mode ?? CALENDLY_BOOKING_MODES.NONE
  const eventTypes = options?.event_types ?? []
  const eventType = eventTypes.find((t) => t.uri === value.eventTypeUri) ?? eventTypes[0]
  const asked = askedLocation(eventType, value.locationKind)

  // Someone can host it: ticked, with the first event type. Nobody can: off.
  useEffect(() => {
    if (!options) return
    if (mode === CALENDLY_BOOKING_MODES.NONE) {
      if (value.sync) onChange({ ...value, sync: false })
      return
    }
    if (!value.eventTypeUri && eventTypes[0]) {
      onChange({ ...value, sync: true, eventTypeUri: eventTypes[0].uri, locationKind: eventTypes[0].locations[0]?.kind ?? '' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options])

  // With the title, Calendly opens exactly the form's time: the event type's open times do not apply.
  const ownLength = value.sync && value.useTitle
  const times = useCalendlyAvailableTimes(
    value.sync && !ownLength && eventType && date ? { attendees, event_type_uri: eventType.uri, date, timezone } : null
  )


  // Tell the form the event type's length (its end time follows it) and
  // whether its start is one of Calendly's open times - null when not syncing.
  const fitMinutes = options && mode !== CALENDLY_BOOKING_MODES.NONE && value.sync && !ownLength && eventType ? eventType.duration : null
  const fitOpen = fitMinutes !== null && times.isSuccess && selectedTime
    ? times.data.some((slot) => slot.local_time === selectedTime)
    : null
  useEffect(() => {
    onCalendlyFit?.({ minutes: fitMinutes, open: fitOpen })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitMinutes, fitOpen])
  useEffect(() => () => onCalendlyFit?.({ minutes: null, open: null }), [])  // eslint-disable-line react-hooks/exhaustive-deps

  if (!options || mode === CALENDLY_BOOKING_MODES.NONE) return null

  const place = eventType?.locations.find((l) => l.kind === value.locationKind)?.kind ?? eventType?.locations[0]?.kind
  const placeDisplay = place ? CALENDLY_LOCATION_DISPLAY[place] : undefined
  const subtitle = mode === CALENDLY_BOOKING_MODES.OWN
    ? 'Booked in your Calendly. Calendly emails everyone.'
    : `Booked in ${options.host?.name ?? 'their'}'s Calendly. You are the invitee; Calendly emails you both.`

  return (
    <div className={`calendly-booking-fields ${value.sync ? 'is-on' : ''}`}>
      <div className="cb-head">
        <span className="calendly-tile"><img src={calendlyLogo} alt="" width={20} height={20} /></span>
        <div className="flex-grow-1 min-w-0">
          <label htmlFor="sync-with-calendly" className="cb-title d-block">Sync with Calendly</label>
          <div id="sync-with-calendly-help" className="cb-sub">
            {value.sync ? subtitle : 'Off - saved only in the portal.'}
          </div>
        </div>
        <div className="form-check form-switch">
          <input
            id="sync-with-calendly"
            type="checkbox"
            role="switch"
            className="form-check-input"
            aria-describedby="sync-with-calendly-help"
            checked={value.sync}
            onChange={(e) => onChange({ ...value, sync: e.target.checked })}
          />
        </div>
      </div>

      {value.sync && (
        <div className="cb-body">
          {ownLength ? null : eventTypes.length > 1 ? (
            <div>
              <label htmlFor="calendly-event-type" className="cb-label d-block">Calendly event type</label>
              {/* The dropdown and the place side by side, not full width. */}
              <div className="cb-type-row">
                <div className="cb-type-select">
                  <EventTypeDropdown
                    inputId="calendly-event-type"
                    eventTypes={eventTypes}
                    value={eventType?.uri ?? ''}
                    onChange={(uri) => {
                      const next = eventTypes.find((t) => t.uri === uri)
                      onChange({ ...value, eventTypeUri: uri, locationKind: next?.locations[0]?.kind ?? '', location: '' })
                    }}
                  />
                </div>
                {placeDisplay && (
                  <span className="cb-chip"><i className={placeDisplay.icon} aria-hidden="true"></i>{placeDisplay.label}</span>
                )}
              </div>
            </div>
          ) : eventType ? (
            <div className="cb-chips" aria-label="Calendly event type">
              <span className="cb-chip"><i className="ri-calendar-event-line" aria-hidden="true"></i><strong className="fw-semibold">{eventType.name}</strong></span>
              {!ownLength && <span className="cb-chip"><i className="ri-time-line" aria-hidden="true"></i>{eventType.duration} min</span>}
              {placeDisplay && <span className="cb-chip"><i className={placeDisplay.icon} aria-hidden="true"></i>{placeDisplay.label}</span>}
            </div>
          ) : (
            <div className="text-danger fs-12">This Calendly has no event type switched on.</div>
          )}
          {first(errors.calendly_event_type_uri) && <div className="text-danger fs-11">{first(errors.calendly_event_type_uri)}</div>}

          {eventType && (
            <div className="cb-own-title">
              <div className="form-check mb-0">
                <input
                  id="calendly-use-title"
                  type="checkbox"
                  className="form-check-input"
                  aria-describedby="calendly-use-title-help"
                  checked={value.useTitle}
                  onChange={(e) => onChange({ ...value, useTitle: e.target.checked })}
                />
                <label htmlFor="calendly-use-title" className="form-check-label cb-own-title-label">Use this appointment's title in Calendly</label>
              </div>
              {value.useTitle ? (
                // The event type and its place are hidden: this says what Calendly books instead.
                <div id="calendly-use-title-help" role="note" className="cb-own-note bg-warning-subtle text-warning-emphasis">
                  <i className="ri-information-line" aria-hidden="true"></i>
                  <span>Calendly creates a one-time meeting with this title and the whole time slot.</span>
                </div>
              ) : (
                <div id="calendly-use-title-help" className="cb-sub">
                  Calendly will name it "{eventType.name}" and book {eventType.duration} min.
                </div>
              )}
              {first(errors.calendly_use_title) && <div className="text-danger fs-11 mt-1">{first(errors.calendly_use_title)}</div>}
            </div>
          )}

          {eventType && !ownLength && (
            <div>
              <div className="cb-label">Open times in Calendly</div>
              {times.isLoading && (
                <div className="cb-slots placeholder-glow" aria-label="Checking Calendly…">
                  {Array.from({ length: 4 }, (_, i) => <span key={i} className="cb-slot-skeleton placeholder" />)}
                </div>
              )}
              {times.isError && (
                <div className="cb-empty text-danger"><i className="ri-error-warning-line" aria-hidden="true"></i>Calendly's open times could not be checked.</div>
              )}
              {times.isSuccess && times.data.length === 0 && (
                <div className="cb-empty">
                  <i className="ri-calendar-close-line" aria-hidden="true"></i>
                  <span>No open times in Calendly on this day. Pick another date, or keep the time set above.</span>
                </div>
              )}
              {times.isSuccess && times.data.length > 0 && (
                <div className="cb-slots">
                  {times.data.map((slot) => (
                    <button
                      key={slot.start_time}
                      type="button"
                      className="cb-slot"
                      aria-pressed={slot.local_time === selectedTime}
                      onClick={() => onPickTime(slot.local_time, eventType.duration)}
                    >
                      {slot.local_time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {asked && (
            <div>
              <label htmlFor="calendly-location" className="cb-label d-block">
                {asked === CALENDLY_LOCATION_KINDS.PHONE_CALL ? 'Phone number to call' : 'Where to meet'}
              </label>
              <input
                id="calendly-location"
                type={asked === CALENDLY_LOCATION_KINDS.PHONE_CALL ? 'tel' : 'text'}
                className={`form-control ${first(errors.calendly_location) ? 'is-invalid' : ''}`}
                value={value.location}
                onChange={(e) => onChange({ ...value, location: e.target.value, locationKind: asked })}
              />
              {first(errors.calendly_location) && <div className="text-danger fs-11 mt-1">{first(errors.calendly_location)}</div>}
            </div>
          )}

          {mode === CALENDLY_BOOKING_MODES.OWN && attendees.length > 1 && (
            <div className="cb-foot">
              <i className="ri-information-line" aria-hidden="true"></i>
              <span>The first person gets the Calendly invite; the others are added as guests.</span>
            </div>
          )}
        </div>
      )}
      {/* Calendly's refusal (booking limit, nobody to host it): under everything above. */}
      {first(errors.sync_with_calendly) && <div className="cb-error text-danger fs-11">{first(errors.sync_with_calendly)}</div>}
    </div>
  )
}
