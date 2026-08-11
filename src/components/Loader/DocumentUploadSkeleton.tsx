import React from 'react'

export default function DocumentUploadSkeleton() {
  return (
    <div className="row g-3">
      <div className="col-12">
        <div className="accordion">
          {[1, 2, 3, 4].map((i) => (
            <div className="accordion-item" key={i}>
              <h2 className="accordion-header">
                <div className="accordion-button collapsed" style={{ pointerEvents: 'none', background: '#f9f9f9' }}>
                  <div className="skeleton-line" style={{ width: '30%', height: 18, borderRadius: 4 }}></div>
                </div>
              </h2>
            </div>
          ))}
        </div>
      </div>
      <div className="col-12 d-flex justify-content-between mt-3">
        <div className="skeleton-line" style={{ width: 100, height: 38, borderRadius: 6 }}></div>
        <div className="skeleton-line" style={{ width: 100, height: 38, borderRadius: 6 }}></div>
      </div>
    </div>
  )
}
