import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getSubscriptionDetails } from '../../modules/partner/services';
import { fetchInvoices } from '../../modules/invoice/services';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { toast } from 'react-toastify';
import BillingDetailsLoader from '../../components/Loader/BillingDetailsLoader';
import PageHeader from '../common/PageHeader';
import { INVOICE_STATUS_COLORS } from '../../config/invoiceConfig';
import { ENTITY_TYPE_PARTNER, ENTITY_TYPE_BORROWER } from '../../config/appConfig';

interface SubscriptionDetailData {
    id: string | number;
    entity_type?: string;
    subscription_title?: string;
    status?: string;

    subscriber_name?: string;
    subscriber_email?: string;
    company_name?: string;
    associated_partner_name?: string;
    partner_name?: string;
    borrower_name?: string;
    partner_email?: string;
    borrower_email?: string;

    subscription_start_date?: string;
    subscription_end_date?: string;
    first_payment_date?: string;
    platform_fee_start_date?: string;
    termination_date?: string;
    created_at?: string;
    updated_at?: string;

    is_enrollment_completed?: boolean;
    enrollment_completed_at?: string;
    next_billing_date?: string;
    next_billing_type?: string;
    next_billing_amount?: string;

    enrollment_type?: string;
    partner_type?: string;
    current_phase?: string;
    payable_amount?: string;
    total_subscription_amount?: string;
    subscription_amount_per_month?: string;
    down_payment?: string;
    monthly_platform_fee?: string;
    borrower_fee_amount?: string;

    installment_type?: number;
    installment_count?: number;
    installments_paid?: number;

    user_seats?: number;
    per_seat_amount?: string;
    total_seat_amount?: string;
}

