import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCommission } from '../../modules/commission/queries';
import { CommissionDetail } from '../../modules/commission/types';
import { useAuthStore } from '../../store/auth/authStore';
import TableLoader from '../../components/Loader/TableLoader';
import ErrorPage from '../Utility/ErrorPage';
import { PAYMENT_STATUS_CLASS_MAP, COMMISSION_STATUS_CLASS_MAP } from '../../config/statusOptions';
import { formatCurrency } from '../../utils/helper';

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

    // Determine if user is partner (is_host === false means partner)
    const isPartner = user?.is_host == false;



    if (isLoading) {
        return (
            <div className="page-content">
                <div className="container-fluid">
                    <TableLoader />
                </div>
            </div>
        );
    }

    if (error || !commission) {
        return (
            <div className="page-content">
                <div className="container-fluid">
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
                {/* Header Section */}
                <div className="row pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
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
                                {/* {!isPartner && commission?.commission_payment_status?.toLowerCase() !== 'paid' && (
                                    <button
                                        className="btn btn-success waves-effect waves-light"
                                    >
                                        <i className="ri-wallet-3-line align-middle me-1"></i> Process Payout
                                    </button>
                                )} */}
                                <button onClick={() => navigate(-1)} className="btn btn-soft-secondary waves-effect">
                                    <i className="ri-arrow-left-line align-middle me-1"></i> Back
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

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
                    <div className="col-xl-3 col-md-6 mb-3 mb-xl-0">
                        <StatCard
                            title={isPartner ? "Your Commission" : "Total Commission"}
                            value={formatCurrency(isPartner ? commission.partner_commission_amount : commission.total_commission_amount, commission.currency_symbol, commission.conversion_rate, 0)}
                            icon="ri-wallet-line"
                            color="success"
                            subValue={`${isPartner ? commission.partner_commission : commission.total_commission}% Rate`}
                        />
                    </div>
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
                                    <DetailRow label="Funding Status" value={<span className={`badge ${COMMISSION_STATUS_CLASS_MAP[commission.funding_status] || 'bg-light text-body'}`}>{commission.funding_status}</span>} />
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

                    {/* Right Column: Partner & Notes */}
                    <div className="col-lg-4">
                        {/* Partner Information */}
                        <div className="card border-0 shadow-sm mb-4">
                            <div className="card-header bg-transparent border-bottom">
                                <h5 className="card-title mb-0 d-flex align-items-center">
                                    <i className="ri-building-line me-2 text-primary"></i>
                                    Partner Information
                                </h5>
                            </div>
                            <div className="card-body">
                                <div className="d-flex align-items-center mb-3">
                                    <div className="flex-shrink-0">
                                        <div className="avatar-sm">
                                            <div className="avatar-title bg-light text-primary rounded-circle fs-20">
                                                {commission.partner_company_name ? commission.partner_company_name.charAt(0) : 'P'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-grow-1 ms-3">
                                        <Link to={`/partners/${commission.partner_id}`} className="text-reset text-decoration-none">
                                            <h6 className="fs-15 mb-1 text-primary text-decoration-underline-hover">{commission.partner_company_name || 'N/A'}</h6>
                                            <p className="text-muted mb-0 fs-13">{commission.partner_name}</p>
                                        </Link>
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <p className="text-muted mb-1 fs-12 text-uppercase fw-medium">Contact Details</p>
                                    <ul className="list-unstyled mb-0 vstack gap-2 fs-13">
                                        <li>
                                            <i className="ri-mail-line me-2 text-muted align-middle"></i>
                                            {commission.partner_email || 'N/A'}
                                        </li>
                                        <li>
                                            <i className="ri-phone-line me-2 text-muted align-middle"></i>
                                            {commission.partner_phone_number || 'N/A'}
                                        </li>
                                        {commission.partner_type && (
                                            <li>
                                                <i className="ri-star-line me-2 text-muted align-middle"></i>
                                                <span className="badge bg-success-subtle text-success border">{commission.partner_type}</span>
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        </div>


                        {/* Commission Breakdown (Admin View Only) */}
                        {!isPartner && (
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
                                                </tr>
                                                {showPartnerCommissionRow && (
                                                    <tr>
                                                        <td>
                                                            <div className="d-flex align-items-center">
                                                                <div className="avatar-xs me-2">
                                                                    <div className="avatar-title bg-info-subtle text-info rounded-circle fs-16">P</div>
                                                                </div>
                                                                <span className="fw-medium">Partner Commission</span>
                                                            </div>
                                                        </td>
                                                        <td className="text-end">{commission.partner_commission}%</td>
                                                        <td className="text-end fw-bold text-info">{formatCurrency(commission.partner_commission_amount, commission.currency_symbol, commission.conversion_rate, 0)}</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Commission Notes */}
                        <div className="card border-0 shadow-sm">
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
