import React from 'react';

export default function BillingDetailsLoader() {
    return (
        <div className="fade-panel">
            <div className="row">
                <div className="col-12">

                    {/* Card 1: Subscriber Profile & Contract Metadata Skeleton */}
                    <div className="card shadow-sm border-0 mb-4">
                        <div className="card-header align-items-center d-flex border-0 bg-transparent py-3">
                            <div className="d-flex align-items-center flex-grow-1">
                                <div className="avatar-xs flex-shrink-0 me-3">
                                    <div className="skeleton-line rounded sk-avatar-32"></div>
                                </div>
                                <div className="d-flex flex-column">
                                    <div className="skeleton-line sk-title-sub"></div>
                                    <div className="skeleton-line sk-subtitle-sub"></div>
                                </div>
                            </div>
                            <div className="flex-shrink-0 text-end">
                                <div className="skeleton-line rounded sk-badge-status"></div>
                            </div>
                        </div>
                        <div className="card-body p-4 pt-2">
                            <div className="row g-4">
                                <div className="col-sm-6 col-md-3">
                                    <div className="d-flex flex-column">
                                        <div className="skeleton-line sk-grid-label-1"></div>
                                        <div className="skeleton-line rounded sk-grid-val-1"></div>
                                    </div>
                                </div>
                                <div className="col-sm-6 col-md-3">
                                    <div className="d-flex flex-column">
                                        <div className="skeleton-line sk-grid-label-2"></div>
                                        <div className="skeleton-line sk-grid-val-2"></div>
                                    </div>
                                </div>
                                <div className="col-sm-6 col-md-3">
                                    <div className="d-flex flex-column">
                                        <div className="skeleton-line sk-grid-label-3"></div>
                                        <div className="skeleton-line sk-grid-val-3"></div>
                                    </div>
                                </div>
                                <div className="col-sm-6 col-md-3">
                                    <div className="d-flex flex-column">
                                        <div className="skeleton-line sk-grid-label-4"></div>
                                        <div className="skeleton-line rounded sk-grid-val-4"></div>
                                    </div>
                                </div>
                                <div className="col-sm-6 col-md-3">
                                    <div className="d-flex flex-column">
                                        <div className="skeleton-line sk-grid-label-5"></div>
                                        <div className="skeleton-line sk-grid-val-5"></div>
                                    </div>
                                </div>
                                <div className="col-sm-6 col-md-3">
                                    <div className="d-flex flex-column">
                                        <div className="skeleton-line sk-grid-label-6"></div>
                                        <div className="skeleton-line sk-grid-val-6"></div>
                                    </div>
                                </div>
                                <div className="col-sm-6 col-md-3">
                                    <div className="d-flex flex-column">
                                        <div className="skeleton-line sk-grid-label-7"></div>
                                        <div className="skeleton-line sk-grid-val-7"></div>
                                    </div>
                                </div>
                                <div className="col-sm-6 col-md-3">
                                    <div className="d-flex flex-column">
                                        <div className="skeleton-line sk-grid-label-8"></div>
                                        <div className="skeleton-line sk-grid-val-8"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Financial Breakdown & Progression Skeleton */}
                    <div className="card shadow-sm border-0 mb-4">
                        <div className="card-header align-items-center d-flex border-0 bg-transparent py-3">
                            <div className="skeleton-line sk-card-title-lg"></div>
                        </div>
                        <div className="card-body p-4 pt-2">
                            {/* Installment Progress Skeleton Bar */}
                            <div className="bg-light bg-opacity-50 p-3 rounded mb-4">
                                <div className="d-flex align-items-center justify-content-between mb-2">
                                    <div className="skeleton-line sk-progress-label"></div>
                                    <div className="skeleton-line rounded sk-progress-badge"></div>
                                </div>
                                <div className="skeleton-line rounded-pill sk-progress-bar"></div>
                            </div>

                            {/* Financial Details Grid */}
                            <div className="row g-4">
                                <div className="col-sm-6 col-md-3">
                                    <div className="d-flex flex-column">
                                        <div className="skeleton-line sk-grid-label-f1"></div>
                                        <div className="skeleton-line sk-grid-val-f1"></div>
                                    </div>
                                </div>
                                <div className="col-sm-6 col-md-3">
                                    <div className="d-flex flex-column">
                                        <div className="skeleton-line sk-grid-label-f2"></div>
                                        <div className="skeleton-line sk-grid-val-f2"></div>
                                    </div>
                                </div>
                                <div className="col-sm-6 col-md-3">
                                    <div className="d-flex flex-column">
                                        <div className="skeleton-line sk-grid-label-f3"></div>
                                        <div className="skeleton-line sk-grid-val-f3"></div>
                                    </div>
                                </div>
                                <div className="col-sm-6 col-md-3">
                                    <div className="d-flex flex-column">
                                        <div className="skeleton-line sk-grid-label-f4"></div>
                                        <div className="skeleton-line sk-grid-val-f4"></div>
                                    </div>
                                </div>
                                <div className="col-sm-6 col-md-3">
                                    <div className="d-flex flex-column">
                                        <div className="skeleton-line sk-grid-label-f5"></div>
                                        <div className="skeleton-line sk-grid-val-f5"></div>
                                    </div>
                                </div>
                                <div className="col-sm-6 col-md-3">
                                    <div className="d-flex flex-column">
                                        <div className="skeleton-line sk-grid-label-f6"></div>
                                        <div className="skeleton-line sk-grid-val-f6"></div>
                                    </div>
                                </div>
                                <div className="col-sm-6 col-md-3">
                                    <div className="d-flex flex-column">
                                        <div className="skeleton-line sk-grid-label-f7"></div>
                                        <div className="skeleton-line sk-grid-val-f7"></div>
                                    </div>
                                </div>
                                <div className="col-sm-6 col-md-3">
                                    <div className="d-flex flex-column">
                                        <div className="skeleton-line sk-grid-label-f8"></div>
                                        <div className="skeleton-line sk-grid-val-f8"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Invoices Ledger Table Skeleton */}
                    <div className="card shadow-sm border-0 mb-4">
                        <div className="card-header align-items-center d-flex border-0 bg-transparent py-3">
                            <div className="skeleton-line sk-card-title-sm"></div>
                        </div>
                        <div className="card-body p-4 pt-2">
                            <div className="table-responsive">
                                <table className="table table-borderless align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th className="sk-col-id">
                                                <div className="skeleton-line sk-th-id"></div>
                                            </th>
                                            <th className="sk-col-date">
                                                <div className="skeleton-line sk-th-date"></div>
                                            </th>
                                            <th className="sk-col-amount">
                                                <div className="skeleton-line sk-th-amount"></div>
                                            </th>
                                            <th className="sk-col-type">
                                                <div className="skeleton-line sk-th-type"></div>
                                            </th>
                                            <th className="sk-col-status">
                                                <div className="skeleton-line sk-th-status"></div>
                                            </th>
                                            <th className="sk-col-action">
                                                <div className="skeleton-line sk-th-action"></div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[1, 2, 3].map((rowIdx) => (
                                            <tr key={rowIdx}>
                                                <td className="sk-td-cell">
                                                    <div className="skeleton-line sk-td-id"></div>
                                                </td>
                                                <td className="sk-td-cell">
                                                    <div className="skeleton-line sk-td-date"></div>
                                                </td>
                                                <td className="sk-td-cell">
                                                    <div className="skeleton-line sk-td-amount"></div>
                                                </td>
                                                <td className="sk-td-cell">
                                                    <div className="skeleton-line sk-td-type"></div>
                                                </td>
                                                <td className="sk-td-cell">
                                                    <div className="skeleton-line rounded-pill sk-td-status"></div>
                                                </td>
                                                <td className="text-center sk-td-cell">
                                                    <div className="skeleton-line rounded sk-td-btn"></div>
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