export default function SubscriptionDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(true);
    const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetailData | null>(null);

    const [invoices, setInvoices] = useState<any[]>([]);
    const [invoicesLoading, setInvoicesLoading] = useState<boolean>(true);
    const [sortField, setSortField] = useState<string>('created_at');
    const [sortOrder, setSortOrder] = useState<string>('desc');

    useEffect(() => {
        const loadDetails = async () => {
            try {
                setLoading(true);
                if (id) {
                    const response = await getSubscriptionDetails(id);
                    if (response.status) {
                        setSubscriptionDetails(response.data);
                    } else {
                        toast.error(response.message || 'Failed to load subscription details');
                    }
                }
            } catch (error) {
                console.error('Error fetching subscription details:', error);
                toast.error('Failed to load subscription details');
            } finally {
                setLoading(false);
            }
        };
        if (id) {
            loadDetails();
        }
    }, [id]);

    useEffect(() => {
        const loadInvoices = async () => {
            try {
                setInvoicesLoading(true);
                const params = {
                    page: 1,
                    per_page: 1000,
                    sort_field: sortField,
                    sort_order: sortOrder,
                    subscription_id: id
                };
                const response = await fetchInvoices(params);
                if (response.status) {
                    setInvoices(response.data || []);
                }
            } catch (error) {
                console.error('Error fetching invoices:', error);
            } finally {
                setInvoicesLoading(false);
            }
        };
        if (id && subscriptionDetails) {
            loadInvoices();
        }
    }, [id, subscriptionDetails, sortField, sortOrder]);

    const onSort = (event: any) => {
        setSortField(event.sortField);
        setSortOrder(event.sortOrder === 1 ? 'asc' : 'desc');
    };

    const statusBodyTemplate = (rowData: any) => {
        const severity = INVOICE_STATUS_COLORS[rowData.status] || 'primary';
        return (
            <span className={`badge bg-${severity}-subtle text-${severity} px-3 py-1 rounded-pill fw-medium`}>
                {rowData.status}
            </span>
        );
    };

    const amountBodyTemplate = (rowData: any) => (
        <span className="fw-semibold text-dark">{rowData.displayable_payment_amount || '-'}</span>
    );

    const actionBodyTemplate = (rowData: any) => (
        <button
            className="btn btn-soft-primary btn-sm p-0 d-flex align-items-center justify-content-center border-0 shadow-none"
            style={{ width: '32px', height: '32px', borderRadius: '6px' }}
            onClick={() => navigate(`/invoices/${rowData.id}`)}
            title="View Invoice"
        >
            <i className="ri-eye-line fs-16"></i>
        </button>
    );

    // Determine Entity Type & Configuration
    const entityType = subscriptionDetails?.entity_type || '';
    const isPartner = entityType === ENTITY_TYPE_PARTNER;
    const isBorrower = entityType === ENTITY_TYPE_BORROWER;

    const subscriptionTitle = subscriptionDetails?.subscription_title || (
        isPartner ? `${ENTITY_TYPE_PARTNER} Subscription` : isBorrower ? `${ENTITY_TYPE_BORROWER} Subscription` : 'Subscription Details'
    );

    const typeColor = isPartner ? 'primary' : isBorrower ? 'success' : 'info';
    const accountType = isPartner ? ENTITY_TYPE_PARTNER : isBorrower ? ENTITY_TYPE_BORROWER : (subscriptionDetails?.entity_type || 'User / Additional Seat');

    const subscriberName = subscriptionDetails?.subscriber_name || subscriptionDetails?.partner_name || subscriptionDetails?.borrower_name || 'N/A';
    const subscriberEmail = subscriptionDetails?.subscriber_email || subscriptionDetails?.partner_email || subscriptionDetails?.borrower_email || 'N/A';

    const isCompleted = Boolean(subscriptionDetails?.is_enrollment_completed || subscriptionDetails?.enrollment_completed_at);
    const paidInst = subscriptionDetails?.installments_paid || 0;
    const totalInst = subscriptionDetails?.installment_count || 12;
    const percentage = totalInst > 0 ? Math.min(Math.round((paidInst / totalInst) * 100), 100) : 0;
    const isInstallment = subscriptionDetails?.installment_type === 1;

    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Page Header — always visible in fixed position */}
                <PageHeader
                    title="Subscription Details"
                    breadcrumbs={[
                        { label: 'Subscriptions', path: '/subscriptions' },
                        { label: 'Details' }
                    ]}
                >
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="btn btn-outline-secondary w-lg waves-effect"
                    >
                        <i className="ri-arrow-left-line align-middle me-1"></i> Back
                    </button>
                </PageHeader>

                {loading ? (
                    <BillingDetailsLoader />
                ) : !subscriptionDetails ? (
                    <div className="alert alert-danger mt-3">Subscription details not found.</div>
                ) : (
                    /* Main Content Column */
                    <div className="row">
                        <div className="col-12">

                            {/* Card 1: Subscriber Profile & Contract Metadata */}
                            <div className="card shadow-sm border-0 mb-4">
                                <div className="card-header align-items-center d-flex border-bottom border-light">
                                    <div className="d-flex align-items-center flex-grow-1">
                                        <div className="avatar-xs flex-shrink-0 me-3">
                                            <div className={`avatar-title bg-${typeColor}-subtle text-${typeColor} rounded fs-16 d-flex align-items-center justify-content-center`} style={{ width: '32px', height: '32px' }}>
                                                <i className={isBorrower ? 'ri-user-3-line' : isPartner ? 'ri-building-2-line' : 'ri-team-line'}></i>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="card-title mb-0 fs-15 fw-semibold">{subscriberName}</h4>
                                            <p className="text-muted mb-0 fs-12">{subscriberEmail}</p>
                                        </div>
                                    </div>
                                    <span className={`badge bg-${subscriptionDetails.status?.toLowerCase() === 'active' ? 'success' : 'warning'}-subtle text-${subscriptionDetails.status?.toLowerCase() === 'active' ? 'success' : 'warning'} text-uppercase px-2.5 py-1`}>
                                        {subscriptionDetails.status || 'Active'}
                                    </span>
                                </div>
                                <div className="card-body p-4">
                                    <div className="row g-4">
                                        <div className="col-sm-6 col-md-3">
                                            <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Subscription Type</p>
                                            <span className={`badge bg-${typeColor}-subtle text-${typeColor} text-uppercase px-2.5 py-1 fw-semibold`}>
                                                {subscriptionTitle}
                                            </span>
                                        </div>
                                        <div className="col-sm-6 col-md-3">
                                            <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Account Type</p>
                                            <h5 className="fs-14 mb-0 fw-semibold text-dark">{accountType}</h5>
                                        </div>
                                        {subscriptionDetails.company_name && (
                                            <div className="col-sm-6 col-md-3">
                                                <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Company</p>
                                                <h5 className="fs-14 mb-0 fw-semibold text-dark">{subscriptionDetails.company_name}</h5>
                                            </div>
                                        )}
                                        {isBorrower && subscriptionDetails.associated_partner_name && (
                                            <div className="col-sm-6 col-md-3">
                                                <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Associated Partner</p>
                                                <h5 className="fs-14 mb-0 fw-semibold text-dark">{subscriptionDetails.associated_partner_name}</h5>
                                            </div>
                                        )}
                                        <div className="col-sm-6 col-md-3">
                                            <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Enrollment Model</p>
                                            <span className="badge bg-primary-subtle text-primary fs-12 px-2.5 py-1 text-uppercase fw-semibold">
                                                {subscriptionDetails.enrollment_type || 'Standard'}
                                            </span>
                                        </div>
                                        <div className="col-sm-6 col-md-3">
                                            <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Start Date</p>
                                            <h5 className="fs-14 mb-0 fw-semibold text-dark">{subscriptionDetails.subscription_start_date || 'N/A'}</h5>
                                        </div>
                                        <div className="col-sm-6 col-md-3">
                                            <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Current Cycle End Date</p>
                                            <h5 className="fs-14 mb-0 fw-semibold text-dark">{subscriptionDetails.subscription_end_date || 'N/A'}</h5>
                                        </div>
                                        {subscriptionDetails.first_payment_date && (
                                            <div className="col-sm-6 col-md-3">
                                                <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">First Payment Date</p>
                                                <h5 className="fs-14 mb-0 fw-semibold text-dark">{subscriptionDetails.first_payment_date}</h5>
                                            </div>
                                        )}
                                        {subscriptionDetails.termination_date && (
                                            <div className="col-sm-6 col-md-3">
                                                <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold text-danger">Termination Date</p>
                                                <h5 className="fs-14 mb-0 text-danger fw-semibold">{subscriptionDetails.termination_date}</h5>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Financial Breakdown & Progression */}
                            <div className="card shadow-sm border-0 mb-4">
                                <div className="card-header align-items-center d-flex border-bottom border-light">
                                    <h4 className="card-title mb-0 flex-grow-1">Financial Breakdown & Progression</h4>
                                </div>
                                <div className="card-body p-4">

                                    {/* Progress Bar for Installment Plans */}
                                    {isInstallment && (
                                        <div className="bg-light bg-opacity-50 p-3 rounded mb-4 border border-light">
                                            <div className="d-flex align-items-center justify-content-between mb-2">
                                                <span className="text-dark fw-semibold fs-13">Installment Progress</span>
                                                <span className="badge bg-primary text-white fs-12 px-2.5 py-1">
                                                    {paidInst} of {totalInst} Paid ({percentage}%)
                                                </span>
                                            </div>
                                            <div className="progress progress-sm bg-primary-subtle rounded-pill" style={{ height: '8px' }}>
                                                <div
                                                    className="progress-bar bg-primary rounded-pill progress-bar-striped progress-bar-animated"
                                                    role="progressbar"
                                                    style={{ width: `${percentage}%` }}
                                                    aria-valuenow={percentage}
                                                    aria-valuemin={0}
                                                    aria-valuemax={100}
                                                ></div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Financial Details Grid */}
                                    <div className="row g-4">
                                        <div className="col-sm-6 col-md-3">
                                            <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Total Plan Amount</p>
                                            <h5 className="fs-14 mb-0 fw-semibold text-dark">
                                                {subscriptionDetails.payable_amount || subscriptionDetails.total_subscription_amount || '$0.00'}
                                            </h5>
                                        </div>

                                        {isInstallment && subscriptionDetails.down_payment && (
                                            <div className="col-sm-6 col-md-3">
                                                <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Down Payment</p>
                                                <h5 className="fs-14 mb-0 fw-semibold text-success">{subscriptionDetails.down_payment}</h5>
                                            </div>
                                        )}

                                        {isInstallment && !isCompleted && (
                                            <div className="col-sm-6 col-md-3">
                                                <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Monthly Installment</p>
                                                <h5 className="fs-14 mb-0 fw-semibold text-dark">
                                                    {subscriptionDetails.subscription_amount_per_month || '$0.00'}
                                                </h5>
                                            </div>
                                        )}

                                        {isPartner && subscriptionDetails.monthly_platform_fee && (
                                            <div className="col-sm-6 col-md-3">
                                                <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Monthly Platform Fee</p>
                                                <h5 className="fs-14 mb-0 fw-semibold text-primary">{subscriptionDetails.monthly_platform_fee}</h5>
                                            </div>
                                        )}

                                        {Boolean(subscriptionDetails.user_seats) && (
                                            <>
                                                <div className="col-sm-6 col-md-3">
                                                    <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Allocated User Seats</p>
                                                    <h5 className="fs-14 mb-0 fw-semibold text-dark">{subscriptionDetails.user_seats} Seats</h5>
                                                </div>
                                                {subscriptionDetails.per_seat_amount && (
                                                    <div className="col-sm-6 col-md-3">
                                                        <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Per Seat Amount</p>
                                                        <h5 className="fs-14 mb-0 fw-semibold text-dark">{subscriptionDetails.per_seat_amount}</h5>
                                                    </div>
                                                )}
                                                {subscriptionDetails.total_seat_amount && (
                                                    <div className="col-sm-6 col-md-3">
                                                        <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Monthly Seat Total</p>
                                                        <h5 className="fs-14 mb-0 fw-semibold text-primary">{subscriptionDetails.total_seat_amount}</h5>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        <div className="col-sm-6 col-md-3">
                                            <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Next Payment Due</p>
                                            <h5 className="fs-14 mb-0 fw-semibold text-primary">
                                                {isCompleted && isBorrower ? (
                                                    <span className="text-success fw-medium">No Further Dues</span>
                                                ) : (
                                                    <>
                                                        {subscriptionDetails.next_billing_date || subscriptionDetails.subscription_end_date || 'N/A'}
                                                        {subscriptionDetails.next_billing_amount && (
                                                            <span className="fs-12 text-muted ms-1">
                                                                ({subscriptionDetails.next_billing_amount})
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </h5>
                                        </div>

                                        {subscriptionDetails.enrollment_completed_at && (
                                            <div className="col-sm-6 col-md-3">
                                                <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Enrollment Completed At</p>
                                                <h5 className="fs-14 mb-0 fw-semibold text-success">{subscriptionDetails.enrollment_completed_at}</h5>
                                            </div>
                                        )}
                                    </div>

                                </div>
                            </div>

                            {/* Card 3: Invoices Ledger Table */}
                            <div className="card shadow-sm border-0 mb-4">
                                <div className="card-header align-items-center d-flex border-bottom border-light">
                                    <h4 className="card-title mb-0 flex-grow-1">Invoices Ledger</h4>
                                </div>
                                <div className="card-body p-4">
                                    <div className="table-responsive table-card">
                                        <DataTable
                                            value={invoices}
                                            paginator={false}
                                            loading={invoicesLoading}
                                            sortMode="single"
                                            sortField={sortField}
                                            sortOrder={sortOrder === 'asc' ? 1 : -1}
                                            onSort={onSort}
                                            dataKey="id"
                                            responsiveLayout="scroll"
                                            className="p-datatable-sm"
                                            emptyMessage="No invoices found for this subscription."
                                        >
                                            <Column field="invoice_id" header="Invoice ID" style={{ minWidth: '100px' }} />
                                            <Column field="created_at" header="Invoice Date" sortable style={{ minWidth: '140px' }} />
                                            <Column field="payment_amount" header="Amount" body={amountBodyTemplate} sortable style={{ minWidth: '110px' }} />
                                            <Column field="type" header="Type" sortable style={{ minWidth: '110px' }} />
                                            <Column field="status" header="Status" body={statusBodyTemplate} sortable style={{ minWidth: '110px' }} />
                                            <Column header="Action" body={actionBodyTemplate} style={{ width: '80px', textAlign: 'center' }} />
                                        </DataTable>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
