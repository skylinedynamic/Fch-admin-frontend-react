import { useState } from 'react'
import { formatSSN, isMaskedValue, maskSSN, unformatSSN } from '../../utils/borrowerFormatters'

/** How many digits a full SSN has. */
const SSN_DIGITS = 9

interface SsnValueProps {
  value: string | null | undefined
  /**
   * Fetches the number in full when the value arrives masked (***-**-6789):
   * a logged reveal on the API (R3-BUG-044). Null when none is on file.
   */
  onReveal?: () => Promise<string | null>
}

/**
 * A Social Security Number shown read-only, the way the SSN field (SsnInput)
 * shows one: masked ***-**-1234, written XXX-XX-XXXX on the eye button. A
 * masked value is revealed through onReveal, once; only the last four on file
 * with nothing to reveal show masked with no button; none shows a dash.
 */
export default function SsnValue({ value, onReveal }: SsnValueProps) {
  const [visible, setVisible] = useState(false)
  const [revealed, setRevealed] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const masked = isMaskedValue(value)
  const digits = masked ? (revealed ?? '') : unformatSSN(value || '')

  if (!value || (!masked && !digits)) return <>-</>

  const canReveal = masked ? !!onReveal : digits.length === SSN_DIGITS
  const shown = visible && digits.length === SSN_DIGITS ? formatSSN(digits) : maskSSN(masked ? value : digits)

  if (!canReveal) return <span>{shown}</span>

  const toggle = async () => {
    if (visible) {
      setVisible(false)
      return
    }
    if (masked && revealed === null && onReveal) {
      setLoading(true)
      try {
        const full = unformatSSN((await onReveal()) || '')
        if (full.length !== SSN_DIGITS) return
        setRevealed(full)
      } catch {
        return
      } finally {
        setLoading(false)
      }
    }
    setVisible(true)
  }

  return (
    <span className="d-inline-flex align-items-center gap-2">
      <span>{shown}</span>
      <button
        type="button"
        className="btn btn-link p-0 lh-1 text-muted"
        onClick={toggle}
        disabled={loading}
        aria-label={visible ? 'Hide SSN' : 'Show SSN'}
        title={visible ? 'Hide SSN' : 'Show SSN'}
      >
        <i className={visible ? 'ri-eye-close-line' : 'ri-eye-2-line'}></i>
      </button>
    </span>
  )
}
