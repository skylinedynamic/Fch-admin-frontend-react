import React, { useState } from 'react';
import CustomDropdown from '../../../components/Common/CustomDropdown';
import { FUNDING_STATUS_OPTIONS, FUNDING_CATEGORY_OPTIONS } from '../../../config/funding';

const FundingFilters = ({ activeFilter, setActiveFilter }) => {
    
    // Internal state before applying
    const [localSearch, setLocalSearch] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

    const onApply = () => {
        // Here we just map the selectedCategory to activeFilter since the parent handles filtering by activeFilter
        setActiveFilter(selectedCategory || 'All Funding');
        // Additional search/status filtering could be added to parent later if needed
    };

    const onClear = () => {
        setLocalSearch('');
        setSelectedStatus('');
        setSelectedCategory('');
        setActiveFilter('All Funding');
    };

    return (
        <form onSubmit={(e) => { e.preventDefault(); onApply(); }}>
            <div className="row g-3 mb-3">
                <div className="col-xxl-4 col-sm-12">
                    <div className="input-group vendor-filter-input-group border-0 transition-all shadow-sm-hover bg-light rounded" style={{ backgroundColor: '#f3f6f9' }}>
                        <span className="input-group-text bg-transparent border-0 pe-1">
                            <i className="ri-search-line text-muted opacity-75"></i>
                        </span>
                        <input
                            type="text"
                            className="form-control bg-transparent border-0 ps-1 fs-13 shadow-none"
                            placeholder="Search here..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && onApply()}
                        />
                    </div>
                </div>
                <div className="col-xxl-3 col-sm-6">
                    <CustomDropdown
                        value={selectedStatus}
                        options={[{ label: 'All Status', value: '' }, ...FUNDING_STATUS_OPTIONS.map(o => ({ ...o, value: o.value || '' }))]}
                        onChange={(val) => setSelectedStatus(val)}
                        optionLabel="label"
                        optionValue="value"
                        placeholder="All Status"
                        className="w-100 vendor-filter-bg h-100"
                    />
                </div>
                <div className="col-xxl-2 col-sm-6">
                    <CustomDropdown
                        value={selectedCategory}
                        options={[{ label: 'All Categories', value: '' }, ...FUNDING_CATEGORY_OPTIONS.map(o => ({ ...o, value: o.value || '' }))]}
                        onChange={(val) => setSelectedCategory(val)}
                        optionLabel="label"
                        optionValue="value"
                        placeholder="All Categories"
                        className="w-100 vendor-filter-bg h-100"
                    />
                </div>
                <div className="col-xxl-3 col-sm-12">
                    <div className="d-flex gap-2">
                        <button type="button" className="btn btn-warning flex-grow-1 fs-13 d-flex align-items-center justify-content-center gap-2" onClick={onApply}>
                            <i className="ri-equalizer-fill align-bottom"></i> Filters
                        </button>
                        <button type="button" className="btn-clear flex-grow-1 fs-13 d-flex align-items-center justify-content-center gap-2" onClick={onClear}>
                            <i className="ri-close-line align-bottom"></i> Clear
                        </button>
                    </div>
                </div>
            </div>
        </form>
    );
};

export default FundingFilters;
