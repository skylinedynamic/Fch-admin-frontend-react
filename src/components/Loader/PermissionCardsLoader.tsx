import React from 'react'

export default function PermissionCardsLoader() {
  const pillColor = 'var(--vz-dark)'
  const outlinePill = {
    color: '#b4b4b4ff',
    borderColor: '#b4b4b4ff',
    borderWidth: '2px',
  } as React.CSSProperties
  return (
    <div className="row g-3 module-grid">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div className="col-xl-6 col-lg-6" key={`perm-skel-${idx}`}>
          <div className="module-card perm-section module-accent open rounded-3">
            <div className="module-header placeholder-glow">
              <div className="title-wrap d-flex align-items-center justify-content-between w-100">
                <span
                  className="placeholder rounded-pill border"
                  style={{ width: 'clamp(160px, 40%, 520px)', height: '1.25rem', ...outlinePill }}
                ></span>
                <div className="d-flex align-items-center gap-2">
                  <span
                    className="placeholder rounded-pill border"
                    style={{ width: 'clamp(60px, 12%, 100px)', height: '1rem', ...outlinePill }}
                  ></span>
                  <span
                    className="placeholder rounded-pill border"
                    style={{ width: 'clamp(50px, 10%, 80px)', height: '1rem', ...outlinePill }}
                  ></span>
                  <span
                    className="placeholder rounded-circle border"
                    style={{ width: '24px', height: '24px', ...outlinePill }}
                  ></span>
                </div>
              </div>
            </div>
            <div className="module-body" style={{ height: 'auto', opacity: 1 }}>
              <div className="perm-grid placeholder-glow">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={`perm-skel-pill-${i}`}>
                    <span
                      className="placeholder rounded-pill border"
                      style={{ display: 'block', width: '80%', height: '1.6rem', ...outlinePill }}
                    ></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}