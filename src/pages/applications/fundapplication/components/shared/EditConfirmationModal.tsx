import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
// bootstrap ships no type declarations for this subpath export
// @ts-expect-error -- untyped third-party module, typed manually below
import BootstrapModalCtor from 'bootstrap/js/dist/modal'

interface BootstrapModalInstance {
  show(): void
  hide(): void
  dispose(): void
}
const Modal = BootstrapModalCtor as new (
  element: Element,
  options?: { backdrop?: boolean | 'static'; keyboard?: boolean }
) => BootstrapModalInstance
import {
  useEditConfirmationStore,
  requestEditConfirmation,
  resolveEditConfirmation,
} from '../../../../../store/fundApplication/editConfirmationStore'

/**
 * Shown as soon as a partner opens an application that has already been signed
 * and submitted, and again on a save if it only became signed during the visit.
 *
 * Laid out like the invoice details dialog - a left-aligned card with the
 * consequences listed, a note, and Cancel / confirm at opposite ends of the
 * footer - on the same Bootstrap flip modal the rest of the portal uses.
 *
 * It is portalled to the body so the layout's own stacking contexts cannot put
 * anything above it, and stacks on Bootstrap's stock z-index.
 *
 * The dimming is the dialog's own full-screen layer rather than a separate
 * Bootstrap backdrop. The portal's other dialogs sweep away any backdrop they
 * find while no dialog is marked shown, and Bootstrap only marks one shown
 * after its backdrop has faded in - so a sweep landing in that gap left this
 * dialog sitting on an undimmed page. With no backdrop element there is nothing
 * to sweep, and nothing left behind over the wizard after it closes.
 *
 * Rendered once by the wizard; which save it is answering for is held in the
 * store, so every save path gets the same dialog.
 */
export default function EditConfirmationModal({ status, awaitingResign }: { status?: string | null; awaitingResign?: boolean }) {
  const isOpen = useEditConfirmationStore(state => state.isOpen)
  const requiresConfirmation = useEditConfirmationStore(state => state.requiresConfirmation)
  const promptOnOpen = useEditConfirmationStore(state => state.promptOnOpen)
  const hasConfirmed = useEditConfirmationStore(state => state.hasConfirmed)
  const navigate = useNavigate()

  const modalRef = useRef<HTMLDivElement>(null)
  const modalInstanceRef = useRef<BootstrapModalInstance | null>(null)

  // An application that was already signed when it was opened asks straight
  // away rather than waiting for the first save. Backing out leaves the wizard.
  useEffect(() => {
    if (!promptOnOpen || !requiresConfirmation || hasConfirmed) return

    requestEditConfirmation().then(confirmed => {
      if (!confirmed) navigate(-1)
    })
  }, [promptOnOpen, requiresConfirmation, hasConfirmed, navigate])

  useEffect(() => {
    if (!modalRef.current) return

    modalInstanceRef.current = new Modal(modalRef.current, { backdrop: false, keyboard: false })

    return () => {
      const modal = modalInstanceRef.current
      modalInstanceRef.current = null
      try {
        modal?.hide()
        modal?.dispose()
      } catch (_) { }
    }
  }, [])

  useEffect(() => {
    const modal = modalInstanceRef.current
    if (!modal) return

    if (isOpen) {
      modal.show()
    } else {
      modal.hide()
    }
  }, [isOpen])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="modal fade flip bg-dark bg-opacity-50"
      ref={modalRef}
      tabIndex={-1}
      aria-hidden="true"
      aria-labelledby="edit-confirmation-title"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg">
          <div className="modal-body p-4">
            <div className="d-flex align-items-center gap-3 border-bottom pb-3 mb-3">
              <div className="avatar-sm flex-shrink-0">
                <span className="avatar-title bg-warning-subtle text-warning rounded-circle fs-22">
                  <i className="ri-file-edit-line"></i>
                </span>
              </div>
              <div>
                <h5 id="edit-confirmation-title" className="mb-1">Edit Submitted Application?</h5>
                <p className="text-muted mb-0">
                  {awaitingResign
                    ? 'This application was submitted before and is waiting for the borrower to sign it again.'
                    : 'This application has already been signed and submitted by the borrower.'}
                </p>
              </div>
            </div>

            <h6 className="text-uppercase fw-semibold fs-13 mb-2">Re-signature required</h6>
            <p className="text-muted mb-3">Editing any field on this application will require the borrower to sign it again. If you save a change:</p>

            <ul className="list-unstyled mb-0">
              <li className="d-flex align-items-start gap-2 mb-2">
                <i className="ri-checkbox-circle-line text-warning fs-16 lh-1 mt-1"></i>
                <span>Review of the application will pause until the borrower signs it again.</span>
              </li>
              <li className="d-flex align-items-start gap-2 mb-2">
                <i className="ri-checkbox-circle-line text-warning fs-16 lh-1 mt-1"></i>
                <span>The borrower must review and re-sign the application.</span>
              </li>
              <li className="d-flex align-items-start gap-2 mb-2">
                <i className="ri-checkbox-circle-line text-warning fs-16 lh-1 mt-1"></i>
                <span>Once re-signed, the application returns to Submitted status.</span>
              </li>
              <li className="d-flex align-items-start gap-2 mb-0">
                <i className="ri-checkbox-circle-line text-warning fs-16 lh-1 mt-1"></i>
                <span>The host will then verify the updated application and make a decision.</span>
              </li>
            </ul>

            <div className="mt-4">
              <div className="alert alert-info mb-0">
                <p className="mb-0">
                  <span className="fw-semibold">NOTE:</span> No changes are made until you save an edit, and each edit is recorded against your account. Select Cancel to keep the application {status ? <>in its current status, <span className="fw-semibold">{status}</span>.</> : 'as it is.'}
                </p>
              </div>
            </div>

            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-4">
              <button type="button" className="btn btn-clear" onClick={() => resolveEditConfirmation(false)}>
                <i className="ri-close-line align-bottom me-1"></i>
                Cancel
              </button>
              <button type="button" className="btn btn-primary shadow-sm" onClick={() => resolveEditConfirmation(true)}>
                <i className="ri-edit-2-line align-bottom me-1"></i>
                Yes, Edit Application
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
