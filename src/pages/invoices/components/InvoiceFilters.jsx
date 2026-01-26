import React from 'react';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { INVOICE_STATUS_OPTIONS, INVOICE_CYCLE_OPTIONS } from '../../../config/invoiceConfig';

export default function InvoiceFilters({ 
    searchText, setSearchText,
    selectedStatus, setSelectedStatus,
    selectedPayee, setSelectedPayee,
    selectedCycle, setSelectedCycle,
    dateRange, setDateRange,
    onApply,
    onClear
}) {
    return (
        <div className="row g-3 mb-3 align-items-center">
            <div className="col-xxl-3 col-sm-12">
                <div className="search-box">
                    <input
                        type="text"
                        className="form-control search bg-light border-light"
                        placeholder="Search invoices..."
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

            <div className="col-xxl-3 col-sm-6">
                <div className="search-box">
                    <Calendar 
                        value={dateRange}
                        onChange={(e) => setDateRange(e.value)}
                        placeholder="Date Range" 
                        selectionMode="range" 
                        readOnlyInput 
                        className="w-100"
                        inputClassName="form-control search bg-light border-light"
                    />
                    <i className="ri-calendar-2-line search-icon"></i>
                </div>
            </div>

            <div className="col-xxl-3 col-sm-6">
                <Dropdown 
                    value={selectedStatus}
                    options={INVOICE_STATUS_OPTIONS} 
                    placeholder="All Status" 
                    className="w-100 employee-filter-dropdown"
                    onChange={(e) => setSelectedStatus(e.value)}
                />
            </div>

            {/* <div className="col-xxl-2 col-sm-4">
                <Dropdown 
                    value={selectedCycle}
                    options={INVOICE_CYCLE_OPTIONS} 
                    placeholder="All Cycle" 
                    className="w-100 employee-filter-dropdown"
                    onChange={(e) => setSelectedCycle(e.value)}
                />
            </div> */}

            <div className="col-xxl-3 col-sm-12">
                <div className="d-flex gap-2">
                    <button type="button" className="btn btn-warning flex-grow-1" onClick={onApply}>
                        <i className="ri-equalizer-fill me-1 align-bottom"></i> Filters
                    </button>
                    <button type="button" className="btn btn-default flex-grow-1" onClick={onClear}>
                        <i className="ri-close-line me-1 align-bottom"></i> Clear
                    </button>
                </div>
            </div>
        </div>
    );
}
