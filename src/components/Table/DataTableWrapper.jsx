import React from 'react'
import { DataTable as PrimeDataTable } from '@primereact/datatable'
import { Skeleton } from 'primereact/skeleton'

export const DataTable = (props) => {
  const { value, loading, className } = props
  const showSkeleton = !!loading

  if (showSkeleton) {
    const count = typeof props.rows === 'number' ? props.rows : 20
    return (
      <div className={className || ''}>
        <div className="p-3">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="d-flex align-items-center gap-3 py-2 border-bottom">
              <Skeleton width="20%" height="2.5rem" />
              <Skeleton width="15%" height="2.5rem" />
              <Skeleton width="25%" height="2.5rem" />
              <Skeleton width="15%" height="2.5rem" />
              <Skeleton width="15%" height="2.5rem" />
              <Skeleton width="20%" height="2.5rem" />
              <Skeleton width="12%" height="2.5rem" />
              <Skeleton width="10%" height="2.5rem" />
              <Skeleton width="18%" height="2.5rem" />
              <Skeleton width="14%" height="2.5rem" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return <PrimeDataTable {...props} />
}