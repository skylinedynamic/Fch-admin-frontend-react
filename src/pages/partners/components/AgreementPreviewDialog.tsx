import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import '../../../../assets/css/agreement-builder.css'

interface AgreementPreviewDialogProps {
  /** e.g. "Partner agreement preview": names the dialog and its frame. */
  title: string
  /** Who it is filled for, shown under the title. */
  subtitle?: string
  /** The agreement as the partner / client will see it (fch-api AgreementSignController::preview). */
  html: string
  onClose: () => void
}

/**
 * A partner's / client's Agreement tab › Preview Agreement: the active
 * agreement they have not signed yet, filled with their details. Read only.
 * The agreement's own pagination script runs, but in a sandbox with no access
 * to the app (no allow-same-origin: no token, cookies or storage).
 */
export default function AgreementPreviewDialog({ title, subtitle, html, onClose }: AgreementPreviewDialogProps) {
  const titleId = useId()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="ab4-confirm-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ab4-templates ab4-agreement-preview" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="ab4-templates__head">
          <div>
            <h6 id={titleId} className="ab4-templates__title">{title}</h6>
            {subtitle && <p className="ab4-templates__sub">{subtitle}</p>}
          </div>
          <button type="button" className="ab4-templates__close" aria-label="Close" onClick={onClose}>
            <i className="ri-close-line" aria-hidden="true" />
          </button>
        </div>
        <iframe className="ab4-agreement-preview__frame" title={title} srcDoc={html} sandbox="allow-scripts" />
      </div>
    </div>,
    document.body
  )
}
