import React from 'react'

export default function RolesGridLoader() {
  return (
    <div className="roles-grid">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div className="role-summary-card" key={`skeleton-${idx}`}>
          <div className="role-header placeholder-glow">
            <span className="placeholder col-6"></span>
            <span className="placeholder col-3"></span>
          </div>
          <p className="role-meta mb-2 placeholder-glow"><span className="placeholder col-8"></span></p>
          <ul className="bullet-list placeholder-glow">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={`bullet-${i}`}><span className="placeholder col-10"></span></li>
            ))}
          </ul>
          <div className="card-actions placeholder-glow d-flex gap-2">
            <span className="placeholder col-4"></span>
            <span className="placeholder col-4"></span>
          </div>
        </div>
      ))}
      <div className="add-role-card text-center placeholder-glow">
        <div className="mb-2"><span className="placeholder col-6"></span></div>
        <div className="mb-1"><span className="placeholder col-4"></span></div>
        <div><span className="placeholder col-5"></span></div>
      </div>
    </div>
  )
}