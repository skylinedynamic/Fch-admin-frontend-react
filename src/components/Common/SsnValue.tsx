import { useState } from 'react'
import { formatSSN, maskSSN, unformatSSN } from '../../utils/borrowerFormatters'

/** How many digits a full SSN has. */
const SSN_DIGITS = 9

/**
 * A Social Security Number shown read-only, the way the SSN field (SsnInput)
 * shows one: masked ***-**-1234, written XXX-XX-XXXX on the eye button. Only
 * the last four on file show masked with nothing to reveal; none shows a dash.
 */
export default function SsnValue({ value }: { value: string | null | undefined }) {
  const [visible, setVisible] = useState(false)
  const digits = unformatSSN(value || '')

  if (!digits) return <>-</>

  if (digits.length !== SSN_DIGITS) return <span>{maskSSN(digits)}</span>

  return (
    <span className="d-inline-flex align-items-center gap-2">
      <span>{visible ? formatSSN(digits) : maskSSN(digits)}</span>
      <button
        type="button"
        className="btn btn-link p-0 lh-1 text-muted"
        onClick={() => setVisible(!visible)}
        aria-label={visible ? 'Hide SSN' : 'Show SSN'}
        title={visible ? 'Hide SSN' : 'Show SSN'}
      >
        <i className={visible ? 'ri-eye-close-line' : 'ri-eye-2-line'}></i>
      </button>
    </span>
  )
}
