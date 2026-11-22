import { useId, useState } from 'react'
import '../../../assets/css/calendly-appointments.css'
import { MAX_ATTENDEES, type AttendeeConflict, type AttendeeInput } from '../../modules/appointment/types'

export interface AttendeeOption {
  label: string
  user_id: number
}

interface Props {
  options: AttendeeOption[]
  value: AttendeeInput[]
  onChange: (value: AttendeeInput[]) => void
  /** Attendees who already have an appointment then - shown as a warning, never a block. */
  conflicts?: AttendeeConflict[]
  /** The API's 422 errors (attendees, attendees.N.email, attendees.N.user_id). */
  errors?: Record<string, string | string[]>
  disabled?: boolean
  loading?: boolean
}

const first = (message?: string | string[]): string | undefined => (Array.isArray(message) ? message[0] : message)

/** "Michael Chen (Borrower)" -> name and role; a label without one is all name. */
const splitRole = (label: string): { name: string; role: string } => {
  const match = label.match(/^(.*?)\s*\(([^()]+)\)$/)
  return match ? { name: match[1], role: match[2] } : { name: label, role: '' }
}

const initials = (name: string): string =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join('') || '?'

/**
 * Who the appointment is with (Calendly v2): platform users picked from the
 * list, or anyone by email, up to MAX_ATTENDEES. The email's format is the
 * API's to check.
 */
