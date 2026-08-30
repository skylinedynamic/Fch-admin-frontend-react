import React from 'react';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import {
    PAYMENT_STATUS_OPTIONS,
    PAYMENT_ENVIRONMENT_OPTIONS,
    PAYMENT_METHOD_OPTIONS,
    PAYMENT_TYPE_OPTIONS
} from '../../../config/paymentConfig';

export default function PaymentFilters({
    searchText, setSearchText,
    selectedStatus, setSelectedStatus,
    selectedEnvironment, setSelectedEnvironment,
    selectedMethod, setSelectedMethod,
    selectedType, setSelectedType,
    selectedPayee, setSelectedPayee,
    selectedCycle, setSelectedCycle,
    dateRange, setDateRange,
    onApply,
    onClear,
    loading
}) {
    if (loading) {
        return (
            <div className="d-flex flex-wrap flex-xl-nowrap gap-2 align-items-center mb-3 w-100 fade-panel">
                <div className="flex-grow-1" style={{ minWidth: '150px' }}>
                    <div className="skeleton-line w-100 skeleton-filter-item"></div>
                </div>
                <div className="flex-grow-1" style={{ minWidth: '160px' }}>
                    <div className="skeleton-line w-100 skeleton-filter-item"></div>
                </div>
                <div className="flex-grow-1" style={{ minWidth: '130px' }}>
                    <div className="skeleton-line w-100 skeleton-filter-item"></div>
                </div>
                <div className="flex-grow-1" style={{ minWidth: '150px' }}>
                    <div className="skeleton-line w-100 skeleton-filter-item"></div>
                </div>
                <div className="flex-grow-1" style={{ minWidth: '160px' }}>
                    <div className="skeleton-line w-100 skeleton-filter-item"></div>
                </div>
                <div className="flex-grow-1" style={{ minWidth: '120px' }}>
                    <div className="skeleton-line w-100 skeleton-filter-item"></div>
                </div>
                <div className="d-flex gap-1 flex-shrink-0" style={{ minWidth: '150px' }}>
                    <div className="skeleton-line flex-grow-1 skeleton-filter-item"></div>
                    <div className="skeleton-line flex-grow-1 skeleton-filter-item"></div>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={(e) => {
            e.preventDefault();
            onApply();
        }}>
            <div className="d-flex flex-wrap flex-xl-nowrap gap-2 align-items-center mb-3 w-100">
                <div className="search-box flex-grow-1" style={{ minWidth: '150px' }}>
                    <input
                        type="text"
                        className="form-control search bg-light border-light"
                        placeholder="Search..."
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

                <div className="search-box flex-grow-1" style={{ minWidth: '160px' }}>
                    <Calendar
                        value={dateRange}
                        onChange={(e) => setDateRange(e.value)}
                        selectionMode="range"
                        readOnlyInput
                        placeholder="Date Range"
                        className="w-100"
                        inputClassName="form-control search bg-light border-light"
                    />
                    <i className="ri-calendar-2-line search-icon"></i>
                </div>

                <div className="flex-grow-1" style={{ minWidth: '130px' }}>
                    <Dropdown
                        value={selectedStatus}
                        options={PAYMENT_STATUS_OPTIONS}
                        onChange={(e) => setSelectedStatus(e.value)}
                        placeholder="All Status"
                        className="w-100 bg-light border-light"
                    />
                </div>

                <div className="flex-grow-1" style={{ minWidth: '150px' }}>
                    <Dropdown
                        value={selectedEnvironment}
                        options={PAYMENT_ENVIRONMENT_OPTIONS}
                        onChange={(e) => setSelectedEnvironment(e.value)}
                        placeholder="All Environment"
                        className="w-100 bg-light border-light"
                    />
                </div>

                <div className="flex-grow-1" style={{ minWidth: '160px' }}>
                    <Dropdown
                        value={selectedMethod}
                        options={PAYMENT_METHOD_OPTIONS}
                        onChange={(e) => setSelectedMethod(e.value)}
                        placeholder="All Methods"
                        className="w-100 bg-light border-light"
                    />
                </div>

                <div className="flex-grow-1" style={{ minWidth: '120px' }}>
                    <Dropdown
                        value={selectedType}
                        options={PAYMENT_TYPE_OPTIONS}
                        onChange={(e) => setSelectedType(e.value)}
                        placeholder="All Types"
                        className="w-100 bg-light border-light"
                    />
                </div>

                <div className="d-flex gap-1 flex-shrink-0" style={{ minWidth: '150px' }}>
                    <button
                        type="button"
                        className="btn btn-warning flex-grow-1 text-nowrap px-2"
                        onClick={onApply}
                    >
                        <i className="ri-equalizer-fill me-1 align-bottom"></i> Filters
                    </button>
                    <button
                        type="button"
                        className="btn btn-default flex-grow-1 text-nowrap px-2"
                        onClick={onClear}
                    >
                        <i className="ri-close-line me-1 align-bottom"></i> Clear
                    </button>
                </div>
            </div>
        </form>
    );
}
