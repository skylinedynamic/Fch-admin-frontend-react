import React from 'react'

type StepNavigationProps = {
  onBack?: () => void
  onNext?: () => void
  isNextDisabled?: boolean
  isLastStep?: boolean
  loading?: boolean
  nextLabel?: string
}

export default function StepNavigation({ onBack, onNext, isNextDisabled, isLastStep, loading, nextLabel }: StepNavigationProps) {
  return (
    <div className="col-12 d-flex justify-content-between mt-2">
      {onBack ? (
        <button type="button" className="btn btn-warning" onClick={onBack} disabled={loading}>
          <i className="ri-arrow-left-line me-1"></i> Previous
        </button>
      ) : (
        <div></div>
      )}
      {onNext && (
        <button id="btn-save-next" type="button" className="btn btn-primary" disabled={isNextDisabled || loading} onClick={onNext}>
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              Submitting...
            </>
          ) : nextLabel ? (
            nextLabel
          ) : isLastStep ? (
            'Submit'
          ) : (
            <>
              Save & Next <i className="ri-arrow-right-line ms-1"></i>
            </>
          )}
        </button>
      )}
    </div>
  )
}
