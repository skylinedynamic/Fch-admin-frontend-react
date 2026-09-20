import React from 'react';
import { Card, CardBody } from 'reactstrap';
import PageHeader, { BreadcrumbItem } from '../../pages/common/PageHeader';

interface CreditProfileRequestDetailsLoaderProps {
    title?: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    children?: React.ReactNode;
}

const CreditProfileRequestDetailsLoader = ({
    title = 'Application Details',
    breadcrumbs = [],
    children,
}: CreditProfileRequestDetailsLoaderProps) => {
    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Real header - the title and breadcrumbs are known up front, so they
                    render immediately instead of skeletons while the data loads. */}
                <PageHeader title={title} breadcrumbs={breadcrumbs}>
                    {children}
                </PageHeader>

                <div className="row">
                    <div className="col-lg-12">
                        <Card className="shadow-sm border-0">
                            <div className="card-header bg-transparent border-bottom py-3">
                                <div className="skeleton-line sk-w-250 sk-h-16"></div>
                            </div>
                            <CardBody className="p-4">
                                {/* Personal Info Section */}
                                <div className="d-flex align-items-center gap-2 mb-3">
                                    <div className="skeleton-line sk-w-32 sk-h-32 rounded"></div>
                                    <div>
                                        <div className="skeleton-line sk-w-150 sk-h-14 mb-1"></div>
                                        <div className="skeleton-line sk-w-100 sk-h-12"></div>
                                    </div>
                                </div>
                                <div className="row g-4 mb-5">
                                    {[1, 2, 3].map(i => (
                                        <div className="col-lg-4 col-md-6" key={i}>
                                            <div className="d-flex align-items-start gap-3 py-2 border-bottom">
                                                <div className="skeleton-line sk-w-16 sk-h-16 mt-1 rounded"></div>
                                                <div className="flex-grow-1">
                                                    <div className="skeleton-line sk-w-100 sk-h-12 mb-2"></div>
                                                    <div className="skeleton-line sk-w-150 sk-h-14"></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Contact Info Section */}
                                <div className="d-flex align-items-center gap-2 mb-3">
                                    <div className="skeleton-line sk-w-32 sk-h-32 rounded"></div>
                                    <div>
                                        <div className="skeleton-line sk-w-150 sk-h-14 mb-1"></div>
                                        <div className="skeleton-line sk-w-100 sk-h-12"></div>
                                    </div>
                                </div>
                                <div className="row g-4 mb-5">
                                    {[1, 2].map(i => (
                                        <div className="col-md-6" key={i}>
                                            <div className="d-flex align-items-start gap-3 py-2 border-bottom">
                                                <div className="skeleton-line sk-w-16 sk-h-16 mt-1 rounded"></div>
                                                <div className="flex-grow-1">
                                                    <div className="skeleton-line sk-w-100 sk-h-12 mb-2"></div>
                                                    <div className="skeleton-line sk-w-150 sk-h-14"></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Address Details Section */}
                                <div className="d-flex align-items-center gap-2 mb-3">
                                    <div className="skeleton-line sk-w-32 sk-h-32 rounded"></div>
                                    <div>
                                        <div className="skeleton-line sk-w-150 sk-h-14 mb-1"></div>
                                        <div className="skeleton-line sk-w-100 sk-h-12"></div>
                                    </div>
                                </div>
                                <div className="row g-4 mb-5">
                                    <div className="col-md-6">
                                        <div className="d-flex align-items-start gap-3 py-2 border-bottom">
                                            <div className="skeleton-line sk-w-16 sk-h-16 mt-1 rounded"></div>
                                            <div className="flex-grow-1">
                                                <div className="skeleton-line sk-w-100 sk-h-12 mb-2"></div>
                                                <div className="skeleton-line sk-w-250 sk-h-14"></div>
                                            </div>
                                        </div>
                                    </div>
                                    {[1, 2, 3].map(i => (
                                        <div className="col-md-2" key={i}>
                                            <div className="d-flex align-items-start gap-3 py-2 border-bottom">
                                                <div className="skeleton-line sk-w-16 sk-h-16 mt-1 rounded"></div>
                                                <div className="flex-grow-1">
                                                    <div className="skeleton-line sk-w-80 sk-h-12 mb-2"></div>
                                                    <div className="skeleton-line sk-w-100 sk-h-14"></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Borrower Section */}
                                <div className="d-flex align-items-center gap-2 mb-3">
                                    <div className="skeleton-line sk-w-32 sk-h-32 rounded"></div>
                                    <div>
                                        <div className="skeleton-line sk-w-150 sk-h-14 mb-1"></div>
                                        <div className="skeleton-line sk-w-100 sk-h-12"></div>
                                    </div>
                                </div>
                                <div className="row g-4">
                                    <div className="col-md-12">
                                        <div className="d-flex align-items-start gap-3 py-2 border-bottom">
                                            <div className="skeleton-line sk-w-16 sk-h-16 mt-1 rounded"></div>
                                            <div className="flex-grow-1">
                                                <div className="skeleton-line sk-w-100 sk-h-12 mb-2"></div>
                                                <div className="skeleton-line sk-w-200 sk-h-14"></div>
                                            </div>
                                        </div>
                                    </div>
                                    {[1, 2].map(i => (
                                        <div className="col-md-6" key={i}>
                                            <div className="d-flex align-items-start gap-3 py-2 border-bottom">
                                                <div className="skeleton-line sk-w-16 sk-h-16 mt-1 rounded"></div>
                                                <div className="flex-grow-1">
                                                    <div className="skeleton-line sk-w-100 sk-h-12 mb-2"></div>
                                                    <div className="skeleton-line sk-w-150 sk-h-14"></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardBody>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreditProfileRequestDetailsLoader;
