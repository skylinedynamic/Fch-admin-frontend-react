import React from 'react';

const BorrowerProfileBannerSkeleton = () => {
    return (
        <div className="borrower-profile-banner">
            <div className="borrower-profile-banner-body">
                <div className="row align-items-center position-relative">
                    <div className="col-auto">
                        <div className="avatar-md p-1 bg-white rounded-circle shadow-sm">
                            <div className="skeleton-line rounded-circle w-100 h-100"></div>
                        </div>
                    </div>
                    <div className="col">
                        <div className="ps-2">
                            <div className="row g-0 align-items-center">
                                <div className="col-md-6 border-end-md pe-md-4">
                                    <div className="skeleton-line borrower-skeleton-label mb-2"></div>
                                    <div className="d-flex align-items-center mt-1">
                                        <div className="skeleton-line borrower-skeleton-title"></div>
                                    </div>
                                </div>
                                <div className="col-md-6 ps-md-4">
                                    <div className="skeleton-line borrower-skeleton-label mb-2"></div>
                                    <div className="d-flex align-items-center mt-1">
                                        <div className="skeleton-line borrower-skeleton-subtitle"></div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-2 pt-2 border-top">
                                <div className="skeleton-line borrower-skeleton-text"></div>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-auto mt-3 mt-lg-0 border-start-lg ps-lg-4">
                        <div className="d-flex gap-4">
                            <div className="text-center w-100 d-flex flex-column align-items-center">
                                <div className="skeleton-line borrower-skeleton-label mb-2"></div>
                                <div className="skeleton-line borrower-skeleton-stat mx-auto"></div>
                            </div>
                        </div>
                        <div className="text-center mt-3">
                            <div className="skeleton-line borrower-skeleton-btn w-100 mx-auto"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BorrowerProfileBannerSkeleton;
