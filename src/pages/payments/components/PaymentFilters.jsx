import React from 'react';
import { Dropdown } from 'primereact/dropdown';
import Flatpickr from 'react-flatpickr';

export default function PaymentFilters({
    searchText, setSearchText,
    selectedStatus, setSelectedStatus,
    selectedPayee, setSelectedPayee,
    selectedCycle, setSelectedCycle,
    dateRange, setDateRange,
    onApply,
    onClear
}) {
    const statusOptions = [
        { label: 'All Status', value: null },
        { label: 'Success', value: 'SUCCESS' },
        { label: 'Pending', value: 'PENDING' },
        { label: 'Failed', value: 'FAILED' },
        { label: 'Disputed', value: 'DISPUTED' }
    ];

    const payeeOptions = [
        { label: 'All Payees', value: null },
        // These would normally be fetched from API, but for now we'll keep it static or empty
    ];

    const cycleOptions = [
        { label: 'All Cycle', value: null },
        { label: 'Daily', value: 'Daily' },
        { label: 'Weekly', value: 'Weekly' },
        { label: 'Monthly', value: 'Monthly' },
        { label: 'Yearly', value: 'Yearly' }
    ];

    return (
        <div className="row g-3 mb-4">
            <div className="col-xxl-3 col-md-4">
                <div className="input-group">
                    <Flatpickr
                        className="form-control"
                        placeholder="Select Date Range"
                        options={{
                            mode: "range",
                            dateFormat: "d M, Y",
                        }}
                        value={dateRange}
                        onChange={(date) => setDateRange(date)}
                    />
                    <span className="input-group-text bg-primary text-white">
                        <i className="ri-calendar-2-line"></i>
                    </span>
                </div>
            </div>

            <div className="col-xxl-2 col-md-2">
                <Dropdown
                    value={selectedStatus}
                    options={statusOptions}
                    onChange={(e) => setSelectedStatus(e.value)}
                    placeholder="All Status"
                    className="w-100"
                />
            </div>

            <div className="col-xxl-2 col-md-2">
                <Dropdown
                    value={selectedPayee}
                    options={payeeOptions}
                    onChange={(e) => setSelectedPayee(e.value)}
                    placeholder="All Payees"
                    className="w-100"
                />
            </div>

            <div className="col-xxl-2 col-md-2">
                <Dropdown
                    value={selectedCycle}
                    options={cycleOptions}
                    onChange={(e) => setSelectedCycle(e.value)}
                    placeholder="All Cycle"
                    className="w-100"
                />
            </div>

            <div className="col-xxl-3 col-md-2 d-flex gap-2">
                <button 
                    type="button" 
                    className="btn btn-warning flex-grow-1"
                    onClick={onApply}
                >
                    <i className="ri-equalizer-fill me-1 align-bottom"></i> Filters
                </button>
                <button 
                    type="button" 
                    className="btn btn-light"
                    onClick={onClear}
                >
                    <i className="ri-refresh-line"></i>
                </button>
            </div>
        </div>
    );
}
