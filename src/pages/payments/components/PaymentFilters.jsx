import React from 'react';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { PAYMENT_STATUS_OPTIONS, PAYMENT_CYCLE_OPTIONS, PAYMENT_ENVIRONMENT_OPTIONS } from '../../../config/paymentConfig';
import FilterLoader from '../../../components/Loader/FilterLoader';

export default function PaymentFilters({
    searchText, setSearchText,
    selectedStatus, setSelectedStatus,
    selectedPayee, setSelectedPayee,
    selectedCycle, setSelectedCycle,
    dateRange, setDateRange,
    onApply,
    onClear,
    loading
}) {
    // Dynamic loader config for Payments
    const loaderConfig = [
        { col: 'col-xxl-4 col-sm-6' }, // Search
        { col: 'col-xxl-4 col-sm-6' }, // Date Range
        { col: 'col-xxl-2 col-sm-6' }, // Status
        { col: 'col-xxl-2 col-sm-12', isButton: true } // Buttons
    ];

    return (
        <form onSubmit={(e) => {
            e.preventDefault();
            onApply();
        }}>
            {loading ? (
                <FilterLoader config={loaderConfig} />
            ) : (
                <div className="row g-3 mb-3">
                    <div className="col-xxl-4 col-sm-6">
                        <div className="search-box">
                            <input
                                type="text"
                                className="form-control search bg-light border-light"
                                placeholder="Search here..."
                                autoComplete="off"
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        onApply();
                                    }
                                }}
                            />
                            <i className="ri-search-line search-icon"></i>
                        </div>
                    </div>

                    <div className="col-xxl-4 col-sm-6">
                        <div className="search-box">
                            <Calendar
                                value={dateRange}
                                onChange={(e) => setDateRange(e.value)}
                                selectionMode="range"
                                readOnlyInput
                                placeholder="Select Date Range"
                                className="w-100"
                                inputClassName="form-control search bg-light border-light"
                            />
                            <i className="ri-calendar-2-line search-icon"></i>
                        </div>
                    </div>

                    <div className="col-xxl-2 col-sm-6">
                        <Dropdown
                            value={selectedStatus}
                            options={PAYMENT_STATUS_OPTIONS}
                            onChange={(e) => setSelectedStatus(e.value)}
                            placeholder="All Status"
                            className="w-100 bg-light border-light"
                        />
                    </div>

                    <div className="col-xxl-2 col-sm-6 d-flex gap-2">
                        <button
                            type="button"
                            className="btn btn-warning flex-grow-1"
                            onClick={onApply}
                        >
                            <i className="ri-equalizer-fill me-1 align-bottom"></i> Filters
                        </button>
                        <button type="button" className="btn btn-default flex-grow-1" onClick={onClear}>
                            <i className="ri-close-line me-1 align-bottom"></i> Clear
                        </button>
                    </div>
                </div>
            )}
        </form>
    );
}
