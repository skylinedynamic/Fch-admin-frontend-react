import React from 'react';
import { Skeleton } from 'primereact/skeleton';

/** A card header: icon + title. */
const CardHeader = ({ titleWidth = '160px' }: { titleWidth?: string }) => (
    <div className="card-header bg-transparent border-bottom d-flex align-items-center">
        <Skeleton width="18px" height="18px" className="me-2" />
        <Skeleton width={titleWidth} height="18px" />
    </div>
);

/** Label/value pairs in a two-column grid, like the page's DetailRow. */
const DetailRows = ({ count }: { count: number }) => (
    <div className="row">
        {Array.from({ length: count }).map((_, i) => (
            <div className="col-md-6 mb-3" key={i}>
                <Skeleton width="90px" height="13px" className="mb-2" />
                <Skeleton width="150px" height="15px" />
            </div>
        ))}
    </div>
);

/** Mirrors the Commission Details layout while it loads. */
export default function CommissionDetailsLoader() {
    return (
        <>
            {/* Stat cards */}
            <div className="row mb-4">
                {[1, 2, 3, 4].map((i) => (
                    <div className="col-xl-3 col-md-6 mb-3 mb-xl-0" key={i}>
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body p-3">
                                <div className="d-flex align-items-center">
                                    <Skeleton width="48px" height="48px" borderRadius="6px" className="flex-shrink-0 me-3" />
                                    <div className="flex-grow-1">
                                        <Skeleton width="110px" height="13px" className="mb-2" />
                                        <Skeleton width="90px" height="20px" className="mb-2" />
                                        <Skeleton width="130px" height="12px" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="row">
                {/* Left column */}
                <div className="col-lg-8">
                    {/* Partner Details */}
                    <div className="card partner-details-section p-0 mb-4">
                        <div className="card-header bg-transparent border-bottom border-bottom-dashed d-flex align-items-center justify-content-between py-3 px-4">
                            <div className="d-flex align-items-center gap-3">
                                <Skeleton shape="circle" size="48px" />
                                <div>
                                    <Skeleton width="130px" height="18px" className="mb-2" />
                                    <Skeleton width="200px" height="13px" />
                                </div>
                            </div>
                            <Skeleton width="100px" height="30px" borderRadius="4px" />
                        </div>
                        <div className="card-body p-4">
                            <div className="row g-3">
                                {[1, 2, 3, 4].map((i) => (
                                    <div className="col-md-3 col-6" key={i}>
                                        <Skeleton width="80px" height="12px" className="mb-2" />
                                        <Skeleton width="120px" height="15px" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Borrower Information */}
                    <div className="card border-0 shadow-sm mb-4">
                        <CardHeader titleWidth="180px" />
                        <div className="card-body">
                            <DetailRows count={4} />
                            <Skeleton width="120px" height="13px" className="mb-2" />
                            <Skeleton width="60%" height="15px" />
                        </div>
                    </div>

                    {/* Funding Details */}
                    <div className="card border-0 shadow-sm mb-4">
                        <CardHeader titleWidth="150px" />
                        <div className="card-body">
                            <DetailRows count={8} />
                        </div>
                    </div>
                </div>

                {/* Right column */}
                <div className="col-lg-4">
                    {/* Payout */}
                    <div className="card border-0 shadow-sm mb-4">
                        <CardHeader titleWidth="90px" />
                        <div className="card-body">
                            <Skeleton width="110px" height="12px" className="mb-2" />
                            <div className="d-flex align-items-center mb-3">
                                <Skeleton shape="circle" size="32px" className="me-2" />
                                <div className="flex-grow-1">
                                    <Skeleton width="140px" height="14px" className="mb-1" />
                                    <Skeleton width="180px" height="12px" />
                                </div>
                            </div>
                            {[1, 2, 3].map((i) => (
                                <div className="d-flex justify-content-between mb-2" key={i}>
                                    <Skeleton width="100px" height="14px" />
                                    <Skeleton width="90px" height="14px" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Commission Breakdown */}
                    <div className="card border-0 shadow-sm mb-4">
                        <CardHeader titleWidth="190px" />
                        <div className="card-body">
                            <Skeleton width="100%" height="34px" className="mb-3" />
                            {[1, 2, 3].map((i) => (
                                <div className="d-flex align-items-center mb-3" key={i}>
                                    <Skeleton shape="circle" size="24px" className="me-2" />
                                    <Skeleton width="110px" height="15px" className="me-auto" />
                                    <Skeleton width="40px" height="15px" className="me-3" />
                                    <Skeleton width="70px" height="15px" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Commission Notes */}
                    <div className="card border-0 shadow-sm mb-4">
                        <CardHeader titleWidth="170px" />
                        <div className="card-body">
                            <Skeleton width="100%" height="60px" borderRadius="4px" />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
