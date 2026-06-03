import React, { useState } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { FUNDING_STATUS_OPTIONS, FUNDING_CATEGORY_OPTIONS } from '../../../config/funding';

const FundingFilters = ({ activeFilter, setActiveFilter }) => {
    
    // Internal state before applying
    const [localSearch, setLocalSearch] = useState('');
    const [selectedStatus, setSelectedStatus] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);

    const onApply = () => {
        // Here we just map the selectedCategory to activeFilter since the parent handles filtering by activeFilter
        setActiveFilter(selectedCategory || 'All Funding');
        // Additional search/status filtering could be added to parent later if needed
    };

    const onClear = () => {
        setLocalSearch('');
        setSelectedStatus(null);
        setSelectedCategory(null);
        setActiveFilter('All Funding');
    };

    return (
        <form onSubmit={(e) => { e.preventDefault(); onApply(); }}>
            <div className="row g-3 mb-3">
                <div className="col-xxl-4 col-sm-12">
                    <div className="search-box">
                        <input
                            type="text"
                            className="form-control search bg-light border-light"
                            placeholder="Search here..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && onApply()}
                        />
                        <i className="ri-search-line search-icon"></i>
                    </div>
                </div>
                <div className="col-xxl-3 col-sm-6">
                    <Dropdown
                        value={selectedStatus}
                        options={[{ label: 'All Status', value: null }, ...FUNDING_STATUS_OPTIONS]}
                        onChange={(e) => setSelectedStatus(e.value)}
                        optionLabel="label"
                        optionValue="value"
                        placeholder="All Status"
                        className="w-100 employee-filter-dropdown"
                        appendTo="self"
                    />
                </div>
                <div className="col-xxl-2 col-sm-6">
                    <Dropdown
                        value={selectedCategory}
                        options={[{ label: 'All Categories', value: null }, ...FUNDING_CATEGORY_OPTIONS]}
                        onChange={(e) => setSelectedCategory(e.value)}
                        optionLabel="label"
                        optionValue="value"
                        placeholder="All Categories"
                        className="w-100 employee-filter-dropdown"
                        appendTo="self"
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
        </form>
    );
};

export default FundingFilters;