export default function AttendeePicker({ options, value, onChange, conflicts = [], errors = {}, disabled = false, loading = false }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [emailError, setEmailError] = useState<string | null>(null)
  const listId = useId()

  const full = value.length >= MAX_ATTENDEES
  const pickedIds = new Set(value.map((a) => a.user_id).filter(Boolean))
  const available = options.filter((option) => !pickedIds.has(option.user_id))
  // A picked user keeps their name, even once the list shows other people.
  const nameOf = (attendee: AttendeeInput) =>
    attendee.user_id
      ? options.find((o) => o.user_id === attendee.user_id)?.label ?? attendee.name ?? `User #${attendee.user_id}`
      : attendee.email

  const typed = query.trim()
  const matches = typed ? available.filter((o) => o.label.toLowerCase().includes(typed.toLowerCase())) : available
  // Anything with an @ can be invited; whether it is a real address is the API's to say.
  const invite = typed.includes('@') ? typed.toLowerCase() : null
  const items: Array<{ kind: 'user'; option: AttendeeOption } | { kind: 'email'; email: string }> = [
    ...matches.map((option) => ({ kind: 'user' as const, option })),
    ...(invite ? [{ kind: 'email' as const, email: invite }] : []),
  ]
  const activeIndex = Math.min(active, Math.max(items.length - 1, 0))

  const reset = () => {
    setQuery('')
    setActive(0)
    setEmailError(null)
  }

  const addUser = (option: AttendeeOption) => {
    if (pickedIds.has(option.user_id) || full) return
    onChange([...value, { user_id: option.user_id, name: option.label }])
    reset()
  }

  const addEmail = (address: string) => {
    if (!address || full) return
    if (value.some((a) => a.email?.toLowerCase() === address)) {
      setEmailError('This person is already on the appointment.')
      return
    }
    onChange([...value, { email: address }])
    reset()
  }

  const choose = (index: number) => {
    const item = items[index]
    if (item?.kind === 'user') addUser(item.option)
    else if (item?.kind === 'email') addEmail(item.email)
    // Nobody matches and no @: still try it as an email, so the API can say why not.
    else if (typed) addEmail(typed.toLowerCase())
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(activeIndex)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index))

  return (
    <div className="attendee-picker d-flex flex-column gap-2">
      {value.length > 0 && (
        <ul className="attendee-list list-unstyled mb-0">
          {value.map((attendee, index) => {
            const clash = attendee.user_id ? conflicts.find((c) => c.user_id === attendee.user_id) : undefined
            const error = first(errors[`attendees.${index}.email`]) ?? first(errors[`attendees.${index}.user_id`])
            const label = nameOf(attendee) ?? ''
            const { name, role } = splitRole(label)
            const guest = !attendee.user_id
            return (
              <li key={`${attendee.user_id ?? attendee.email}-${index}`} className={`attendee-item ${clash ? 'has-clash' : ''}`}>
                <div className="attendee-row">
                  <span className={`attendee-avatar ${guest ? 'is-guest' : ''}`} aria-hidden="true">
                    {guest ? <i className="ri-mail-line"></i> : initials(name)}
                  </span>
                  <div className="flex-grow-1 min-w-0">
                    <div className="attendee-name text-truncate">{name}</div>
                    <div className="attendee-meta text-truncate">{guest ? 'Guest · invited by email' : role}</div>
                  </div>
                  {clash && <i className="ri-error-warning-fill text-warning fs-16" aria-hidden="true"></i>}
                  {!disabled && (
                    <button type="button" className="attendee-remove" aria-label={`Remove ${label}`} title="Remove" onClick={() => remove(index)}>
                      <i className="ri-close-line"></i>
                    </button>
                  )}
                </div>
                {clash?.conflicts.map((c) => (
                  <div key={c.id} className="attendee-note is-clash">
                    <span>Already has an appointment {c.start_time}–{c.end_time}. You can still book it.</span>
                  </div>
                ))}
                {error && <div className="attendee-note is-error">{error}</div>}
              </li>
            )
          })}
        </ul>
      )}

      {!disabled && !full && (
        <div className="attendee-search">
          <i className="ri-search-line attendee-search-icon" aria-hidden="true"></i>
          <input
            id="attendee-search"
            type="text"
            role="combobox"
            aria-label="Add people"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={open && items[activeIndex] ? `${listId}-${activeIndex}` : undefined}
            placeholder={loading ? 'Loading people…' : 'Search people or type an email…'}
            className={`form-control ${emailError ? 'is-invalid' : ''}`}
            value={query}
            autoComplete="off"
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); setEmailError(null) }}
            onKeyDown={onKeyDown}
          />
          {open && (
            <ul id={listId} role="listbox" className="attendee-menu list-unstyled mb-0">
              {items.map((item, index) => {
                const selected = index === activeIndex
                const common = {
                  id: `${listId}-${index}`,
                  role: 'option',
                  'aria-selected': selected,
                  className: `attendee-option ${selected ? 'is-active' : ''}`,
                  // Keep focus in the box, so the list does not close before the click.
                  onMouseDown: (e: React.MouseEvent) => e.preventDefault(),
                  onMouseEnter: () => setActive(index),
                  onClick: () => choose(index),
                }
                if (item.kind === 'email') {
                  return (
                    <li key="invite" {...common}>
                      <span className="attendee-avatar is-guest" aria-hidden="true"><i className="ri-mail-add-line"></i></span>
                      <span className="attendee-name">Invite {item.email}</span>
                    </li>
                  )
                }
                const { name, role } = splitRole(item.option.label)
                return (
                  <li key={item.option.user_id} {...common}>
                    <span className="attendee-avatar" aria-hidden="true">{initials(name)}</span>
                    <span className="d-flex flex-column min-w-0">
                      <span className="attendee-name text-truncate">{name}</span>
                      {role && <span className="attendee-meta">{role}</span>}
                    </span>
                  </li>
                )
              })}
              {items.length === 0 && (
                <li className="attendee-empty">
                  {loading ? 'Loading people…' : typed ? 'No one matches. Type a full email to invite someone.' : 'No one else to add. Type an email to invite someone.'}
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      <div className="d-flex align-items-start justify-content-between gap-2">
        <div className="flex-grow-1">
          {full && !disabled && <div className="text-muted fs-11">An appointment can have up to {MAX_ATTENDEES} people.</div>}
          {emailError && <div className="text-danger fs-11">{emailError}</div>}
          {first(errors.attendees) && <div className="text-danger fs-11">{first(errors.attendees)}</div>}
        </div>
        {value.length > 0 && <span className="attendee-count">{value.length} of {MAX_ATTENDEES}</span>}
      </div>
    </div>
  )
}
