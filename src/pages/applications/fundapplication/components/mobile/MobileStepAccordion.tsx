import React from 'react'
import { tabs } from '../../types'

type MobileStepAccordionProps = {
  active: number
  mobileOpenIdx: number | null
  completedCount: number
  progressPct: number
  maxAllowedIdx: number
  isStepComplete: (idx: number) => boolean
  onStepClick: (idx: number) => void
  setMobileOpenIdx: (idx: number | null) => void
  renderStep: (idx: number) => React.ReactNode
}

export default function MobileStepAccordion({
  active,
  mobileOpenIdx,
  completedCount,
  progressPct,
  maxAllowedIdx,
  isStepComplete,
  onStepClick,
  setMobileOpenIdx,
  renderStep,
}: MobileStepAccordionProps) {
  const stepsTotal = tabs.length

  return (
    <div className="col-12 d-block d-lg-none">
      <div className="card">
        <div className="card-body p-0">
          <div className="px-3 py-2 border-bottom progress-section">
            <div className="d-flex align-items-center">
              <i className="ri-checkbox-circle-line text-success me-2"></i>
              <span className="fw-semibold progress-title">Application Progress</span>
              <span className="ms-auto progress-badge">{progressPct}%</span>
            </div>
            <div className="progress-subtitle text-muted">
              Completed {completedCount} of {stepsTotal} steps
            </div>
            <progress className="progress-micro" value={completedCount} max={stepsTotal}></progress>
          </div>
          <ul className="list-unstyled m-0">
            {tabs.map((label, idx) => {
              const isCompleted = isStepComplete(idx)
              const isActive = active === idx
              return (
                <li key={label} className="border-bottom">
                  <button
                    type="button"
                    className={`w-100 d-flex align-items-center text-start p-3 side-tab sidebar-step-btn ${
                      isActive ? 'active-step' : ''
                    } ${idx > maxAllowedIdx ? 'disabled' : ''}`}
                    disabled={idx > maxAllowedIdx}
                    onClick={() => {
                      if (idx > maxAllowedIdx) return
                      if (mobileOpenIdx === idx) {
                        setMobileOpenIdx(null)
                        return
                      }
                      onStepClick(idx)
                      setMobileOpenIdx(idx)
                    }}
                  >
                    <span className={`sidebar-step-badge ${isCompleted ? 'completed' : ''}`}>
                      {isCompleted ? <i className="ri-check-line"></i> : idx + 1}
                    </span>
                    <span className="align-middle fw-semibold">{label}</span>
                    <i className={`ri-arrow-${mobileOpenIdx === idx ? 'up' : 'down'}-s-line ms-auto`}></i>
                  </button>
                  {mobileOpenIdx === idx && <div className="p-3">{renderStep(idx)}</div>}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
