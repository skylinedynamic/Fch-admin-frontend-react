import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
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
        <div className="d-flex align-items-start gap-3 py-2 border-bottom h-100">
            {icon && (
                <div className="flex-shrink-0 text-primary mt-1">
                    <i className={`${icon} fs-16`}></i>
                </div>
            )}
            <div className="flex-grow-1 min-w-0">
                <div className="text-muted fs-12 text-uppercase fw-medium mb-1" style={{ letterSpacing: '0.5px' }}>
                    {label}
                </div>
                <div className="fw-semibold text-dark fs-14 d-flex align-items-center gap-2 flex-wrap justify-content-between">
                    <div>{value || <span className="text-muted fst-italic">—</span>}</div>
                    {textToCopy ? (
                        <button 
                            onClick={handleCopy} 
                            className="btn btn-sm p-0 flex-shrink-0"
                            style={{ color: copied ? '#198754' : '#adb5bd', transition: 'color 0.2s', lineHeight: 1 }}
                            title="Copy to clipboard"
                        >
                            <i className={copied ? "ri-check-line fs-15" : "ri-file-copy-line fs-14"}></i>
                        </button>
                    ) : null}
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
                <div className="row pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-lg-center flex-lg-row flex-column py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Application Details</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item"><Link to="/intake-review/credit-profile-requests">Credit Profile Requests</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">Details</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
                                <Link to="/intake-review/credit-profile-requests" className="btn btn-outline-secondary w-lg waves-effect">
                                    <i className="ri-arrow-left-line align-middle me-1"></i> Back
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-lg-12">
                        <div className="card shadow-sm border-0">
                            <div className="card-header bg-transparent border-bottom py-3">
                                <h5 className="card-title mb-0 fs-16 fw-semibold">Credit Profile Submission Details</h5>
                            </div>
                            <div className="card-body p-4">
                                
                                {/* Personal Information Section */}
                                <div className="d-flex align-items-center gap-2 mb-3">
                                    <div className="rounded bg-primary-subtle p-2">
                                        <i className="ri-user-3-line text-primary fs-16"></i>
                                    </div>
                                    <div>
                                        <div className="fw-semibold text-dark fs-14">Personal Information</div>
                                        <div className="text-muted fs-12">Applicant identity details</div>
                                    </div>
                                </div>
                                <div className="row g-4 mb-5">
                                    <div className="col-lg-4 col-md-6">
                                        <DetailItem label="Full Name" icon="ri-account-circle-line" value={fullName} copyValue={fullName} />
                                    </div>
                                    <div className="col-lg-4 col-md-6">
                                        <DetailItem label="Date of Birth" icon="ri-cake-2-line" value={formatDate(request.date_of_birth)} />
                                    </div>
                                    <div className="col-lg-4 col-md-6">
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
                                                        className="btn btn-sm btn-soft-secondary py-0 px-2 fs-12"
                                                        onClick={() => setShowFullSSN(s => !s)}
                                                    >
                                                        <i className={`${showFullSSN ? 'ri-eye-off-line' : 'ri-eye-line'} align-middle me-1`}></i>
                                                        {showFullSSN ? 'Hide' : 'Reveal'}
                                                    </button>
                                                </div>
                                            }
                                        />
                                    </div>
                                </div>

                                {/* Contact Information Section */}
                                <div className="d-flex align-items-center gap-2 mb-3">
                                    <div className="rounded bg-info-subtle p-2">
                                        <i className="ri-contacts-line text-info fs-16"></i>
                                    </div>
                                    <div>
                                        <div className="fw-semibold text-dark fs-14">Contact Information</div>
                                        <div className="text-muted fs-12">Reach and communication details</div>
                                    </div>
                                </div>
                                <div className="row g-4 mb-5">
                                    <div className="col-md-6">
                                        <DetailItem label="Email Address" icon="ri-mail-line" value={<a href={`mailto:${request.email}`} className="text-primary text-decoration-none">{request.email}</a>} copyValue={request.email} />
                                    </div>
                                    <div className="col-md-6">
                                        <DetailItem label="Phone Number" icon="ri-phone-line" value={<a href={`tel:${request.phone}`} className="text-dark text-decoration-none">{request.phone}</a>} copyValue={request.phone} />
                                    </div>
                                </div>

                                {/* Address Details Section */}
                                <div className="d-flex align-items-center gap-2 mb-3">
                                    <div className="rounded bg-warning-subtle p-2">
                                        <i className="ri-map-pin-2-line text-warning fs-16"></i>
                                    </div>
                                    <div>
                                        <div className="fw-semibold text-dark fs-14">Address Details</div>
                                        <div className="text-muted fs-12">Residential address for credit verification</div>
                                    </div>
                                </div>
                                <div className="row g-4 mb-5">
                                    <div className="col-md-6">
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
                                    <div className="col-md-2">
                                        <DetailItem label="City" icon="ri-building-2-line" value={request.city} copyValue={request.city} />
                                    </div>
                                    <div className="col-md-2">
                                        <DetailItem label="State" icon="ri-map-2-line" value={request.state} copyValue={request.state} />
                                    </div>
                                    <div className="col-md-2">
                                        <DetailItem label="Zip Code" icon="ri-mail-send-line" value={request.zip} copyValue={request.zip} />
                                    </div>
                                </div>

                                {/* Borrower Account Section */}
                                <div className="d-flex align-items-center gap-2 mb-3">
                                    <div className="rounded bg-success-subtle p-2">
                                        <i className="ri-bank-card-line text-success fs-16"></i>
                                    </div>
                                    <div>
                                        <div className="fw-semibold text-dark fs-14">Borrower Account</div>
                                        <div className="text-muted fs-12">Associated business and borrower details</div>
                                    </div>
                                </div>
                                <div className="row g-4">
                                    <div className="col-md-12">
                                        <DetailItem label="Business Name" icon="ri-building-line" value={borrowerName} />
                                    </div>
                                    {request.borrower && (
                                        <>
                                            <div className="col-md-6">
                                                <DetailItem label="Account Email" icon="ri-mail-send-line" value={<a href={`mailto:${request.borrower.email}`} className="text-primary text-decoration-none">{request.borrower.email}</a>} copyValue={request.borrower.email} />
                                            </div>
                                            <div className="col-md-6">
                                                <DetailItem label="Account Phone" icon="ri-phone-fill" value={<a href={`tel:${request.borrower.phone_number}`} className="text-dark text-decoration-none">{request.borrower.phone_number}</a>} copyValue={request.borrower.phone_number} />
                                            </div>
                                        </>
                                    )}
                                </div>
                                
                                {/* Submission timestamp */}
                                {request.created_at && (
                                    <div className="mt-4 pt-3 border-top d-flex align-items-center gap-2 text-muted fs-12 justify-content-end">
                                        <i className="ri-time-line"></i>
                                        Submitted on {new Date(request.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
