import React from 'react'
import { tabs } from '../../types'

type ProgressSidebarProps = {
  active: number
  completedCount: number
  progressPct: number
  maxAllowedIdx: number
  isStepComplete: (idx: number) => boolean
  onStepClick: (idx: number) => void
}

export default function ProgressSidebar({
  active,
  completedCount,
  progressPct,
  maxAllowedIdx,
  isStepComplete,
  onStepClick,
}: ProgressSidebarProps) {
  const stepsTotal = tabs.length

  return (
    <div className="card">
      <div className="card-body p-0 position-relative">
        <div className="px-2 py-2 border-bottom">
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
        <ul className="side-tabs list-unstyled m-0">
          {tabs.map((label, idx) => {
            const isCompleted = isStepComplete(idx)
            const isActive = active === idx
            return (
              <li key={label} className="sidebar-li">
                <button
                  type="button"
                  className={`side-tab d-flex align-items-center w-100 text-start py-2 px-3 sidebar-step-btn ${
                    isActive ? 'active-step' : ''
                  } ${idx > maxAllowedIdx ? 'disabled' : ''}`}
                  disabled={idx > maxAllowedIdx}
                  onClick={() => {
                    if (idx <= maxAllowedIdx) onStepClick(idx)
                  }}
                >
                  <span className={`sidebar-step-badge ${isCompleted ? 'completed' : ''}`}>
                    {isCompleted ? <i className="ri-check-line"></i> : idx + 1}
                  </span>
                  <span className="fw-semibold sidebar-step-label">{label}</span>
                  <span className={`sidebar-step-notch ${isActive ? 'show' : ''}`}></span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
