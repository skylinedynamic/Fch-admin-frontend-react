import React from 'react';
import { Container, Row, Col, Card, CardHeader, CardBody } from 'reactstrap';

const ResourceDetailLoader = () => {
    return (
        <div className="page-content resource-detail-container">
            <Container fluid>
                {/* Page Header & Breadcrumbs Skeleton */}
                <div className="row">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <div className="skeleton-line mb-3 sk-w-250 sk-h-24"></div>
                                <div className="d-flex gap-2">
                                    <div className="skeleton-line sk-w-80 sk-h-12"></div>
                                    <div className="skeleton-line sk-w-80 sk-h-12"></div>
                                    <div className="skeleton-line sk-w-80 sk-h-12"></div>
                                </div>
                            </div>
                            <div className="mt-0">
                                <div className="skeleton-line sk-w-100 sk-h-38 rounded"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Briefing Card Skeleton */}
                <Card className="border-0 shadow-sm mb-4 rounded-0">
                    <CardBody className="p-4 p-md-5">
                        <Row className="g-0">
                            {/* Service Overview Skeleton */}
                            <Col lg={6} className="pe-lg-5">
                                <div className="d-flex align-items-center gap-3 mb-4">
                                    <div className="skeleton-line sk-avatar-40 rounded-circle flex-shrink-0"></div>
                                    <div className="flex-grow-1">
                                        <div className="skeleton-line mb-1 sk-w-140 sk-h-18"></div>
                                        <div className="skeleton-line sk-w-80 sk-h-10"></div>
                                    </div>
                                </div>
                                <div className="skeleton-line mb-2 sk-w-100p sk-h-14"></div>
                                <div className="skeleton-line mb-4 sk-w-80p sk-h-14"></div>

                                <div className="vstack gap-1">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="d-flex align-items-start gap-3 py-2 border-bottom border-light">
                                            <div className="skeleton-line sk-w-20 sk-h-20 rounded flex-shrink-0"></div>
                                            <div className="skeleton-line sk-w-90p sk-h-14 mt-1"></div>
                                        </div>
                                    ))}
                                </div>
                            </Col>

                            {/* Divider Placeholder */}
                            <div className="d-none d-lg-block border-start border-light position-absolute start-50 top-50 translate-middle-x" style={{ height: '70%', opacity: 0.5 }}></div>

                            {/* Why it matters Skeleton */}
                            <Col lg={6} className="ps-lg-5 mt-5 mt-lg-0">
                                <div className="d-flex align-items-center gap-3 mb-4">
                                    <div className="skeleton-line sk-avatar-40 rounded-circle flex-shrink-0"></div>
                                    <div className="flex-grow-1">
                                        <div className="skeleton-line mb-1 sk-w-140 sk-h-18"></div>
                                        <div className="skeleton-line sk-w-80 sk-h-10"></div>
                                    </div>
                                </div>
                                <div className="skeleton-line mb-2 sk-w-100p sk-h-14"></div>
                                <div className="skeleton-line mb-4 sk-w-80p sk-h-14"></div>

                                <div className="vstack gap-1">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="d-flex align-items-start gap-3 py-2 border-bottom border-light">
                                            <div className="skeleton-line sk-w-20 sk-h-20 rounded flex-shrink-0"></div>
                                            <div className="skeleton-line sk-w-90p sk-h-14 mt-1"></div>
                                        </div>
                                    ))}
                                </div>
                            </Col>
                        </Row>
                    </CardBody>
                </Card>

                {/* Providers Section Skeleton */}
                <Card className="border-0 shadow-sm mb-4 rounded-0">
                    <CardHeader className="p-4 border-bottom border-light border-bottom-dashed">
                        <div className="skeleton-line sk-w-200 sk-h-20"></div>
                    </CardHeader>
                    <CardBody className="p-3 p-md-4">
                        <div className="provider-grid">
                            {[1, 2, 3, 4].map((i) => (
                                <Card className="provider-card border-0 shadow-sm rounded-0 h-100" key={i}>
                                    <CardBody className="p-3">
                                        <div className="d-flex align-items-center gap-3 mb-3">
                                            <div className="skeleton-line sk-w-45 sk-h-45 rounded flex-shrink-0"></div>
                                            <div className="flex-grow-1">
                                                <div className="skeleton-line sk-w-120 sk-h-16"></div>
                                            </div>
                                        </div>
                                        <div className="skeleton-line mb-2 sk-w-100p sk-h-12"></div>
                                        <div className="skeleton-line mb-3 sk-w-70p sk-h-12"></div>

                                        <div className="border-top border-light pt-3 mt-3">
                                            {[1, 2, 3].map((j) => (
                                                <div key={j} className="d-flex align-items-center gap-2 mb-2">
                                                    <div className="skeleton-line sk-w-14 sk-h-14 rounded flex-shrink-0"></div>
                                                    <div className="skeleton-line sk-w-80p sk-h-12"></div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardBody>
                                    <div className="card-footer bg-light bg-opacity-50 border-top-0 p-3">
                                        <div className="skeleton-line sk-w-100p sk-h-38 rounded-0"></div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </CardBody>
                </Card>
            </Container>
        </div>
    );
};

export default ResourceDetailLoader;
