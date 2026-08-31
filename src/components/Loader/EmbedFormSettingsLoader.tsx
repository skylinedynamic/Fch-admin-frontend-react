import React from 'react';

export const EmbedFormSettingsSkeleton: React.FC = () => {
    return (
        <div className="animate__animated animate__fadeIn">
            {/* Main Content Grid */}
            <div className="row g-3 g-lg-4 embed-main-grid">
                {/* Left Column: Form Settings Skeleton */}
                <div className="col-lg-7">
                    {/* Summary Metrics Row */}
                    <div className="row g-2 g-sm-3 mb-3 embed-metrics-row">
                        <div className="col-6">
                            <div className="card shadow-sm border-0 mb-0 h-100">
                                <div className="card-body p-2.5 p-sm-3 d-flex align-items-center gap-2 gap-sm-3">
                                    <div className="skeleton-line rounded-3 embed-avatar-stat flex-shrink-0" />
                                    <div className="flex-grow-1 min-w-0">
                                        <div className="skeleton-line sk-w-80 sk-h-10 mb-1" />
                                        <div className="skeleton-line sk-w-40 sk-h-20" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-6">
                            <div className="card shadow-sm border-0 mb-0 h-100">
                                <div className="card-body p-2.5 p-sm-3 d-flex align-items-center gap-2 gap-sm-3">
                                    <div className="skeleton-line rounded-3 embed-avatar-stat flex-shrink-0" />
                                    <div className="flex-grow-1 min-w-0">
                                        <div className="skeleton-line sk-w-60 sk-h-10 mb-1" />
                                        <div className="skeleton-line sk-w-70 sk-h-18 rounded-pill" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Configuration Form Card Skeleton */}
                    <div className="card shadow-sm border-0 mb-3 mb-lg-4">
                        <div className="card-header bg-transparent border-0 py-3 px-3 px-sm-4">
                            <div className="d-flex align-items-center">
                                <div className="skeleton-line rounded-circle embed-header-avatar me-2.5 me-sm-3 flex-shrink-0" />
                                <div className="flex-grow-1">
                                    <div className="skeleton-line sk-w-160 sk-h-16 mb-1" />
                                    <div className="skeleton-line sk-w-60p sk-h-10" />
                                </div>
                            </div>
                        </div>

                        <div className="card-body p-3 p-sm-4 pt-0">
                            {/* Form Title Skeleton */}
                            <div className="mb-3">
                                <div className="skeleton-line sk-w-100 sk-h-12 mb-1" />
                                <div className="skeleton-line w-100 sk-h-38 rounded" />
                                <div className="skeleton-line sk-w-50p sk-h-10 mt-1" />
                            </div>

                            {/* Notification Email Skeleton */}
                            <div className="mb-3">
                                <div className="skeleton-line sk-w-140 sk-h-12 mb-1" />
                                <div className="skeleton-line w-100 sk-h-38 rounded" />
                                <div className="skeleton-line sk-w-60p sk-h-10 mt-1" />
                            </div>

                            {/* Form Active Switch Skeleton */}
                            <div className="mb-3 p-3 rounded-3 bg-light d-flex align-items-center justify-content-between">
                                <div className="flex-grow-1 me-2">
                                    <div className="skeleton-line sk-w-120 sk-h-14 mb-1" />
                                    <div className="skeleton-line sk-w-180 sk-h-10" />
                                </div>
                                <div className="skeleton-line rounded-pill sk-w-45 sk-h-24 flex-shrink-0" />
                            </div>

                            {/* Allowed Domains Skeleton */}
                            <div className="mb-3 mt-4">
                                <div className="skeleton-line sk-w-120 sk-h-12 mb-1" />
                                <div className="d-flex gap-2 mb-2">
                                    <div className="skeleton-line flex-grow-1 sk-h-38 rounded" />
                                    <div className="skeleton-line sk-w-90 sk-h-38 rounded" />
                                </div>
                                <div className="d-flex flex-wrap gap-2 mt-2">
                                    <div className="skeleton-line sk-w-120 sk-h-26 rounded-pill" />
                                    <div className="skeleton-line sk-w-150 sk-h-26 rounded-pill" />
                                </div>
                            </div>

                            {/* Submit Button Skeleton (Desktop) */}
                            <div className="d-none d-lg-flex justify-content-end mt-4">
                                <div className="skeleton-line rounded sk-w-160 sk-h-38" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Embed Snippet & Share Links Skeleton */}
                <div className="col-lg-5">
                    <div className="card shadow-sm border-0 mb-3 mb-lg-4 embed-sticky-card">
                        <div className="card-header bg-transparent border-0 py-3 px-3 px-sm-4">
                            <div className="d-flex align-items-center">
                                <div className="skeleton-line rounded-circle embed-header-avatar me-2.5 me-sm-3 flex-shrink-0" />
                                <div className="flex-grow-1">
                                    <div className="skeleton-line sk-w-120 sk-h-16 mb-1" />
                                    <div className="skeleton-line sk-w-50p sk-h-10" />
                                </div>
                            </div>
                        </div>

                        <div className="card-body p-3 p-sm-4 pt-0">
                            {/* Partner Public Key Skeleton */}
                            <div className="mb-3 p-3 bg-light rounded-3">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <div className="skeleton-line sk-w-110 sk-h-10" />
                                    <div className="skeleton-line sk-w-50 sk-h-10" />
                                </div>
                                <div className="skeleton-line w-100 sk-h-14" />
                            </div>

                            {/* Direct Shareable Link Skeleton */}
                            <div className="mb-3">
                                <div className="skeleton-line sk-w-120 sk-h-12 mb-1" />
                                <div className="d-flex gap-2 mb-2">
                                    <div className="skeleton-line flex-grow-1 sk-h-38 rounded" />
                                    <div className="skeleton-line sk-w-70 sk-h-38 rounded" />
                                </div>
                                <div className="d-flex justify-content-between align-items-center">
                                    <div className="skeleton-line sk-w-160 sk-h-10" />
                                    <div className="skeleton-line sk-w-40 sk-h-10" />
                                </div>
                            </div>

                            {/* iFrame Embed Code Skeleton */}
                            <div className="mb-3">
                                <div className="skeleton-line sk-w-160 sk-h-12 mb-1" />
                                <div className="skeleton-line w-100 sk-h-80 rounded" />
                                <div className="skeleton-line w-100 sk-h-38 rounded mt-2" />
                                <div className="skeleton-line sk-w-60p sk-h-10 mt-1.5" />
                            </div>

                            {/* Key Management Alert Skeleton */}
                            <div className="p-3 bg-light rounded-3">
                                <div className="skeleton-line sk-w-110 sk-h-12 mb-1" />
                                <div className="skeleton-line w-100 sk-h-10 mb-2" />
                                <div className="skeleton-line sk-w-160 sk-h-30 rounded" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Bottom Submit Button Skeleton */}
                <div className="col-12 d-lg-none mt-1 mb-3">
                    <div className="p-2">
                        <div className="skeleton-line rounded w-100 sk-h-38" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmbedFormSettingsSkeleton;
