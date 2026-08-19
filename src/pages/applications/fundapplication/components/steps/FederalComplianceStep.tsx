import React, { useState, useEffect, useCallback } from 'react'
import type { FederalCompliance } from '../../types'
import StepNavigation from '../shared/StepNavigation'
import FormSkeleton from '../../../../../components/Loader/FormSkeleton'
import { useFederalCompliance, useSaveFederalCompliance } from '../../../../../modules/funding-application/queries'
import { toast } from 'react-toastify'
import ConfirmationModal from '../../../../../components/GlobalModal/ConfirmationModal'

interface FederalComplianceStepProps {
  federal: FederalCompliance
  setFederal: React.Dispatch<React.SetStateAction<FederalCompliance>>
  onNext: () => void
  onBack: () => void
  loading: boolean
  isValid: boolean
  fundingRequestId?: number | string | null
  onRegisterSave?: (fn: (() => Promise<boolean>) | null) => void
  nextLabel?: string
}

const questions: { key: keyof FederalCompliance; label: string; apiField: string }[] = [
  { key: 'bankruptcy', label: '1. Has the Business or any Owner ever filed for bankruptcy?', apiField: 'filed_for_bankruptcy' },
  { key: 'lawsuit', label: '2. Is the Business or any Owner currently involved in any pending lawsuits?', apiField: 'any_pending_lawsuits' },
  { key: 'federalLoanDefault', label: '3. Has the Business or any Owner ever defaulted on a Federal Loan (SBA, etc.)?', apiField: 'has_federal_loan' },
  { key: 'federalDebtDelinquent', label: '4. Is the Business or any Owner currently delinquent on any Federal Debt?', apiField: 'has_federal_debt' },
  { key: 'criminalOffense', label: '5. Has any Owner ever been convicted of a criminal offense?', apiField: 'has_criminal_offense' },
  { key: 'paroleProbation', label: '6. Is any Owner currently on parole or probation?', apiField: 'has_parole_or_probation' },
  { key: 'suspendedDebarred', label: '7. Is the Business or any Owner currently suspended or debarred from doing business with the Federal Government?', apiField: 'suspended_or_debarred' },
  { key: 'judgmentsLiensBusiness', label: '8. Are there any outstanding judgments or liens against the Business?', apiField: 'any_outstanding_judgments_business' },
  { key: 'judgmentsLiensOwner', label: '9. Are there any outstanding judgments or liens against any Owner?', apiField: 'any_outstanding_judgments_owner' },
]

