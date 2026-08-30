import React from 'react';
import { Link } from 'react-router-dom';

const WizardLoader = () => {
    return (
        <div className="page-content funding-wizard-page">
            <div className="container-fluid">
                
                {/* ── Breadcrumb Skeleton ─────────────────────────────────────────────── */}
                <div className="row page-subheader-sticky bg-body">
                    <div className="col-12 py-2">
                        <div className="d-flex align-items-center justify-content-between">
                            <div className="flex-grow-1">
                                <div className="skeleton-line mb-2 mt-0" style={{ width: 250, height: 28, borderRadius: 4 }}></div>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item">
                                            <div className="skeleton-line d-inline-block m-0 align-middle" style={{ width: 80, height: 16, borderRadius: 4 }}></div>
                                        </li>
                                        <li className="breadcrumb-item">
                                            <div className="skeleton-line d-inline-block m-0 align-middle" style={{ width: 110, height: 16, borderRadius: 4 }}></div>
                                        </li>
                                        <li className="breadcrumb-item">
                                            <div className="skeleton-line d-inline-block m-0 align-middle" style={{ width: 140, height: 16, borderRadius: 4 }}></div>
                                        </li>
                                        <li className="breadcrumb-item active" aria-current="page">
                                            <div className="skeleton-line d-inline-block m-0 align-middle" style={{ width: 120, height: 16, borderRadius: 4 }}></div>
                                        </li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="mt-0">
                                <div className="skeleton-line d-inline-block m-0 skeleton-badge"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mx-auto funding-wizard-container">

                {/* Stepper Header Skeleton */}
                <div className="d-flex justify-content-center mb-5 pt-4">
                    <div className="d-flex align-items-center position-relative w-100 funding-wizard-stepper-container">
                        <div className="position-absolute funding-wizard-stepper-line"></div>
                        {[1, 2, 3, 4].map((step, index) => {
                            const isActive = index === 0;
                            return (
                                <React.Fragment key={step}>
                                    {index !== 0 && (
                                        <div className="funding-wizard-stepper-spacer"></div>
                                    )}
                                    <div className="d-flex flex-column align-items-center position-relative funding-wizard-stepper-item">
                                        <div
                                            className="skeleton-line skeleton-step-circle"
                                        ></div>
                                        <div
                                            className="skeleton-line mt-2 position-absolute skeleton-step-text"
                                        ></div>
                                    </div>
                                    {index !== 3 && (
                                        <div className="funding-wizard-stepper-spacer"></div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                {/* Card Content Skeleton */}
                <div className="card shadow-sm border-0 mt-5 rounded overflow-hidden">
                    <div className="card-body p-5">
                        <div>
                            <div className="skeleton-line mb-2 skeleton-title" />
                            <div className="skeleton-line mb-4 skeleton-subtitle" />

                            {/* Info Box Skeleton */}
                            <div className="border rounded-3 p-4 mb-4 bg-white shadow-sm">
                                <div className="row mb-4">
                                    <div className="col-12 mb-3">
                                        <div className="skeleton-line mb-2 skeleton-label-sm" />
                                        <div className="skeleton-line skeleton-value-md" />
                                    </div>
                                    <div className="col-12 mb-3">
                                        <div className="skeleton-line mb-2 skeleton-label-md" />
                                        <div className="skeleton-line skeleton-value-sm" />
                                    </div>
                                </div>
                                <div className="row">
                                    <div className="col-md-6 mb-3 mb-md-0">
                                        <div className="skeleton-line mb-2 skeleton-value-sm" />
                                        <div className="skeleton-line skeleton-label-xs" />
                                    </div>
                                    <div className="col-md-6">
                                        <div className="skeleton-line mb-2 skeleton-label-xs" />
                                        <div className="skeleton-line skeleton-value-xs" />
                                    </div>
                                </div>
                            </div>

                            {/* Inputs Row Skeleton */}
                            <div className="row g-4 mb-4">
                                <div className="col-md-6">
                                    <div className="skeleton-line mb-2 skeleton-input-label" />
                                    <div className="skeleton-line skeleton-input-box" />
                                </div>
                                <div className="col-md-6">
                                    <div className="skeleton-line mb-2 skeleton-input-label-sm" />
                                    <div className="skeleton-line skeleton-input-box" />
                                </div>
                            </div>

                            {/* Alert Skeleton */}
                            <div className="skeleton-line skeleton-button-lg" />
                        </div>
                    </div>
                </div>
                </div>

            </div>
        </div>
    );
};

export default WizardLoader;
