import React from 'react'
import { tabs } from '../../types'

type ProgressHeaderProps = {
  active: number
  progressPct: number
  stepsTotal: number
}

export default function ProgressHeader({ active, progressPct, stepsTotal }: ProgressHeaderProps) {
  return (
    <div className="card-header d-flex align-items-center">
      <span className="fw-semibold fs-15">
        Step {active + 1} of {stepsTotal}: {tabs[active]}
      </span>
      <span className="ms-auto badge bg-primary">{progressPct}%</span>
    </div>
  )
}
