import React from 'react';

export default function PlanFeeSkeletonLoader() {
    return (
        <div className="plan-fee-skeleton-wrapper">
            {/* Info Banner Skeleton */}
            <div className="alert alert-info bg-info-subtle border-0 p-3 rounded-3 mb-4 shadow-xs placeholder-glow">
                <div className="d-flex align-items-center gap-2.5">
                    <span className="placeholder rounded-circle flex-shrink-0" style={{ width: '24px', height: '24px' }}></span>
                    <div className="flex-grow-1">
                        <span className="placeholder col-4 mb-1 d-block rounded" style={{ height: '14px' }}></span>
                        <span className="placeholder col-8 d-block rounded" style={{ height: '12px' }}></span>
                    </div>
                </div>
            </div>

            {/* Main Card Skeleton */}
            <div className="card border-0 shadow-sm bg-white overflow-hidden plan-fee-main-card">
                {/* Tabs Header Skeleton */}
                <div className="card-header border-0 bg-light bg-opacity-25 pb-0 pt-3">
                    <div className="d-flex align-items-center gap-3 border-bottom pb-2 placeholder-glow">
                        {[1, 2, 3, 4].map((tabIdx) => (
                            <div key={`tab-skel-${tabIdx}`} className="d-flex align-items-center gap-2 py-2 px-3">
                                <span className="placeholder rounded" style={{ width: '18px', height: '18px' }}></span>
                                <span className="placeholder rounded" style={{ width: '110px', height: '16px' }}></span>
                                <span className="placeholder rounded-pill" style={{ width: '24px', height: '18px' }}></span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Card Body Skeleton */}
                <div className="card-body p-4 pt-3">
                    {/* Policy Banner Skeleton */}
                    <div className="alert alert-warning bg-warning-subtle border-0 p-3 rounded-3 mb-3 shadow-xs placeholder-glow">
                        <div className="d-flex align-items-center gap-2 mb-2">
                            <span className="placeholder rounded-circle" style={{ width: '20px', height: '20px' }}></span>
                            <span className="placeholder col-3 rounded" style={{ height: '16px' }}></span>
                        </div>
                        <div className="ms-4">
                            <span className="placeholder col-7 d-block mb-1.5 rounded" style={{ height: '13px' }}></span>
                            <span className="placeholder col-5 d-block rounded" style={{ height: '13px' }}></span>
                        </div>
                    </div>

                    {/* Plan Row Items Skeleton */}
                    <div className="d-flex flex-column gap-3">
                        {[1, 2, 3].map((rowIdx) => (
                            <div key={`row-skel-${rowIdx}`} className="p-3 bg-light bg-opacity-40 rounded mb-2 placeholder-glow">
                                <div className="row align-items-center g-3">
                                    {/* Left Details Column */}
                                    <div className="col-12 col-md-5 d-flex align-items-center gap-3">
                                        <div className="avatar-md flex-shrink-0 placeholder rounded-3" style={{ width: '48px', height: '48px' }}></div>
                                        <div className="flex-grow-1">
                                            <span className="placeholder col-6 d-block mb-2 rounded" style={{ height: '16px' }}></span>
                                            <span className="placeholder col-10 d-block rounded" style={{ height: '12px' }}></span>
                                        </div>
                                    </div>

                                    {/* Right Inputs Column */}
                                    <div className="col-12 col-md-7">
                                        <div className="d-flex align-items-center justify-content-md-end flex-wrap gap-3">
                                            {/* Total Amount Input Skeleton */}
                                            <div>
                                                <span className="placeholder col-8 d-block mb-1 rounded" style={{ height: '12px' }}></span>
                                                <span className="placeholder rounded" style={{ width: '120px', height: '32px' }}></span>
                                            </div>

                                            {/* Platform Fee Input Skeleton */}
                                            <div>
                                                <span className="placeholder col-8 d-block mb-1 rounded" style={{ height: '12px' }}></span>
                                                <span className="placeholder rounded" style={{ width: '120px', height: '32px' }}></span>
                                            </div>

                                            {/* Action Button Skeleton */}
                                            <div className="align-self-end">
                                                <span className="placeholder rounded-2 d-inline-block" style={{ width: '75px', height: '32px' }}></span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
