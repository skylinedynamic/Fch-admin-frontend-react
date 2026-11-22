import { useState } from 'react'
import { toast } from 'react-toastify'
import type { AttendeeInput } from '../../modules/appointment/types'
import { useAddToCalendly, useCalendlyBookingOptions } from '../../modules/calendly/queries'
import { CALENDLY_BOOKING_MODES, CALENDLY_LOCATION_KINDS } from '../../modules/calendly/types'
import { askedLocation } from './CalendlyBookingFields'

interface Props {
  appointmentId: number | string
  attendees: AttendeeInput[]
  onAdded: () => void
}

type ApiError = { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }

/**
 * "Add to Calendly" on an appointment made without it (Calendly v2): its
 * creator books it in Calendly, one at a time. Offered only when someone on
 * it can host it in their Calendly.
 */
export default function AddToCalendly({ appointmentId, attendees, onAdded }: Props) {
  const { data: options } = useCalendlyBookingOptions(attendees, true)
  const add = useAddToCalendly()
  const [eventTypeUri, setEventTypeUri] = useState('')
  const [location, setLocation] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!options || options.mode === CALENDLY_BOOKING_MODES.NONE || options.event_types.length === 0) return null

  const eventType = options.event_types.find((t) => t.uri === eventTypeUri) ?? options.event_types[0]
  const asked = askedLocation(eventType, '')

  const submit = () => {
    setError(null)
    add.mutate(
      { id: appointmentId, payload: { calendly_event_type_uri: eventType.uri, calendly_location_kind: asked, calendly_location: asked ? location : null } },
      {
        onSuccess: () => {
          toast.success('Added to Calendly')
          onAdded()
        },
        onError: (e) => {
          const data = (e as ApiError).response?.data
          setError(Object.values(data?.errors ?? {})[0]?.[0] ?? data?.message ?? 'It could not be added to Calendly.')
        },
      }
    )
  }

  return (
    <div className="add-to-calendly border rounded p-2 d-flex flex-column gap-2">
      {options.event_types.length > 1 && (
        <select aria-label="Calendly event type" className="form-select form-select-sm" value={eventType.uri} onChange={(e) => setEventTypeUri(e.target.value)}>
          {options.event_types.map((t) => <option key={t.uri} value={t.uri}>{t.name} ({t.duration} min)</option>)}
        </select>
      )}
      {asked && (
        <input
          aria-label={asked === CALENDLY_LOCATION_KINDS.PHONE_CALL ? 'Phone number to call' : 'Where to meet'}
          placeholder={asked === CALENDLY_LOCATION_KINDS.PHONE_CALL ? 'Phone number to call' : 'Where to meet'}
          className="form-control form-control-sm"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      )}
      <button type="button" className="btn btn-soft-primary btn-sm" onClick={submit} disabled={add.isPending}>
        {add.isPending ? 'Adding…' : 'Add to Calendly'}
      </button>
      {error && <div className="text-danger fs-11">{error}</div>}
    </div>
  )
}
