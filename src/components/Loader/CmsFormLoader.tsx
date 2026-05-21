import React from 'react';

interface CmsFormLoaderProps {
    showHeader?: boolean;
    rowClassName?: string;
}

const CmsFormLoader: React.FC<CmsFormLoaderProps> = ({
    showHeader = true,
    rowClassName
}) => {
    const defaultRowClass = showHeader ? "row mt-n3" : "row";
    const actualRowClass = rowClassName || defaultRowClass;

    const content = (
        <div className={actualRowClass}>
            {/* Left Column: Main Content & SEO (col-8) */}
            <div className="col-lg-8">
                {/* Main Content Card */}
                <div className="card mb-4 shadow-sm border-0">
                    <div className="card-header bg-transparent border-bottom-0 pb-0 pt-4 px-4">
                        <div className="d-flex align-items-center">
                            <div className="skeleton-line sk-h-40 sk-w-40 rounded-circle me-3"></div>
                            <div>
                                <div className="skeleton-line sk-h-18 sk-w-140 mb-2"></div>
                                <div className="skeleton-line sk-h-12 sk-w-280"></div>
                            </div>
                        </div>
                    </div>
                    <div className="card-body p-4">
                        <div className="row">
                            <div className="col-12 mb-3">
                                <div className="skeleton-line sk-h-16 sk-w-160 mb-2"></div>
                                <hr className="mt-1" />
                            </div>
                            <div className="col-12 mb-4">
                                <div className="skeleton-line sk-h-14 sk-w-100 mb-2"></div>
                                <div className="skeleton-line sk-h-38 w-100"></div>
                            </div>
                            <div className="col-12 mb-4">
                                <div className="skeleton-line sk-h-14 sk-w-120 mb-2"></div>
                                <div className="skeleton-line sk-h-80 w-100"></div>
                            </div>
                            <div className="col-12 mb-3">
                                <div className="skeleton-line sk-h-14 sk-w-100 mb-2"></div>
                                <div className="skeleton-line sk-h-400 w-100 rounded-3"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SEO Card */}
                <div className="card mb-4 shadow-sm border-0">
                    <div className="card-header bg-transparent border-bottom-0 pb-0 pt-4 px-4 d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center">
                            <div className="skeleton-line sk-h-40 sk-w-40 rounded-circle me-3"></div>
                            <div>
                                <div className="skeleton-line sk-h-18 sk-w-180 mb-2"></div>
                                <div className="skeleton-line sk-h-12 sk-w-260"></div>
                            </div>
                        </div>
                        <div className="skeleton-line sk-h-30 sk-w-110 rounded-pill"></div>
                    </div>
                    <div className="card-body p-4">
                        {/* SEO Preview Skeleton */}
                        <div className="mb-4 p-3 bg-light rounded-3">
                            <div className="skeleton-line sk-h-20 sk-w-300 mb-2"></div>
                            <div className="skeleton-line sk-h-14 sk-w-240 mb-2"></div>
                            <div className="skeleton-line sk-h-14 w-100"></div>
                        </div>

                        <div className="row border-top pt-4">
                            <div className="col-12 mb-4">
                                <div className="d-flex justify-content-between mb-2">
                                    <div className="skeleton-line sk-h-14 sk-w-80"></div>
                                    <div className="skeleton-line sk-h-12 sk-w-50"></div>
                                </div>
                                <div className="skeleton-line sk-h-38 w-100"></div>
                                <div className="skeleton-line sk-h-12 w-75 mt-2"></div>
                            </div>
                            <div className="col-12 mb-2">
                                <div className="d-flex justify-content-between mb-2">
                                    <div className="skeleton-line sk-h-14 sk-w-100"></div>
                                    <div className="skeleton-line sk-h-12 sk-w-50"></div>
                                </div>
                                <div className="skeleton-line sk-h-80 w-100"></div>
                                <div className="skeleton-line sk-h-12 w-75 mt-2"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Settings & Sidebars (col-4) */}
            <div className="col-lg-4">
                {/* Publishing Status Card */}
                <div className="card mb-4 shadow-sm border-0">
                    <div className="card-header bg-transparent border-bottom-0 pb-0 pt-4 px-4">
                        <div className="d-flex align-items-center">
                            <div className="skeleton-line sk-h-35 sk-w-35 rounded-circle me-3"></div>
                            <div className="skeleton-line sk-h-18 sk-w-100"></div>
                        </div>
                    </div>
                    <div className="card-body p-4">
                        <div className="skeleton-line sk-h-14 sk-w-100 mb-2"></div>
                        <div className="skeleton-line sk-h-60 w-100 rounded-3"></div>
                    </div>
                </div>

                {/* Classification Card */}
                <div className="card mb-4 shadow-sm border-0">
                    <div className="card-header bg-transparent border-bottom-0 pb-0 pt-4 px-4">
                        <div className="d-flex align-items-center">
                            <div className="skeleton-line sk-h-35 sk-w-35 rounded-circle me-3"></div>
                            <div className="skeleton-line sk-h-18 sk-w-120"></div>
                        </div>
                    </div>
                    <div className="card-body p-4">
                        <div className="mb-4">
                            <div className="d-flex justify-content-between mb-2">
                                <div className="skeleton-line sk-h-14 sk-w-80"></div>
                                <div className="skeleton-line sk-h-12 sk-w-60"></div>
                            </div>
                            <div className="skeleton-line sk-h-38 w-100"></div>
                        </div>
                        <div className="mb-0">
                            <div className="d-flex justify-content-between mb-2">
                                <div className="skeleton-line sk-h-14 sk-w-60"></div>
                                <div className="skeleton-line sk-h-12 sk-w-60"></div>
                            </div>
                            <div className="skeleton-line sk-h-38 w-100"></div>
                        </div>
                    </div>
                </div>

                {/* Featured Image Card */}
                <div className="card border shadow-none mb-4">
                    <div className="card-header border-bottom-dashed py-2">
                        <div className="skeleton-line sk-h-18 sk-w-140"></div>
                    </div>
                    <div className="card-body p-2">
                        <div className="skeleton-line sk-h-150 w-100 rounded-3 mb-2"></div>
                        <div className="text-center">
                            <div className="skeleton-line sk-h-12 sk-w-180 mx-auto"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return showHeader ? (
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
            {content}
        </div>
    ) : content;
};

export default CmsFormLoader;
