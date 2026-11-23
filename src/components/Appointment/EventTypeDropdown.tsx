import { Dropdown } from 'primereact/dropdown'
import type { CalendlyEventType } from '../../modules/calendly/types'

interface Props {
  eventTypes: CalendlyEventType[]
  value: string
  onChange: (uri: string) => void
  /** Id of its input, so a <label htmlFor> names it. */
  inputId?: string
  disabled?: boolean
}

/**
 * Choosing among several Calendly event types (Calendly v2): the same
 * PrimeReact dropdown as the appointment form's other fields (Type, time).
 * With one event type there is nothing to choose - the callers just name it.
 */
export default function EventTypeDropdown({ eventTypes, value, onChange, inputId, disabled = false }: Props) {
  const options = eventTypes.map((type) => ({ label: `${type.name ?? 'Calendly event type'} (${type.duration} min)`, value: type.uri }))

  return (
    <Dropdown
      inputId={inputId}
      value={value}
      options={options}
      onChange={(e) => onChange(e.value)}
      className="w-100 calendly-event-type-dropdown"
      placeholder="Select event type"
      disabled={disabled}
      appendTo="self"
    />
  )
}
