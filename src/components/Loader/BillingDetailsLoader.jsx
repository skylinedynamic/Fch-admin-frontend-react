import React from 'react';

export default function BillingDetailsLoader() {
    return (
        <div>
            {/* Content Cards Skeleton */}
            <div className="row">
                <div className="col-12">

                    {/* Card 1 Skeleton */}
                    <div className="card shadow-sm border-0 mb-4">
                        <div className="card-header align-items-center d-flex border-bottom border-light p-4">
                            <div className="d-flex align-items-center flex-grow-1">
                                <div className="flex-shrink-0 me-3">
                                    <div className="skeleton-line sk-avatar-lg"></div>
                                </div>
                                <div>
                                    <div className="skeleton-line sk-title-lg mb-2"></div>
                                    <div className="skeleton-line sk-subtitle-md"></div>
                                </div>
                            </div>
                            <div className="flex-shrink-0 text-end">
                                <div className="skeleton-line sk-badge-md"></div>
                            </div>
                        </div>
                        <div className="card-body p-4">
                            <div className="row g-4">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((j) => (
                                    <div className="col-sm-6 col-md-3" key={j}>
                                        <div className="skeleton-line sk-label-sm mb-2"></div>
                                        <div className="skeleton-line sk-value-lg"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Card 2 Skeleton */}
                    <div className="card shadow-sm border-0 mb-4">
                        <div className="card-header align-items-center d-flex border-bottom border-light p-4">
                            <div className="skeleton-line sk-section-title"></div>
                        </div>
                        <div className="card-body p-4">
                            <div className="row g-4">
                                {[1, 2, 3, 4].map((k) => (
                                    <div className="col-sm-6 col-md-3" key={k}>
                                        <div className="skeleton-line sk-label-md mb-2"></div>
                                        <div className="skeleton-line sk-value-md"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Invoices Ledger Table Skeleton */}
                    <div className="card shadow-sm border-0 mb-4">
                        <div className="card-header align-items-center d-flex border-bottom border-light p-4">
                            <div className="skeleton-line sk-section-title-lg"></div>
                        </div>
                        <div className="card-body p-4">
                            <div className="table-responsive">
                                <table className="table table-borderless align-middle mb-0">
                                    <thead>
                                        <tr className="table-active">
                                            {['Invoice ID', 'Invoice Date', 'Amount', 'Status', 'Action'].map((head, idx) => (
                                                <th key={idx}>
                                                    <div className="skeleton-line sk-th-sm"></div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[1, 2, 3].map((rowIdx) => (
                                            <tr key={rowIdx}>
                                                <td><div className="skeleton-line sk-td-id"></div></td>
                                                <td><div className="skeleton-line sk-td-date"></div></td>
                                                <td><div className="skeleton-line sk-td-amount"></div></td>
                                                <td><div className="skeleton-line sk-td-status"></div></td>
                                                <td className="text-center">
                                                    <div className="skeleton-line sk-td-action mx-auto"></div>
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
