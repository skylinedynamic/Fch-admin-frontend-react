import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CalendlySyncDates, CalendlySyncDirection } from '../../modules/calendly/types'
import calendlyLogo from '../../../assets/images/integrations/calendly.svg'

type Option = {
  value: CalendlySyncDirection
  title: string
  description: string
  icon: string
  /** Sends FCH meetings to Calendly - needs the viewer's own Calendly. */
  pushes: boolean
}

const OPTIONS: Option[] = [
  {
    value: 'pull',
    title: 'Pull from Calendly',
    description: 'Bring meetings booked in Calendly into FCH, and add the meetings others set with you to your Calendly.',
    icon: 'ri-download-cloud-2-line',
    pushes: false,
  },
  {
    value: 'push',
    title: 'Push to Calendly',
    description: 'Send the meetings you set in FCH to Calendly - yours, and the other person’s own Calendly when they have one.',
    icon: 'ri-upload-cloud-2-line',
    pushes: true,
  },
  {
    value: 'both',
    title: 'Two-way sync',
    description: 'Do both: pull from Calendly, then push your FCH meetings to it.',
    icon: 'ri-arrow-left-right-line',
    pushes: true,
  },
]

type Props = {
  show: boolean
  onClose: () => void
  onSubmit: (direction: CalendlySyncDirection) => void
  loading?: boolean
  /** The dates the calendar shows; none = this month. */
  dates?: CalendlySyncDates | null
  /** Push and two-way need the viewer's own Calendly. */
  canPush?: boolean
  /** Why push is off, shown under those options. */
  pushHint?: string
}

const thisMonth = () => new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

/**
 * Sync now: pick one way - pull, push or two-way - for the dates the calendar
 * shows (else the current month), then sync.
 */
export default function CalendlySyncModal({ show, onClose, onSubmit, loading = false, dates, canPush = true, pushHint }: Props) {
  const titleId = useId()
  const [direction, setDirection] = useState<CalendlySyncDirection>('pull')

  // Each opening starts on Pull, and on it again whenever push is not allowed.
  useEffect(() => {
    if (show) setDirection('pull')
  }, [show])

  // Esc closes (not while syncing); the page behind does not scroll.
  useEffect(() => {
    if (!show) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onClose()
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [show, loading, onClose])

  if (!show) return null

  return createPortal(
    <>
      <div className="modal-backdrop fade show" />
      <div className="modal fade show d-block" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow-lg">
            <div className="modal-header border-bottom-0 pb-0">
              <div className="d-flex align-items-center gap-3">
                <div className="avatar-sm flex-shrink-0">
                  <span className="avatar-title bg-light rounded-circle">
                    <img src={calendlyLogo} alt="" width={22} height={22} aria-hidden="true" />
                  </span>
                </div>
                <div>
                  <h5 className="modal-title mb-0" id={titleId}>Sync with Calendly</h5>
                  <p className="text-muted fs-13 mb-0">Choose how your meetings sync.</p>
                </div>
              </div>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose} disabled={loading} />
            </div>

            <div className="modal-body">
              <div className="d-flex align-items-center gap-2 rounded bg-light px-3 py-2 mb-3 fs-13">
                <i className="ri-calendar-2-line text-primary fs-16" aria-hidden="true" />
                <span className="text-muted">Dates:</span>
                <span className="fw-medium">{dates?.label ?? thisMonth()}</span>
                <span className="badge bg-primary-subtle text-primary ms-auto">{dates ? (dates.view ?? 'Calendar view') : 'This month'}</span>
              </div>

              <div role="radiogroup" aria-labelledby={titleId} className="d-flex flex-column gap-2">
                {OPTIONS.map((option) => {
                  const disabled = option.pushes && !canPush
                  const selected = direction === option.value
                  return (
                    <label
                      key={option.value}
                      className={`d-flex align-items-start gap-3 rounded border p-3 mb-0 ${selected ? 'border-primary bg-primary-subtle' : ''} ${disabled ? 'opacity-50' : ''}`}
                      style={{ cursor: disabled ? 'not-allowed' : 'pointer', borderWidth: selected ? 2 : 1 }}
                    >
                      <input
                        type="radio"
                        name="calendly-sync-direction"
                        value={option.value}
                        className="form-check-input mt-1 flex-shrink-0"
                        aria-label={option.title}
                        aria-describedby={`${titleId}-${option.value}`}
                        checked={selected}
                        disabled={disabled || loading}
                        onChange={() => setDirection(option.value)}
                      />
                      <div className="avatar-xs flex-shrink-0">
                        <span className={`avatar-title rounded fs-16 ${selected ? 'bg-primary text-white' : 'bg-light text-primary'}`}>
                          <i className={option.icon} aria-hidden="true" />
                        </span>
                      </div>
                      <div className="flex-grow-1">
                        <div className="fw-semibold">{option.title}</div>
                        <div className="text-muted fs-13" id={`${titleId}-${option.value}`}>{option.description}</div>
                        {disabled && pushHint && <div className="text-warning fs-12 mt-1">{pushHint}</div>}
                      </div>
                    </label>
                  )
                })}
              </div>

              <p className="text-muted fs-12 mt-3 mb-0 d-flex gap-1">
                <i className="ri-information-line" aria-hidden="true" />
                <span>Only upcoming meetings are sent to Calendly. A free Calendly plan books up to 5 meetings a day.</span>
              </p>
            </div>

            <div className="modal-footer border-top-0 pt-0">
              <button type="button" className="btn btn-light" onClick={onClose} disabled={loading}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={() => onSubmit(direction)} disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                    Syncing…
                  </>
                ) : (
                  <>
                    <i className="ri-refresh-line me-1" aria-hidden="true" />
                    Sync
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  )
}

/** What a sync did, in a line: "3 brought in from Calendly · 2 sent to Calendly". */
export function syncSummary(result: { pulled: number; pushed: number; direction: CalendlySyncDirection }): string {
  const parts: string[] = []
  if (result.direction !== 'push') parts.push(`${result.pulled} brought in from Calendly`)
  if (result.direction !== 'pull' || result.pushed > 0) parts.push(`${result.pushed} sent to Calendly`)
  return parts.join(' · ')
}
