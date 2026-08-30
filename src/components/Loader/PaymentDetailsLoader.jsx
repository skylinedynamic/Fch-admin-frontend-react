import React from 'react';
import { Skeleton } from 'primereact/skeleton';

export default function PaymentDetailsLoader() {
    return (
        <div className="row">
            <div className="col-lg-12">
                <div className="card border-0 overflow-hidden shadow-sm mb-4">
                    {/* Header Skeleton */}
                    <div className="card-header border-bottom border-primary border-opacity-25 p-4">
                        <div className="d-flex align-items-center">
                            <div className="flex-shrink-0 avatar-sm">
                                <Skeleton width="38px" height="38px" borderRadius="6px" />
                            </div>
                            <div className="flex-grow-1 ms-3">
                                <Skeleton width="180px" height="22px" className="mb-2" />
                                <Skeleton width="140px" height="14px" />
                            </div>
                            <div className="flex-shrink-0 text-end">
                                <Skeleton width="100px" height="28px" className="mb-2 ms-auto" />
                                <Skeleton width="65px" height="20px" borderRadius="4px" className="ms-auto" />
                            </div>
                        </div>
                    </div>

                    <div className="card-body p-4">
                        {/* Section 1: Payment Details */}
                        <div className="border-bottom pb-2 mb-3">
                            <Skeleton width="130px" height="18px" />
                        </div>
                        <div className="row mb-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div className="col-lg-3 col-sm-6 mb-3" key={i}>
                                    <Skeleton width="95px" height="12px" className="mb-2" />
                                    <Skeleton width="130px" height="16px" />
                                </div>
                            ))}
                        </div>

                        {/* Section 2: Payer Information */}
                        <div className="border-bottom pb-2 mb-3">
                            <Skeleton width="140px" height="18px" />
                        </div>
                        <div className="row bg-light rounded p-3 m-0 mb-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div className="col-lg-3 col-sm-6 mb-3 mb-lg-0" key={i}>
                                    <Skeleton width="80px" height="12px" className="mb-2" />
                                    <Skeleton width="120px" height="16px" />
                                </div>
                            ))}
                        </div>

                        {/* Section 3: Verification Info */}
                        <div className="mt-4">
                            <div className="border-bottom pb-2 mb-3">
                                <Skeleton width="130px" height="18px" />
                            </div>
                            <div className="row">
                                {[1, 2, 3, 4].map((i) => (
                                    <div className="col-lg-3 col-sm-6 mb-3" key={i}>
                                        <Skeleton width="90px" height="12px" className="mb-2" />
                                        <Skeleton width="115px" height="16px" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
