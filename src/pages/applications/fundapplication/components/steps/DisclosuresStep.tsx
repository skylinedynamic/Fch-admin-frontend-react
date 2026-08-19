import React, { useEffect, useState, useCallback } from 'react'
import type { DisclosureConsent } from '../../types'
import StepNavigation from '../shared/StepNavigation'
import DisclosuresSkeleton from '../../../../../components/Loader/DisclosuresSkeleton'
import { useDisclosuresConsent, useSaveDisclosuresConsent } from '../../../../../modules/funding-application/queries'
import { toast } from 'react-toastify'
import DisclosureModal from '../shared/DisclosureModal'
import { AUTHORIZATION_DATA, TERMS_OF_SERVICE_DATA } from '../../../../../config/disclosureConfig'

interface DisclosuresStepProps {
  disclosure: DisclosureConsent
  setDisclosure: (data: DisclosureConsent) => void
  disclosureItems: { key: keyof DisclosureConsent; label: string; route: string }[]
  onNext: () => void
  onBack: () => void
  loading: boolean
  fundingRequestId?: number | string | null
  onRegisterSave?: (fn: (() => Promise<boolean>) | null) => void
}

export default function DisclosuresStep({
  disclosure,
  setDisclosure,
  disclosureItems,
  onNext,
  onBack,
  loading,
  fundingRequestId,
  onRegisterSave,
}: DisclosuresStepProps) {
  const { data: apiData, isLoading: isApiLoading, isSuccess } = useDisclosuresConsent(fundingRequestId, { enabled: !!fundingRequestId })
  const { mutateAsync: saveDisclosures, isPending: isSaving } = useSaveDisclosuresConsent()
  const [disclosureId, setDisclosureId] = useState<number | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Memoized save handler
  const handleSave = useCallback(async (): Promise<boolean> => {
    setValidationErrors({})

    const payload = {
      id: disclosureId,
      funding_request_id: fundingRequestId || null,
      credit_pull_authorization: disclosure.agreeTerms,
      terms_conditions_acceptance: disclosure.creditCheckConsent,
    }

    try {
      await saveDisclosures(payload)
      return true
    } catch (error: any) {
      console.error('Error saving disclosures:', error)
      const errors = error.response?.data?.errors
      if (errors) {
        setValidationErrors(errors)
        toast.error('Please resolve validation errors')
      } else {
        toast.error(error.response?.data?.message || 'Failed to save disclosures')
      }
      return false
    }
  }, [disclosureId, disclosure, saveDisclosures])

  // Register save function
  useEffect(() => {
    if (onRegisterSave) {
      onRegisterSave(handleSave)
    }
    return () => {
      if (onRegisterSave) onRegisterSave(null)
    }
  }, [onRegisterSave, handleSave])

  // Pre-fill form from API
  useEffect(() => {
    if (isSuccess && apiData) {
      setDisclosureId(apiData.id || null)
      setDisclosure({
        ...disclosure,
        agreeTerms: apiData.credit_pull_authorization,
        creditCheckConsent: apiData.terms_conditions_acceptance,
      })
    }
  }, [isSuccess, apiData])

  const allRequiredChecked = disclosureItems.every((item) => disclosure[item.key])

  const handleSubmit = async () => {
    const success = await handleSave()
    if (success) {
      toast.success('Disclosures saved successfully')
      onNext()
    }
  }

  // Modal State Management
  const [modalState, setModalState] = useState<{ isOpen: boolean; title: string; content: string }>({
    isOpen: false,
    title: '',
    content: '',
  })

  const toggleModal = () => setModalState({ ...modalState, isOpen: !modalState.isOpen })

  const openDisclosureModal = (key: keyof DisclosureConsent, title: string) => {
    const content = key === 'agreeTerms' ? AUTHORIZATION_DATA : TERMS_OF_SERVICE_DATA
    setModalState({
      isOpen: true,
      title,
      content,
    })
  }

  // Helper to map UI keys to API keys for error display
  const getApiError = (uiKey: keyof DisclosureConsent): string | undefined => {
    if (uiKey === 'agreeTerms') return validationErrors['credit_pull_authorization']
    if (uiKey === 'creditCheckConsent') return validationErrors['terms_conditions_acceptance']
    return undefined
  }

  if (loading || isApiLoading) {
    return <DisclosuresSkeleton count={disclosureItems.length} />
  }

  return (
    <>
      <form className="row g-3">
        {disclosureItems.map((item) => (
          <div className="col-12" key={item.key}>
            <div
              className={`d-flex align-items-center justify-content-between border rounded p-3 mb-2 ${getApiError(item.key) ? 'border-danger bg-danger-subtle' : ''}`}
            >
              <div className="form-check">
                <input
                  id={`disc-${item.key}`}
                  className={`form-check-input ${getApiError(item.key) ? 'is-invalid' : ''}`}
                  type="checkbox"
                  checked={disclosure[item.key] as boolean}
                  onChange={(e) => setDisclosure({ ...disclosure, [item.key]: e.target.checked })}
                />
                <label htmlFor={`disc-${item.key}`} className="form-check-label ms-2">
                  <span className="fw-semibold">{item.label}</span> <span className="text-danger">*</span>
                </label>
                {getApiError(item.key) && <div className="invalid-feedback d-block mt-1">{getApiError(item.key)}</div>}
              </div>
              <button
                type="button"
                className="btn btn-link text-primary p-0 border-0 shadow-none lh-1"
                onClick={() => openDisclosureModal(item.key, item.label)}
                title="View Details"
              >
                <i className="ri-eye-line fs-20"></i>
              </button>
            </div>
          </div>
        ))}

        <div className="col-12 mt-4">
          <StepNavigation
            onBack={onBack}
            onNext={handleSubmit}
            isNextDisabled={!allRequiredChecked || isSaving}
            loading={loading || isApiLoading || isSaving}
          />
        </div>
      </form>

      {/* Unified Modal */}
      <DisclosureModal
        isOpen={modalState.isOpen}
        toggle={toggleModal}
        title={modalState.title}
        content={modalState.content}
      />
    </>
  )
}


