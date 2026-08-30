import React from 'react';

const ResourceFormLoader: React.FC = () => {
    return (
        <div className="container-fluid">
            {/* Page Header Skeleton */}
            <div className="row page-subheader-sticky bg-body">
                <div className="col-12">
                    <div className="d-flex align-items-lg-center flex-lg-row flex-column py-2">
                        <div className="flex-grow-1">
                            <div className="skeleton-line sk-h-24 sk-w-180 mb-2"></div>
                            <div className="skeleton-line sk-h-14 sk-w-240"></div>
                        </div>
                        <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
                            <div className="skeleton-line sk-h-38 sk-w-110"></div>
                            <div className="skeleton-line sk-h-38 sk-w-110"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                {/* Main Form Skeleton (col-8) */}
                <div className="col-lg-8">
                    <div className="card shadow-sm">
                        <div className="card-body p-4">
                            {/* Section Title */}
                            <div className="skeleton-line sk-h-18 sk-w-160 mb-3"></div>
                            <hr className="mt-1 mb-4" />

                            <div className="row g-4">
                                <div className="col-lg-6">
                                    <div className="skeleton-line sk-h-14 sk-w-100 mb-2"></div>
                                    <div className="skeleton-line sk-h-38 w-100"></div>
                                </div>
                                <div className="col-lg-6">
                                    <div className="skeleton-line sk-h-14 sk-w-100 mb-2"></div>
                                    <div className="skeleton-line sk-h-38 w-100"></div>
                                </div>
                                <div className="col-lg-12">
                                    <div className="skeleton-line sk-h-14 sk-w-100 mb-2"></div>
                                    <div className="skeleton-line sk-h-38 w-100"></div>
                                </div>
                                <div className="col-lg-12">
                                    <div className="skeleton-line sk-h-14 sk-w-100 mb-2"></div>
                                    <div className="skeleton-line sk-h-80 w-100"></div>
                                </div>
                            </div>

                            {/* Additional Section */}
                            <div className="mt-5">
                                <div className="skeleton-line sk-h-18 sk-w-160 mb-3"></div>
                                <hr className="mt-1 mb-4" />
                                <div className="row g-3">
                                    {[1, 2].map(i => (
                                        <div className="col-lg-6" key={i}>
                                            <div className="d-flex justify-content-between mb-2">
                                                <div className="skeleton-line sk-h-14 sk-w-80"></div>
                                                <div className="skeleton-line sk-h-14 sk-w-60"></div>
                                            </div>
                                            <div className="vstack gap-2">
                                                {[1, 2, 3].map(j => (
                                                    <div className="skeleton-line sk-h-38 w-100" key={j}></div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Skeleton (col-4) */}
                <div className="col-lg-4">
                    <div className="card shadow-sm mb-4">
                        <div className="card-body p-4">
                            <div className="skeleton-line sk-h-18 sk-w-150 mb-3"></div>
                            <hr className="mt-1 mb-3" />
                            <div className="skeleton-line sk-h-50 w-100 rounded-3 mb-4"></div>

                            <div className="skeleton-line sk-h-18 sk-w-130 mb-3 mt-4"></div>
                            <hr className="mt-1 mb-3" />
                            <div className="d-flex gap-2">
                                <div className="skeleton-line sk-h-40 flex-grow-1 rounded-pill"></div>
                                <div className="skeleton-line sk-h-40 flex-grow-1 rounded-pill"></div>
                            </div>
                        </div>
                    </div>

                    <div className="card shadow-sm">
                        <div className="card-body p-4">
                            <div className="skeleton-line sk-h-18 sk-w-140 mb-3"></div>
                            <hr className="mt-1 mb-3" />
                            <div className="skeleton-line sk-h-100 w-100 rounded-3"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResourceFormLoader;
