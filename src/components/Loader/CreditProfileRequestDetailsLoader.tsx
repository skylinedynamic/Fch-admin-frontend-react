import React from 'react';
import PageHeader, { BreadcrumbItem } from '../../pages/common/PageHeader';
import { useAuthStore } from '../../store/auth';

type CardTone = 'primary' | 'warning' | 'success';

const TONE_CLASSES: Record<CardTone, string> = {
    primary: 'bg-primary-subtle text-primary',
    warning: 'bg-warning-subtle text-warning',
    success: 'bg-success-subtle text-success',
};

interface CprFieldSkeletonProps {
    labelWidth?: string;
    valueWidth?: string;
    hasAction?: boolean;
}

const CprFieldSkeleton = ({
    labelWidth = 'sk-w-80',
    valueWidth = 'sk-w-150',
    hasAction = false,
}: CprFieldSkeletonProps) => (
    <div className="cpr-field">
        <span className="cpr-field-icon skeleton-line sk-w-20 sk-h-20 rounded"></span>
        <div className="cpr-field-body">
            <div className={`skeleton-line ${labelWidth} sk-h-12 mb-2 rounded`}></div>
            <div className="d-flex align-items-center gap-2">
                <div className={`skeleton-line ${valueWidth} sk-h-18 rounded`}></div>
                {hasAction && (
                    <div className="skeleton-line sk-w-50 sk-h-20 rounded ms-auto"></div>
                )}
            </div>
        </div>
    </div>
);

const CprCardSkeleton = ({
    tone,
    titleWidth = 'sk-w-150',
    hintWidth = 'sk-w-200',
    children,
}: {
    tone: CardTone;
    titleWidth?: string;
    hintWidth?: string;
    children: React.ReactNode;
}) => (
    <div className="cpr-card">
        <div className="cpr-card-head">
            <div className={`cpr-card-icon ${TONE_CLASSES[tone]}`}>
                <span className="skeleton-line sk-w-18 sk-h-18 rounded"></span>
            </div>
            <div>
                <div className={`skeleton-line ${titleWidth} sk-h-16 mb-2 rounded`}></div>
                <div className={`skeleton-line ${hintWidth} sk-h-12 rounded`}></div>
            </div>
        </div>
        <div className="cpr-card-body">{children}</div>
    </div>
);

const CreditAuthorizationPanelSkeleton = () => (
    <div className="card border-0 shadow-sm mb-4" data-testid="credit-authorization-panel-skeleton">
        <div className="card-header bg-transparent border-0 py-3">
            <div className="d-flex align-items-center gap-2">
                <div className="rounded bg-primary-subtle p-2">
                    <span className="skeleton-line sk-w-20 sk-h-20 rounded"></span>
                </div>
                <div>
                    <div className="skeleton-line sk-w-160 sk-h-16 mb-2 rounded"></div>
                    <div className="skeleton-line sk-w-260 sk-h-12 rounded"></div>
                </div>
            </div>
        </div>

        <div className="card-body pt-0">
            <div className="table-responsive">
                <table className="table table-sm table-borderless align-middle mb-0 fs-13">
                    <thead>
                        <tr>
                            <th style={{ width: '22%' }}><span className="skeleton-line sk-w-100 sk-h-14 rounded"></span></th>
                            <th style={{ width: '12%' }}><span className="skeleton-line sk-w-60 sk-h-14 rounded"></span></th>
                            <th style={{ width: '18%' }}><span className="skeleton-line sk-w-70 sk-h-14 rounded"></span></th>
                            <th style={{ width: '16%' }}><span className="skeleton-line sk-w-80 sk-h-14 rounded"></span></th>
                            <th style={{ width: '20%' }}><span className="skeleton-line sk-w-110 sk-h-14 rounded"></span></th>
                            <th className="text-end" style={{ width: '12%' }}><span className="skeleton-line sk-w-50 sk-h-14 rounded ms-auto"></span></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><span className="skeleton-line sk-w-140 sk-h-16 rounded"></span></td>
                            <td><span className="skeleton-line sk-w-50 sk-h-16 rounded"></span></td>
                            <td>
                                <div className="d-flex gap-1">
                                    <span className="skeleton-line sk-w-40 sk-h-18 rounded-pill"></span>
                                    <span className="skeleton-line sk-w-48 sk-h-18 rounded-pill"></span>
                                </div>
                            </td>
                            <td><span className="skeleton-line sk-w-90 sk-h-16 rounded"></span></td>
                            <td><span className="skeleton-line sk-w-130 sk-h-16 rounded"></span></td>
                            <td className="text-end">
                                <span className="skeleton-line sk-w-70 sk-h-26 rounded ms-auto d-inline-block"></span>
                            </td>
                        </tr>
                        <tr>
                            <td><span className="skeleton-line sk-w-120 sk-h-16 rounded"></span></td>
                            <td><span className="skeleton-line sk-w-50 sk-h-16 rounded"></span></td>
                            <td>
                                <div className="d-flex gap-1">
                                    <span className="skeleton-line sk-w-40 sk-h-18 rounded-pill"></span>
                                    <span className="skeleton-line sk-w-48 sk-h-18 rounded-pill"></span>
                                </div>
                            </td>
                            <td><span className="skeleton-line sk-w-100 sk-h-16 rounded"></span></td>
                            <td><span className="skeleton-line sk-w-110 sk-h-16 rounded"></span></td>
                            <td className="text-end">
                                <span className="skeleton-line sk-w-70 sk-h-26 rounded ms-auto d-inline-block"></span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
);

