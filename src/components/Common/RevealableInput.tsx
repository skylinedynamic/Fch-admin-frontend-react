import { useState } from 'react'
import { isMaskedValue } from '../../utils/borrowerFormatters'

interface RevealableInputProps {
  id: string
  /** What the eye button is named for: "Show SSN" / "Hide SSN". */
  name: string
  /** The field's value: the API's mask (***-**-6789) until revealed or typed. */
  value: string
  onChange: (value: string) => void
  /** Fetches the number in full; null when none is on file. */
  onReveal: () => Promise<string | null>
  /** Writes digits the way the field shows them (XXX-XX-XXXX). */
  format: (value: string) => string
  /** The masked form of a number the field holds (***-**-6789). */
  mask: (value: string) => string
  placeholder?: string
  maxLength?: number
  invalid?: boolean
  disabled?: boolean
}

/**
 * An SSN or EIN field whose number on file arrives masked (BUG-014): the
 * mask shows read-only, the eye button fetches the number and opens it for
 * editing, and the eye again hides it. With no number on file it is a plain
 * input, written out as typed.
 */
export default function RevealableInput({
  id, name, value, onChange, onReveal, format, mask, placeholder, maxLength, invalid, disabled,
}: RevealableInputProps) {
  const [hidden, setHidden] = useState(false)
  const [revealed, setRevealed] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const masked = isMaskedValue(value) || (hidden && value !== '')

  const show = async () => {
    if (isMaskedValue(value)) {
      if (revealed === null) {
        setLoading(true)
        try {
          const full = await onReveal()
          if (!full) return
          const written = format(full)
          setRevealed(written)
          onChange(written)
        } catch {
          return
        } finally {
          setLoading(false)
        }
      } else {
        onChange(revealed)
      }
    }
    setHidden(false)
  }

  return (
    <div className="input-group">
      <input
        id={id}
        type="text"
        className={`form-control${invalid ? ' is-invalid' : ''}`}
        placeholder={placeholder}
        value={masked && !isMaskedValue(value) ? mask(value) : value}
        readOnly={masked}
        onChange={(e) => onChange(format(e.target.value))}
        maxLength={maxLength}
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
      />
      {value !== '' && (
        <button
          type="button"
          className="btn"
          style={{ border: '1px solid #ced4da', background: '#fff', color: '#6c757d', boxShadow: 'none' }}
          onClick={() => (masked ? show() : setHidden(true))}
          tabIndex={-1}
          aria-label={masked ? `Show ${name}` : `Hide ${name}`}
          title={masked ? `Show ${name}` : `Hide ${name}`}
          disabled={disabled || loading}
        >
          <i className={masked ? 'ri-eye-2-line' : 'ri-eye-close-line'}></i>
        </button>
      )}
    </div>
  )
}
