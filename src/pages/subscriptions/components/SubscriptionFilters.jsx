import React from 'react';
import { Dropdown } from 'primereact/dropdown';
import { SUBSCRIPTION_STATUS_OPTIONS } from '../../../config/subscriptionConfig';
import FilterLoader from '../../../components/Loader/FilterLoader';

export default function SubscriptionFilters({ 
    searchText, setSearchText, 
    selectedStatus, setSelectedStatus, 
    onApply, onClear, loading
}) {
    // Exact layout config for Subscriptions (4 items: Search, Status, Button, Button)
    // Map to 3 columns: Search(6), Status(3), Buttons(3)
    const loaderConfig = [
        { col: 'col-xxl-6 col-sm-12' },   // Search
        { col: 'col-xxl-3 col-sm-6' },    // Status
        { col: 'col-xxl-3 col-sm-12', isButton: true } // Filters & Clear
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
                    <div className="col-xxl-6 col-sm-12">
                        <div className="search-box">
                            <input
                                type="text"
                                className="form-control search bg-light border-light"
                                placeholder="Search subscriptions..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                            />
                            <i className="ri-search-line search-icon"></i>
                        </div>
                    </div>
                    <div className="col-xxl-3 col-sm-6">
                        <Dropdown
                            value={selectedStatus}
                            options={SUBSCRIPTION_STATUS_OPTIONS}
                            onChange={(e) => setSelectedStatus(e.value)}
                            placeholder="Select Status"
                            className="w-100 employee-filter-dropdown"
                            showClear
                        />
                    </div>

                    <div className="col-xxl-3 col-sm-12">
                        <div className="d-flex gap-2">
                            <button type="submit" className="btn btn-warning flex-grow-1">
                                <i className="ri-equalizer-fill me-1 align-bottom"></i> Filters
                            </button>
                            <button type="button" className="btn btn-default flex-grow-1" onClick={onClear}>
                                <i className="ri-close-line me-1 align-bottom"></i> Clear
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
}
