import React from 'react';
import { Container, Row, Col, Card, CardHeader, CardBody } from 'reactstrap';
import PageHeader, { BreadcrumbItem } from '../../pages/common/PageHeader';

interface ResourceDetailLoaderProps {
    title?: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    children?: React.ReactNode;
}

const ResourceDetailLoader = ({ title, breadcrumbs = [], children }: ResourceDetailLoaderProps) => {
    return (
        <div className="page-content resource-detail-container">
            <Container fluid>
                {/* Real breadcrumbs render immediately; only the title stays a skeleton
                    because it is the resource name, which isn't known until it loads. */}
                <PageHeader
                    title={title ?? <span className="skeleton-line d-inline-block align-middle sk-w-250 sk-h-24" />}
                    breadcrumbs={breadcrumbs}
                >
                    {children}
                </PageHeader>

                {/* Main Briefing Card Skeleton */}
                <Card className="border-0 shadow-sm mb-4 rounded-0">
                    <CardBody className="p-4 p-md-4">
                        <Row className="g-0">
                            {/* Service Overview Skeleton */}
                            <Col lg={6} className="pe-lg-5">
                                <div className="d-flex align-items-center gap-3 mb-4">
                                    <div className="skeleton-line sk-avatar-40 rounded-circle flex-shrink-0" style={{ width: '40px', height: '40px' }}></div>
                                    <div className="flex-grow-1">
                                        <div className="skeleton-line mb-1 sk-w-140 sk-h-18"></div>
                                        <div className="skeleton-line sk-w-80 sk-h-10"></div>
                                    </div>
                                </div>
                                <div className="skeleton-line mb-2 sk-w-100p sk-h-14"></div>
                                <div className="skeleton-line mb-4 sk-w-80p sk-h-14"></div>

                                <div className="vstack gap-1">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="d-flex align-items-start gap-3 py-1 border-bottom border-light">
                                            <div className="skeleton-line rounded flex-shrink-0" style={{ width: '20px', height: '20px' }}></div>
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
                                    <div className="skeleton-line sk-avatar-40 rounded-circle flex-shrink-0" style={{ width: '40px', height: '40px' }}></div>
                                    <div className="flex-grow-1">
                                        <div className="skeleton-line mb-1 sk-w-140 sk-h-18"></div>
                                        <div className="skeleton-line sk-w-80 sk-h-10"></div>
                                    </div>
                                </div>
                                <div className="skeleton-line mb-2 sk-w-100p sk-h-14"></div>
                                <div className="skeleton-line mb-4 sk-w-80p sk-h-14"></div>

                                <div className="vstack gap-1">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div key={i} className="d-flex align-items-start gap-3 py-1 border-bottom border-light">
                                            <div className="skeleton-line rounded flex-shrink-0" style={{ width: '20px', height: '20px' }}></div>
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
                        <div className="d-flex align-items-center gap-2">
                            <div className="skeleton-line rounded-circle flex-shrink-0" style={{ width: '18px', height: '18px' }}></div>
                            <div className="skeleton-line sk-w-200 sk-h-20"></div>
                        </div>
                    </CardHeader>
                    <CardBody className="p-3 p-md-4 bg-light bg-opacity-30">
                        <div className="provider-grid">
                            {[1, 2, 3, 4].map((i) => (
                                <Card className="provider-card border-0 shadow-sm rounded-0" key={i}>
                                    <CardBody className="p-3">
                                        {/* Inline logo + title — mirrors the real layout */}
                                        <div className="d-flex flex-row align-items-center gap-3 mb-3 mt-2">
                                            <div className="skeleton-line rounded-0 flex-shrink-0" style={{ width: '100px', height: '50px' }}></div>
                                            <div className="text-start">
                                                <div className="skeleton-line sk-w-120 sk-h-16"></div>
                                            </div>
                                        </div>
                                        <div className="skeleton-line mb-2 sk-w-100p sk-h-12"></div>
                                        <div className="skeleton-line mb-3 sk-w-70p sk-h-12"></div>

                                        <div className="border-top border-light pt-3 mt-3">
                                            {[1, 2, 3].map((j) => (
                                                <div key={j} className="d-flex align-items-center gap-2 mb-2">
                                                    <div className="skeleton-line rounded flex-shrink-0" style={{ width: '14px', height: '14px' }}></div>
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
