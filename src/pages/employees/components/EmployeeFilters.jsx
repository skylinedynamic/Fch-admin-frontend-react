import React from 'react';
import { STATUS } from '../../../config';
import { Dropdown } from 'primereact/dropdown';

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
    // Transform status options
    const statusOptions = [
        { label: 'All Status', value: '' },
        ...STATUS
    ];

    // Transform department options
    const deptOptions = [
        { label: 'All Department', value: '' },
        ...departments.map(dept => ({ label: dept.name, value: dept.name }))
    ];

    return (
        <form onSubmit={(e) => {
            e.preventDefault();
            onApplyFilters();
        }}>
            <div className="row g-3 mb-3">
                <div className="col-xxl-4 col-sm-6">
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
                    <Dropdown
                        value={statusFilter}
                        onChange={(e) => onStatusChange({ target: { value: e.value } })}
                        options={statusOptions}
                        optionLabel="label"
                        optionValue="value"
                        placeholder="All Status"
                        className="w-100 bg-light border-light employee-filter-dropdown"
                    />
                </div>

                <div className="col-xxl-3 col-sm-4">
                    <Dropdown
                        value={deptFilter}
                        onChange={(e) => onDeptChange({ target: { value: e.value } })}
                        options={deptOptions}
                        optionLabel="label"
                        optionValue="value"
                        placeholder="All Department"
                        className="w-100 bg-light border-light employee-filter-dropdown"
                    />
                </div>

                <div className="col-xxl-2 col-sm-4">
                    <div className="d-flex gap-2">
                        <button type="button" className="btn btn-warning flex-grow-1" onClick={onApplyFilters}>
                            <i className="ri-equalizer-fill me-1 align-bottom"></i> Filters
                        </button>
                        <button type="button" className="btn btn-default flex-grow-1" onClick={onClearFilters}>
                            <i className="ri-close-line me-1 align-bottom"></i> Clear
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
}
