import React from 'react';
import { Dropdown } from 'primereact/dropdown';
import FilterLoader from '../../../components/Loader/FilterLoader';
import { ENTITY_TYPE_PARTNER, ENTITY_TYPE_BORROWER } from '../../../config/appConfig';

export const BILLING_VIEW_ALL = 'all';
export const BILLING_VIEW_SCHEDULED = 'scheduled';
export const BILLING_VIEW_OVERDUE = 'overdue';
export const BILLING_VIEW_PAUSED = 'paused';

export const BILLING_VIEW_OPTIONS = [
    { label: 'All Billings', value: BILLING_VIEW_ALL },
    { label: 'Scheduled', value: BILLING_VIEW_SCHEDULED },
    { label: 'Overdue', value: BILLING_VIEW_OVERDUE },
    { label: 'Paused / Not Collectable', value: BILLING_VIEW_PAUSED },
];

// Sentinel for "no entity filter". Kept out of appConfig because it is a UI-only
// value — it is translated to "send nothing" before the request goes out, so the
// API never receives it.
export const BILLING_ENTITY_TYPE_ALL = 'all';

// The real values come from appConfig so the frontend and the API share one
// vocabulary — the API maps them onto the model classes stored in entity_type.
export const BILLING_ENTITY_TYPE_OPTIONS = [
    { label: 'All Types', value: BILLING_ENTITY_TYPE_ALL },
    { label: ENTITY_TYPE_PARTNER, value: ENTITY_TYPE_PARTNER },
    { label: ENTITY_TYPE_BORROWER, value: ENTITY_TYPE_BORROWER },
];

export default function BillingFilters({
    searchText, setSearchText,
    view, setView,
    entityType, setEntityType,
    onApply, onClear, loading
}) {
    // Layout config (4 items: Search, Entity Type, View, Buttons)
    const loaderConfig = [
        { col: 'col-xxl-4 col-sm-12' },   // Search
        { col: 'col-xxl-3 col-sm-6' },    // Entity type
        { col: 'col-xxl-2 col-sm-6' },    // View
        { col: 'col-xxl-3 col-sm-12', isButton: true } // Filters & Clear
    ];

    // Deliberately not a <form>. Nothing here applies on change or on Enter — the
    // filters are staged locally and only take effect when Filters is clicked, so
    // typing a search term does not fire a request per keystroke or per Enter.
    return (
        <>
            {loading ? (
                <FilterLoader config={loaderConfig} />
            ) : (
                <div className="row g-3 mb-3">
                    <div className="col-xxl-4 col-sm-12">
                        <div className="search-box">
                            <input
                                type="text"
                                className="form-control search bg-light border-light"
                                placeholder="Search by name, email..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                onKeyDown={(e) => {
                                    // Enter must not apply the filter.
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                    }
                                }}
                            />
                            <i className="ri-search-line search-icon"></i>
                        </div>
                    </div>

                    <div className="col-xxl-3 col-sm-6">
                        <Dropdown
                            value={entityType}
                            options={BILLING_ENTITY_TYPE_OPTIONS}
                            onChange={(e) => setEntityType(e.value ?? BILLING_ENTITY_TYPE_ALL)}
                            placeholder="All Types"
                            className="w-100 employee-filter-dropdown"
                        />
                    </div>

                    <div className="col-xxl-2 col-sm-6">
                        <Dropdown
                            value={view}
                            options={BILLING_VIEW_OPTIONS}
                            onChange={(e) => setView(e.value ?? BILLING_VIEW_ALL)}
                            placeholder="All Billings"
                            className="w-100 employee-filter-dropdown"
                        />
                    </div>

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
            )}
        </>
    );
}
