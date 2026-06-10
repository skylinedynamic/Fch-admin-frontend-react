import React from 'react';
import { Row, Col, Card, CardBody } from 'reactstrap';

export default function CreditProfileSkeleton() {
    return (
        <div className="fade-panel animate__animated animate__fadeIn">
            <Row>
                {/* Left side Card skeleton */}
                <Col lg={6}>
                    <Card className="border shadow-none mb-0 credit-profile-skeleton-card">
                        <div className="card-header bg-light d-flex align-items-center justify-content-between py-3">
                            <div className="skeleton-line skeleton-title"></div>
                            <div className="d-flex align-items-center gap-2">
                                <div className="skeleton-line skeleton-btn-md"></div>
                                <div className="skeleton-line skeleton-btn-sm"></div>
                                <div className="skeleton-line skeleton-btn-sm"></div>
                                <div className="skeleton-line skeleton-btn-lg"></div>
                            </div>
                        </div>
                        <CardBody className="p-3 credit-profile-skeleton-body">
                            {/* Mimic Sub-tabs */}
                            <div className="d-flex gap-4 border-bottom pb-2 mb-3">
                                <div className="skeleton-line skeleton-tab-sm"></div>
                                <div className="skeleton-line skeleton-tab-lg"></div>
                                <div className="skeleton-line skeleton-tab-md"></div>
                                <div className="skeleton-line skeleton-tab-xs"></div>
                            </div>

                            {/* FICO Score input skeleton */}
                            <div className="mb-4">
                                <div className="skeleton-line skeleton-label mb-2"></div>
                                <div className="skeleton-line skeleton-input"></div>
                            </div>

                            {/* Table Skeleton */}
                            <div className="skeleton-line skeleton-table-title mb-3"></div>
                            <div className="skeleton-border-container p-2 mb-4">
                                <div className="d-flex gap-2 mb-2 pb-2 border-bottom">
                                    {Array.from({ length: 7 }).map((_, idx) => (
                                        <div key={`th-${idx}`} className="skeleton-line skeleton-th flex-grow-1"></div>
                                    ))}
                                </div>
                                {Array.from({ length: 4 }).map((_, rIdx) => (
                                    <div key={`tr-${rIdx}`} className="d-flex gap-2 mb-2">
                                        {Array.from({ length: 7 }).map((_, cIdx) => (
                                            <div key={`td-${rIdx}-${cIdx}`} className="skeleton-line skeleton-td flex-grow-1"></div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </CardBody>
                    </Card>
                </Col>

                {/* Right side Card skeleton */}
                <Col lg={6}>
                    <Card className="border shadow-none h-100 credit-profile-skeleton-card">
                        <div className="card-header bg-light d-flex align-items-center justify-content-between py-3">
                            <div className="skeleton-line skeleton-title"></div>
                            <div className="skeleton-line skeleton-btn-sm"></div>
                        </div>
                        <CardBody className="p-0 credit-profile-skeleton-body">
                            <div className="w-100 h-100 d-flex flex-column gap-3 p-4">
                                <div className="skeleton-line skeleton-pdf-header"></div>
                                <div className="skeleton-line skeleton-pdf-view"></div>
                            </div>
                        </CardBody>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
