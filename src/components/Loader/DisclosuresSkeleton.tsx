import React from 'react'

type DisclosuresSkeletonProps = {
  count?: number
}

export default function DisclosuresSkeleton({ count = 2 }: DisclosuresSkeletonProps) {
  const fields = Array.from({ length: count }, (_, i) => i)

  return (
    <div className="row g-3">
      {fields.map((i) => (
        <div className="col-12" key={i}>
          <div className="d-flex align-items-center justify-content-between border rounded p-3">
            <div className="d-flex align-items-center flex-grow-1">
              <div className="skeleton-line sk-checkbox flex-shrink-0"></div>
              <div className="skeleton-line sk-text-50 flex-grow-1 me-2"></div>
            </div>
            <div className="skeleton-line sk-btn-sm flex-shrink-0"></div>
          </div>
        </div>
      ))}
      <div className="col-12 d-flex justify-content-between mt-2">
        <div className="skeleton-line sk-btn"></div>
        <div className="skeleton-line sk-btn"></div>
      </div>
    </div>
  )
}
