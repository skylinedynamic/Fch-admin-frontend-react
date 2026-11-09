import ConfirmationModal from '../../../components/GlobalModal/ConfirmationModal'

type Props = {
  show: boolean
  loading: boolean
  onClose: () => void
  onConfirm: () => void
}

/** What stops working when the public key is replaced, and what to do next. */
const CONSEQUENCES = [
  'The form will no longer load on any website that uses the current embed code.',
  'The current Direct Shareable Link also stops working, including links already sent by email or SMS.',
  'Afterwards, copy the new embed code and link, and replace the old ones everywhere - including the Apply Page Form Code in CMS > Site Settings.',
]

/** Confirms replacing the embedded form's public key. */
export default function RegenerateKeyModal({ show, loading, onClose, onConfirm }: Props) {
  return (
    <ConfirmationModal
      show={show}
      loading={loading}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Regenerate the public key?"
      message="A new key replaces the current one, and the current key stops working straight away."
      confirmText="Yes, regenerate key"
      loadingText="Regenerating..."
      confirmClassName="btn-danger"
      iconClass="ri-key-2-line"
      iconBgClass="bg-warning-subtle"
      iconTextClass="text-warning"
    >
      <div className="alert alert-warning text-start fs-13 d-flex gap-2 mb-4" role="alert" style={{ borderRadius: 4 }}>
        <i className="ri-error-warning-line fs-18 lh-1 flex-shrink-0" aria-hidden="true" />
        <ul className="mb-0 ps-3">
          {CONSEQUENCES.map((line) => (
            <li key={line} className="mb-1">{line}</li>
          ))}
        </ul>
      </div>
    </ConfirmationModal>
  )
}
