import React from 'react'
import { DataTable as PrimeDataTable } from '@primereact/datatable'
import TableLoader from '../Loader/TableLoader'

export const DataTable = (props) => {
  const { value, loading, className, children } = props
  const showSkeleton = !!loading

  if (showSkeleton) {
    const count = typeof props.rows === 'number' ? props.rows : 20

    // Attempt to determine column count from children
    let columns = 6
    if (children) {
      if (Array.isArray(children)) {
        columns = children.length
      } else if (children.type) {
        // Single child
        columns = 1
      }
    }

    return (
      <div className={className || ''}>
        <TableLoader rows={count} columns={columns} />
      </div>
    )
  }

  return <PrimeDataTable {...props} />
}