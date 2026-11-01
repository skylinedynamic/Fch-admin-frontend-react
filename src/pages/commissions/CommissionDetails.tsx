import React, { useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import PageHeader from '../common/PageHeader';
import { useCommission } from '../../modules/commission/queries';
import { CommissionDetail } from '../../modules/commission/types';
import { COMMISSION_VIEWER, resolveCommissionViewer } from '../../modules/commission';
import { useAuthStore } from '../../store/auth/authStore';
import CommissionDetailsLoader from '../../components/Loader/CommissionDetailsLoader';
import ErrorPage from '../Utility/ErrorPage';
import { PAYMENT_STATUS_CLASS_MAP, COMMISSION_STATUS_CLASS_MAP, PAYMENT_STATUS_OPTIONS } from '../../config/statusOptions';
import { FUNDING_APPLICATION_STATUS_CLASS_MAP } from '../../config/borrower';
import { formatCurrency } from '../../utils/helper';
import { PAYOUT_TYPE_COMMISSION } from '../../config/compensationOptions';
import PayoutSection from './components/PayoutSection';

const DetailRow = ({ label, value, className = 'col-md-6 mb-3' }: { label: string; value: React.ReactNode; className?: string }) => (
    <div className={className}>
        <label className="form-label fs-13">{label}</label>
        <div className="fw-medium fs-13 text-muted">{value || '-'}</div>
    </div>
);

const StatCard = ({ title, value, icon, color = 'primary', statusClass, subValue }: { title: string; value: string; icon: string; color?: string; statusClass?: string; subValue?: string }) => (
    <div className="card border-0 shadow-sm h-100">
        <div className="card-body p-3">
            <div className="d-flex align-items-center">
                <div className={`avatar-sm flex-shrink-0 me-3`}>
                    <div className={`avatar-title ${statusClass || `bg-${color}-subtle text-${color}`} rounded fs-20`}>
                        <i className={icon}></i>
                    </div>
                </div>
                <div className="flex-grow-1">
                    <p className="text-muted fs-13 mb-1 text-uppercase">{title}</p>
                    <h5 className="mb-0 fw-bold">{value}</h5>
                    {subValue && <div className="text-muted fs-12 mt-1">{subValue}</div>}
                </div>
            </div>
        </div>
    </div>
);

export default function CommissionDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: fetchedCommission, isLoading, error } = useCommission(id);
    const [commissionState, setCommissionState] = useState<CommissionDetail | null>(null);
    const user = useAuthStore((state) => state.user);

    // Update state when data is fetched
    React.useEffect(() => {
        if (fetchedCommission) {
            setCommissionState(fetchedCommission);
        }
    }, [fetchedCommission]);

    const commission = commissionState || fetchedCommission;

    // Who is looking decides which money the page shows (see modules/commission/viewer).
    const viewer = resolveCommissionViewer(commission?.viewer, user);
    // Host staff follow their own payout here; only the host's side pays (the API says can_pay).
    const showsPayout = viewer === COMMISSION_VIEWER.HOST_OWNER || viewer === COMMISSION_VIEWER.HOST_STAFF;
    const commissionCard = !commission ? null : {
        [COMMISSION_VIEWER.HOST_OWNER]: { title: 'Total Commission', amount: commission.total_commission_amount, rate: commission.total_commission },
        [COMMISSION_VIEWER.PARTNER_OWNER]: { title: 'Your Commission', amount: commission.partner_commission_amount, rate: commission.partner_commission },
        [COMMISSION_VIEWER.HOST_STAFF]: { title: 'My Commission', amount: commission.payout?.amount, rate: commission.payout?.payout_type === PAYOUT_TYPE_COMMISSION ? commission.payout?.rate : null },
        [COMMISSION_VIEWER.PARTNER_STAFF]: null,
    }[viewer];



    // Shown in every state, so the breadcrumbs are there while it loads.
    const pageHeader = (
        <PageHeader 
            title="Commission Details" 
            breadcrumbs={[
                { label: 'Commissions', path: '/commissions' },
                { label: 'Details' }
            ]} 
        >
            <div className="page-actions d-flex align-items-center gap-2 mt-0">
                <button
                    onClick={() => navigate(-1)}
                    className="btn btn-soft-secondary waves-effect"
                >
                    <i className="ri-arrow-left-line align-middle me-1"></i> Back
                </button>
            </div>
        </PageHeader>
    );

    if (isLoading) {
        return (
            <div className="page-content">
                <div className="container-fluid">
                    {pageHeader}
                    <CommissionDetailsLoader />
                </div>
            </div>
        );
    }

    if (error || !commission) {
        return (
            <div className="page-content">
                <div className="container-fluid">
                    {pageHeader}
                    <ErrorPage />
                </div>
            </div>
        );
    }



    const authPartnerId = (user as any)?.partner_id;
    const showPartnerCommissionRow = commission?.partner_id !== authPartnerId;

    return (
        <div className="page-content">
            <div className="container-fluid">
                {pageHeader}

                {/* Key Metrics Stats Row */}
                <div className="row mb-4">
                    <div className="col-xl-3 col-md-6 mb-3 mb-xl-0">
                        <StatCard
                            title="Requested Amount"
                            value={formatCurrency(commission.funding_requested_amount, commission.currency_symbol, commission.conversion_rate, 0)}
                            icon="ri-money-dollar-circle-line"
                            color="primary"
                            subValue={`Funded Amount - ${formatCurrency(commission.funded_amount, commission.currency_symbol, commission.conversion_rate, 0)}`}
                        />
                    </div>
                    {/* The viewer's own money from the deal; partner staff get none (see modules/commission/viewer). */}
                    {commissionCard && (
                        <div className="col-xl-3 col-md-6 mb-3 mb-xl-0">
                            <StatCard
                                title={commissionCard.title}
                                value={formatCurrency(commissionCard.amount ?? 0, commission.currency_symbol, commission.conversion_rate, 0)}
                                icon="ri-wallet-line"
                                color="success"
                                subValue={commissionCard.rate != null ? `${commissionCard.rate}% Rate` : undefined}
                            />
                        </div>
                    )}
                    <div className="col-xl-3 col-md-6 mb-3 mb-xl-0">
                        <StatCard
                            title="Commission Status"
                            value={commission.commission_status}
                            icon="ri-checkbox-circle-line"
                            statusClass={COMMISSION_STATUS_CLASS_MAP[commission.commission_status]}
                        />
                    </div>
                    <div className="col-xl-3 col-md-6">
                        <StatCard
                            title="Payment Status"
                            value={commission.commission_payment_status}
                            icon="ri-secure-payment-line"
                            statusClass={PAYMENT_STATUS_CLASS_MAP[commission.commission_payment_status]}
                        />
                    </div>
                </div>

                <div className="row">
                    {/* Left Column: Main Information */}
                    <div className="col-lg-8">
                        {/* Partner Information — same design as the client details page */}
                        <div className="card partner-details-section p-0 mb-4">
                            <div className="card-header partner-section-header bg-transparent border-bottom border-bottom-dashed d-flex align-items-center justify-content-between py-3 px-4">
                                <div className="partner-section-title-wrap d-flex align-items-center gap-3">
                                    {commission.partner_logo ? (
                                        <img src={commission.partner_logo} alt="Partner Logo" className="partner-logo-img" />
                                    ) : (
                                        <div className="partner-logo-fallback">
                                            <i className="ri-user-line"></i>
                                        </div>
                                    )}
                                    <div>
                                        <h5 className="partner-section-title mb-1">Partner Details</h5>
                                        <p className="partner-section-subtitle mb-0">Partner this commission belongs to</p>
                                    </div>
                                </div>
                                {commission.partner_id ? (
                                    <Link to={`/partners/${commission.partner_id}`} className="btn btn-sm btn-soft-primary d-flex align-items-center gap-1 partner-profile-btn">
                                        <i className="ri-external-link-line"></i> View Profile
                                    </Link>
                                ) : (
                                    <span className="partner-status-badge">No Assigned Partner</span>
                                )}
                            </div>
                            <div className="card-body partner-details-body p-4">
                                <div className="partner-info-grid">
                                    <div className="partner-info-card">
                                        <span className="partner-info-label">Partner Name</span>
                                        <span className="partner-info-val">{commission.partner_name || 'N/A'}</span>
                                    </div>
                                    <div className="partner-info-card">
                                        <span className="partner-info-label">Company</span>
                                        <span className="partner-info-val">{commission.partner_company_name || 'N/A'}</span>
                                    </div>
                                    <div className="partner-info-card">
                                        <span className="partner-info-label">Phone</span>
                                        <span className="partner-info-val">{commission.partner_phone_number || 'N/A'}</span>
                                    </div>
                                    <div className="partner-info-card">
                                        <span className="partner-info-label">Email</span>
                                        <span className="partner-info-val">{commission.partner_email || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Borrower Information */}
                        <div className="card border-0 shadow-sm mb-4">
                            <div className="card-header bg-transparent border-bottom">
                                <h5 className="card-title mb-0 d-flex align-items-center">
                                    <i className="ri-user-line me-2 text-primary"></i>
                                    Borrower Information
                                </h5>
                            </div>
                            <div className="card-body">
                                <div className="row">
                                    <DetailRow
                                        label="Full Name"
                                        value={
                                            commission.borrower_id ? (
                                                <Link to={`/clients/${commission.borrower_id}`} className="text-muted text-decoration-underline-hover">
                                                    {commission.borrower_name}
                                                </Link>
                                            ) : commission.borrower_name
                                        }
                                    />
                                    <DetailRow label="Business Name" value={commission.borrower_business_name} />
                                    <DetailRow label="Email" value={commission.borrower_business_email} />
                                    <DetailRow label="Phone" value={commission.borrower_business_phone_no} />
                                    <div className="col-12">
                                        <label className="form-label fs-13 text-muted">Business Address</label>
                                        <div className="fw-medium fs-14">
                                            {commission.borrower_business_address && (
                                                <>
                                                    {commission.borrower_business_address}
                                                    {commission.borrower_business_city && `, ${commission.borrower_business_city}`}
                                                    {commission.borrower_business_state && `, ${commission.borrower_business_state}`}
                                                    {commission.business_postal_code && ` ${commission.business_postal_code}`}
                                                    {commission.borrower_business_country && `, ${commission.borrower_business_country}`}
                                                </>
                                            ) || '-'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Funding Details */}
                        <div className="card border-0 shadow-sm mb-4">
                            <div className="card-header bg-transparent border-bottom">
                                <h5 className="card-title mb-0 d-flex align-items-center">
                                    <i className="ri-funds-box-line me-2 text-primary"></i>
                                    Funding Details
                                </h5>
                            </div>
                            <div className="card-body">
                                <div className="row">
                                    <DetailRow label="Requested Amount" value={formatCurrency(commission.funding_requested_amount, commission.currency_symbol, commission.conversion_rate, 0)} />
                                    <DetailRow label="Funded Amount" value={formatCurrency(commission.funded_amount, commission.currency_symbol, commission.conversion_rate, 0)} text-success />
                                    <DetailRow label="Funding Status" value={<span className={`badge ${FUNDING_APPLICATION_STATUS_CLASS_MAP[commission.funding_status] || 'bg-light text-body'}`}>{commission.funding_status}</span>} />
                                    <DetailRow label="Funded Date" value={commission.funded_date} />
                                    <div className="col-12"><hr className="my-2 border-dashed" /></div>
                                    <DetailRow label="Industry Type" value={commission.funding_industry_type} />
                                    <DetailRow label="Entity Type" value={commission.funding_entity_type} />
                                    <DetailRow label="Funding Type" value={commission.funding_preferred_funding_type} />
                                    <DetailRow label="Purpose of Funds" value={commission.funding_purpose_of_funds} />
                                </div>
                            </div>
                        </div>


                    </div>

                    {/* Right Column: Payout, Commission Breakdown & Notes */}
                    <div className="col-lg-4">

                        {/* Payout — to the partner, or the assigned user of a host-partner client (Admin View Only) */}
                        {showsPayout && commission.payout && (
                            <PayoutSection
                                commissionId={commission.id}
                                payout={commission.payout}
                                currencySymbol={commission.currency_symbol}
                                conversionRate={commission.conversion_rate}
                            />
                        )}

                        {/* Commission Breakdown (Admin View Only) */}
                        {viewer === COMMISSION_VIEWER.HOST_OWNER && (
                            <div className="card border-0 shadow-sm mb-4">
                                <div className="card-header bg-transparent border-bottom">
                                    <h5 className="card-title mb-0 d-flex align-items-center">
                                        <i className="ri-pie-chart-line me-2 text-primary"></i>
                                        Commission Breakdown
                                    </h5>
                                </div>
                                <div className="card-body">
                                    <div className="table-responsive">
                                        <table className="table table-borderless table-nowrap mb-0 align-middle">
                                            <thead className="table-light text-muted">
                                                <tr>
                                                    <th scope="col">Type</th>
                                                    <th scope="col" className="text-end">Percentage</th>
                                                    <th scope="col" className="text-end">Amount</th>
                                                    <th scope="col" className="text-end"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td>
                                                        <div className="d-flex align-items-center">
                                                            <div className="avatar-xs me-2">
                                                                <div className="avatar-title bg-primary-subtle text-primary rounded-circle fs-16">T</div>
                                                            </div>
                                                            <span className="fw-medium">Success Fee</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-end">{commission.total_commission}%</td>
                                                    <td className="text-end fw-bold">{formatCurrency(commission.total_commission_amount, commission.currency_symbol, commission.conversion_rate, 0)}</td>
                                                    <td></td>
                                                </tr>
                                                <tr>
                                                    <td>
                                                        <div className="d-flex align-items-center">
                                                            <div className="avatar-xs me-2">
                                                                <div className="avatar-title bg-success-subtle text-success rounded-circle fs-16">A</div>
                                                            </div>
                                                            <span className="fw-medium">Admin Commission</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-end">{commission.admin_commission}%</td>
                                                    <td className="text-end fw-bold text-success">{formatCurrency(commission.admin_commission_amount, commission.currency_symbol, commission.conversion_rate, 0)}</td>
                                                    <td></td>
                                                </tr>
                                                {showPartnerCommissionRow && (
                                                    <tr>
                                                        <td>
                                                            <div className="d-flex align-items-center">
                                                                <div className="avatar-xs me-2">
                                                                    <div className="avatar-title bg-info-subtle text-info rounded-circle fs-16">P</div>
                                                                </div>
                                                                <span className="fw-medium me-2">Partner Commission</span>
                                                                {commission?.commission_payment_status === PAYMENT_STATUS_OPTIONS[0].value && (
                                                                    <span className="badge bg-success-subtle text-success border border-success border-opacity-25 fs-12 px-2 py-1">
                                                                        <i className="ri-checkbox-circle-line align-middle me-1"></i> {PAYMENT_STATUS_OPTIONS[0].label}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="text-end">{commission.partner_commission}%</td>
                                                        <td className="text-end fw-bold text-info">{formatCurrency(commission.partner_commission_amount, commission.currency_symbol, commission.conversion_rate, 0)}</td>
                                                        <td></td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Commission Notes */}
                        <div className="card border-0 shadow-sm mb-4">
                            <div className="card-header bg-transparent border-bottom">
                                <h5 className="card-title mb-0 d-flex align-items-center">
                                    <i className="ri-sticky-note-line me-2 text-primary"></i>
                                    Commission Notes
                                </h5>
                            </div>
                            <div className="card-body">
                                {commission.commission_note ? (
                                    <div className="alert alert-warning border-0 mb-0 py-3">
                                        <div className="d-flex">
                                            <div className="flex-grow-1 ms-3">
                                                <p className="mb-0 fs-13" style={{ whiteSpace: 'pre-wrap' }}>
                                                    {commission.commission_note}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-muted py-3">
                                        <p className="mb-0 fs-13">No notes available.</p>
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
