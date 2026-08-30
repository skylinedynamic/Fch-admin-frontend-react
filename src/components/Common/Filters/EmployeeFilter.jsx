import React from 'react'

export default function EmployeeFilter({
  globalFilterValue,
  setGlobalFilterValue,
  statusFilter,
  setStatusFilter,
  deptFilter,
  setDeptFilter,
  departments,
  statusOptions,
  onApplyFilters,
  onClearFilters
}) {
  return (
    <form className="row g-3 mb-3">
      <div className="col-xxl-4 col-sm-12">
        <div className="search-box">
          <input
            type="text"
            className="form-control search bg-light border-light"
            placeholder="Search here..."
            value={globalFilterValue}
            onChange={(e) => setGlobalFilterValue(e.target.value)}
          />
          <i className="ri-search-line search-icon"></i>
        </div>
      </div>
      <div className="col-xxl-3 col-sm-4">
        <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Select Employee Status</option>
          {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
      <div className="col-xxl-3 col-sm-4">
        <select className="form-control" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
          <option value="">Select Department</option>
          {departments.map(d => <option key={d.id} value={d.department}>{d.department}</option>)}
        </select>
      </div>
      <div className="col-xxl-2 col-sm-4 d-flex gap-2">
        <button type="button" className="btn btn-warning flex-grow-1" onClick={onApplyFilters}>Filters</button>
        <button type="button" className="btn btn-outline-secondary flex-grow-1" onClick={onClearFilters}>Clear</button>
      </div>
    </form>
  )
}
