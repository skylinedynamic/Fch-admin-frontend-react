import React from 'react';

/**
 * Custom skeleton loader for the Agreement Dashboard
 * Mimics the global feature toggle and the list rows
 */
export const AgreementDashboardSkeleton: React.FC = () => {
    return (
        <div className="animate__animated animate__fadeIn">
            {/* Global Feature Toggle Skeleton */}
            <div className="p-3 bg-primary-subtle rounded-3 mb-4 d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3">
                    <div className="skeleton-line sk-rounded-circle sk-w-32 sk-h-32"></div>
                    <div>
                        <div className="skeleton-line mb-1 sk-w-160 sk-h-14"></div>
                        <div className="skeleton-line sk-w-220 sk-h-10"></div>
                    </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <div className="skeleton-line mb-0 sk-w-45 sk-h-14"></div>
                    <div className="skeleton-line rounded-pill sk-w-45 sk-h-24"></div>
                </div>
            </div>

            {/* List Items Skeleton */}
            {[1, 2].map((i) => (
                <div key={i} className="d-flex align-items-center gap-3 py-3">
                    <div className="skeleton-line rounded sk-w-40 sk-h-40 opacity-50" style={{ backgroundColor: '#fde8e8' }}></div>
                    <div className="flex-grow-1">
                        <div className="skeleton-line mb-2 sk-w-180 sk-h-16"></div>
                        <div className="skeleton-line sk-w-220 sk-h-12"></div>
                    </div>
                    <div className="d-flex align-items-center gap-3 flex-shrink-0">
                        <div className="d-flex align-items-center gap-2">
                            <div className="skeleton-line mb-0 sk-w-40 sk-h-12"></div>
                            <div className="skeleton-line rounded-pill sk-w-40 sk-h-22"></div>
                        </div>
                        <div className="skeleton-line rounded sk-w-110 sk-h-34"></div>
                    </div>
                </div>
            ))}
        </div>
    );
};

/**
 * Custom skeleton loader for the Stripe Configuration Form
 */
export const StripeConfigSkeleton: React.FC = () => {
    return (
        <div className="animate__animated animate__fadeIn">
            {/* Info Banner */}
            <div className="d-flex align-items-center bg-info-subtle rounded-3 p-3 mb-4">
                <div className="skeleton-line rounded sk-w-40 sk-h-40 me-4"></div>
                <div className="flex-grow-1">
                    <div className="skeleton-line mb-2 sk-w-140 sk-h-16"></div>
                    <div className="skeleton-line sk-w-400 sk-h-12"></div>
                </div>
            </div>

            {/* Environment Toggle */}
            <div className="mb-4 bg-primary-subtle rounded-3 p-3">
                <div className="d-flex align-items-center justify-content-between">
                    <div>
                        <div className="skeleton-line mb-1 sk-w-160 sk-h-16"></div>
                        <div className="skeleton-line sk-w-280 sk-h-12"></div>
                    </div>
                    <div className="skeleton-line rounded sk-w-180 sk-h-38"></div>
                </div>
            </div>

            <div className="row g-4 mt-2">
                {[1, 2].map(i => (
                    <div key={i} className="col-12">
                        <div className="skeleton-line rounded w-100 sk-h-42"></div>
                    </div>
                ))}
            </div>

            <div className="col-12 mt-5 pt-3 border-top">
                <div className="d-flex justify-content-end">
                    <div className="skeleton-line rounded sk-w-180 sk-h-40"></div>
                </div>
            </div>
        </div>
    );
};

/**
 * Custom skeleton loader for the MicroBilt Configuration Form
 */
