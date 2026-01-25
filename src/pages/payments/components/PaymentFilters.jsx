import React from 'react';
import { Dropdown } from 'primereact/dropdown';
import Flatpickr from 'react-flatpickr';
import { PAYMENT_STATUS_OPTIONS, PAYMENT_CYCLE_OPTIONS } from '../../../config/paymentConfig';

export default function PaymentFilters({
    searchText, setSearchText,
    selectedStatus, setSelectedStatus,
    selectedPayee, setSelectedPayee,
    selectedCycle, setSelectedCycle,
    dateRange, setDateRange,
    onApply,
    onClear
}) {

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

            <div className="col-xxl-3 col-md-2">
                <Dropdown
                    value={selectedStatus}
                    options={PAYMENT_STATUS_OPTIONS}
                    onChange={(e) => setSelectedStatus(e.value)}
                    placeholder="All Status"
                    className="w-100"
                />
            </div>

            <div className="col-xxl-3 col-md-2">
                <Dropdown
                    value={selectedCycle}
                    options={PAYMENT_CYCLE_OPTIONS}
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
                 <button type="button" className="btn btn-default flex-grow-1"  onClick={onClear}>
                    <i className="ri-close-line me-1 align-bottom"></i> Clear
                </button>
            </div>
        </div>
    );
}
