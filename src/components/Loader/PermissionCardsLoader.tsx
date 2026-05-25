import React from 'react'

export default function PermissionCardsLoader() {
  return (
    <div className="permissions-list-wrapper mt-2">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div className="card shadow-none border mb-3" key={`perm-skel-${idx}`}>
          <div className="card-header bg-light-subtle bg-opacity-75 border-bottom d-flex flex-wrap align-items-center justify-content-between p-3">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className="skeleton-line sk-w-28 sk-h-28 sk-rounded-circle"></span>
              <span className="skeleton-line sk-w-160 sk-h-16"></span>
              <span className="skeleton-line sk-w-140 sk-h-14"></span>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="skeleton-line sk-w-80 sk-h-14"></span>
              <span className="skeleton-line sk-w-45 sk-h-24 rounded-pill"></span>
            </div>
          </div>
          <div className="card-body p-3">
            <div className="d-flex flex-wrap gap-3">
              {Array.from({ length: 5 }).map((_, pIdx) => (
                <div className="d-flex align-items-center gap-2 py-1 me-4" key={`perm-skel-p-${pIdx}`}>
                  <span className="skeleton-line sk-w-20 sk-h-20 rounded"></span>
                  <span className="skeleton-line sk-w-100 sk-h-14"></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}