import React from 'react';

export default function FundingRequestDetailLoader() {
    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Header Skeleton */}
                <div className="row pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-lg-center flex-lg-row flex-column py-2">
                            <div className="flex-grow-1">
                                <div className="skeleton-line mb-2" style={{ width: '250px', height: '24px', borderRadius: '6px' }}></div>
                                <div className="skeleton-line" style={{ width: '300px', height: '14px', borderRadius: '4px' }}></div>
                            </div>
                            <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
                                <div className="skeleton-line" style={{ width: '80px', height: '38px', borderRadius: '4px' }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row mt-3">
                    {/* Left Column */}
                    <div className="col-lg-8">
                        {/* Review Progress Card Skeleton */}
                        <div className="card shadow-sm border-0 mb-4 rounded-3">
                            <div className="card-body p-0">
                                <div className="p-4 d-flex justify-content-between align-items-center">
                                    <div className="d-flex align-items-center">
                                        <div className="skeleton-line rounded-3 me-3" style={{ width: 48, height: 48 }}></div>
                                        <div>
                                            <div className="skeleton-line mb-2" style={{ width: '150px', height: '18px', borderRadius: '4px' }}></div>
                                            <div className="skeleton-line" style={{ width: '220px', height: '14px', borderRadius: '4px' }}></div>
                                        </div>
                                    </div>
                                    <div className="skeleton-line rounded-circle" style={{ width: 76, height: 76 }}></div>
                                </div>
                                <div className="p-4 pt-4 pb-5 overflow-hidden">
                                    <div className="d-flex justify-content-between align-items-start position-relative px-3">
                                        {[1, 2, 3, 4, 5].map((_, idx) => (
                                            <React.Fragment key={idx}>
                                                <div className="d-flex flex-column align-items-center position-relative" style={{ width: 100, flexShrink: 0 }}>
                                                    <div className="skeleton-line mb-2 rounded-circle" style={{ width: 36, height: 36 }}></div>
                                                    <div className="skeleton-line mb-1" style={{ width: 70, height: 14, borderRadius: 4 }}></div>
                                                    <div className="skeleton-line mt-1" style={{ width: 90, height: 10, borderRadius: 4 }}></div>
                                                    <div className="skeleton-line mt-1" style={{ width: 110, height: 10, borderRadius: 4 }}></div>
                                                </div>
                                                {idx < 4 && (
                                                    <div className="flex-grow-1" style={{ height: 2, marginTop: 17, backgroundColor: '#f1f5f9', marginLeft: -36, marginRight: -36 }}></div>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Borrower & Funding Info Skeleton */}
                        <div className="card shadow-sm border-0 mb-4 rounded-3">
                            <div className="card-header bg-white border-0 pt-4 pb-0">
                                <div className="d-flex align-items-center">
                                    <div className="skeleton-line rounded me-3" style={{ width: 32, height: 32 }}></div>
                                    <div className="skeleton-line" style={{ width: '200px', height: '18px', borderRadius: '4px' }}></div>
                                </div>
                            </div>
                            <div className="card-body p-4">
                                <div className="row g-4">
                                    {[1, 2, 3, 4, 5, 6].map(i => (
                                        <div className="col-md-6" key={i}>
                                            <div className="skeleton-line mb-2" style={{ width: '100px', height: '12px', borderRadius: '4px' }}></div>
                                            <div className="skeleton-line" style={{ width: '180px', height: '16px', borderRadius: '4px' }}></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Lenders Info Skeleton */}
                        <div className="card shadow-sm border-0 mb-4 rounded-3">
                            <div className="card-header bg-white border-0 pt-4 pb-0">
                                <div className="d-flex align-items-center">
                                    <div className="skeleton-line rounded me-3" style={{ width: 32, height: 32 }}></div>
                                    <div className="skeleton-line" style={{ width: '150px', height: '18px', borderRadius: '4px' }}></div>
                                </div>
                            </div>
                            <div className="card-body p-4">
                                <div className="skeleton-line w-100" style={{ height: '150px', borderRadius: '8px' }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="col-lg-4">
                        {/* Review Actions Skeleton */}
                        <div className="card shadow-sm border-0 mb-4 rounded-3 sticky-side-div">
                            <div className="card-header bg-white border-0 pt-4 pb-0">
                                <div className="d-flex align-items-center">
                                    <div className="skeleton-line rounded me-3" style={{ width: 32, height: 32 }}></div>
                                    <div className="skeleton-line" style={{ width: '120px', height: '18px', borderRadius: '4px' }}></div>
                                </div>
                            </div>
                            <div className="card-body p-4">
                                <div className="skeleton-line mb-3" style={{ width: '100%', height: '14px', borderRadius: '4px' }}></div>
                                <div className="skeleton-line mb-4" style={{ width: '80%', height: '14px', borderRadius: '4px' }}></div>
                                
                                <div className="skeleton-line mb-2" style={{ width: '60px', height: '12px', borderRadius: '4px' }}></div>
                                <div className="skeleton-line w-100 mb-3" style={{ height: '38px', borderRadius: '6px' }}></div>
                                
                                <div className="skeleton-line w-100" style={{ height: '38px', borderRadius: '6px' }}></div>
                            </div>
                        </div>

                        {/* Activity Skeleton */}
                        <div className="card shadow-sm border-0 mb-4 rounded-3">
                            <div className="card-header bg-white border-bottom p-3">
                                <div className="skeleton-line" style={{ width: '100px', height: '16px', borderRadius: '4px' }}></div>
                            </div>
                            <div className="card-body p-3">
                                {[1, 2, 3].map(i => (
                                    <div className="d-flex mb-3" key={i}>
                                        <div className="skeleton-line rounded-circle me-3 flex-shrink-0" style={{ width: 32, height: 32 }}></div>
                                        <div className="flex-grow-1">
                                            <div className="skeleton-line mb-2" style={{ width: '80%', height: '14px', borderRadius: '4px' }}></div>
                                            <div className="skeleton-line" style={{ width: '40%', height: '12px', borderRadius: '4px' }}></div>
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
