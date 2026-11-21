import { useState } from 'react'
import { toast } from 'react-toastify'
import {
  AGREEMENT_SIGNER,
  useAgreementRequirement,
  useAgreementSignerPreview,
  useSetAgreementRequired,
  type AgreementSigner,
} from '../../../modules/agreement'
import AgreementSection from './AgreementSection'
import AgreementPreviewDialog from './AgreementPreviewDialog'

/** The partner's / client's details this tab reads (PartnerDetailsResource / BorrowerDetailsResource). */
export interface AgreementTabFormData {
  id?: number | string | null
  user_id?: number | null
  has_sign?: boolean
  agreement_required?: boolean
}

interface AgreementTabProps {
  signer: AgreementSigner
  /** Only the host's team may excuse someone from signing. */
  isHost: boolean
  formData: AgreementTabFormData
  partnerId?: number | string
  clientId?: number | string
  onRefresh?: () => void
  /** Told the new value once saved, so the page can keep it without loading everything again. */
  onRequiredChange?: (required: boolean) => void
}

const COPY: Record<AgreementSigner, { label: string; agreement: string; others: string; previewTitle: string }> = {
  [AGREEMENT_SIGNER.PARTNER]: { label: 'partner', agreement: 'partner agreement', others: 'Other partners', previewTitle: 'Partner agreement preview' },
  [AGREEMENT_SIGNER.CLIENT]: { label: 'client', agreement: 'borrower agreement', others: "The partner's other clients", previewTitle: 'Borrower agreement preview' },
}

/**
 * A partner's or client's Agreement tab: whether they are asked to sign (the
 * host can excuse this one partner or client while signing stays on for
 * everyone else), and their signed agreement once there is one.
 */
