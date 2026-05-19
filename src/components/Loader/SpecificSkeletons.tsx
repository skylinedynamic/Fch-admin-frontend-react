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
