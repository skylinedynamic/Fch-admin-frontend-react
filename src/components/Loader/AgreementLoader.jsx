import React from 'react';

/**
 * Skeleton loader for the Agreement Dashboard (List View)
 * Matches the AgreementDashboard.jsx structure exactly
 */
export const AgreementDashboardLoader = () => {
    return (
        <div className="fade-panel h-100">
            {/* Header Area Skeleton */}
            <div className="card-header d-flex align-items-center gap-3">
                <div className="skeleton-line rounded sk-w-40 sk-h-40"></div>
                <div>
                    <div className="skeleton-line mb-1 sk-w-200 sk-h-20"></div>
                    <div className="skeleton-line sk-w-250 sk-h-12"></div>
                </div>
            </div>

            <div className="card-body p-4">
                {/* Global Feature Toggle Skeleton */}
                <div className="p-3 bg-primary-subtle rounded-3 mb-4 d-flex align-items-center justify-content-between border border-primary-subtle opacity-75">
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
                    <div key={i} className="d-flex align-items-center gap-3 py-3 border-bottom border-light last-child-no-border">
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
        </div>
    );
};

/**
 * Skeleton loader for the Agreement Builder (Editor View)
 */
export const AgreementBuilderLoader = () => {
    return (
        <div className="ab4-root fade-panel bg-light">
            {/* toolbar skeleton */}
            <div className="ab4-toolbar bg-white border-bottom p-3 d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3">
                    <div className="skeleton-line rounded sk-w-36 sk-h-36"></div>
                    <div>
                        <div className="skeleton-line mb-1 sk-w-160 sk-h-18"></div>
                        <div className="skeleton-line sk-w-250 sk-h-12"></div>
                    </div>
                </div>
                <div className="d-flex gap-2">
                    <div className="skeleton-line rounded sk-w-100 sk-h-32"></div>
                    <div className="skeleton-line rounded sk-w-80 sk-h-32"></div>
                    <div className="skeleton-line rounded sk-w-120 sk-h-32"></div>
                </div>
            </div>

            <div className="ab4-layout d-flex flex-1 overflow-hidden">
                {/* palette skeleton */}
                <div className="ab4-palette bg-white border-right p-3 sk-w-180">
                    <div className="skeleton-line mb-4 rounded sk-w-70p sk-h-12"></div>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="skeleton-line mb-2 rounded w-100 sk-h-38"></div>
                    ))}
                </div>

                {/* document canvas skeleton */}
                <div className="ab4-center flex-grow-1 p-5 d-flex flex-column align-items-center overflow-hidden">
                    <div className="skeleton-line mb-2 sk-w-794 sk-h-10"></div>
                    <div className="bg-white shadow rounded p-5 sk-w-794 sk-min-h-1000">
                        <div className="skeleton-line mb-5 mx-auto rounded sk-w-140 sk-h-50"></div>
                        <div className="skeleton-line mb-4 rounded sk-w-50p sk-h-28"></div>
                        <div className="skeleton-line mb-5 rounded sk-w-30p sk-h-14"></div>
                        <div className="skeleton-line mb-5 rounded w-100 sk-h-2"></div>
                        
                        <div className="skeleton-line mb-4 rounded w-100 sk-h-120"></div>
                        
                        <div className="row g-4 mb-5">
                            <div className="col-6"><div className="skeleton-line rounded sk-h-140"></div></div>
                            <div className="col-6"><div className="skeleton-line rounded sk-h-140"></div></div>
                        </div>

                        <div className="skeleton-line mb-3 rounded sk-w-40p sk-h-20"></div>
                        <div className="skeleton-line mb-4 rounded w-100 sk-h-80"></div>
                    </div>
                </div>

                {/* property panel skeleton */}
                <div className="ab4-props bg-white border-left p-3 sk-w-280">
                    <div className="skeleton-line mb-5 rounded sk-w-60p sk-h-20"></div>
                    
                    <div className="mb-4">
                        <div className="skeleton-line mb-2 rounded sk-w-45p sk-h-10"></div>
                        <div className="skeleton-line rounded w-100 sk-h-38"></div>
                    </div>

                    <div className="mb-4">
                        <div className="skeleton-line mb-2 rounded sk-w-50p sk-h-10"></div>
                        <div className="skeleton-line rounded w-100 sk-h-42"></div>
                    </div>

                    <div className="mb-4">
                        <div className="skeleton-line mb-3 rounded sk-w-40p sk-h-10"></div>
                        <div className="d-flex gap-2">
                             {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton-line rounded sk-w-32 sk-h-32"></div>)}
                        </div>
                    </div>

                    <div className="skeleton-line mt-auto rounded w-100 sk-h-120"></div>
                </div>
            </div>
        </div>
    );
};

