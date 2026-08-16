import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageHeader from '../../common/PageHeader';
import { useCreditProfileRequestDetails } from '../../../modules/credit-profile-request';
import CreditProfileRequestDetailsLoader from '../../../components/Loader/CreditProfileRequestDetailsLoader';
import { formatSSN, formatDate } from '../../../utils/formatters';

interface DetailItemProps {
    label: string;
    value: React.ReactNode;
    icon?: string;
    copyValue?: string;
}

const DetailItem = ({ label, value, icon, copyValue }: DetailItemProps) => {
    const [copied, setCopied] = useState(false);

    const textToCopy = copyValue || (typeof value === 'string' ? value : '');

    const handleCopy = () => {
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="d-flex align-items-start gap-3 py-2">
            {icon && (
                <div className="flex-shrink-0 text-muted">
                    <i className={`${icon} fs-16`}></i>
                </div>
            )}
            <div className="flex-grow-1 min-w-0">
                <div className="text-muted fs-12 text-uppercase fw-medium mb-1 detail-label">
                    {label}
                </div>
                <div className="fw-semibold text-dark fs-14 d-flex align-items-center gap-2">
                    <span>{value || <span className="text-muted fst-italic">—</span>}</span>
                    {textToCopy && (
                        <button
                            onClick={handleCopy}
                            className="btn btn-sm p-0 border-0 bg-transparent flex-shrink-0 fw-normal detail-copy-btn"
                            title="Copy"
                        >
                            <i className={`ri-${copied ? 'check-line' : 'file-copy-line'} detail-copy-icon${copied ? ' copied' : ''}`}></i>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function CreditProfileRequestDetails() {
    const { id } = useParams();
    const { data: apiResponse, isLoading, error } = useCreditProfileRequestDetails(id || '');
    const [showFullSSN, setShowFullSSN] = useState(false);

    if (isLoading) {
        return <CreditProfileRequestDetailsLoader />;
    }

    const request = apiResponse?.data;

    if (error || !request) {
        return (
            <div className="page-content">
                <div className="container-fluid py-5 text-center">
                    <i className="ri-error-warning-line fs-40 text-danger mb-2 d-block"></i>
                    <h5 className="fw-semibold">Error loading request details</h5>
                    <p className="text-muted">The requested credit profile request could not be found or loaded.</p>
                    <Link to="/intake-review/credit-profile-requests" className="btn btn-primary mt-3">
                        Back to List
                    </Link>
                </div>
            </div>
        );
    }

    const fullName = [request.first_name, request.middle_name, request.last_name].filter(Boolean).join(' ');
    const borrowerName = request.borrower
        ? (request.borrower.business_name || `${request.borrower.first_name || ''} ${request.borrower.last_name || ''}`.trim())
        : '-';

    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Header */}
                <PageHeader 
                    title="Application Details" 
                    breadcrumbs={[
                        { label: 'Credit Profile Requests', path: '/intake-review/credit-profile-requests' },
                        { label: 'Details' }
                    ]} 
                >
                    <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
                        <Link to="/intake-review/credit-profile-requests" className="btn btn-outline-secondary w-lg waves-effect">
                            <i className="ri-arrow-left-line align-middle me-1"></i> Back
                        </Link>
                    </div>
                </PageHeader>

                <div className="row g-4">
                    {/* ── Left column (8) ── */}
                    <div className="col-lg-8 d-flex flex-column">
                        {/* Combined Personal + Contact card */}
                        <div className="card shadow-sm">
                            <div className="card-header bg-transparent py-3">
                                <div className="d-flex align-items-center gap-2">
                                    <div className="rounded bg-primary-subtle p-2">
                                        <i className="ri-user-3-line text-primary fs-16"></i>
                                    </div>
                                    <div>
                                        <div className="fw-semibold text-dark fs-14">Applicant Details</div>
                                        <div className="text-muted fs-12">Personal and contact information</div>
                                    </div>
                                </div>
                            </div>
                            <div className="card-body px-4 py-3">
                                <div className="row g-0">
                                    <div className="col-6">
                                        <DetailItem label="First Name" icon="ri-account-circle-line" value={request.first_name} copyValue={request.first_name} />
                                        <DetailItem label="Middle Name" icon="ri-account-circle-line" value={request.middle_name || '-'} copyValue={request.middle_name || undefined} />
                                        <DetailItem label="Last Name" icon="ri-account-circle-line" value={request.last_name} copyValue={request.last_name} />
                                        <DetailItem label="Date of Birth" icon="ri-cake-2-line" value={formatDate(request.date_of_birth)} />
                                        <DetailItem
                                            label="Social Security Number"
                                            icon="ri-lock-line"
                                            copyValue={request.ssn}
                                            value={
                                                <div className="d-flex align-items-center gap-2">
                                                    <span className="font-monospace fs-14">
                                                        {formatSSN(request.ssn, showFullSSN)}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-reveal-ssn py-0 px-2 fs-12"
                                                        onClick={() => setShowFullSSN(s => !s)}
                                                    >
                                                        <i className={`${showFullSSN ? 'ri-eye-off-line' : 'ri-eye-line'} align-middle me-1`}></i>
                                                        {showFullSSN ? 'Hide' : 'Reveal'}
                                                    </button>
                                                </div>
                                            }
                                        />
                                    </div>
                                    <div className="col-6">
                                        <DetailItem label="Email Address" icon="ri-mail-line" value={<a href={`mailto:${request.email}`} className="text-primary text-decoration-none">{request.email}</a>} copyValue={request.email} />
                                        <DetailItem label="Phone Number" icon="ri-phone-line" value={<a href={`tel:${request.phone}`} className="text-dark text-decoration-none">{request.phone}</a>} copyValue={request.phone} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Address Details */}
                        <div className="card shadow-sm">
                            <div className="card-header bg-transparent  py-3">
                                <div className="d-flex align-items-center gap-2">
                                    <div className="rounded bg-warning-subtle p-2">
                                        <i className="ri-map-pin-2-line text-warning fs-16"></i>
                                    </div>
                                    <div>
                                        <div className="fw-semibold text-dark fs-14">Address Details</div>
                                        <div className="text-muted fs-12">Residential address for credit verification</div>
                                    </div>
                                </div>
                            </div>
                            <div className="card-body px-4 py-3">
                                <div className="row g-0">
                                    <div className="col-md-4">
                                        <DetailItem
                                            label="Street Address"
                                            icon="ri-road-map-line"
                                            value={
                                                <>
                                                    {request.address}
                                                    {request.apt_suite_other && (
                                                        <span className="text-muted ms-2 fs-13">({request.apt_suite_other})</span>
                                                    )}
                                                </>
                                            }
                                            copyValue={request.address}
                                        />
                                    </div>
                                    <div className="col-md-3">
                                        <DetailItem label="City" icon="ri-building-2-line" value={request.city} copyValue={request.city} />
                                    </div>
                                    <div className="col-md-3">
                                        <DetailItem label="State" icon="ri-map-2-line" value={request.state} copyValue={request.state} />
                                    </div>
                                    <div className="col-md-2">
                                        <DetailItem label="Zip Code" icon="ri-mail-send-line" value={request.zip} copyValue={request.zip} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Right column (4) ── */}
                    <div className="col-lg-4">
                        <div className="card shadow-sm">
                            <div className="card-header bg-transparent  py-3">
                                <div className="d-flex align-items-center gap-2">
                                    <div className="rounded bg-success-subtle p-2">
                                        <i className="ri-bank-card-line text-success fs-16"></i>
                                    </div>
                                    <div>
                                        <div className="fw-semibold text-dark fs-14">Borrower Account</div>
                                        <div className="text-muted fs-12">Associated business and borrower details</div>
                                    </div>
                                </div>
                            </div>
                            <div className="card-body px-4 py-3">
                                <DetailItem label="Business Name" icon="ri-building-line" value={<span>{borrowerName}</span>} />
                                {request.borrower && (
                                    <>
                                        <DetailItem label="Account Email" icon="ri-mail-send-line" value={<a href={`mailto:${request.borrower.email}`} className="text-primary text-decoration-none">{request.borrower.email}</a>} />
                                        <DetailItem label="Account Phone" icon="ri-phone-fill" value={<a href={`tel:${request.borrower.phone_number}`} className="text-dark text-decoration-none">{request.borrower.phone_number}</a>} />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Submission timestamp */}
                    {request.created_at && (
                        <div className="col-12">
                            <div className="d-flex align-items-center gap-2 text-muted fs-12 justify-content-end">
                                <i className="ri-time-line"></i>
                                Submitted on {new Date(request.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