export const MicroBiltConfigSkeleton: React.FC = () => {
    return (
        <div className="animate__animated animate__fadeIn">
            {/* Info Banner */}
            <div className="d-flex align-items-center bg-info-subtle rounded-3 p-3 mb-4">
                <div className="skeleton-line rounded sk-w-40 sk-h-40 me-4"></div>
                <div className="flex-grow-1">
                    <div className="skeleton-line mb-2 sk-w-200 sk-h-16"></div>
                    <div className="skeleton-line sk-w-450 sk-h-12"></div>
                </div>
            </div>

            {/* Environment Toggle */}
            <div className="mb-4 bg-primary-subtle rounded-3 p-3">
                <div className="d-flex align-items-center justify-content-between">
                    <div>
                        <div className="skeleton-line mb-1 sk-w-160 sk-h-16"></div>
                        <div className="skeleton-line sk-w-280 sk-h-12"></div>
                    </div>
                    <div className="skeleton-line rounded sk-w-180 sk-h-38"></div>
                </div>
            </div>

            <div className="row g-4 mt-2">
                <div className="col-12">
                    <div className="skeleton-line rounded w-100 sk-h-42"></div>
                </div>
                <div className="col-lg-6">
                    <div className="skeleton-line rounded w-100 sk-h-42"></div>
                </div>
                <div className="col-lg-6">
                    <div className="skeleton-line rounded w-100 sk-h-42"></div>
                </div>
            </div>

            <div className="col-12 mt-5 pt-3 border-top">
                <div className="d-flex justify-content-end">
                    <div className="skeleton-line rounded sk-w-180 sk-h-40"></div>
                </div>
            </div>
        </div>
    );
};

/**
 * Custom skeleton loader for the Email Configuration Form
 */
export const OpenAiConfigSkeleton: React.FC = () => {
    return (
        <div className="animate__animated animate__fadeIn">
            <div className="row g-4">
                {/* API key field (full width) + helper text */}
                <div className="col-12">
                    <div className="skeleton-line mb-2 sk-w-160 sk-h-12"></div>
                    <div className="skeleton-line rounded w-100 sk-h-42"></div>
                    <div className="skeleton-line mt-2 sk-w-450 sk-h-12"></div>
                </div>

                {/* Model field (half width) + helper text */}
                <div className="col-lg-6">
                    <div className="skeleton-line mb-2 sk-w-160 sk-h-12"></div>
                    <div className="skeleton-line rounded w-100 sk-h-42"></div>
                    <div className="skeleton-line mt-2 sk-w-280 sk-h-12"></div>
                </div>

                {/* Reasoning-effort info banner */}
                <div className="col-12">
                    <div className="d-flex align-items-center bg-info-subtle rounded-3 p-3">
                        <div className="skeleton-line rounded sk-w-40 sk-h-40 me-4"></div>
                        <div className="flex-grow-1">
                            <div className="skeleton-line mb-2 sk-w-450 sk-h-12"></div>
                            <div className="skeleton-line sk-w-280 sk-h-12"></div>
                        </div>
                    </div>
                </div>

                {/* Support assistants: Borrower and WL Partner agent ID fields + switches */}
                {[0, 1].map((i) => (
                    <div className="col-lg-6" key={i}>
                        <div className="skeleton-line mb-2 sk-w-160 sk-h-12"></div>
                        <div className="skeleton-line rounded w-100 sk-h-42"></div>
                        <div className="skeleton-line mt-2 sk-w-280 sk-h-12"></div>
                        <div className="skeleton-line mt-2 sk-w-160 sk-h-12"></div>
                    </div>
                ))}
            </div>

            <div className="col-12 mt-5 pt-3 border-top">
                <div className="d-flex justify-content-end">
                    <div className="skeleton-line rounded sk-w-180 sk-h-40"></div>
                </div>
            </div>
        </div>
    );
};

