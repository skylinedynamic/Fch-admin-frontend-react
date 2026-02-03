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
                                <div className="skeleton-line mb-1" style={{ width: '220px', height: '24px', borderRadius: '6px' }}></div>
                                <div className="skeleton-line" style={{ width: '350px', height: '14px', borderRadius: '4px' }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Commission Section Skeleton */}
                <div className="row">
                    <div className="col-12">
                        <div className="card shadow-sm border-0 mb-4 overflow-hidden">
                            <div className="card-header bg-white border-bottom py-2">
                                <div className="skeleton-line" style={{ width: '150px', height: '18px', borderRadius: '4px' }}></div>
                            </div>
                            <div className="card-body p-0">
                                <div className="row g-0">
                                    {/* Left: Inputs */}
                                    <div className="col-md-5 border-end border-light">
                                        <div className="p-4 h-100 bg-light bg-opacity-50">
                                            <div className="mb-3">
                                                <div className="skeleton-line mb-2" style={{ width: '80px', height: '12px', borderRadius: '4px' }}></div>
                                                <div className="skeleton-line" style={{ width: '100%', height: '38px', borderRadius: '6px' }}></div>
                                            </div>
                                            <div className="row">
                                                <div className="col-6">
                                                    <div className="skeleton-line mb-2" style={{ width: '100px', height: '12px', borderRadius: '4px' }}></div>
                                                    <div className="skeleton-line" style={{ width: '100%', height: '38px', borderRadius: '6px' }}></div>
                                                </div>
                                                <div className="col-6">
                                                    <div className="skeleton-line mb-2" style={{ width: '100px', height: '12px', borderRadius: '4px' }}></div>
                                                    <div className="skeleton-line" style={{ width: '100%', height: '38px', borderRadius: '6px' }}></div>
                                                </div>
                                            </div>
                                            <div className="mt-4 text-end">
                                                <div className="skeleton-line" style={{ width: '140px', height: '38px', borderRadius: '6px', marginLeft: 'auto' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Right: Results */}
                                    <div className="col-md-7">
                                        <div className="p-3 h-100 d-flex flex-column">
                                            <div className="skeleton-line mb-3" style={{ width: '100%', height: '45px', borderRadius: '6px' }}></div>
                                            <div className="row g-2">
                                                <div className="col-12">
                                                    <div className="skeleton-line mb-3" style={{ width: '100%', height: '38px', borderRadius: '6px' }}></div>
                                                </div>
                                                <div className="col-6">
                                                    <div className="skeleton-line" style={{ width: '100%', height: '100px', borderRadius: '8px' }}></div>
                                                </div>
                                                <div className="col-6">
                                                    <div className="skeleton-line" style={{ width: '100%', height: '100px', borderRadius: '8px' }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    {/* Sidebar Skeleton */}
                    <div className="col-lg-3">
                        {/* Tab Buttons (Progress Steps) */}
                        <div className="card mb-4">
                            <div className="card-header bg-white py-3">
                                <div className="skeleton-line" style={{ width: '180px', height: '18px', borderRadius: '4px' }}></div>
                            </div>
                            <div className="list-group list-group-flush">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="list-group-item d-flex align-items-center py-2">
                                        <div className="skeleton-line me-3" style={{ width: '32px', height: '32px', borderRadius: '50%' }}></div>
                                        <div className="skeleton-line" style={{ width: '140px', height: '14px', borderRadius: '4px' }}></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Status Card Skeleton */}
                        <div className="card">
                            <div className="card-body">
                                <div className="skeleton-line mb-3" style={{ width: '140px', height: '16px', borderRadius: '4px' }}></div>
                                <div className="mb-3">
                                    <div className="skeleton-line mb-2" style={{ width: '60px', height: '12px', borderRadius: '4px' }}></div>
                                    <div className="skeleton-line" style={{ width: '100%', height: '38px', borderRadius: '6px' }}></div>
                                </div>
                                <div className="mb-3">
                                    <div className="skeleton-line mb-2" style={{ width: '80px', height: '12px', borderRadius: '4px' }}></div>
                                    <div className="skeleton-line" style={{ width: '100%', height: '80px', borderRadius: '6px' }}></div>
                                </div>
                                <div className="d-grid">
                                    <div className="skeleton-line" style={{ width: '100%', height: '38px', borderRadius: '6px' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Area Skeleton */}
                    <div className="col-lg-9">
                        <div className="card border-0 shadow-sm">
                            <div className="card-header border-bottom">
                                <div className="skeleton-line" style={{ width: '220px', height: '18px', borderRadius: '4px' }}></div>
                            </div>
                            <div className="card-body p-4">
                                <div className="row">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                        <div className="col-md-6 mb-4" key={i}>
                                            <div className="skeleton-line mb-2" style={{ width: '100px', height: '12px', borderRadius: '4px' }}></div>
                                            <div className="skeleton-line" style={{ width: '180px', height: '14px', borderRadius: '4px' }}></div>
                                        </div>
                                    ))}
                                </div>
                                <div className="d-flex justify-content-between mt-4 pt-3 border-top">
                                    <div className="skeleton-line" style={{ width: '100px', height: '38px', borderRadius: '6px' }}></div>
                                    <div className="skeleton-line" style={{ width: '100px', height: '38px', borderRadius: '6px' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
