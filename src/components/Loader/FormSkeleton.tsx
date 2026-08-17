import React from 'react'

type FormSkeletonProps = {
  fieldCount?: number
}

export default function FormSkeleton({ fieldCount = 6 }: FormSkeletonProps) {
  const fields = Array.from({ length: fieldCount }, (_, i) => i)
  
  return (
    <form className="row g-3">
      {fields.map((i) => (
        <div className="col-md-6" key={i}>
          <div className="skeleton-line" style={{ height: 16, width: 80 + (i * 20) % 100, marginBottom: 8 }}></div>
          <div className="skeleton-line" style={{ height: 38, borderRadius: 6 }}></div>
        </div>
      ))}
      <div className="col-12 d-flex justify-content-between mt-4">
        <div className="skeleton-line" style={{ height: 38, width: 100, borderRadius: 6 }}></div>
        <div className="skeleton-line" style={{ height: 38, width: 100, borderRadius: 6 }}></div>
      </div>
    </form>
  )
}