interface CreditProfileRequestDetailsLoaderProps {
    title?: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    children?: React.ReactNode;
}

/**
 * The waiting state for the credit profile request details screen.
 *
 * It is the screen's SHAPE, with nothing filled in yet - the same cpr-grid, the
 * same three cards, the same field rows, drawing the identical markup the
 * loaded screen's CprCard and CprField do.
 *
 * Every card title, hint and table column heading is a bar rather than the real
 * word so the skeleton reads as a loading placeholder rather than preview copy.
 *
 * The authorization panel above the grid is drawn only for a host user -
 * `user.is_host` is known from the auth store before this page's own API call
 * resolves.
 */
const CreditProfileRequestDetailsLoader = ({
    title = 'Application Details',
    breadcrumbs = [],
    children,
}: CreditProfileRequestDetailsLoaderProps) => {
    const isHost = useAuthStore((state: any) => state.user?.is_host) == 1;

    return (
        <div className="page-content">
            <div className="container-fluid">
                <PageHeader title={title} breadcrumbs={breadcrumbs}>
                    {children}
                </PageHeader>

                {isHost && <CreditAuthorizationPanelSkeleton />}

                <div className="cpr-grid">
                    <div className="cpr-col">
                        <CprCardSkeleton tone="primary" titleWidth="sk-w-150" hintWidth="sk-w-220">
                            <div className="cpr-fields cpr-fields-2">
                                <CprFieldSkeleton labelWidth="sk-w-70" valueWidth="sk-w-160" />
                                <CprFieldSkeleton labelWidth="sk-w-90" valueWidth="sk-w-110" />
                                <CprFieldSkeleton labelWidth="sk-w-140" valueWidth="sk-w-120" hasAction />
                                <CprFieldSkeleton labelWidth="sk-w-90" valueWidth="sk-w-180" />
                                <CprFieldSkeleton labelWidth="sk-w-90" valueWidth="sk-w-130" />
                            </div>
                        </CprCardSkeleton>

                        <CprCardSkeleton tone="warning" titleWidth="sk-w-120" hintWidth="sk-w-250">
                            <div className="cpr-fields cpr-fields-4">
                                <CprFieldSkeleton labelWidth="sk-w-90" valueWidth="sk-w-150" />
                                <CprFieldSkeleton labelWidth="sk-w-40" valueWidth="sk-w-100" />
                                <CprFieldSkeleton labelWidth="sk-w-50" valueWidth="sk-w-70" />
                                <CprFieldSkeleton labelWidth="sk-w-60" valueWidth="sk-w-80" />
                            </div>
                        </CprCardSkeleton>
                    </div>

                    <div className="cpr-col">
                        <CprCardSkeleton tone="success" titleWidth="sk-w-140" hintWidth="sk-w-230">
                            <div className="cpr-fields">
                                <CprFieldSkeleton labelWidth="sk-w-90" valueWidth="sk-w-180" />
                                <CprFieldSkeleton labelWidth="sk-w-90" valueWidth="sk-w-190" />
                                <CprFieldSkeleton labelWidth="sk-w-90" valueWidth="sk-w-130" />
                            </div>
                        </CprCardSkeleton>
                    </div>
                </div>

                <div className="cpr-meta">
                    <span className="skeleton-line sk-w-16 sk-h-16 rounded-circle me-1"></span>
                    <span className="skeleton-line sk-w-200 sk-h-14 rounded"></span>
                </div>
            </div>
        </div>
    );
};

export default CreditProfileRequestDetailsLoader;

