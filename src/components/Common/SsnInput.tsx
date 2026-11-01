import { useState } from 'react'
import { formatSSN, maskSSN, unformatSSN } from '../../utils/borrowerFormatters'

/** How many digits a full SSN has - how the field is written, not a check (that is the API's App\Rules\Ssn). */
const SSN_DIGITS = 9

interface SsnInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  disabled?: boolean
}

/**
 * A full Social Security Number input, written XXX-XX-XXXX as it is typed -
 * the same field as the borrower portal's (borrower-fch SsnInput).
 *
 * A complete number shows masked (***-**-1234) while the field is not in use.
 * Clicking the field makes it editable, the number hidden as dots like one
 * being typed; it masks again once the field is left. The eye button shows the
 * digits and hides them again.
 */
export default function SsnInput({ id, value, onChange, invalid, disabled }: SsnInputProps) {
  const [visible, setVisible] = useState(false)
  // Set while the field has focus, so a number on file can be edited and a new
  // one does not turn into a mask on the ninth digit.
  const [editing, setEditing] = useState(false)
  const complete = unformatSSN(value).length === SSN_DIGITS
  const masked = complete && !visible && !editing

  return (
    <div className="input-group">
      <input
        id={id}
        type={masked || visible ? 'text' : 'password'}
        className={`form-control${invalid ? ' is-invalid' : ''}`}
        placeholder="XXX-XX-XXXX"
        value={masked ? maskSSN(value) : value}
        onFocus={() => setEditing(true)}
        onBlur={() => setEditing(false)}
        onChange={(e) => onChange(formatSSN(e.target.value))}
        maxLength={11}
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
      />
      <button
        type="button"
        className="btn"
        style={{ border: '1px solid #ced4da', background: '#fff', color: '#6c757d', boxShadow: 'none' }}
        onClick={() => setVisible(!visible)}
        tabIndex={-1}
        aria-label={visible ? 'Hide SSN' : 'Show SSN'}
        title={visible ? 'Hide SSN' : 'Show SSN'}
        disabled={disabled}
      >
        <i className={visible ? 'ri-eye-close-line' : 'ri-eye-2-line'}></i>
      </button>
    </div>
  )
}
