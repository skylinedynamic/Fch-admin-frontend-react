import React from 'react';
import { Skeleton } from 'primereact/skeleton';

export default function PaymentMethodsLoader(): React.JSX.Element {
    return (
        <div className="row animate__animated animate__fadeIn">
            <div className="col-12">
                <div className="card shadow-sm border-0 payment-method-card">
                    <div className="card-header d-flex align-items-center gap-3 bg-white border-bottom py-3">
                        <div className="avatar-sm flex-shrink-0">
                            <div className="avatar-title bg-primary-subtle text-primary rounded fs-20 payment-method-avatar-title">
                                <i className="ri-bank-card-2-line"></i>
                            </div>
                        </div>
                        <div>
                            <h5 className="card-title mb-0 fs-16 fw-semibold text-dark">Payment Gateways</h5>
                            <p className="text-muted mb-0 fs-13">Configure checkout payment options and toggle active status</p>
                        </div>
                    </div>
                    <div className="card-body p-0">
                        {[1, 2, 3, 4].map((i) => (
                            <div className="payment-method-row" key={i}>
                                <div className="d-flex align-items-center gap-4 flex-wrap">
                                    <Skeleton width="96px" height="60px" borderRadius="4px"></Skeleton>
                                    <div>
                                        <div className="d-flex align-items-center gap-2 mb-2">
                                            <Skeleton width="100px" height="1.25rem"></Skeleton>
                                            <Skeleton width="60px" height="1rem" borderRadius="4px"></Skeleton>
                                        </div>
                                        <Skeleton width="280px" height="0.875rem"></Skeleton>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center gap-3">
                                    <Skeleton width="120px" height="2.25rem" borderRadius="4px"></Skeleton>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