export default function FederalComplianceStep({
  federal,
  setFederal,
  onNext,
  onBack,
  loading,
  isValid,
  fundingRequestId,
  onRegisterSave,
  nextLabel,
}: FederalComplianceStepProps) {
  const { data: apiData, isLoading: isApiLoading, isSuccess } = useFederalCompliance(fundingRequestId, { enabled: !!fundingRequestId })
  const { mutateAsync: saveCompliance, isPending: isSaving } = useSaveFederalCompliance()
  const [complianceId, setComplianceId] = useState<number | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [showModal, setShowModal] = useState(false)

  // Helper to map boolean values to payload format
  const mapPayloadVal = (val: string): boolean | null => {
    if (val === 'yes') return true
    if (val === 'no') return false
    return null
  }

  // Memoized save handler
  const handleSave = useCallback(async (): Promise<boolean> => {
    setValidationErrors({})

    const payload = {
      id: complianceId,
      funding_request_id: fundingRequestId || null,
      filed_for_bankruptcy: mapPayloadVal(federal.bankruptcy),
      any_pending_lawsuits: mapPayloadVal(federal.lawsuit),
      has_federal_loan: mapPayloadVal(federal.federalLoanDefault),
      has_federal_debt: mapPayloadVal(federal.federalDebtDelinquent),
      has_criminal_offense: mapPayloadVal(federal.criminalOffense),
      has_parole_or_probation: mapPayloadVal(federal.paroleProbation),
      suspended_or_debarred: mapPayloadVal(federal.suspendedDebarred),
      any_outstanding_judgments_business: mapPayloadVal(federal.judgmentsLiensBusiness),
      any_outstanding_judgments_owner: mapPayloadVal(federal.judgmentsLiensOwner),
      federal_compliance_disclosures_explanation: federal.explanation,
    }

    try {
      const response = await saveCompliance(payload)
      toast.success(response?.message || 'Federal compliance disclosures saved successfully!')
      return true
    } catch (error: any) {
      console.error('Error saving federal compliance:', error)
      const errors = error.response?.data?.errors
      if (errors) {
        setValidationErrors(errors)
        toast.error('Please resolve validation errors')
      } else {
        toast.error(error.response?.data?.message || 'Failed to save federal compliance')
      }
      return false
    }
  }, [complianceId, federal, saveCompliance])

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
      setComplianceId(apiData.id || null)

      const mapVal = (v: any) => {
        if (v === 1 || v === '1' || v === 'yes' || v === true) return 'yes'
        return 'no'
      }

      setFederal((prev) => ({
        ...prev,
        bankruptcy: mapVal(apiData.filed_for_bankruptcy),
        lawsuit: mapVal(apiData.any_pending_lawsuits),
        federalLoanDefault: mapVal(apiData.has_federal_loan),
        federalDebtDelinquent: mapVal(apiData.has_federal_debt),
        criminalOffense: mapVal(apiData.has_criminal_offense),
        paroleProbation: mapVal(apiData.has_parole_or_probation),
        suspendedDebarred: mapVal(apiData.suspended_or_debarred),
        judgmentsLiensBusiness: mapVal(apiData.any_outstanding_judgments_business),
        judgmentsLiensOwner: mapVal(apiData.any_outstanding_judgments_owner),
        explanation: apiData.federal_compliance_disclosures_explanation || prev.explanation,
      }))
    }
  }, [isSuccess, apiData, setFederal])

  // Save & Next button handler
  const handleNext = () => {
    setShowModal(true)
  }

  const handleConfirm = async () => {
    const success = await handleSave()
    if (success) {
      setShowModal(false)
      onNext()
    } else {
      setShowModal(false)
    }
  }

  const getApiError = (apiField: string): string | undefined => {
    return validationErrors[apiField]
  }

  const anyYes = questions.some((q) => federal[q.key] === 'yes')
  const allAnswered = questions.every((q) => federal[q.key] === 'yes' || federal[q.key] === 'no')
  const stepValid = allAnswered && (!anyYes || federal.explanation.trim().length > 0)

  if (loading || isApiLoading) {
    return <FormSkeleton fieldCount={9} />
  }

  return (
    <form className="row g-3">
      <div className="col-12">
        <div className="list-group">
          {questions.map((q) => (
            <div className={`list-group-item ${getApiError(q.apiField) ? 'border-danger' : ''}`} key={q.key as string}>
              <div className="row align-items-center">
                <div className="col-9 text-start">
                  <span className="fw-medium d-block">
                    {q.label} <span className="text-danger">*</span>
                  </span>
                  {getApiError(q.apiField) && <div className="text-danger small mt-1">{getApiError(q.apiField)}</div>}
                </div>
                <div className="col-3 text-end">
                  <div className="btn-group" role="group" aria-label={`Select answer for ${q.label}`}>
                    <input
                      type="radio"
                      className="btn-check"
                      name={q.key as string}
                      id={`${q.key}-yes`}
                      checked={federal[q.key] === 'yes'}
                      onChange={() => setFederal({ ...federal, [q.key]: 'yes' })}
                    />
                    <label className="btn btn-sm btn-outline-success" htmlFor={`${q.key}-yes`}>
                      Yes
                    </label>
                    <input
                      type="radio"
                      className="btn-check"
                      name={q.key as string}
                      id={`${q.key}-no`}
                      checked={federal[q.key] === 'no'}
                      onChange={() => setFederal({ ...federal, [q.key]: 'no' })}
                    />
                    <label className="btn btn-sm btn-outline-danger" htmlFor={`${q.key}-no`}>
                      No
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="col-12">
        <div className="card">
          <div className="card-header text-start">
            Explanation <span className="text-danger">{anyYes ? '*' : ''}</span>
          </div>
          <div className="card-body">
            <textarea
              className={`form-control ${validationErrors['federal_compliance_disclosures_explanation'] ? 'is-invalid' : ''}`}
              rows={4}
              placeholder="If yes to any of the above, explain"
              value={federal.explanation}
              onChange={(e) => setFederal({ ...federal, explanation: e.target.value })}
            />
            {validationErrors['federal_compliance_disclosures_explanation'] && (
              <div className="invalid-feedback">{validationErrors['federal_compliance_disclosures_explanation']}</div>
            )}
            {anyYes && !federal.explanation.trim() && !validationErrors['federal_compliance_disclosures_explanation'] && (
              <div className="form-text text-danger mt-1">Explanation is required when any answer is Yes.</div>
            )}
          </div>
        </div>
      </div>

      <StepNavigation onBack={onBack} onNext={handleNext} isNextDisabled={!stepValid || isSaving} loading={loading || isSaving} nextLabel={nextLabel} />

      <ConfirmationModal
        show={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleConfirm}
        title="Notify Borrower"
        message="Are you sure you want to save this draft and notify the borrower to complete their application?"
        confirmText="Yes, Save & Notify"
        loading={isSaving}
      />
    </form>
  )
}

