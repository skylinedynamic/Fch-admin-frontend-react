import React from 'react';

export default function BillingDetailsLoader() {
    return (
        <div>
            {/* Stats Row Skeleton */}
            <div className="row">
                {[1, 2, 3].map((i) => (
                    <div className="col-xl-4 col-md-6" key={i}>
                        <div className="card card-animate mb-0 border-0 shadow-sm">
                            <div className="card-body p-3">
                                <div className="d-flex align-items-center">
                                    <div className="flex-shrink-0">
                                        <div className="skeleton-line" style={{ width: '48px', height: '48px', borderRadius: '8px' }}></div>
                                    </div>
                                    <div className="flex-grow-1 ms-3">
                                        <div className="skeleton-line mb-2" style={{ width: '90px', height: '13px' }}></div>
                                        <div className="skeleton-line" style={{ width: '130px', height: '24px', borderRadius: '4px' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Details Hero Card Skeleton */}
            <div className="row">
                <div className="col-12">
                    <div className="card shadow-sm border-0 overflow-hidden">

                        {/* Hero Header Skeleton */}
                        <div className="card-header bg-soft-primary border-opacity-25 p-4">
                            <div className="d-flex align-items-center">
                                <div className="flex-shrink-0">
                                    <div className="skeleton-line" style={{ width: '48px', height: '48px', borderRadius: '6px' }}></div>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                    <div className="skeleton-line mb-2" style={{ width: '220px', height: '20px', borderRadius: '4px' }}></div>
                                    <div className="skeleton-line" style={{ width: '180px', height: '14px', borderRadius: '3px' }}></div>
                                </div>
                                <div className="flex-shrink-0 text-end">
                                    <div className="skeleton-line" style={{ width: '80px', height: '26px', borderRadius: '4px' }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Subscriber Info + Subscription Details side by side */}
                        <div className="card-body p-4 border-bottom border-bottom-dashed">
                            <div className="row g-4">

                                {/* Left: Subscriber Info */}
                                <div className="col-lg-6 col-md-6">
                                    <div className="skeleton-line mb-4" style={{ width: '180px', height: '18px', borderRadius: '4px' }}></div>
                                    <div className="row g-3">
                                        {[1, 2, 3, 4].map((j) => (
                                            <div className="col-sm-6" key={j}>
                                                <div className="skeleton-line mb-2" style={{ width: '70px', height: '11px' }}></div>
                                                <div className="skeleton-line" style={{ width: '140px', height: '16px', borderRadius: '3px' }}></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Right: Subscription Details */}
                                <div className="col-lg-6 col-md-6">
                                    <div className="skeleton-line mb-4" style={{ width: '180px', height: '18px', borderRadius: '4px' }}></div>
                                    <div className="row g-3">
                                        {[1, 2, 3, 4, 5, 6].map((k) => (
                                            <div className="col-sm-6" key={k}>
                                                <div className="skeleton-line mb-2" style={{ width: '100px', height: '11px' }}></div>
                                                <div className="skeleton-line" style={{ width: '120px', height: '16px', borderRadius: '3px' }}></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Invoices Ledger Table Skeleton */}
                        <div className="card-body p-4">
                            <div className="skeleton-line mb-4" style={{ width: '200px', height: '18px', borderRadius: '4px' }}></div>
                            <div className="table-responsive">
                                <table className="table table-borderless align-middle mb-0">
                                    <thead>
                                        <tr className="table-active">
                                            {['Invoice ID', 'Invoice Date', 'Amount', 'Status', 'Action'].map((head, idx) => (
                                                <th key={idx}>
                                                    <div className="skeleton-line" style={{ width: '70px', height: '12px' }}></div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[1, 2, 3].map((rowIdx) => (
                                            <tr key={rowIdx}>
                                                <td><div className="skeleton-line" style={{ width: '100px', height: '14px' }}></div></td>
                                                <td><div className="skeleton-line" style={{ width: '120px', height: '14px' }}></div></td>
                                                <td><div className="skeleton-line" style={{ width: '80px', height: '14px' }}></div></td>
                                                <td><div className="skeleton-line" style={{ width: '60px', height: '18px', borderRadius: '10px' }}></div></td>
                                                <td className="text-center">
                                                    <div className="skeleton-line mx-auto" style={{ width: '32px', height: '32px', borderRadius: '6px' }}></div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
