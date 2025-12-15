import React from 'react'

interface SkeletonLoaderProps {
  viewMode: 'grid' | 'list'
  count?: number
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ viewMode, count = 20 }) => {
  if (viewMode === 'grid') {
    return (
      <div className="fm-skeleton-grid">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="fm-skeleton-grid-item">
            <div className="fm-skeleton fm-skeleton-icon" />
            <div className="fm-skeleton fm-skeleton-text" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="fm-skeleton-list">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="fm-skeleton-list-item">
          <div className="fm-skeleton-list-cell">
            <div className="fm-skeleton fm-skeleton-icon-small" />
            <div className="fm-skeleton fm-skeleton-text-small" />
          </div>
          <div className="fm-skeleton-list-cell">
            <div className="fm-skeleton fm-skeleton-text-medium" />
          </div>
          <div className="fm-skeleton-list-cell">
            <div className="fm-skeleton fm-skeleton-text-short" />
          </div>
        </div>
      ))}
    </div>
  )
}
