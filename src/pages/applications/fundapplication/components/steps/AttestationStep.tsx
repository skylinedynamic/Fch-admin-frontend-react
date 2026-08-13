import React, { useState, useEffect } from 'react'
import type { Attestation } from '../../types'
import { useNavigate } from 'react-router-dom'
import StepNavigation from '../shared/StepNavigation'
import FormSkeleton from '../../../../../components/Loader/FormSkeleton'
import { useSaveAttestation, useAttestation } from '../../../../../modules/funding-application/queries'
import { toast } from 'react-toastify'
import { useConfigStore } from '../../../../../store/config/configStore'
import ConfirmationModal from '../../../../../components/GlobalModal/ConfirmationModal'
import DisclosureModal from '../shared/DisclosureModal'
import { TERMS_OF_SERVICE_DATA, PRIVACY_POLICY_DATA, AUTHORIZATION_DATA, ATTESTATION_ITEMS } from '../../../../../config/disclosureConfig'

interface AttestationStepProps {
  attestation: Attestation
  setAttestation: (data: Attestation) => void
  onSubmit: () => void
  onBack: () => void
  loading: boolean
  fundingRequestId?: number | string | null
}

export default function AttestationStep({
  attestation,
  setAttestation,
  onSubmit,
  onBack,
  loading,
  fundingRequestId,
}: AttestationStepProps) {
  const navigate = useNavigate()
  const { branding } = useConfigStore()
  const [showModal, setShowModal] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [attestationId, setAttestationId] = useState<number | null>(null)
  
  // Modal State
  const [modalState, setModalState] = useState<{ isOpen: boolean; title: string; content: string }>({
    isOpen: false,
    title: '',
    content: '',
  })
  const toggleModal = () => setModalState({ ...modalState, isOpen: !modalState.isOpen })

  const { data: apiData, isLoading: isApiLoading, isSuccess } = useAttestation()
  const { mutate: saveAttestation, isPending: isSaving } = useSaveAttestation()

  // Pre-fill form from API
  const [hasPrefilled, setHasPrefilled] = useState(false)
  
  useEffect(() => {
    if (isSuccess && apiData && !hasPrefilled) {
      setAttestationId(apiData.id || null)
      if (apiData.signature_data) {
        setAttestation({
          ...attestation,
          signature_name: apiData.signature_data.signature_name || '',
          esign_consent: apiData.signature_data.esign_consent || false,
          terms_consent: apiData.signature_data.terms_consent || false,
          credit_consent: apiData.signature_data.credit_consent || false,
          legal_binding_consent: apiData.signature_data.legal_binding_consent || false,
        })
      }
      setHasPrefilled(true)
    }
  }, [isSuccess, apiData, hasPrefilled, setAttestation, attestation])

  const handleChange = (field: keyof Attestation, value: any) => {
    if (typeof value === 'boolean' && ['esign_consent', 'terms_consent', 'privacy_consent', 'credit_consent', 'legal_binding_consent'].includes(field)) {
      const timestampKey = `${field}_timestamp` as keyof Attestation;
      setAttestation({ 
        ...attestation, 
        [field]: value,
        [timestampKey]: value ? Date.now() : undefined
      })
    } else {
      setAttestation({ ...attestation, [field]: value })
    }
  }

  const handleConfirm = () => {
    setValidationErrors({})
    const payload = {
      id: attestationId,
      funding_request_id: fundingRequestId || null,
      signature_name: attestation.signature_name,
      esign_consent: attestation.esign_consent,
      terms_consent: attestation.terms_consent,
      credit_consent: attestation.credit_consent,
      legal_binding_consent: attestation.legal_binding_consent,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      application_version: '1.0',
      terms_version: '1.0',
      privacy_version: '1.0',
      credit_auth_version: '1.0',
      consents_data: JSON.stringify([
        ...ATTESTATION_ITEMS.map(item => ({
          key: item.key,
          label: item.label,
          checked: Boolean(attestation[item.key as keyof Attestation]),
          timestamp: attestation[`${item.key}_timestamp` as keyof Attestation] || null,
          version: '1.0'
        })),
        {
          key: 'final_certification',
          label: 'Final Certification: By typing my full legal name above and clicking "Submit Application," I certify that all information provided is true and accurate, consent to receive records electronically, authorize Four Corner Funding and its funding partners to obtain and review my business and/or personal credit information as permitted by law, and agree that my electronic signature has the same legal effect as a handwritten signature under the ESIGN Act, UETA, and other applicable law.',
          checked: true,
          timestamp: Date.now(),
          version: '1.0'
        }
      ]),
    }

    saveAttestation(payload, {
      onSuccess: () => {
        setShowModal(false)
        toast.success('Application submitted successfully!')
        navigate('/my-applications')
      },
      onError: (error: any) => {
        setShowModal(false)
        console.error('Error submitting application:', error)
        const errors = error.response?.data?.errors
        if (errors) {
          setValidationErrors(errors)
          toast.error('Please resolve validation errors')
        } else {
          toast.error(error.response?.data?.message || 'Failed to submit application')
        }
      },
    })
  }

  const getApiError = (field: string): string | undefined => validationErrors[field]

  const isFormValid = Boolean(
    attestation.signature_name &&
    attestation.signature_name.trim().length >= 3 &&
    attestation.esign_consent &&
    attestation.terms_consent &&
    attestation.credit_consent &&
    attestation.legal_binding_consent
  )

  if (loading || isApiLoading) {
    return <FormSkeleton fieldCount={4} />
  }

  return (
    <>
      <form className="row g-3">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <h5 className="mb-4">Electronic Signature & Consent</h5>

              <div className="mb-4">
                <label htmlFor="signature_name" className="form-label">
                  Electronic Signature (Full Legal Name) <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  id="signature_name"
                  className={`form-control ${getApiError('signature_name') ? 'is-invalid' : ''}`}
                  placeholder="Enter your full legal name"
                  value={attestation.signature_name}
                  onChange={(e) => handleChange('signature_name', e.target.value)}
                />
                {getApiError('signature_name') && (
                  <div className="invalid-feedback d-block mt-1">{getApiError('signature_name')}</div>
                )}
              </div>



              {ATTESTATION_ITEMS.map((item, idx) => {
                const isLast = idx === ATTESTATION_ITEMS.length - 1;
                return (
                  <div key={item.key} className={`d-flex align-items-center justify-content-between border rounded p-3 mb-${isLast ? '4' : '2'} ${getApiError(item.key) ? 'border-danger bg-danger-subtle' : ''}`}>
                    <div className="form-check mb-0">
                      <input
                        id={item.key}
                        className={`form-check-input ${getApiError(item.key) ? 'is-invalid' : ''}`}
                        type="checkbox"
                        checked={attestation[item.key as keyof Attestation] as boolean}
                        onChange={(e) => handleChange(item.key as keyof Attestation, e.target.checked)}
                      />
                      <label htmlFor={item.key} className="form-check-label ms-2">
                        <span className="fw-semibold">{item.label}</span>
                        {item.modalContent && (
                          <a
                            href="#!"
                            className="text-primary text-decoration-none fw-semibold ms-1"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              setModalState({ isOpen: true, title: item.modalTitle || '', content: item.modalContent || '' })
                            }}
                          >
                            (Read {item.modalTitle})
                          </a>
                        )}
                        <span className="text-danger ms-1">*</span>
                      </label>
                    </div>
                  </div>
                );
              })}

              <div className="alert alert-info small mb-0">
                <strong>Final Certification:</strong> By typing my full legal name above and clicking "Submit Application," I certify that all information provided is true and accurate, consent to receive records electronically, authorize {branding?.site_name || 'Four Corner Funding'} and its funding partners to obtain and review my business and/or personal credit information as permitted by law, and agree that my electronic signature has the same legal effect as a handwritten signature under the ESIGN Act, UETA, and other applicable law.
              </div>
            </div>
          </div>
        </div>
        <StepNavigation
          onBack={onBack}
          onNext={() => setShowModal(true)}
          isNextDisabled={!isFormValid || isSaving}
          isLastStep
          loading={loading || isSaving || isApiLoading}
        />
      </form>

      <ConfirmationModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleConfirm}
        title="Confirm Submission"
        message="Are you sure you want to submit your application? Please strictly review all information before confirming."
        confirmText="Submit Application"
        loading={isSaving}
        loadingText="Submitting..."
        icon="https://cdn.lordicon.com/lupuorrc.json"
      />

      <DisclosureModal
        isOpen={modalState.isOpen}
        toggle={toggleModal}
        title={modalState.title}
        content={modalState.content}
      />
    </>
  )
}
