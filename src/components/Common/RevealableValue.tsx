import { useState } from 'react'

interface RevealableValueProps {
  /** The API's mask (**-***4534), or null when there is no number. */
  value: string | null | undefined
  /** What the eye button is named for: "Show EIN" / "Hide EIN". */
  name: string
  /** Fetches the number in full. */
  onReveal: () => Promise<string | null>
  /** Writes the digits out (XX-XXXXXXX). */
  format: (value: string) => string
}

/**
 * A masked SSN or EIN shown read-only (BUG-014): the eye button fetches the
 * number once and shows it written out; the eye again hides it.
 */
export default function RevealableValue({ value, name, onReveal, format }: RevealableValueProps) {
  const [visible, setVisible] = useState(false)
  const [revealed, setRevealed] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!value) return <>-</>

  const toggle = async () => {
    if (visible) {
      setVisible(false)
      return
    }
    if (revealed === null) {
      setLoading(true)
      try {
        const full = await onReveal()
        if (!full) return
        setRevealed(format(full))
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
      <span>{visible && revealed !== null ? revealed : value}</span>
      <button
        type="button"
        className="btn btn-link p-0 lh-1 text-muted"
        onClick={toggle}
        disabled={loading}
        aria-label={visible ? `Hide ${name}` : `Show ${name}`}
        title={visible ? `Hide ${name}` : `Show ${name}`}
      >
        <i className={visible ? 'ri-eye-close-line' : 'ri-eye-2-line'}></i>
      </button>
    </span>
  )
}
