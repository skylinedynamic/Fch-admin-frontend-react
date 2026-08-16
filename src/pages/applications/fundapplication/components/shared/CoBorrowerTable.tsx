import React from 'react'
import type { CoBorrower } from '../../types'

type CoBorrowerTableProps = {
  coBorrowers: CoBorrower[]
  onDelete: (idx: number) => void
  onAdd: () => void
  onEdit?: (idx: number) => void
}

export default function CoBorrowerTable({ coBorrowers, onDelete, onAdd, onEdit }: CoBorrowerTableProps) {
  return (
    <div className="card coborrower-card">
      <div className="card-header d-flex align-items-center">
        <span className="card-title fw-semibold">Co-Borrowers</span>
        
        <span className="ms-auto btn-add-coborrower cursor-pointer text-primary" onClick={onAdd}>
          + Add More
        </span>
        
      </div>
      <div className="card-body">
        <div className="table-responsive">
          <table className="table coborrower-table">
            <thead className="coborrower-thead">
              <tr>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Role</th>
                <th>Email</th>
                <th>Mobile Phone</th>
                <th>Ownership %</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {coBorrowers.map((cb, idx) => (
                <tr key={`${cb.firstName}-${cb.lastName}-${idx}`} className="coborrower-row">
                  <td data-label="First Name">{cb.firstName}</td>
                  <td data-label="Last Name">{cb.lastName}</td>
                  <td data-label="Role">{cb.role}</td>
                  <td data-label="Email">{cb.email}</td>
                  <td data-label="Mobile Phone">{cb.mobilePhone}</td>
                  <td data-label="Ownership">{cb.ownershipPct ? `${cb.ownershipPct}%` : ''}</td>
                  <td data-label="Action" className="text-end">
                    <div className="d-flex gap-2 justify-content-end">
                      {onEdit && (
                        <button
                          type="button"
                          className="btn btn-sm btn-soft-primary"
                          onClick={() => onEdit(idx)}
                          aria-label="Edit"
                        >
                          <i className="ri-pencil-line me-1"></i>
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-sm btn-soft-danger"
                        onClick={() => onDelete(idx)}
                        aria-label="Delete"
                      >
                        <i className="ri-delete-bin-line me-1"></i>
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {coBorrowers.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted">
                    No co-borrowers added
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
