import React from 'react';
import FilterLoader from '../../../components/Loader/FilterLoader';

export default function BillingFilters({ 
    searchText, setSearchText, 
    onApply, onClear, loading
}) {
    // Layout config (2 items: Search and Buttons)
    const loaderConfig = [
        { col: 'col-xxl-9 col-sm-12' },   // Search
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
                    <div className="col-xxl-9 col-sm-8">
                        <div className="search-box">
                            <input
                                type="text"
                                className="form-control search bg-light border-light"
                                placeholder="Search by name, email..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                            />
                            <i className="ri-search-line search-icon"></i>
                        </div>
                    </div>

                    <div className="col-xxl-3 col-sm-4">
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
