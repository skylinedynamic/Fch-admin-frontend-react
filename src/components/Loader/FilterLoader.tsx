import React from 'react';

export default function FilterLoader() {
    return (
        <div className="row g-3 fade-panel">
            {/* Search Box Skeleton */}
            <div className="col-xxl-3 col-sm-6">
                <div className="skeleton-line w-100 skeleton-filter-item"></div>
            </div>

            {/* Placeholder/Partner Dropdown Skeleton */}
            <div className="col-xxl-2 col-sm-6">
                <div className="skeleton-line w-100 skeleton-filter-item"></div>
            </div>

            {/* Status Dropdown Skeleton */}
            <div className="col-xxl-2 col-sm-6">
                <div className="skeleton-line w-100 skeleton-filter-item"></div>
            </div>

            {/* Payment Status Dropdown Skeleton */}
            <div className="col-xxl-2 col-sm-6">
                <div className="skeleton-line w-100 skeleton-filter-item"></div>
            </div>

            {/* Buttons Skeleton */}
            <div className="col-xxl-3 col-sm-12">
                <div className="d-flex gap-2">
                    <div className="skeleton-line flex-grow-1 skeleton-filter-item"></div>
                    <div className="skeleton-line flex-grow-1 skeleton-filter-item"></div>
                </div>
            </div>
        </div>
    );
}