/**
 * Skeleton loader for the Agreement Signing Modal
 */
export const AgreementSignModalLoader = () => {
    return (
        <div className="asm-overlay fade-panel">
            <div className="asm-main-wrapper">
                <div className="asm-modal-card">
                    {/* Side Info Skeleton */}
                    <div className="asm-side-info">
                        <div className="asm-brand-area d-flex align-items-center">
                            <div className="skeleton-line sk-rounded-circle sk-w-32 sk-h-32"></div>
                            <div className="skeleton-line ms-2 sk-w-120 sk-h-16"></div>
                        </div>
                        <div className="asm-step-box mt-5">
                            <div className="skeleton-line mb-2 sk-w-100 sk-h-12"></div>
                            <div className="skeleton-line mb-3 w-100 sk-h-24"></div>
                            <div className="skeleton-line sk-w-90 sk-h-40"></div>
                        </div>
                        <div className="mt-5">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="d-flex gap-3 mb-4">
                                    <div className="skeleton-line rounded sk-w-28 sk-h-28"></div>
                                    <div className="flex-grow-1">
                                        <div className="skeleton-line mb-1 sk-w-80 sk-h-12"></div>
                                        <div className="skeleton-line w-100 sk-h-10"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Content Area Skeleton */}
                    <div className="asm-content-area d-flex flex-column flex-grow-1">
                        <div className="asm-content-header border-bottom p-4">
                            <div className="skeleton-line mb-1 sk-w-180 sk-h-20"></div>
                            <div className="skeleton-line sk-w-120 sk-h-10"></div>
                        </div>
                        <div className="asm-document-frame p-4 flex-grow-1 bg-light">
                            <div className="bg-white shadow-sm p-5 h-100 rounded">
                                <div className="skeleton-line mb-5 mx-auto sk-w-140 sk-h-40"></div>
                                <div className="skeleton-line mb-4 sk-w-60p sk-h-24"></div>
                                <div className="skeleton-line mb-3 w-100 sk-h-12"></div>
                                <div className="skeleton-line mb-3 w-100 sk-h-12"></div>
                                <div className="skeleton-line mb-3 w-100 sk-h-12"></div>
                                <div className="skeleton-line mb-5 sk-w-80p sk-h-12"></div>
                                <div className="skeleton-line mb-4 sk-w-40p sk-h-20"></div>
                                <div className="skeleton-line mb-3 w-100 sk-h-12"></div>
                                <div className="skeleton-line mb-3 w-100 sk-h-12"></div>
                                <div className="skeleton-line w-100 sk-h-12"></div>
                            </div>
                        </div>
                        <div className="asm-action-footer p-4 border-top">
                            <div className="d-flex align-items-center justify-content-between">
                                <div className="d-flex align-items-center gap-2">
                                    <div className="skeleton-line rounded sk-w-20 sk-h-20"></div>
                                    <div className="skeleton-line sk-w-240 sk-h-14"></div>
                                </div>
                                <div className="skeleton-line rounded sk-w-160 sk-h-42"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