export const AiUnderwritingResultSkeleton: React.FC = () => {
    return (
        <div className="animate__animated animate__fadeIn">
            {/* Meta bar: model / status / latency / evaluated-at */}
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 p-3 mb-4 rounded-3 border bg-light">
                <div className="d-flex align-items-center gap-2">
                    <div className="skeleton-line rounded sk-w-160 sk-h-28"></div>
                    <div className="skeleton-line rounded sk-w-160 sk-h-28"></div>
                </div>
                <div className="skeleton-line rounded sk-w-180 sk-h-16"></div>
            </div>

            {/* Recommended funding programs: three cards */}
            <div className="skeleton-line mb-3 sk-w-280 sk-h-16"></div>
            <div className="row g-3 mb-4">
                {[1, 2, 3].map(i => (
                    <div className="col-md-6 col-lg-4" key={i}>
                        <div className="card border shadow-none mb-0">
                            <div className="card-body p-3 d-flex align-items-center gap-3">
                                <div className="skeleton-line rounded sk-w-40 sk-h-40"></div>
                                <div className="flex-grow-1">
                                    <div className="skeleton-line mb-2 sk-w-160 sk-h-16"></div>
                                    <div className="skeleton-line sk-w-80 sk-h-12"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Required document checklist */}
            <div className="skeleton-line mb-3 sk-w-280 sk-h-16"></div>
            <div className="bg-light p-3 rounded border mb-4">
                {[1, 2, 3, 4].map(i => (
                    <div className="d-flex align-items-center gap-2 py-2" key={i}>
                        <div className="skeleton-line rounded sk-w-16 sk-h-16"></div>
                        <div className="skeleton-line sk-w-450 sk-h-12"></div>
                    </div>
                ))}
            </div>

            {/* Borrower-facing summary, then the internal memo block */}
            <div className="skeleton-line mb-3 sk-w-280 sk-h-16"></div>
            <div className="skeleton-line rounded w-100 sk-h-60 mb-4"></div>
            <div className="skeleton-line mb-3 sk-w-280 sk-h-16"></div>
            <div className="skeleton-line rounded w-100 sk-h-120"></div>
        </div>
    );
};

export const EmailConfigSkeleton: React.FC = () => {
    return (
        <div className="animate__animated animate__fadeIn">
            {/* Info Banner */}
            <div className="d-flex align-items-center bg-info-subtle rounded-3 p-3 mb-4">
                <div className="skeleton-line rounded sk-w-50 sk-h-50 me-4"></div>
                <div className="flex-grow-1">
                    <div className="skeleton-line mb-2 sk-w-220 sk-h-16"></div>
                    <div className="skeleton-line sk-w-500 sk-h-12"></div>
                </div>
            </div>

            {/* Provider Toggle */}
            <div className="mb-4 bg-primary-subtle rounded-3 p-3">
                <div className="d-flex align-items-center justify-content-between">
                    <div>
                        <div className="skeleton-line mb-1 sk-w-120 sk-h-16"></div>
                        <div className="skeleton-line sk-w-300 sk-h-12"></div>
                    </div>
                    <div className="skeleton-line rounded sk-w-180 sk-h-38"></div>
                </div>
            </div>

            <div className="row g-4 mb-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="col-md-6">
                        <div className="skeleton-line rounded w-100 sk-h-42"></div>
                    </div>
                ))}
            </div>

            <div className="col-12 mt-5 pt-3 border-top">
                <div className="d-flex justify-content-end">
                    <div className="skeleton-line rounded sk-w-180 sk-h-40"></div>
                </div>
            </div>
        </div>
    );
};

/**
 * Custom skeleton loader for the Branding Form
 */
