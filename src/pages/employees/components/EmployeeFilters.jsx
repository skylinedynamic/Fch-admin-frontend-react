import React from 'react';

export default function EmployeeFilters({
    globalFilterValue,
    onGlobalFilterChange,
    statusFilter,
    onStatusChange,
    deptFilter,
    onDeptChange,
    departments,
    onApplyFilters,
    onClearFilters
}) {
    return (
        <form onSubmit={(e) => {
            e.preventDefault();
            onApplyFilters();
        }}>
            <div className="row g-3 mb-3">
                <div className="col-xxl-4 col-sm-12">
                    <div className="search-box">
                        <input
                            type="text"
                            className="form-control search bg-light border-light"
                            autoComplete="off"
                            placeholder="Search here..."
                            value={globalFilterValue}
                            onChange={onGlobalFilterChange}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    onApplyFilters();
                                }
                            }}
                        />
                        <i className="ri-search-line search-icon"></i>
                    </div>
                </div>

                <div className="col-xxl-3 col-sm-4">
                    <div className="input-light">
                        <select
                            className="form-control"
                            data-choices
                            data-choices-search-false
                            name="choices-status"
                            id="idStatus"
                            value={statusFilter}
                            onChange={(e) => onStatusChange({ target: { value: e.target.value } })}
                        >
                            <option value="">Job Status</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                <div className="col-xxl-3 col-sm-4">
                    <div className="input-light">
                        <select
                            className="form-control"
                            data-choices
                            data-choices-search-false
                            name="choices-department"
                            id="idDepartment"
                            value={deptFilter}
                            onChange={(e) => onDeptChange({ target: { value: e.target.value } })}
                        >
                            <option value="">Select Department</option>
                            {departments.map((dept) => (
                                <option key={dept.name} value={dept.name}>
                                    {dept.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="col-xxl-2 col-sm-4">
                    <div className="d-flex gap-2">
                        <button type="button" className="btn btn-warning flex-grow-1" onClick={onApplyFilters}>
                            <i className="ri-equalizer-fill me-1 align-bottom"></i> Filters
                        </button>
                        <button type="button" className="btn btn-outline-secondary flex-grow-1" onClick={onClearFilters}>
                            <i className="ri-close-line me-1 align-bottom"></i> Clear
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
}
