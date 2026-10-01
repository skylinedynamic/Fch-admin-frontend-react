import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageHeader from '../../common/PageHeader';
import { useCreditProfileRequestDetails } from '../../../modules/credit-profile-request';
import CreditProfileRequestDetailsLoader from '../../../components/Loader/CreditProfileRequestDetailsLoader';
import { formatSSN, formatDate } from '../../../utils/formatters';
import CreditAuthorizationPanel from './components/CreditAuthorizationPanel';
import { CprCard, CprField } from './components/CprCard';

export default function CreditProfileRequestDetails() {
    const { id } = useParams();
    const { data: apiResponse, isLoading, error } = useCreditProfileRequestDetails(id || '');
    const [showFullSSN, setShowFullSSN] = useState(false);

    if (isLoading) {
        return (
            <CreditProfileRequestDetailsLoader
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
            </CreditProfileRequestDetailsLoader>
        );
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

                {/* The FCRA evidence behind this client's pulls. Host partner
                    only - the panel hides itself for anyone else. */}
                <CreditAuthorizationPanel
                    borrowerId={request.borrower_id}
                    rows={request.credit_authorizations}
                />

                {/* 2fr / 1fr, collapsing to one column under lg. The loader
                    draws the same grid, so nothing moves when data arrives. */}
                <div className="cpr-grid">
                    <div className="cpr-col">
                        <CprCard
                            icon="ri-user-3-line"
                            tone="primary"
                            title="Applicant Details"
                            hint="Personal and contact information"
                        >
                            {/* Two even columns. These used to be 5 fields
                                against 2, which left half the card empty. */}
                            <div className="cpr-fields cpr-fields-2">
                                <CprField label="Full Name" icon="ri-account-circle-line" value={fullName} copyValue={fullName} />
                                <CprField label="Date of Birth" icon="ri-cake-2-line" value={formatDate(request.date_of_birth)} />
                                <CprField
                                    label="Social Security Number"
                                    icon="ri-lock-line"
                                    copyValue={request.ssn}
                                    value={
                                        <>
                                            <span className="font-monospace">{formatSSN(request.ssn, showFullSSN)}</span>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-reveal-ssn py-0 px-2 fs-12"
                                                onClick={() => setShowFullSSN(s => !s)}
                                            >
                                                <i className={`${showFullSSN ? 'ri-eye-off-line' : 'ri-eye-line'} align-middle me-1`}></i>
                                                {showFullSSN ? 'Hide' : 'Reveal'}
                                            </button>
                                        </>
                                    }
                                />
                                <CprField
                                    label="Email Address"
                                    icon="ri-mail-line"
                                    copyValue={request.email}
                                    value={<a href={`mailto:${request.email}`} className="text-primary text-decoration-none">{request.email}</a>}
                                />
                                <CprField
                                    label="Phone Number"
                                    icon="ri-phone-line"
                                    copyValue={request.phone}
                                    value={<a href={`tel:${request.phone}`} className="text-dark text-decoration-none">{request.phone}</a>}
                                />
                            </div>
                        </CprCard>

                        <CprCard
                            icon="ri-map-pin-2-line"
                            tone="warning"
                            title="Address Details"
                            hint="Residential address for credit verification"
                        >
                            <div className="cpr-fields cpr-fields-4">
                                <CprField
                                    label="Street Address"
                                    icon="ri-road-map-line"
                                    copyValue={request.address}
                                    value={
                                        <>
                                            {request.address}
                                            {request.apt_suite_other && (
                                                <span className="text-muted ms-1 fs-13">({request.apt_suite_other})</span>
                                            )}
                                        </>
                                    }
                                />
                                <CprField label="City" icon="ri-building-2-line" value={request.city} copyValue={request.city} />
                                <CprField label="State" icon="ri-map-2-line" value={request.state} copyValue={request.state} />
                                <CprField label="Zip Code" icon="ri-mail-send-line" value={request.zip} copyValue={request.zip} />
                            </div>
                        </CprCard>
                    </div>

                    <div className="cpr-col">
                        <CprCard
                            icon="ri-bank-card-line"
                            tone="success"
                            title="Borrower Account"
                            hint="Associated business and borrower details"
                        >
                            <div className="cpr-fields">
                                <CprField label="Business Name" icon="ri-building-line" value={borrowerName} />
                                {request.borrower && (
                                    <>
                                        <CprField
                                            label="Account Email"
                                            icon="ri-mail-send-line"
                                            copyValue={request.borrower.email || undefined}
                                            value={<a href={`mailto:${request.borrower.email}`} className="text-primary text-decoration-none">{request.borrower.email}</a>}
                                        />
                                        <CprField
                                            label="Account Phone"
                                            icon="ri-phone-fill"
                                            copyValue={request.borrower.phone_number || undefined}
                                            value={<a href={`tel:${request.borrower.phone_number}`} className="text-dark text-decoration-none">{request.borrower.phone_number}</a>}
                                        />
                                    </>
                                )}
                            </div>
                        </CprCard>
                    </div>
                </div>

                {request.created_at && (
                    <div className="cpr-meta">
                        <i className="ri-time-line"></i>
                        Submitted {new Date(request.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                )}
            </div>
        </div>
    );
}
