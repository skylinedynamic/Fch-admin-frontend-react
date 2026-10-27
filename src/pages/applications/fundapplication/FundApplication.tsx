import React, { useMemo, useState, useEffect, useCallback } from 'react'
import './application.css'
import { toast } from 'react-toastify'
import { useLocation, useNavigate, useParams } from 'react-router-dom'

// Components
import BusinessInformationStep from './components/steps/BusinessInformationStep'
import OwnershipInformationStep from './components/steps/OwnershipInformationStep'
import FinancialInformationStep from './components/steps/FinancialInformationStep'
import FundingRequestStep from './components/steps/FundingRequestStep'
import DocumentUploadStep from './components/steps/DocumentUploadStep'
import DisclosuresStep from './components/steps/DisclosuresStep'
import FederalComplianceStep from './components/steps/FederalComplianceStep'
import CoBorrowerModal from './components/shared/CoBorrowerModal'
import EditConfirmationModal from './components/shared/EditConfirmationModal'
import { setEditRequiresConfirmation, setEditConfirmationResolving, resetEditConfirmation } from '../../../store/fundApplication/editConfirmationStore'

// Hooks
import { useCoBorrowers } from './hooks/useCoBorrowers'
import { FUNDING_PURPOSE_OTHER, purposeOfFundingOptions, timeframeOptions, withoutPreferredFundingType } from '../../../data/profile'
import { FUNDING_APPLICATION_STATUS } from '../../../config/borrower'
import { useFundingRequest, useFundingApplicationDocuments } from '../../../modules/funding-application/queries'
import { formatCurrency } from '../../../utils/borrowerFormatters'

// Types & Utils
import {
  tabs,
  disclosureItems,
  type PersonalInfo,
  type BusinessDetails,
  type OwnerInfo,
  type FinancialInfo,
  type FundingRequest,
  type DisclosureConsent,
  type FederalCompliance,
} from './types'

const matchPurpose = (raw: string | null | undefined): string => {
  if (!raw) return ''
  const trimmed = raw.trim()

  if (trimmed.includes(',')) {
    return trimmed
  }

  const exact = purposeOfFundingOptions.find(o => o.value.toLowerCase() === trimmed.toLowerCase())
  if (exact) return exact.value

  const lowerAll = trimmed.toLowerCase()
  if (lowerAll === 'working capital') return 'Working Capital'
  if (lowerAll.includes('equipment')) return 'Equipment Purchase'
  if (lowerAll.includes('inventory')) return 'Inventory'
  if (lowerAll.includes('payroll')) return 'Payroll'
  if (lowerAll.includes('real estate') || lowerAll.includes('property')) return 'Commercial Real Estate Purchase'
  if (lowerAll.includes('line of credit')) return 'Business Line of Credit'
  if (lowerAll.includes('expansion')) return 'Business Expansion'
  if (lowerAll.includes('acquisition')) return 'Business Acquisition'

  return trimmed
}

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

// Constants
const STEP_INDICES = {
  BUSINESS_INFO: 0,
  OWNERSHIP_INFO: 1,
  FINANCIAL_INFO: 2,
  FUNDING_REQUEST: 3,
  DOCUMENT_UPLOAD: 4,
  DISCLOSURES: 5,
  FEDERAL_COMPLIANCE: 6,
  ATTESTATION: 7,
} as const

const INITIAL_LOADING_DELAY_MS = 700

// Federal compliance question keys for validation
const FEDERAL_COMPLIANCE_KEYS: (keyof FederalCompliance)[] = [
  'bankruptcy',
  'lawsuit',
  'federalLoanDefault',
  'federalDebtDelinquent',
  'criminalOffense',
  'paroleProbation',
  'suspendedDebarred',
  'judgmentsLiensBusiness',
  'judgmentsLiensOwner',
]