export const BrandingSkeleton: React.FC = () => {
    return (
        <div className="animate__animated animate__fadeIn">
            <div className="row g-4">
                <div className="col-12">
                    <div className="skeleton-line mb-2 sk-w-100 sk-h-14"></div>
                    <div className="skeleton-line rounded w-100 sk-h-38"></div>
                </div>
                <div className="col-12">
                    <div className="skeleton-line mb-2 sk-w-100 sk-h-14"></div>
                    <div className="skeleton-line rounded w-100 sk-h-38"></div>
                </div>

                <div className="col-md-4">
                    <div className="skeleton-line rounded w-100 sk-h-120"></div>
                </div>
                <div className="col-md-4">
                    <div className="skeleton-line rounded w-100 sk-h-120"></div>
                </div>
                <div className="col-md-4">
                    <div className="skeleton-line rounded w-100 sk-h-120"></div>
                </div>

                <div className="col-md-6">
                    <div className="skeleton-line mb-2 sk-w-150 sk-h-14"></div>
                    <div className="d-flex gap-2">
                        <div className="skeleton-line rounded sk-w-60 sk-h-38"></div>
                        <div className="skeleton-line rounded w-100 sk-h-38"></div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="skeleton-line mb-2 sk-w-150 sk-h-14"></div>
                    <div className="d-flex gap-2">
                        <div className="skeleton-line rounded sk-w-60 sk-h-38"></div>
                        <div className="skeleton-line rounded w-100 sk-h-38"></div>
                    </div>
                </div>
            </div>

            <div className="text-end mt-5 pt-3 border-top">
                <div className="skeleton-line rounded sk-w-160 sk-h-40 d-inline-block"></div>
            </div>
        </div>
    );
};
/**
 * Custom skeleton loader for the Tenant Domain Configuration Form
 */
export const TenantDomainSkeleton: React.FC = () => {
    return (
        <div className="animate__animated animate__fadeIn">
            {/* Status Toggle Banner */}
            <div className="p-3 bg-light rounded-3 mb-4">
                <div className="d-flex align-items-center gap-3">
                    <div className="skeleton-line rounded sk-w-45 sk-h-24"></div>
                    <div className="skeleton-line sk-w-180 sk-h-16"></div>
                </div>
                <div className="skeleton-line mt-2 sk-w-300 sk-h-12 ms-1"></div>
            </div>

            <div className="row g-4">
                <div className="col-lg-6">
                    <div className="skeleton-line mb-2 sk-w-150 sk-h-14"></div>
                    <div className="skeleton-line rounded w-100 sk-h-42"></div>
                </div>
                <div className="col-lg-6">
                    <div className="skeleton-line mb-2 sk-w-150 sk-h-14"></div>
                    <div className="skeleton-line rounded w-100 sk-h-42"></div>
                </div>
            </div>

            <div className="d-flex justify-content-end mt-4 pt-3 border-top">
                <div className="skeleton-line rounded sk-w-180 sk-h-40"></div>
            </div>
        </div>
    );
};

/**
 * Custom skeleton loader for the Capital Access Section
 */
