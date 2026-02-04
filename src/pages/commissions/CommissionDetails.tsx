import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCommission } from '../../modules/commission/queries';
import { useAuthStore } from '../../store/auth/authStore';
import FormLoader from '../../components/Loader/FormLoader';

export default function CommissionDetails() {
    const { id } = useParams<{ id: string }>();
    const { data: commission, isLoading, error } = useCommission(id);
    const user = useAuthStore((state) => state.user);

    // Determine if user is partner (is_host === false means partner)
    const isPartner = user?.is_host === false;

    const formatCurrency = (amount: string | number | undefined) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: commission?.currency || 'USD',
            minimumFractionDigits: 0
        }).format(Number(amount) || 0);
    };

    const getStatusBadgeClass = (status: string | undefined) => {
        const s = status?.toLowerCase();
        if (s === 'approved' || s === 'paid') return 'bg-success';
        if (s === 'pending') return 'bg-warning';
        if (s === 'rejected' || s === 'declined' || s === 'cancelled') return 'bg-danger';
        return 'bg-secondary';
    };

    const handlePayout = () => {
        // TODO: Implement payout functionality
        alert('Payout functionality to be implemented');
    };

    if (isLoading) {
        return (
            <div className="page-content">
                <div className="container-fluid">
                    <FormLoader count={10} />
                </div>
            </div>
        );
    }

    if (error || !commission) {
        return (
            <div className="page-content">
                <div className="container-fluid">
                    <div className="alert alert-danger">
                        <i className="ri-error-warning-line me-2"></i>
                        Commission not found or an error occurred while fetching details.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Header Section */}
                <div className="row mb-3 pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1 fw-semibold">Commission Details</h4>
                                <nav aria-label="breadcrumb" className="d-none d-sm-block">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item"><Link to="/commissions">Commissions</Link></li>
                                        <li className="breadcrumb-item active">Details</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="page-actions d-flex align-items-center gap-2 mt-0">
                                {!isPartner && commission?.commission_payment_status?.toLowerCase() !== 'paid' && (
                                    <button
                                        onClick={handlePayout}
                                        className="btn btn-success waves-effect waves-light"
                                    >
                                        <i className="ri-wallet-3-line align-middle me-1"></i> Process Payout
                                    </button>
                                )}
                                <Link to="/commissions" className="btn btn-soft-secondary waves-effect">
                                    <i className="ri-arrow-left-line align-middle me-1"></i> Back
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Hero Section with Gradient */}
                <div className="row mb-4">
                    <div className="col-12">
                        <div className="card border-0 shadow-lg overflow-hidden" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                            <div className="card-body p-4">
                                <div className="row align-items-center">
                                    <div className="col-lg-8">
                                        <div className="d-flex align-items-center mb-3">
                                            <div className="avatar-lg rounded-circle bg-white bg-opacity-25 me-3 d-flex align-items-center justify-content-center">
                                                <i className="ri-money-dollar-circle-fill fs-1 text-white"></i>
                                            </div>
                                            <div>
                                                <h3 className="text-white mb-1 fw-bold">{commission.borrower_name}</h3>
                                                <p className="text-white-50 mb-0 d-flex align-items-center gap-2">
                                                    <span><i className="ri-building-line me-1"></i>{commission.borrower_business_name}</span>
                                                    <span className="mx-2">•</span>
                                                    <span><i className="ri-file-text-line me-1"></i>App #{commission.funding_application_id}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="row g-3">
                                            <div className="col-sm-4">
                                                <div className="text-white-50 fs-13 mb-1">Funded Amount</div>
                                                <h4 className="text-white mb-0 fw-bold">{formatCurrency(commission.funding_total_funded_amount)}</h4>
                                            </div>
                                            <div className="col-sm-4">
                                                <div className="text-white-50 fs-13 mb-1">{isPartner ? 'Your Commission' : 'Total Commission'}</div>
                                                <h4 className="text-white mb-0 fw-bold">
                                                    {formatCurrency(isPartner ? commission.partner_commission_amount : commission.total_commission_amount)}
                                                </h4>
                                            </div>
                                            <div className="col-sm-4">
                                                <div className="text-white-50 fs-13 mb-1">Commission Rate</div>
                                                <h4 className="text-white mb-0 fw-bold">
                                                    {isPartner ? commission.partner_commission : commission.total_commission}%
                                                </h4>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-lg-4 text-lg-end mt-3 mt-lg-0">
                                        <div className="mb-3">
                                            <span className={`badge ${getStatusBadgeClass(commission.commission_status)} fs-13 px-3 py-2 text-white`}>
                                                <i className="ri-checkbox-circle-line me-1"></i>
                                                {commission.commission_status}
                                            </span>
                                        </div>
                                        <div>
                                            <span className={`badge ${getStatusBadgeClass(commission.commission_payment_status)} fs-13 px-3 py-2 text-white`}>
                                                <i className="ri-wallet-3-line me-1"></i>
                                                {commission.commission_payment_status}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    {/* Left Column */}
                    <div className="col-lg-8">
                        {/* Commission Breakdown - Only for Hosts */}
                        {!isPartner && (
                            <div className="card border-0 shadow-sm mb-4">
                                <div className="card-header bg-light border-0">
                                    <h5 className="card-title mb-0 d-flex align-items-center">
                                        <div className="avatar-xs rounded-circle bg-primary-subtle me-2 d-flex align-items-center justify-content-center">
                                            <i className="ri-pie-chart-line text-primary"></i>
                                        </div>
                                        Commission Breakdown
                                    </h5>
                                </div>
                                <div className="card-body p-4">
                                    <div className="row g-3">
                                        <div className="col-md-4">
                                            <div className="p-3 rounded-3 text-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                                                <div className="text-white-50 fs-13 mb-2">Total Commission</div>
                                                <h3 className="text-white mb-1 fw-bold">{formatCurrency(commission.total_commission_amount)}</h3>
                                                <div className="text-white-50 fs-13">{commission.total_commission}%</div>
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="p-3 rounded-3 text-center bg-success-subtle">
                                                <div className="text-success fs-13 mb-2">Admin Commission</div>
                                                <h3 className="text-success mb-1 fw-bold">{formatCurrency(commission.admin_commission_amount)}</h3>
                                                <div className="text-success fs-13">{commission.admin_commission}%</div>
                                            </div>
                                        </div>
                                        <div className="col-md-4">
                                            <div className="p-3 rounded-3 text-center bg-info-subtle">
                                                <div className="text-info fs-13 mb-2">Partner Commission</div>
                                                <h3 className="text-info mb-1 fw-bold">{formatCurrency(commission.partner_commission_amount)}</h3>
                                                <div className="text-info fs-13">{commission.partner_commission}%</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Borrower Information */}
                        <div className="card border-0 shadow-sm mb-4">
                            <div className="card-header bg-primary-subtle border-0">
                                <h5 className="card-title mb-0 text-primary d-flex align-items-center">
                                    <div className="avatar-xs rounded-circle bg-primary me-2 d-flex align-items-center justify-content-center">
                                        <i className="ri-user-line text-white fs-16"></i>
                                    </div>
                                    Borrower Information
                                </h5>
                            </div>
                            <div className="card-body p-4">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <div className="d-flex align-items-start">
                                            <div className="flex-shrink-0">
                                                <div className="avatar-sm rounded bg-primary-subtle d-flex align-items-center justify-content-center">
                                                    <i className="ri-user-3-fill text-primary fs-18"></i>
                                                </div>
                                            </div>
                                            <div className="flex-grow-1 ms-3">
                                                <p className="text-muted mb-1 fs-13">Full Name</p>
                                                <h6 className="mb-0">{commission.borrower_name || 'N/A'}</h6>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="d-flex align-items-start">
                                            <div className="flex-shrink-0">
                                                <div className="avatar-sm rounded bg-success-subtle d-flex align-items-center justify-content-center">
                                                    <i className="ri-store-2-fill text-success fs-18"></i>
                                                </div>
                                            </div>
                                            <div className="flex-grow-1 ms-3">
                                                <p className="text-muted mb-1 fs-13">Business Name</p>
                                                <h6 className="mb-0">{commission.borrower_business_name || 'N/A'}</h6>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="d-flex align-items-start">
                                            <div className="flex-shrink-0">
                                                <div className="avatar-sm rounded bg-info-subtle d-flex align-items-center justify-content-center">
                                                    <i className="ri-mail-fill text-info fs-18"></i>
                                                </div>
                                            </div>
                                            <div className="flex-grow-1 ms-3">
                                                <p className="text-muted mb-1 fs-13">Email</p>
                                                <h6 className="mb-0 text-break">{commission.borrower_business_email || 'N/A'}</h6>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="d-flex align-items-start">
                                            <div className="flex-shrink-0">
                                                <div className="avatar-sm rounded bg-warning-subtle d-flex align-items-center justify-content-center">
                                                    <i className="ri-phone-fill text-warning fs-18"></i>
                                                </div>
                                            </div>
                                            <div className="flex-grow-1 ms-3">
                                                <p className="text-muted mb-1 fs-13">Phone</p>
                                                <h6 className="mb-0">{commission.borrower_business_phone_no || 'N/A'}</h6>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-12">
                                        <div className="d-flex align-items-start">
                                            <div className="flex-shrink-0">
                                                <div className="avatar-sm rounded bg-danger-subtle d-flex align-items-center justify-content-center">
                                                    <i className="ri-map-pin-fill text-danger fs-18"></i>
                                                </div>
                                            </div>
                                            <div className="flex-grow-1 ms-3">
                                                <p className="text-muted mb-1 fs-13">Business Address</p>
                                                <p className="mb-0">
                                                    {commission.borrower_business_address && (
                                                        <>
                                                            {commission.borrower_business_address}
                                                            {commission.borrower_business_city && `, ${commission.borrower_business_city}`}
                                                            {commission.borrower_business_state && `, ${commission.borrower_business_state}`}
                                                            {commission.business_postal_code && ` ${commission.business_postal_code}`}
                                                            {commission.borrower_business_country && `, ${commission.borrower_business_country}`}
                                                        </>
                                                    ) || 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Funding Application Details */}
                        <div className="card border-0 shadow-sm mb-4">
                            <div className="card-header bg-success-subtle border-0">
                                <h5 className="card-title mb-0 text-success d-flex align-items-center">
                                    <div className="avatar-xs rounded-circle bg-success me-2 d-flex align-items-center justify-content-center">
                                        <i className="ri-funds-box-line text-white fs-16"></i>
                                    </div>
                                    Funding Application Details
                                </h5>
                            </div>
                            <div className="card-body p-4">
                                <div className="row g-3 mb-3">
                                    <div className="col-md-6">
                                        <div className="border border-success border-opacity-25 rounded-3 p-3 bg-success-subtle bg-opacity-10">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <p className="text-muted mb-1 fs-13">Requested Amount</p>
                                                    <h5 className="mb-0 text-success">{formatCurrency(commission.funding_requested_amount)}</h5>
                                                </div>
                                                <div className="avatar-sm rounded-circle bg-success-subtle d-flex align-items-center justify-content-center">
                                                    <i className="ri-hand-coin-line text-success fs-20"></i>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="border border-primary border-opacity-25 rounded-3 p-3 bg-primary-subtle bg-opacity-10">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <p className="text-muted mb-1 fs-13">Funded Amount</p>
                                                    <h5 className="mb-0 text-primary">{formatCurrency(commission.funding_total_funded_amount)}</h5>
                                                </div>
                                                <div className="avatar-sm rounded-circle bg-primary-subtle d-flex align-items-center justify-content-center">
                                                    <i className="ri-money-dollar-circle-line text-primary fs-20"></i>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="row g-3">
                                    <div className="col-md-4">
                                        <p className="text-muted mb-1 fs-13">Status</p>
                                        <span className={`badge ${getStatusBadgeClass(commission.funding_status)} text-white`}>
                                            {commission.funding_status}
                                        </span>
                                    </div>
                                    <div className="col-md-4">
                                        <p className="text-muted mb-1 fs-13">Industry Type</p>
                                        <p className="mb-0 fw-medium">{commission.funding_industry_type || 'N/A'}</p>
                                    </div>
                                    <div className="col-md-4">
                                        <p className="text-muted mb-1 fs-13">Entity Type</p>
                                        <p className="mb-0 fw-medium">{commission.funding_entity_type || 'N/A'}</p>
                                    </div>
                                    <div className="col-md-6">
                                        <p className="text-muted mb-1 fs-13">Funding Type</p>
                                        <p className="mb-0 fw-medium">{commission.funding_preferred_funding_type || 'N/A'}</p>
                                    </div>
                                    {commission.funding_purpose_of_funds && (
                                        <div className="col-12">
                                            <p className="text-muted mb-1 fs-13">Purpose of Funds</p>
                                            <div className="alert alert-info mb-0 py-2">
                                                <i className="ri-information-line me-1"></i>
                                                {commission.funding_purpose_of_funds}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="col-lg-4">
                        {/* Partner Information */}
                        <div className="card border-0 shadow-sm mb-4" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                            <div className="card-body p-4">
                                <h5 className="card-title mb-4 text-white d-flex align-items-center">
                                    <i className="ri-building-line me-2 fs-20"></i>
                                    Partner Information
                                </h5>
                                <div className="mb-3">
                                    <p className="text-white-50 mb-1 fs-13">Partner Name</p>
                                    <h6 className="mb-0 text-white">{commission.partner_name || 'N/A'}</h6>
                                </div>
                                <div className="mb-3">
                                    <p className="text-white-50 mb-1 fs-13">Company</p>
                                    <h6 className="mb-0 text-white">{commission.partner_company_name || 'N/A'}</h6>
                                </div>
                                <div className="mb-3">
                                    <p className="text-white-50 mb-1 fs-13">Email</p>
                                    <p className="mb-0 text-white text-break">{commission.partner_email || 'N/A'}</p>
                                </div>
                                <div className="mb-3">
                                    <p className="text-white-50 mb-1 fs-13">Phone</p>
                                    <p className="mb-0 text-white">{commission.partner_phone_number || 'N/A'}</p>
                                </div>
                                {commission.partner_type && (
                                    <div className="mb-0">
                                        <p className="text-white-50 mb-1 fs-13">Partner Type</p>
                                        <span className="badge bg-white text-dark">{commission.partner_type}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Contact Person */}
                        {(commission.partner_contact_person || commission.partner_contact_person_email || commission.partner_contact_person_phone_number) && (
                            <div className="card border-0 shadow-sm mb-4">
                                <div className="card-header bg-info-subtle border-0">
                                    <h6 className="mb-0 text-info d-flex align-items-center">
                                        <i className="ri-contacts-line me-2"></i>
                                        Contact Person
                                    </h6>
                                </div>
                                <div className="card-body p-3">
                                    {commission.partner_contact_person && (
                                        <div className="mb-2">
                                            <p className="text-muted mb-1 fs-13">Name</p>
                                            <p className="mb-0 fw-medium">{commission.partner_contact_person}</p>
                                        </div>
                                    )}
                                    {commission.partner_contact_person_email && (
                                        <div className="mb-2">
                                            <p className="text-muted mb-1 fs-13">Email</p>
                                            <p className="mb-0 text-break">{commission.partner_contact_person_email}</p>
                                        </div>
                                    )}
                                    {commission.partner_contact_person_phone_number && (
                                        <div className="mb-0">
                                            <p className="text-muted mb-1 fs-13">Phone</p>
                                            <p className="mb-0">{commission.partner_contact_person_phone_number}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Commission Notes */}
                        {commission.commission_note && (
                            <div className="card border-0 shadow-sm">
                                <div className="card-header bg-warning-subtle border-0">
                                    <h6 className="mb-0 text-warning d-flex align-items-center">
                                        <i className="ri-file-text-line me-2"></i>
                                        Commission Notes
                                    </h6>
                                </div>
                                <div className="card-body p-3">
                                    <div className="alert alert-warning mb-0 py-2">
                                        <p className="mb-0 fs-14" style={{ whiteSpace: 'pre-wrap' }}>
                                            {commission.commission_note}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