export default function FundApplication() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const [fundingSequenceId, setFundingSequenceId] = useState<string | number | null>(null)
  const [fundingRequestId, setFundingRequestId] = useState<string | number | null>(null)

  const [activeStep, setActiveStep] = useState<number>(STEP_INDICES.BUSINESS_INFO)
  const [highestVisitedStep, setHighestVisitedStep] = useState<number>(STEP_INDICES.BUSINESS_INFO)
  const [loading, setLoading] = useState(true)
  const [isNavigatingSave, setIsNavigatingSave] = useState(false)
  const [mobileOpenIdx, setMobileOpenIdx] = useState<number | null>(STEP_INDICES.BUSINESS_INFO)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const activeStepSaveRef = React.useRef<(() => Promise<boolean>) | null>(null)

  // Co-borrower hook
  const {
    coBorrowers,
    setCoBorrowers,
    coDraft,
    setCoDraft,
    addCoBorrower,
    submitCoBorrower,
    deleteCoBorrower,
    editCoBorrower,
    isEditing,
    editIndex,
  } = useCoBorrowers()

  // Form State
  const [personal, setPersonal] = useState<PersonalInfo>({
    fullName: '',
    businessName: '',
    email: '',
    phoneCountry: 'USA (+1)',
    phoneNumber: '',
  })

  const [business, setBusiness] = useState<BusinessDetails>({
    businessName: '',
    businessAddress: '',
    city: '',
    state: '',
    incorporationState: '',
    zip: '',
    industryType: '',
    entityType: '',
    yearsInBusiness: '',
    employees: '',
  })

  const [owner, setOwner] = useState<OwnerInfo>({
    firstName: '',
    lastName: '',
    dob: '',
    ssn: '',
    citizenship: '',
    streetAddress: '',
    country: 'United States',
    city: '',
    state: '',
    zip: '',
    ownershipPct: '',
    hasCoBorrower: false,
    phoneNumber: '',
  })

  // What the owner and the other co-borrowers already hold - the one being
  // edited is left out - so adding a co-borrower is refused when the share
  // would pass 100%, not only at Save & Next (BUG-108).
  const otherOwnershipTotal = (Number(owner.ownershipPct) || 0) +
    coBorrowers.reduce((sum, cb, idx) => (idx === editIndex ? sum : sum + (Number(cb.ownershipPct) || 0)), 0)

  const [financial, setFinancial] = useState<FinancialInfo>({
    monthlyRevenue: '',
    annualRevenue: '',
    bankName: '',
    checkingStartDate: '',
    personalCreditScore: '',
    businessCreditScore: '',
    existingDebt: false,
    debtBalance: '',
  })

  const [funding, setFunding] = useState<FundingRequest>({
    requestedAmount: '',
    purpose: '',
    approvedFunding: '',
    fundingType: '',
    additionalFundingTypes: [],
    timeframe: '',
    collateral: '',
    purposeNote: '',
  })

  // Initialize funding state from location.state & query params
  useEffect(() => {
    const state = location.state as any;
    const searchParams = new URLSearchParams(window.location.search);
    const seqId = state?.funding_sequence_id ?? state?.fundingSequenceId ?? searchParams.get('funding_sequence_id') ?? searchParams.get('fundingSequenceId');
    const reqId = id ?? state?.funding_request_id ?? state?.fundingRequestId ?? searchParams.get('funding_request_id') ?? searchParams.get('fundingRequestId');

    if (seqId) setFundingSequenceId(seqId);
    if (reqId) setFundingRequestId(reqId);

    if (state && (state.purpose || state.approved_funding || state.requested_amount || state.funding_type)) {
      setFunding(prev => {
        let matchedPurpose = state.purpose ? matchPurpose(state.purpose) : prev.purpose;

        return {
          ...prev,
          purpose: matchedPurpose,
          approvedFunding: state.approved_funding || prev.approvedFunding,
          requestedAmount: state.requested_amount ? formatCurrency(state.requested_amount) : prev.requestedAmount,
          fundingType: state.funding_type || prev.fundingType,
        };
      })
    }
  }, [location.state, id])

  const [federal, setFederal] = useState<FederalCompliance>({
    legalBusinessName: '',
    ein: '',
    country: '',
    ofacResult: '',
    patriotActAck: false,
    fcraAuth: false,
    ecoaAck: false,
    bankruptcy: 'no',
    lawsuit: 'no',
    federalLoanDefault: 'no',
    federalDebtDelinquent: 'no',
    criminalOffense: 'no',
    paroleProbation: 'no',
    suspendedDebarred: 'no',
    judgmentsLiensBusiness: 'no',
    judgmentsLiensOwner: 'no',
    explanation: '',
  })

  const [disclosure, setDisclosure] = useState<DisclosureConsent>({
    agreeTerms: false,
    creditCheckConsent: false,
    eSignConsent: false,
    authorizeVerification: false,
    marketingOptIn: false,
  })

  // Fetch funding request and documents (tab-wise lazy loading)
  const currentReqId = fundingRequestId || id || null
  const { data: fundingData, isLoading: isFundingDataLoading } = useFundingRequest(currentReqId, { enabled: !!currentReqId })
  const fundingApplicationId = fundingData?.id ?? null
  const { data: documentsData } = useFundingApplicationDocuments(fundingApplicationId, {
    enabled: !!fundingApplicationId,
  })

  // Whether an edit currently costs the borrower their signature is the API's
  // call, not a status list held here - the server decides it and enforces it.
  // Feed it to the gate the step saves wait on, and clear the gate on unmount so
  // a stale flag cannot follow the partner to another borrower's application.
  //
  // Only a loaded application can answer. The request id changes type once the
  // application arrives, which refetches it; treating that gap as "not signed"
  // let saves through unasked and dismissed a dialog that had just opened.
  useEffect(() => {
    if (!fundingData) return
    setEditRequiresConfirmation(Boolean(fundingData.edit_needs_confirmation ?? fundingData.edit_requires_resign), fundingData.id)
  }, [fundingData])

  // Until the application has loaded, the flag above is only a default. Saves
  // wait on this, so one fired early still gets the dialog.
  useEffect(() => {
    setEditConfirmationResolving(isFundingDataLoading)
  }, [isFundingDataLoading])

  useEffect(() => () => resetEditConfirmation(), [])

  // Synchronize funding data when fetched from API
  useEffect(() => {
    if (fundingData) {
      const rawAmount = fundingData.requested_amount
      const parsedAmount = rawAmount ? formatCurrency(rawAmount) : ''
      const rawPurpose = fundingData.purpose_of_funds
      const resolvedPurpose = matchPurpose(rawPurpose)
      const resolvedApproved = fundingData.approved_funding || ''
      const resolvedType = fundingData.preferred_funding_type || ''
      const resolvedTimeframe = matchTimeframe(fundingData.timeframe_needed)

      setFunding({
        requestedAmount: parsedAmount,
        purpose: resolvedPurpose,
        approvedFunding: resolvedApproved,
        fundingType: resolvedType,
        additionalFundingTypes: withoutPreferredFundingType(fundingData.additional_funding_types, resolvedType),
        timeframe: resolvedTimeframe,
        collateral: fundingData.collateral_available || '',
        purposeNote: fundingData.purpose_note || '',
      })

      if (fundingData.funding_sequence_id && !fundingSequenceId) {
        setFundingSequenceId(fundingData.funding_sequence_id)
      }
      if (fundingData.funding_request_id && !fundingRequestId) {
        setFundingRequestId(fundingData.funding_request_id)
      }
    }
  }, [fundingData])

  // Initial loading effect
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), INITIAL_LOADING_DELAY_MS)
    return () => clearTimeout(timer)
  }, [])

  // Sync mobile accordion with active step
  useEffect(() => {
    setMobileOpenIdx(activeStep)
  }, [activeStep])

  // Callback for steps to register their save function
  const registerSave = useCallback((fn: (() => Promise<boolean>) | null) => {
    activeStepSaveRef.current = fn
  }, [])

  // Validation: Check if business info step can proceed
  const canProceedFromBusinessInfo = useMemo((): boolean => {
    return Boolean(
      personal.fullName &&
      personal.businessName &&
      personal.email &&
      personal.phoneNumber &&
      business.businessName &&
      business.businessAddress &&
      business.city &&
      business.state &&
      business.incorporationState &&
      business.industryType &&
      business.entityType &&
      business.yearsInBusiness
    )
  }, [personal, business])
  // Validation: Check if a specific step is valid
  const isStepValid = useCallback(
    (stepIndex: number): boolean => {
      // Helper to check backend save state
      const checkBackendSaved = (idx: number) => {
        if (idx === STEP_INDICES.BUSINESS_INFO) return !!fundingData?.is_business_info_saved;
        if (idx === STEP_INDICES.OWNERSHIP_INFO) return !!fundingData?.is_ownership_info_saved;
        if (idx === STEP_INDICES.FINANCIAL_INFO) return !!fundingData?.is_financial_info_saved;
        if (idx === STEP_INDICES.FUNDING_REQUEST) return !!fundingData?.is_funding_request_saved;
        if (idx === STEP_INDICES.DOCUMENT_UPLOAD) return true;
        if (idx === STEP_INDICES.DISCLOSURES) return !!fundingData?.is_disclosures_saved;
        if (idx === STEP_INDICES.FEDERAL_COMPLIANCE) return !!fundingData?.is_federal_compliance_saved;
        return false;
      };

      // If we're not currently on this tab, it is ONLY valid if it has been saved in the backend.
      // This prevents unmounted tabs that happen to have valid pre-filled local state from bypassing the sequence.
      if (activeStep !== stepIndex) {
        return checkBackendSaved(stepIndex);
      }

      switch (stepIndex) {
        case STEP_INDICES.BUSINESS_INFO:
          return canProceedFromBusinessInfo

        case STEP_INDICES.OWNERSHIP_INFO:
          return Boolean(
            owner.firstName &&
            owner.lastName &&
            owner.dob &&
            owner.ssn &&
            owner.citizenship &&
            owner.streetAddress &&
            owner.city &&
            owner.state &&
            owner.ownershipPct
          )

        case STEP_INDICES.FINANCIAL_INFO: {
          const baseFieldsValid = Boolean(
            financial.monthlyRevenue && financial.checkingStartDate && financial.personalCreditScore
          )
          const debtFieldValid = !financial.existingDebt || Boolean(financial.debtBalance)
          return baseFieldsValid && debtFieldValid
        }

        case STEP_INDICES.FUNDING_REQUEST:
          return Boolean(
            funding.requestedAmount &&
            funding.purpose &&
            funding.fundingType &&
            (funding.purpose !== FUNDING_PURPOSE_OTHER || funding.purposeNote)
          )

        case STEP_INDICES.DOCUMENT_UPLOAD:
          // Document upload is optional (never blocks navigation)
          return true

        case STEP_INDICES.DISCLOSURES:
          return disclosureItems.every((item) => disclosure[item.key])

        case STEP_INDICES.FEDERAL_COMPLIANCE: {
          const anyYes = FEDERAL_COMPLIANCE_KEYS.some((key) => federal[key] === 'yes')
          const allAnswered = FEDERAL_COMPLIANCE_KEYS.every((key) => federal[key] === 'yes' || federal[key] === 'no')
          return allAnswered && (!anyYes || federal.explanation.trim().length > 0)
        }

        default:
          return false
      }
    },
    [canProceedFromBusinessInfo, owner, financial, funding, disclosure, federal]
  )

  const initializedRef = React.useRef(false)
  useEffect(() => {
    if (fundingData && !loading && !initializedRef.current) {
      const firstInvalid = tabs.findIndex((_, index) => !isStepValid(index))
      const initialHighest = firstInvalid === -1 ? tabs.length - 1 : firstInvalid
      setHighestVisitedStep(initialHighest)
      initializedRef.current = true
    }
  }, [fundingData, loading, isStepValid])

  useEffect(() => {
    setHighestVisitedStep(prev => Math.max(prev, activeStep))
  }, [activeStep])



  // Check if a step is complete (for progress display)
  const isStepComplete = useCallback(
    (stepIndex: number): boolean => {
      // If no funding application is saved yet, NO step is complete
      if (!fundingApplicationId) return false;

      // Helper to check if a step is explicitly saved in the database
      const isStepSaved = (idx: number) => {
        if (idx === STEP_INDICES.BUSINESS_INFO) return !!fundingData?.is_business_info_saved;
        if (idx === STEP_INDICES.OWNERSHIP_INFO) return !!fundingData?.is_ownership_info_saved;
        if (idx === STEP_INDICES.FINANCIAL_INFO) return !!fundingData?.is_financial_info_saved;
        if (idx === STEP_INDICES.FUNDING_REQUEST) return !!fundingData?.is_funding_request_saved;
        if (idx === STEP_INDICES.DISCLOSURES) return !!fundingData?.is_disclosures_saved;
        if (idx === STEP_INDICES.FEDERAL_COMPLIANCE) return !!fundingData?.is_federal_compliance_saved;
        return true;
      };

      // Enforce strict linear progression: a step cannot be complete if ANY previous step is unsaved
      for (let i = 0; i < stepIndex; i++) {
        if (!isStepSaved(i)) return false;
        // If we are currently on the tab, enforce validation
        if (activeStep === i && !isStepValid(i)) return false;
      }

      // Document upload shows checkmark if it has files or user progressed past this step
      if (stepIndex === STEP_INDICES.DOCUMENT_UPLOAD) {
        return Boolean((documentsData && documentsData.length > 0) || highestVisitedStep > STEP_INDICES.DOCUMENT_UPLOAD || activeStep > STEP_INDICES.DOCUMENT_UPLOAD)
      }

      if (!isStepSaved(stepIndex)) return false;
      if (activeStep === stepIndex && !isStepValid(stepIndex)) return false;

      return true;
    },
    [activeStep, highestVisitedStep, documentsData, isStepValid, fundingApplicationId, fundingData]
  )

  // Progress calculations
  const isApplicationSubmitted = Boolean(
      fundingData?.status &&
      fundingData.status !== FUNDING_APPLICATION_STATUS.ON_HOLD &&
      fundingData.status !== FUNDING_APPLICATION_STATUS.DRAFT
    )

  // const isApplicationSubmitted = fundingData?.status && !['Draft', 'On Hold', 'Pending'].includes(fundingData.status) ? true : false;

  const stepsTotal = tabs.length
  const completedCount = isApplicationSubmitted ? stepsTotal : tabs.reduce((acc, _, index) => acc + (isStepComplete(index) ? 1 : 0), 0)
  const progressPct = isApplicationSubmitted ? 100 : Math.round((completedCount / stepsTotal) * 100)
  // How far down the list a step may be opened: up to the first one that is not
  // complete (saved - the one without a tick), and never past it. This used to
  // ask only whether a step's fields looked valid, so a step whose form was
  // prefilled but never saved unlocked the one after it, which then showed dark
  // and clickable beside steps that were correctly greyed out.
  const firstIncompleteIdx = isApplicationSubmitted ? -1 : tabs.findIndex((_, index) => !isStepComplete(index))
  // Open steps are the complete ones (ticked) and the one being worked on.
  // Every other step is greyed out - including the very next one - until the
  // step before it has been saved. The way forward is Save & Next.
  const lastCompleteIdx = firstIncompleteIdx === -1 ? stepsTotal - 1 : firstIncompleteIdx - 1
  const maxAllowedIdx = isApplicationSubmitted
    ? stepsTotal - 1
    : Math.max(activeStep, lastCompleteIdx)

  // Handle tab switching with auto-save
  const handleTabSwitch = useCallback(
    async (targetIndex: number) => {
      if (targetIndex === activeStep) return
      if (targetIndex > maxAllowedIdx) return

      // If navigating backwards, do not save
      if (targetIndex < activeStep) {
        setActiveStep(targetIndex)
        return
      }

      // If navigating forward, use the active step's save function to save and validate
      if (activeStepSaveRef.current) {
        setIsNavigatingSave(true)
        const success = await activeStepSaveRef.current()
        setIsNavigatingSave(false)
        if (success) {
          setActiveStep(targetIndex)
        }
        return
      }

      // Fallback
      setActiveStep(targetIndex)
    },
    [activeStep, maxAllowedIdx]
  )

  // Handle mobile accordion click
  const handleMobileTabClick = useCallback(
    (targetIndex: number) => {
      if (targetIndex > maxAllowedIdx) return

      // Toggle accordion if clicking the same tab
      if (mobileOpenIdx === targetIndex) {
        setMobileOpenIdx(null)
        return
      }

      // Switch to the new tab
      handleTabSwitch(targetIndex)
    },
    [mobileOpenIdx, maxAllowedIdx, handleTabSwitch]
  )

  // Common props for step components
  const commonStepProps = useMemo(
    () => ({
      loading,
      onNext: () => {
        if (activeStep === tabs.length - 1) {
          navigate('/')
        } else {
          setActiveStep(activeStep + 1)
        }
      },
      onBack: () => handleTabSwitch(activeStep - 1),
      onRegisterSave: registerSave,
      nextLabel: activeStep === tabs.length - 1 ? 'Save & Notify Borrower' : undefined,
    }),
    [loading, activeStep, handleTabSwitch, registerSave, navigate]
  )

  // Render the current step content
  const renderStep = (stepIndex: number, isActive: boolean = true): React.ReactNode => {
    switch (stepIndex) {
      case STEP_INDICES.BUSINESS_INFO:
        return (
          <BusinessInformationStep
            personal={personal}
            setPersonal={setPersonal}
            business={business}
            setBusiness={setBusiness}
            canProceed={canProceedFromBusinessInfo}
            onNext={() => setActiveStep(STEP_INDICES.OWNERSHIP_INFO)}
            loading={loading}
            onRegisterSave={isActive ? registerSave : undefined}
            fundingSequenceId={fundingSequenceId}
            fundingRequestId={fundingRequestId || id}
          />
        )

      case STEP_INDICES.OWNERSHIP_INFO:
        return (
          <OwnershipInformationStep
            owner={owner}
            setOwner={setOwner}
            coBorrowers={coBorrowers}
            setCoBorrowers={setCoBorrowers}
            onDeleteCoBorrower={deleteCoBorrower}
            onShowCoModal={addCoBorrower}
            coDraft={coDraft}
            setCoDraft={setCoDraft}
            onAddCoBorrower={submitCoBorrower}
            onEditCoBorrower={editCoBorrower}
            isValid={isStepValid(STEP_INDICES.OWNERSHIP_INFO)}
            fundingSequenceId={fundingSequenceId}
            fundingRequestId={fundingRequestId || id}
            {...commonStepProps}
            onRegisterSave={isActive ? registerSave : undefined}
          />
        )

      case STEP_INDICES.FINANCIAL_INFO:
        return (
          <FinancialInformationStep
            financial={financial}
            setFinancial={setFinancial}
            fundingSequenceId={fundingSequenceId}
            fundingRequestId={fundingRequestId || id}
            {...commonStepProps}
            onRegisterSave={isActive ? registerSave : undefined}
          />
        )

      case STEP_INDICES.FUNDING_REQUEST:
        return (
          <FundingRequestStep
            funding={funding}
            setFunding={setFunding}
            fundingSequenceId={fundingSequenceId}
            fundingRequestId={fundingRequestId || id}
            {...commonStepProps}
            onRegisterSave={isActive ? registerSave : undefined}
          />
        )

      case STEP_INDICES.DOCUMENT_UPLOAD:
        return (
          <DocumentUploadStep
            fundingSequenceId={fundingSequenceId}
            fundingRequestId={fundingRequestId || id}
            fundingApplicationId={fundingApplicationId}
            {...commonStepProps}
            onRegisterSave={isActive ? registerSave : undefined}
          />
        )

      case STEP_INDICES.DISCLOSURES:
        return (
          <DisclosuresStep
            disclosure={disclosure}
            setDisclosure={setDisclosure}
            disclosureItems={disclosureItems}
            fundingRequestId={fundingRequestId || id}
            {...commonStepProps}
            onRegisterSave={isActive ? registerSave : undefined}
          />
        )

      case STEP_INDICES.FEDERAL_COMPLIANCE:
        return (
          <FederalComplianceStep
            federal={federal}
            setFederal={setFederal}
            isValid={isStepValid(STEP_INDICES.FEDERAL_COMPLIANCE)}
            fundingRequestId={fundingRequestId || id}
            {...commonStepProps}
            onRegisterSave={isActive ? registerSave : undefined}
          />
        )

      default:
        return null
    }
  }

  // Render step badge (number or checkmark)
  const renderStepBadge = (stepIndex: number, isCompleted: boolean) => {
    // Active step never shows a checkmark visually (it shows its number highlighted)
    const showCheckmark = isCompleted && stepIndex !== activeStep;
    return (
      <span className={`sidebar-step-badge ${showCheckmark ? 'completed' : ''}`}>
        {showCheckmark ? <i className="ri-check-line"></i> : stepIndex + 1}
      </span>
    )
  }

  // Render progress header
  const renderProgressHeader = (className?: string) => (
    <div className={className}>
      <div className="d-flex align-items-center">
        <i className="ri-checkbox-circle-line text-success me-2"></i>
        <span className="fw-semibold fs-15">Application Progress</span>
        <span className="ms-auto progress-badge">{progressPct}%</span>
      </div>
      <div className="small text-muted">
        Completed {completedCount} of {stepsTotal} steps
      </div>
      <progress className="progress-micro" value={completedCount} max={stepsTotal}></progress>
    </div>
  )

  return (
    <div className="page-content fundapplication-page funding-wizard-page">
      <div className="container-fluid min-vh-70 pt-4">
        {/* Page Header */}
        <div className="text-center mb-4">
          <h4 className="mb-1">
            {completedCount > 0 ? 'Complete' : 'Start'} Your Business Funding Application
            {funding.approvedFunding && ` (${funding.approvedFunding.replace(/\s+Application$/i, '')})`}
          </h4>
          <div className="text-muted">
            {funding.approvedFunding
              ? (completedCount > 0
                  ? 'Please complete the final steps below to process your approved funding request and finalize your funds.'
                  : 'Please complete the steps below to start processing your approved funding sequence and finalize your funds.')
              : (completedCount > 0
                  ? 'Please complete the remaining steps below to finalize your business funding application.'
                  : 'Apply now to unlock working capital, equipment financing, SBA loans, or credit-building options tailored to your goals.')}
          </div>
        </div>

        <div className="row">
          {/* Desktop Sidebar */}
          <div className="col-xl-3 col-lg-4 mb-3 d-none d-lg-block">
            <div className="card">
              <div className="card-body p-0 position-relative">
                {renderProgressHeader('px-2 py-2 border-bottom')}

                <ul className="side-tabs list-unstyled m-0">
                  {tabs.map((label, idx) => {
                    const isCompleted = isStepComplete(idx)
                    const isActive = activeStep === idx
                    const isDisabled = idx > maxAllowedIdx || isNavigatingSave

                    return (
                      <li key={label} className="sidebar-li">
                        <button
                          type="button"
                          className={`side-tab d-flex align-items-center w-100 text-start py-2 px-3 sidebar-step-btn ${isActive ? 'active-step' : ''} ${idx > maxAllowedIdx ? 'disabled' : ''}`}
                          disabled={isDisabled}
                          onClick={() => handleTabSwitch(idx)}
                        >
                          {renderStepBadge(idx, isCompleted)}
                          <span className="fw-semibold sidebar-step-label">{label}</span>
                          {isActive && <span className="sidebar-step-notch show"></span>}
                          {isActive && isNavigatingSave && (
                            <span className="ms-auto spinner-border spinner-border-sm text-white"></span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          </div>

          {/* Desktop Content */}
          <div className="col-xl-9 col-lg-8 d-none d-lg-block">
            <div className="card">
              <div className="card-header d-flex align-items-center">
                <span className="fw-semibold fs-15">
                  Step {activeStep + 1} of {stepsTotal}: {tabs[activeStep]}
                </span>
              </div>
              <div className="card-body">
                {tabs.map((_, idx) => (
                  <div key={idx} style={{ display: activeStep === idx ? 'block' : 'none' }}>
                    {renderStep(idx, activeStep === idx)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile Accordion */}
          <div className="col-12 d-block d-lg-none">
            <div className="card">
              <div className="card-body p-0">
                {renderProgressHeader('px-3 py-2 border-bottom progress-section')}

                <ul className="list-unstyled m-0">
                  {tabs.map((label, idx) => {
                    const isCompleted = isStepComplete(idx)
                    const isActive = activeStep === idx
                    const isDisabled = idx > maxAllowedIdx || isNavigatingSave
                    const isOpen = mobileOpenIdx === idx

                    return (
                      <li key={label} className="border-bottom">
                        <button
                          type="button"
                          className={`w-100 d-flex align-items-center text-start p-3 side-tab sidebar-step-btn ${isActive ? 'active-step' : ''} ${idx > maxAllowedIdx ? 'disabled' : ''}`}
                          disabled={isDisabled}
                          onClick={() => handleMobileTabClick(idx)}
                        >
                          {renderStepBadge(idx, isCompleted)}
                          <span className="align-middle fw-semibold">{label}</span>
                          {isActive && isNavigatingSave && (
                            <span className="ms-2 spinner-border spinner-border-sm text-white"></span>
                          )}
                          <i className={`ri-arrow-${isOpen ? 'up' : 'down'}-s-line ms-auto`}></i>
                        </button>
                        <div className="p-3" style={{ display: isOpen ? 'block' : 'none' }}>
                          {renderStep(idx, isOpen)}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      <CoBorrowerModal
        coDraft={coDraft}
        setCoDraft={setCoDraft}
        onSubmit={(e) => {
          submitCoBorrower(e)
          // An added co-borrower always shows in the list (BUG-108).
          setOwner((prev) => ({ ...prev, hasCoBorrower: true }))
        }}
        isEditing={isEditing}
        otherOwnershipTotal={otherOwnershipTotal}
      />
      {/* Rendered once for the whole wizard: every step's save waits on it. */}
      <EditConfirmationModal status={fundingData?.status} awaitingResign={Boolean(fundingData?.requires_resign)} />
    </div>
  )
}