export const CapitalAccessSkeleton: React.FC = () => {
    return (
        <div className="ca-page-wrap pt-0 animate__animated animate__fadeIn">
            <div className="d-flex justify-content-end mb-4">
                <div className="skeleton-line rounded sk-w-130 sk-h-32"></div>
            </div>

            <div className="row g-4 mb-4">
                {/* Capital Access Readiness Scores Card Skeleton */}
                <div className="col-md-6">
                    <div className="ca-metric-card h-100">
                        <div className="ca-metric-header">
                            <div className="ca-metric-title-block">
                                <div className="skeleton-line mb-2 sk-w-150 sk-h-14"></div>
                                <div className="d-flex align-items-center gap-2">
                                    <div className="skeleton-line sk-w-60 sk-h-34"></div>
                                    <div className="skeleton-line rounded-pill sk-w-60 sk-h-24"></div>
                                </div>
                            </div>
                            <div className="skeleton-line rounded sk-w-44 sk-h-44"></div>
                        </div>

                        <div className="ca-slider-wrapper">
                            <div className="ca-custom-progress-container">
                                <div className="skeleton-line w-100 sk-h-10 rounded-3"></div>
                            </div>
                        </div>

                        <div className="ca-score-factors mt-3">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="d-flex align-items-center justify-content-between py-1">
                                    <div className="skeleton-line sk-w-110 sk-h-12"></div>
                                    <div className="skeleton-line sk-w-60 sk-h-12"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Estimated Total Access Card Skeleton */}
                <div className="col-md-6">
                    <div className="ca-metric-card h-100">
                        <div className="ca-metric-header">
                            <div className="ca-metric-title-block">
                                <div className="skeleton-line mb-2 sk-w-150 sk-h-14"></div>
                                <div className="skeleton-line sk-w-110 sk-h-34"></div>
                            </div>
                            <div className="skeleton-line rounded sk-w-44 sk-h-44"></div>
                        </div>

                        <div className="ca-exposure-vertical-chart">
                            <div className="ca-exposure-vertical-bar skeleton-line rounded sk-h-38"></div>
                            <div className="ca-exposure-vertical-bar skeleton-line rounded sk-h-42"></div>
                            <div className="ca-exposure-vertical-bar skeleton-line rounded sk-h-60"></div>
                            <div className="ca-exposure-vertical-bar skeleton-line rounded sk-h-38"></div>
                            <div className="ca-exposure-vertical-bar skeleton-line rounded sk-h-42"></div>
                        </div>

                        <div className="ca-access-footer">
                            <div className="skeleton-line sk-w-130 sk-h-12"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="ca-next-step-card mt-4">
                <div className="ca-next-step-content w-100">
                    <div className="skeleton-line mb-2 sk-w-110 sk-h-16"></div>
                    <div className="skeleton-line w-100 sk-h-12"></div>
                </div>
            </div>
        </div>
    );
};

/**
 * Custom skeleton loader for the Embed Form Configuration / Settings Page
 */
