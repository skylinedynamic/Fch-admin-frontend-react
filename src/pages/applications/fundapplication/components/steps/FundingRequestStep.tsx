import React, { useEffect, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import type { FundingRequest } from '../../types'
import StepNavigation from '../shared/StepNavigation'
import FormSkeleton from '../../../../../components/Loader/FormSkeleton'
import CustomDropdown from '../../../../../components/Common/CustomDropdown'
import { purposeOfFundingOptions, fundingTypeOptions, timeframeOptions, collateralOptions, FUNDING_PURPOSE_OTHER, additionalFundingTypeOptions, withoutPreferredFundingType, splitPurposes, joinPurposes } from '../../../../../data/profile'
import ChipMultiSelect from '../../../../../components/Common/ChipMultiSelect'
import { useFundingRequest, useSaveFundingRequest } from '../../../../../modules/funding-application/queries'
import { isEditConfirmationCancelled } from '../../../../../modules/funding-application/editConfirmation'
import { toast } from 'react-toastify'
import { formatCurrency, unformatCurrency } from '../../../../../utils/borrowerFormatters'
import { useQuery } from '@tanstack/react-query'
import { fetchBorrowerFunding } from '../../../../../modules/funding/services'

interface FundingRequestStepProps {
  funding: FundingRequest
  setFunding: (data: FundingRequest) => void
  onNext: () => void
  onBack: () => void
  loading: boolean
  onRegisterSave?: (fn: (() => Promise<boolean>) | null) => void
  fundingRequestId?: number | string | null
  fundingSequenceId?: number | string | null
}

/** A saved purpose_of_funds string, normalised: the known purposes as listed, joined again. */
const matchPurpose = (raw: string | null | undefined): string => joinPurposes(splitPurposes(raw))

const matchTimeframe = (raw: string | null | undefined): string => {
  if (!raw) return ''
  const trimmed = raw.trim()
  const exact = timeframeOptions.find(o => o.value.toLowerCase() === trimmed.toLowerCase())
  if (exact) return exact.value

  const lower = trimmed.toLowerCase()
  if (lower.includes('hour') || lower.includes('1-3 day') || lower.includes('1-5 day') || lower.includes('3-7 day') || lower.includes('immediately')) {
    return 'Immediately'
  }
  if (lower.includes('7-14') || lower.includes('1-2 week') || lower.includes('2 week')) {
    return '1-2 Weeks'
  }
  if (lower.includes('21-45') || lower.includes('30-60') || lower.includes('month')) {
    return '1 Month'
  }
  if (lower.includes('flexible')) {
    return 'Flexible'
  }
  return trimmed
}

export default function FundingRequestStep({
  funding,
  setFunding,
  onNext,
  onBack,
  loading,
  onRegisterSave,
  fundingRequestId: initialFundingRequestId,
  fundingSequenceId,
}: FundingRequestStepProps) {
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const urlApprovedFunding = (location.state as any)?.approved_funding
  const urlRequestedAmount = (location.state as any)?.requested_amount
  const urlFundingType = (location.state as any)?.funding_type
  const urlPurpose = (location.state as any)?.purpose

  const effectiveRequestId = initialFundingRequestId
    || (location.state as any)?.funding_request_id
    || (location.state as any)?.fundingRequestId
    || searchParams.get('funding_request_id')
    || searchParams.get('fundingRequestId')
    || null

  const [fundingRequestId, setFundingRequestId] = useState<number | null>(effectiveRequestId ? Number(effectiveRequestId) : null)
  const { data: apiData, isLoading: isApiLoading, isSuccess } = useFundingRequest(fundingRequestId, { enabled: !!fundingRequestId })
  const saveMutation = useSaveFundingRequest()
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Fetch approved funding options
  const { data: fundingOptionsData } = useQuery({
    queryKey: ['borrower-funding'],
    queryFn: fetchBorrowerFunding
  })

  const approvedFundingOptions = React.useMemo(() => {
    if (!fundingOptionsData?.data?.groups) return []
    return fundingOptionsData.data.groups.flatMap((g: any) =>
      g.sequencings.map((seq: any) => ({
        label: seq.name,
        value: seq.name
      }))
    )
  }, [fundingOptionsData])

  const dynamicFundingTypeOptions = React.useMemo(() => {
    const opts = [...fundingTypeOptions]
    const currentType = funding.fundingType || urlFundingType || apiData?.preferred_funding_type
    if (currentType && !opts.find(o => o.value.toLowerCase() === currentType.toLowerCase())) {
      opts.unshift({ label: currentType, value: currentType })
    }
    return opts
  }, [funding.fundingType, urlFundingType, apiData?.preferred_funding_type])

  const selectedPurposes = React.useMemo(() => splitPurposes(funding.purpose), [funding.purpose])
  const hasOtherPurpose = selectedPurposes.includes(FUNDING_PURPOSE_OTHER)

  // The listed purposes, plus any saved one not on the list, so it shows and is kept.
  const dynamicPurposeOptions = React.useMemo(() => {
    const extra = selectedPurposes
      .filter(p => !purposeOfFundingOptions.some(o => o.value === p))
      .map(p => ({ label: p, value: p }))
    return [...extra, ...purposeOfFundingOptions]
  }, [selectedPurposes])

  const dynamicTimeframeOptions = React.useMemo(() => {
    const opts = [...timeframeOptions]
    const currentTimeframe = funding.timeframe
    if (currentTimeframe && !opts.find(o => o.value.toLowerCase() === currentTimeframe.toLowerCase())) {
      opts.push({ label: currentTimeframe, value: currentTimeframe })
    }
    return opts
  }, [funding.timeframe])

  // Memoized save handler
  const handleSave = useCallback(async (): Promise<boolean> => {
    setValidationErrors({})

    const payload = {
      id: fundingRequestId,
      funding_request_id: effectiveRequestId || apiData?.funding_request_id || null,
      funding_sequence_id: fundingSequenceId || apiData?.funding_sequence_id || null,
      requested_amount: unformatCurrency(funding.requestedAmount) || null,
      purpose_of_funds: funding.purpose || null,
      preferred_funding_type: funding.fundingType || null,
      additional_funding_types: withoutPreferredFundingType(funding.additionalFundingTypes, funding.fundingType),
      approved_funding: funding.approvedFunding || null,
      timeframe_needed: funding.timeframe || null,
      collateral_available: funding.collateral || null,
      purpose_note: hasOtherPurpose ? (funding.purposeNote || null) : null,
    }

    try {
      await saveMutation.mutateAsync(payload)
      toast.success('Funding request saved successfully')
      return true
    } catch (error: any) {
      // The partner backed out of the re-signature confirmation - nothing was
      // attempted, so say nothing.
      if (isEditConfirmationCancelled(error)) return false
      console.error('Error saving funding request:', error)
      const errors = error.response?.data?.errors
      if (errors) {
        setValidationErrors(errors)
      } else {
        toast.error(error?.response?.data?.message || 'Failed to save funding request')
      }
      return false
    }
  }, [fundingRequestId, effectiveRequestId, apiData, fundingSequenceId, funding, hasOtherPurpose, saveMutation])

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
      setFundingRequestId(apiData.id || null)

      const rawAmount = urlRequestedAmount || apiData.requested_amount
      const parsedAmount = rawAmount ? formatCurrency(rawAmount) : ''

      const rawPurpose = urlPurpose || apiData.purpose_of_funds
      const resolvedPurpose = matchPurpose(rawPurpose) || funding.purpose || ''

      const resolvedApprovedFunding = urlApprovedFunding || apiData.approved_funding || funding.approvedFunding || ''
      const resolvedFundingType = urlFundingType || apiData.preferred_funding_type || funding.fundingType || ''
      const resolvedTimeframe = matchTimeframe(apiData.timeframe_needed) || funding.timeframe || ''

      setFunding({
        ...funding,
        requestedAmount: parsedAmount,
        purpose: resolvedPurpose,
        approvedFunding: resolvedApprovedFunding,
        fundingType: resolvedFundingType,
        additionalFundingTypes: withoutPreferredFundingType(apiData.additional_funding_types, resolvedFundingType),
        timeframe: resolvedTimeframe,
        collateral: apiData.collateral_available || '',
        purposeNote: apiData.purpose_note || '',
      })
    } else if (urlApprovedFunding && !funding.approvedFunding) {
      // If no API data yet, but we have a URL param, pre-fill it immediately
      setFunding({
        ...funding,
        approvedFunding: urlApprovedFunding,
        requestedAmount: urlRequestedAmount ? formatCurrency(urlRequestedAmount) : funding.requestedAmount,
        fundingType: urlFundingType || funding.fundingType,
        purpose: matchPurpose(urlPurpose) || funding.purpose,
      })
    }
  }, [isSuccess, apiData, effectiveRequestId])

  // Helper to get field error
  const getFieldError = (fieldName: string): string | undefined => {
    return validationErrors[fieldName]
  }

  // Helper to check if field has error
  const hasError = (fieldName: string): boolean => {
    return !!validationErrors[fieldName]
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    const success = await handleSave()
    if (success) {
      onNext()
    }
  }

  const isValid = !!(
    funding.requestedAmount &&
    funding.purpose &&
    funding.fundingType &&
    (!hasOtherPurpose || funding.purposeNote)
  )

  if (loading || isApiLoading) {
    return <FormSkeleton fieldCount={5} />
  }

  return (
    <form className="row g-3" onSubmit={handleSubmit}>
      <div className="col-md-6">
        <label className="form-label">
          Requested Amount <span className="text-danger">*</span>
        </label>
        <input
          type="text"
          className={`form-control ${hasError('requested_amount') ? 'is-invalid' : ''}`}
          placeholder="Enter requested amount"
          value={funding.requestedAmount}
          readOnly
          style={{ backgroundColor: '#f8f9fa', cursor: 'default' }}
        />
        {hasError('requested_amount') && <div className="invalid-feedback">{getFieldError('requested_amount')}</div>}
      </div>
      <div className="col-md-6">
        <label className="form-label" htmlFor="purpose_of_funds">
          Purpose of Funds <span className="text-danger">*</span>
        </label>
        {/* Several purposes at once, sent joined in the one purpose_of_funds string. */}
        <ChipMultiSelect
          inputId="purpose_of_funds"
          value={selectedPurposes}
          onChange={(purposes) => setFunding({
            ...funding,
            purpose: joinPurposes(purposes),
            purposeNote: purposes.includes(FUNDING_PURPOSE_OTHER) ? funding.purposeNote : ''
          })}
          options={dynamicPurposeOptions}
          placeholder="Select purpose of funds"
          invalid={hasError('purpose_of_funds')}
          filter
          filterPlaceholder="Search purposes"
        />
        {hasError('purpose_of_funds') && (
          <div className="invalid-feedback d-block">{getFieldError('purpose_of_funds')}</div>
        )}
      </div>

      {hasOtherPurpose && (
        <div className="col-md-6">
          <label className="form-label">
            Purpose Note <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className={`form-control ${hasError('purpose_note') ? 'is-invalid' : ''}`}
            placeholder="Please specify the purpose of funds"
            value={funding.purposeNote || ''}
            onChange={(e) => setFunding({ ...funding, purposeNote: e.target.value })}
          />
          {hasError('purpose_note') && <div className="invalid-feedback">{getFieldError('purpose_note')}</div>}
        </div>
      )}

      <div className="col-md-6">
        <label className="form-label">
          Approved Funding Product <span className="text-danger">*</span>
        </label>
        {/* <CustomDropdown
              value={funding.approvedFunding}
              onChange={(value) => setFunding({ ...funding, approvedFunding: value })}
              options={approvedFundingOptions}
              optionLabel="label"
              optionValue="value"
              placeholder="Select approved funding"
              className={`w-100 ${hasError('approved_funding') ? 'is-invalid' : ''}`}
              disabled
           /> */}
        <input
          type="text"
          className={`form-control ${hasError('approved_funding') ? 'is-invalid' : ''}`}
          value={funding.approvedFunding || ''}
          readOnly
          style={{ backgroundColor: '#f8f9fa', cursor: 'default' }}
        />
        {hasError('approved_funding') && (
          <div className="invalid-feedback d-block">{getFieldError('approved_funding')}</div>
        )}
      </div>

      <div className="col-md-6">
        <label className="form-label">
          Preferred Funding Type <span className="text-danger">*</span>
        </label>
        <CustomDropdown
          value={funding.fundingType}
          onChange={(value) => setFunding({
            ...funding,
            fundingType: value,
            additionalFundingTypes: withoutPreferredFundingType(funding.additionalFundingTypes, value),
          })}
          options={dynamicFundingTypeOptions}
          optionLabel="label"
          optionValue="value"
          placeholder="Select preferred funding type"
          className={`w-100 ${hasError('preferred_funding_type') ? 'is-invalid' : ''}`}
        />
        {hasError('preferred_funding_type') && (
          <div className="invalid-feedback d-block">{getFieldError('preferred_funding_type')}</div>
        )}
      </div>
      <div className="col-md-6">
        <label className="form-label" htmlFor="additional_funding_types">Additional Funding Types</label>
        {/* Every funding type but the preferred one, several at once. */}
        <ChipMultiSelect
          inputId="additional_funding_types"
          value={funding.additionalFundingTypes ?? []}
          onChange={(types) => setFunding({ ...funding, additionalFundingTypes: types })}
          options={additionalFundingTypeOptions(funding.fundingType)}
          placeholder="Select any other funding types"
          filter
          filterPlaceholder="Search funding types"
          invalid={hasError('additional_funding_types')}
        />
        {hasError('additional_funding_types') && (
          <div className="invalid-feedback d-block">{getFieldError('additional_funding_types')}</div>
        )}
      </div>
      <div className="col-md-6">
        <label className="form-label">Timeframe Needed</label>
        <CustomDropdown
          value={funding.timeframe}
          onChange={(value) => setFunding({ ...funding, timeframe: value })}
          options={dynamicTimeframeOptions}
          optionLabel="label"
          optionValue="value"
          placeholder="Select timeframe needed"
          className={`w-100 ${hasError('timeframe_needed') ? 'is-invalid' : ''}`}
        />
        {hasError('timeframe_needed') && (
          <div className="invalid-feedback d-block">{getFieldError('timeframe_needed')}</div>
        )}
      </div>

      <div className="col-md-6">
        <label className="form-label">Collateral Available?</label>
        <CustomDropdown
          value={funding.collateral}
          onChange={(value) => setFunding({ ...funding, collateral: value })}
          options={collateralOptions}
          optionLabel="label"
          optionValue="value"
          placeholder="Select collateral"
          className={`w-100 ${hasError('collateral_available') ? 'is-invalid' : ''}`}
        />
        {hasError('collateral_available') && (
          <div className="invalid-feedback d-block">{getFieldError('collateral_available')}</div>
        )}
      </div>

      <StepNavigation
        onBack={onBack}
        onNext={handleSubmit}
        isNextDisabled={!isValid}
        loading={loading || isApiLoading || saveMutation.isPending}
      />
    </form>
  )
}
