import React from 'react';

export default function ApplicationDetailsLoader() {
    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Header Skeleton */}
                <div className="row mb-3 pb-1">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row">
                            <div className="flex-grow-1">
                                <div className="skeleton-line mb-2" style={{ width: '200px', height: '24px', borderRadius: '6px' }}></div>
                                <div className="skeleton-line" style={{ width: '300px', height: '16px', borderRadius: '4px' }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    {/* Sidebar Skeleton */}
                    <div className="col-lg-3">
                        {/* Tab Buttons */}
                        <div className="list-group list-group-flush border-0 rounded-3 mb-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="list-group-item list-group-item-action mb-2">
                                    <div className="d-flex align-items-center">
                                        <div className="skeleton-line me-3" style={{ width: '24px', height: '24px', borderRadius: '4px' }}></div>
                                        <div className="skeleton-line" style={{ width: '120px', height: '16px', borderRadius: '4px' }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Status Card Skeleton */}
                        <div className="card">
                            <div className="card-body">
                                <div className="skeleton-line mb-3" style={{ width: '150px', height: '18px', borderRadius: '4px' }}></div>
                                
                                {/* Status Dropdown */}
                                <div className="mb-3">
                                    <div className="skeleton-line mb-2" style={{ width: '80px', height: '14px', borderRadius: '4px' }}></div>
                                    <div className="skeleton-line" style={{ width: '100%', height: '42px', borderRadius: '8px' }}></div>
                                </div>

                                {/* Notes Textarea */}
                                <div className="mb-3">
                                    <div className="skeleton-line mb-2" style={{ width: '100px', height: '14px', borderRadius: '4px' }}></div>
                                    <div className="skeleton-line" style={{ width: '100%', height: '80px', borderRadius: '8px' }}></div>
                                </div>

                                {/* Update Button */}
                                <div className="d-grid">
                                    <div className="skeleton-line" style={{ width: '100%', height: '42px', borderRadius: '8px' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Area Skeleton */}
                    <div className="col-lg-9">
                        <div className="card">
                            <div className="card-header">
                                <div className="skeleton-line" style={{ width: '180px', height: '18px', borderRadius: '4px' }}></div>
                            </div>
                            <div className="card-body">
                                {/* Detail Rows */}
                                {[1, 2, 3, 4, 5, 6].map((i) => (
                                    <div className="row mb-3" key={i}>
                                        <div className="col-sm-4">
                                            <div className="skeleton-line" style={{ width: '140px', height: '16px', borderRadius: '4px' }}></div>
                                        </div>
                                        <div className="col-sm-8">
                                            <div className="skeleton-line" style={{ width: '220px', height: '16px', borderRadius: '4px' }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
