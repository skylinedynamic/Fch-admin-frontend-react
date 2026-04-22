import React from 'react';

const ResourceLoader = () => {
    return (
        <>
            {/* Metric Skeletons */}
            <div className="row g-3 mb-4">
                {[1, 2, 3, 4].map(i => (
                    <div className="col-md-3" key={i}>
                        <div className="card shadow-sm border-0 rounded-2 bg-white h-100">
                            <div className="card-body py-3 px-4 d-flex align-items-center">
                                <div className="skeleton-line rounded me-3 sk-avatar-48"></div>
                                <div className="flex-grow-1">
                                    <div className="skeleton-line mb-2 sk-w-60p sk-h-12"></div>
                                    <div className="skeleton-line sk-w-40p sk-h-22"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="row g-3">
                <div className="col-lg-8">
                    <div className="row g-3">
                        {/* Legal & Business Categories */}
                        {[1, 2].map(i => (
                            <div className="col-md-6" key={i}>
                                <div className="card shadow-sm border-0 rounded-2 h-100 bg-white">
                                    <div className="card-header bg-transparent border-0 pt-3 px-3 d-flex justify-content-between align-items-center">
                                        <div className="skeleton-line sk-w-120 sk-h-18"></div>
                                        <div className="skeleton-line sk-w-80 sk-h-28 sk-rounded-4"></div>
                                    </div>
                                    <div className="card-body p-3 pt-2">
                                        <div className="d-flex flex-column gap-3">
                                            {[1, 2, 3, 4].map(j => (
                                                <div className="p-3 rounded-2 border d-flex align-items-center" key={j}>
                                                    <div className="skeleton-line rounded me-3 sk-avatar-32"></div>
                                                    <div className="flex-grow-1">
                                                        <div className="skeleton-line mb-1 sk-w-70p sk-h-14"></div>
                                                        <div className="skeleton-line sk-w-50p sk-h-10"></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Education Library */}
                        <div className="col-12">
                            <div className="card shadow-sm border-0 rounded-2 bg-white">
                                <div className="card-header border-0 bg-light p-3">
                                    <div className="d-flex flex-column flex-lg-row align-items-center justify-content-between gap-3">
                                        <div className="flex-grow-1">
                                            <div className="skeleton-line mb-2 sk-w-180 sk-h-24 sk-rounded-4"></div>
                                            <div className="skeleton-line sk-w-300 sk-h-14 sk-rounded-3"></div>
                                        </div>
                                        <div className="d-flex align-items-center gap-3">
                                            <div className="skeleton-line rounded-pill sk-w-240 sk-h-38"></div>
                                            <div className="skeleton-line rounded-pill sk-w-110 sk-h-38"></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="card-body p-3 pt-2">
                                    <div className="row g-3">
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                                            <div className="col-6 col-md-4 col-xl-3" key={i}>
                                                <div className="p-3 rounded-3 text-center h-100 border border-light-subtle bg-white">
                                                    <div className="skeleton-line mx-auto mb-3 rounded-3 sk-avatar-40"></div>
                                                    <div className="skeleton-line mx-auto mb-2 sk-w-80p sk-h-14 sk-rounded-4"></div>
                                                    <div className="skeleton-line mx-auto sk-w-60p sk-h-10 sk-rounded-3"></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-lg-4">
                    <div className="d-flex flex-column gap-3">
                        {/* Download Assets Sidebar */}
                        <div className="card shadow-sm border-0 rounded-2 bg-white mb-0">
                            <div className="card-header border-bottom border-light p-3 d-flex align-items-center justify-content-between">
                                <div className="skeleton-line sk-w-150 sk-h-18"></div>
                                <div className="skeleton-line sk-w-80 sk-h-28 sk-rounded-4"></div>
                            </div>
                            <div className="card-body p-0">
                                {[1, 2, 3, 4].map(i => (
                                    <div className="p-3 border-bottom border-light d-flex align-items-center" key={i}>
                                        <div className="skeleton-line me-3 sk-avatar-24"></div>
                                        <div className="skeleton-line sk-w-70p sk-h-14"></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Training Academy Sidebar */}
                        <div className="card shadow-sm border-0 rounded-2 bg-white mb-0">
                            <div className="card-header border-bottom border-light p-3 d-flex align-items-center justify-content-between">
                                <div className="skeleton-line sk-w-150 sk-h-18"></div>
                                <div className="skeleton-line sk-w-80 sk-h-28 sk-rounded-4"></div>
                            </div>
                            <div className="card-body p-3 pt-3">
                                <div className="d-flex flex-column gap-3">
                                    {[1, 2, 3, 4, 5, 6, 7].map(i => (
                                        <div className="d-flex align-items-center gap-3" key={i}>
                                            <div className="skeleton-line flex-shrink-0 video-thumb-size rounded-2"></div>
                                            <div className="flex-grow-1 overflow-hidden">
                                                <div className="skeleton-line mb-2 sk-w-80p sk-h-14 sk-rounded-4"></div>
                                                <div className="skeleton-line mb-1 sk-w-60p sk-h-12 sk-rounded-3"></div>
                                                <div className="skeleton-line sk-w-30p sk-h-10 sk-rounded-3"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ResourceLoader;