export const EmbedFormSettingsSkeleton: React.FC = () => {
    return (
        <div className="animate__animated animate__fadeIn">
            <div className="row g-4">
                {/* Left Column: Form Settings */}
                <div className="col-lg-7">
                    {/* Summary Metrics Row */}
                    <div className="row g-3 mb-4">
                        <div className="col-sm-6">
                            <div className="card shadow-sm border-0 mb-0">
                                <div className="card-body p-3 d-flex align-items-center gap-3">
                                    <div className="skeleton-line rounded-3 flex-shrink-0" style={{ width: '48px', height: '48px' }} />
                                    <div className="flex-grow-1">
                                        <div className="skeleton-line mb-2" style={{ width: '100px', height: '11px' }} />
                                        <div className="skeleton-line" style={{ width: '60px', height: '24px' }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-sm-6">
                            <div className="card shadow-sm border-0 mb-0">
                                <div className="card-body p-3 d-flex align-items-center gap-3">
                                    <div className="skeleton-line rounded-3 flex-shrink-0" style={{ width: '48px', height: '48px' }} />
                                    <div className="flex-grow-1">
                                        <div className="skeleton-line mb-2" style={{ width: '80px', height: '11px' }} />
                                        <div className="skeleton-line" style={{ width: '120px', height: '20px' }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Configuration Form Card Skeleton */}
                    <div className="card shadow-sm border-0 mb-4">
                        <div className="card-header bg-transparent border-0 pb-3 pt-4 px-4">
                            <div className="d-flex align-items-center">
                                <div className="skeleton-line rounded-circle me-3 flex-shrink-0" style={{ width: '40px', height: '40px' }} />
                                <div className="flex-grow-1">
                                    <div className="skeleton-line mb-2" style={{ width: '160px', height: '18px' }} />
                                    <div className="skeleton-line" style={{ width: '300px', height: '12px' }} />
                                </div>
                            </div>
                        </div>

                        <div className="card-body p-4">
                            {/* Form Title Field */}
                            <div className="mb-3">
                                <div className="skeleton-line mb-2" style={{ width: '90px', height: '14px' }} />
                                <div className="skeleton-line rounded w-100 mb-1" style={{ height: '42px' }} />
                                <div className="skeleton-line" style={{ width: '280px', height: '11px' }} />
                            </div>

                            {/* Notification Email Field */}
                            <div className="mb-3">
                                <div className="skeleton-line mb-2" style={{ width: '160px', height: '14px' }} />
                                <div className="skeleton-line rounded w-100 mb-1" style={{ height: '42px' }} />
                                <div className="skeleton-line" style={{ width: '380px', height: '11px' }} />
                            </div>

                            {/* Form Active Switch */}
                            <div className="mb-4 pt-2">
                                <div className="skeleton-line mb-2" style={{ width: '90px', height: '14px' }} />
                                <div className="d-flex align-items-center gap-2">
                                    <div className="skeleton-line rounded-pill" style={{ width: '44px', height: '24px' }} />
                                    <div className="skeleton-line" style={{ width: '240px', height: '14px' }} />
                                </div>
                            </div>

                            <div className="my-4" />

                            {/* Allowed Domains */}
                            <div className="mb-4">
                                <div className="skeleton-line mb-2" style={{ width: '130px', height: '14px' }} />
                                <div className="skeleton-line rounded w-100 mb-2" style={{ height: '42px' }} />
                                <div className="d-flex gap-2">
                                    <div className="skeleton-line rounded-pill" style={{ width: '140px', height: '28px' }} />
                                    <div className="skeleton-line rounded-pill" style={{ width: '160px', height: '28px' }} />
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="d-flex justify-content-end">
                                <div className="skeleton-line rounded" style={{ width: '160px', height: '40px' }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Embed & Share Card Skeleton */}
                <div className="col-lg-5">
                    <div className="card shadow-sm border-0 mb-4">
                        <div className="card-header bg-transparent border-0 pb-3 pt-4 px-4">
                            <div className="d-flex align-items-center">
                                <div className="skeleton-line rounded-circle me-3 flex-shrink-0" style={{ width: '40px', height: '40px' }} />
                                <div className="flex-grow-1">
                                    <div className="skeleton-line mb-2" style={{ width: '130px', height: '18px' }} />
                                    <div className="skeleton-line" style={{ width: '220px', height: '12px' }} />
                                </div>
                            </div>
                        </div>

                        <div className="card-body p-4">
                            {/* Partner Key Box */}
                            <div className="mb-4 p-3 bg-light rounded">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <div className="skeleton-line" style={{ width: '110px', height: '11px' }} />
                                    <div className="skeleton-line" style={{ width: '60px', height: '12px' }} />
                                </div>
                                <div className="skeleton-line" style={{ width: '100%', height: '16px' }} />
                            </div>

                            {/* Direct Shareable Link */}
                            <div className="mb-4">
                                <div className="skeleton-line mb-2" style={{ width: '130px', height: '14px' }} />
                                <div className="skeleton-line rounded w-100 mb-2" style={{ height: '42px' }} />
                                <div className="skeleton-line" style={{ width: '220px', height: '11px' }} />
                            </div>

                            {/* iFrame Embed Snippet */}
                            <div className="mb-4">
                                <div className="skeleton-line mb-2" style={{ width: '180px', height: '14px' }} />
                                <div className="skeleton-line rounded w-100 mb-2" style={{ height: '100px' }} />
                                <div className="skeleton-line rounded w-100 mb-2" style={{ height: '40px' }} />
                                <div className="skeleton-line" style={{ width: '280px', height: '11px' }} />
                            </div>

                            {/* Key Management Alert box */}
                            <div className="p-3 bg-warning-subtle rounded">
                                <div className="d-flex align-items-start gap-2">
                                    <div className="skeleton-line rounded-circle flex-shrink-0" style={{ width: '20px', height: '20px' }} />
                                    <div className="flex-grow-1">
                                        <div className="skeleton-line mb-1" style={{ width: '110px', height: '14px' }} />
                                        <div className="skeleton-line mb-2" style={{ width: '220px', height: '12px' }} />
                                        <div className="skeleton-line rounded" style={{ width: '160px', height: '32px' }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