export default function AgreementTab({ signer, isHost, formData, partnerId, clientId, onRefresh, onRequiredChange }: AgreementTabProps) {
  const setRequired = useSetAgreementRequired()
  const copy = COPY[signer]
  const signed = !!formData.has_sign
  const userId = formData.user_id ?? null
  // Nothing to require or waive once signed.
  const showControl = isHost && !signed
  // The host can change it only while signing, and the agreement this partner /
  // client would sign, are both on in Settings › Agreement - the API says which.
  const { data: statusRes, isLoading } = useAgreementRequirement(userId, showControl)
  const status = statusRes?.data
  // Before they sign: the active agreement they would sign, filled for them. None while it is off.
  const { data: preview } = useAgreementSignerPreview(userId, !signed)
  const [previewing, setPreviewing] = useState(false)
  const loading = !!userId && isLoading
  const canPreview = !signed && !!preview?.template_html
  const previewButton = (
    <button type="button" className="btn btn-sm btn-soft-primary agr-preview__btn" onClick={() => setPreviewing(true)}>
      <i className="ri-eye-line me-1" aria-hidden="true" />
      Preview Agreement
    </button>
  )
  const locked = !!status && !status.can_change
  const globallyOff = locked && !status.signing_enabled
  const required = !locked && (status?.agreement_required ?? formData.agreement_required) !== false
  const turnOnHint =
    locked && !globallyOff && signer === AGREEMENT_SIGNER.CLIENT
      ? "Turn it on in that partner's Configuration › Agreement to require or waive it for this client."
      : `Turn it on there to require or waive the ${copy.agreement} for this ${copy.label}.`

  const toggle = () => {
    if (!userId || !status?.can_change) return
    const next = !required
    setRequired.mutate(
      { userId, required: next },
      {
        // Only this switch changes: no need to load the whole page again.
        onSuccess: (res) => {
          onRequiredChange?.(res.data?.agreement_required ?? next)
          toast.success(res.message || 'Agreement requirement updated')
        },
        onError: (error: unknown) => {
          const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
          toast.error(message || 'Failed to update the agreement requirement')
        },
      }
    )
  }

  return (
    <div className="d-flex flex-column gap-3">
      {showControl && (
        <div className="agr-req">
          <div className="agr-req__head">
            <div className={`agr-req__icon ${required ? 'agr-req__icon--on' : 'agr-req__icon--off'}`} aria-hidden="true">
              <i className={required ? 'ri-quill-pen-line' : 'ri-file-forbid-line'} />
            </div>

            <div className="flex-grow-1 min-w-0">
              <h6 className="agr-req__title">
                Agreement signing
                {locked ? (
                  <span className="agr-req__pill agr-req__pill--off">{globallyOff ? 'Off for everyone' : 'Agreement off'}</span>
                ) : required ? (
                  <span className="agr-req__pill agr-req__pill--on">Required</span>
                ) : (
                  <span className="agr-req__pill agr-req__pill--off">Waived</span>
                )}
              </h6>
              <p className="agr-req__text">
                {locked
                  ? globallyOff
                    ? 'Nobody is asked to sign an agreement while signing is off.'
                    : `Nobody is asked to sign the ${copy.agreement} while it is off.`
                  : required
                    ? `This ${copy.label} is asked to sign the ${copy.agreement}.`
                    : `This ${copy.label} is not asked to sign the ${copy.agreement}. ${copy.others} are not affected.`}
              </p>
              {!userId && (
                <span className="agr-req__note">
                  <i className="ri-information-line" aria-hidden="true" />
                  Available once this {copy.label} has a login.
                </span>
              )}
            </div>

            <div className="agr-req__control">
              <label className="agr-req__control-label" htmlFor="agreement-required-switch">
                {setRequired.isPending ? 'Saving…' : locked ? 'Off' : required ? 'Required' : 'Not required'}
              </label>
              <div className="form-check form-switch form-switch-lg">
                <input
                  id="agreement-required-switch"
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  checked={required}
                  onChange={toggle}
                  disabled={!userId || !status?.can_change || setRequired.isPending}
                  aria-label={`Require this ${copy.label} to sign the ${copy.agreement}`}
                />
              </div>
            </div>
          </div>

          {!loading && (
            <div className={`agr-req__status${locked ? ' agr-req__status--locked' : ''}`}>
              {locked ? (
                <>
                  <div className="agr-req__status-icon agr-req__status-icon--off" aria-hidden="true">
                    <i className="ri-lock-line" />
                  </div>
                  <div>
                    <p className="agr-req__status-title">{status?.locked_reason}</p>
                    <p className="agr-req__status-text">{turnOnHint}</p>
                  </div>
                </>
              ) : required ? (
                <>
                  <div className="agr-req__status-icon agr-req__status-icon--on" aria-hidden="true">
                    <i className="ri-time-line" />
                  </div>
                  <div>
                    <p className="agr-req__status-title">Awaiting signature</p>
                    <p className="agr-req__status-text">
                      They will be asked to sign the {copy.agreement} the next time they use the portal.
                    </p>
                  </div>
                  {canPreview && previewButton}
                </>
              ) : (
                <>
                  <div className="agr-req__status-icon agr-req__status-icon--off" aria-hidden="true">
                    <i className="ri-shield-check-line" />
                  </div>
                  <div>
                    <p className="agr-req__status-title">No signature needed</p>
                    <p className="agr-req__status-text">Turn signing back on at any time to ask them again.</p>
                  </div>
                  {canPreview && previewButton}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Without the host's switch (a partner viewing its own client), the preview stands alone. */}
      {canPreview && !showControl && (
        <div className="agr-preview">
          <div className="agr-req__status-icon agr-req__status-icon--on" aria-hidden="true">
            <i className="ri-file-text-line" />
          </div>
          <div className="flex-grow-1 min-w-0">
            <p className="agr-req__status-title">Not signed yet</p>
            <p className="agr-req__status-text">See the {copy.agreement} as this {copy.label} will see it, filled with their details.</p>
          </div>
          {previewButton}
        </div>
      )}

      {previewing && preview?.template_html && (
        <AgreementPreviewDialog
          title={copy.previewTitle}
          subtitle={`As this ${copy.label} will see it. Read only - nothing is signed or sent.`}
          html={preview.template_html}
          onClose={() => setPreviewing(false)}
        />
      )}

      {signed && <AgreementSection partnerId={partnerId} clientId={clientId} formData={formData} onRefresh={onRefresh} />}
    </div>
  )
}
