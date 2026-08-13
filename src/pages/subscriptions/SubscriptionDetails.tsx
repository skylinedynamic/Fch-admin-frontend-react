import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getSubscriptionDetails } from '../../modules/partner/services';
import { fetchInvoices } from '../../modules/invoice/services';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { toast } from 'react-toastify';
import BillingDetailsLoader from '../../components/Loader/BillingDetailsLoader';
import StatisticsCard from '../../components/Common/StatisticsCard';
import { INVOICE_STATUS_COLORS } from '../../config/invoiceConfig';

interface SubscriptionDetailData {
    id: string | number;
    borrower_id?: string | number;
    partner_id?: string | number;
    borrower_name?: string;
    partner_name?: string;
    borrower_email?: string;
    partner_email?: string;
    company_name?: string;
    enrollment_type?: string;
    status?: string;
    subscription_start_date?: string;
    subscription_end_date?: string;
    first_payment_date?: string;
    termination_date?: string;
    total_subscription_amount?: string;
    payable_amount?: string;
    subscription_amount_per_month?: string;
    monthly_platform_fee?: string;
    total_paid_amount?: string;
    installment_type?: number;
    installment_count?: number;
    installments_paid?: number;
    down_payment?: string;
    current_phase?: string;
    next_billing_date?: string;
    next_installment_date?: string;
    next_platform_fee_date?: string;
    enrollment_completed_at?: string;
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

    if (loading) {
        return (
            <div className="page-content">
                <div className="container-fluid">
                    <BillingDetailsLoader />
                </div>
            </div>
        );
    }

    if (!subscriptionDetails) {
        return (
            <div className="page-content">
                <div className="container-fluid">
                    <div className="alert alert-danger mt-3">Subscription details not found.</div>
                </div>
            </div>
        );
    }

    const typeColor = subscriptionDetails.borrower_id ? 'success' : 'primary';
    const accountType = subscriptionDetails.borrower_id ? 'Borrower' : 'Partner';
    const subscriberName = subscriptionDetails.borrower_id ? subscriptionDetails.borrower_name : subscriptionDetails.partner_name;
    const subscriberEmail = subscriptionDetails.borrower_id ? subscriptionDetails.borrower_email : subscriptionDetails.partner_email;

    const paidInst = subscriptionDetails.installments_paid || 0;
    const totalInst = subscriptionDetails.installment_count || 12;
    const percentage = totalInst > 0 ? Math.min(Math.round((paidInst / totalInst) * 100), 100) : 0;
    const isInstallment = subscriptionDetails.installment_type === 1 ||
        subscriptionDetails.enrollment_type?.toLowerCase().includes('payment plan') ||
        subscriptionDetails.enrollment_type?.toLowerCase().includes('installment');

    return (
        <div className="page-content">
            <div className="container-fluid">

                {/* Page Header */}
                <div className="row">
                    <div className="col-12 d-flex justify-content-between align-items-center py-2">
                        <div>
                            <h4 className="fs-20 mb-1 fw-semibold">Subscription Details</h4>
                            <nav aria-label="breadcrumb">
                                <ol className="breadcrumb m-0 fs-12 text-muted">
                                    <li className="breadcrumb-item"><Link to="/" className="text-muted">Dashboard</Link></li>
                                    <li className="breadcrumb-item"><Link to="/subscriptions" className="text-muted">Subscriptions</Link></li>
                                    <li className="breadcrumb-item active text-primary fw-medium" aria-current="page">Details</li>
                                </ol>
                            </nav>
                        </div>
                        <button onClick={() => navigate(-1)} className="btn btn-soft-secondary waves-effect btn-sm">
                            <i className="ri-arrow-left-line align-middle me-1"></i> Back
                        </button>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="row">
                    <StatisticsCard
                        title="Total Subscription"
                        count={subscriptionDetails.total_subscription_amount || '$0.00'}
                        icon="ri-money-dollar-circle-line"
                        colorVariant="success"
                        colSize="col-lg-4 col-md-6"
                    />
                    <StatisticsCard
                        title="Payable (Installment) Amount"
                        count={subscriptionDetails.payable_amount || '$0.00'}
                        icon="ri-hand-coin-line"
                        colorVariant="primary"
                        colSize="col-lg-4 col-md-6"
                    />
                    <StatisticsCard
                        title="Monthly Platform Fee"
                        count={subscriptionDetails.monthly_platform_fee || '$0.00'}
                        icon="ri-building-2-line"
                        colorVariant="info"
                        colSize="col-lg-4 col-md-6"
                    />
                </div>

                {/* Main Content Column (Single Column Stack) */}
                <div className="row">
                    <div className="col-12">

                        {/* Card 1: Subscriber Profile & Overview */}
                        <div className="card shadow-sm border-0 mb-4">
                            <div className="card-header align-items-center d-flex border-bottom border-light">
                                <div className="d-flex align-items-center flex-grow-1">
                                    <div className="avatar-xs flex-shrink-0 me-3">
                                        <div className={`avatar-title bg-${typeColor}-subtle text-${typeColor} rounded fs-16 d-flex align-items-center justify-content-center`} style={{ width: '32px', height: '32px' }}>
                                            <i className={subscriptionDetails.borrower_id ? 'ri-user-3-line' : 'ri-building-2-line'}></i>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="card-title mb-0 fs-15 fw-semibold">{subscriberName}</h4>
                                        <p className="text-muted mb-0 fs-12">{subscriberEmail}</p>
                                    </div>
                                </div>
                                <span className={`badge bg-${subscriptionDetails.status?.toLowerCase() === 'active' ? 'success' : 'warning'}-subtle text-${subscriptionDetails.status?.toLowerCase() === 'active' ? 'success' : 'warning'} text-uppercase px-2.5 py-1`}>
                                    {subscriptionDetails.status || 'Pending'}
                                </span>
                            </div>
                            <div className="card-body p-4">
                                <div className="row g-4">
                                    <div className="col-sm-6 col-md-3">
                                        <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Account Type</p>
                                        <span className={`badge bg-${typeColor}-subtle text-${typeColor} text-uppercase px-2.5 py-1 fw-semibold`}>
                                            {accountType}
                                        </span>
                                    </div>
                                    {subscriptionDetails.company_name && (
                                        <div className="col-sm-6 col-md-3">
                                            <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Company</p>
                                            <h5 className="fs-14 mb-0 fw-semibold text-dark">{subscriptionDetails.company_name}</h5>
                                        </div>
                                    )}
                                    <div className="col-sm-6 col-md-3">
                                        <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Enrollment Model</p>
                                        <span className="badge bg-primary-subtle text-primary fs-12 px-2.5 py-1 text-uppercase fw-semibold">
                                            {subscriptionDetails.enrollment_type || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="col-sm-6 col-md-3">
                                        <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Start Date</p>
                                        <h5 className="fs-14 mb-0 fw-semibold text-dark">{subscriptionDetails.subscription_start_date || 'N/A'}</h5>
                                    </div>
                                    <div className="col-sm-6 col-md-3">
                                        <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">End Date</p>
                                        <h5 className="fs-14 mb-0 fw-semibold text-dark">{subscriptionDetails.subscription_end_date || 'N/A'}</h5>
                                    </div>
                                    <div className="col-sm-6 col-md-3">
                                        <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">First Payment Date</p>
                                        <h5 className="fs-14 mb-0 fw-semibold text-dark">{subscriptionDetails.first_payment_date || 'N/A'}</h5>
                                    </div>
                                    {subscriptionDetails.termination_date && (
                                        <div className="col-sm-6 col-md-3">
                                            <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold text-danger">Termination Date</p>
                                            <h5 className="fs-14 mb-0 text-danger fw-semibold">{subscriptionDetails.termination_date}</h5>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Card 2: Billing & Progression Details */}
                        <div className="card shadow-sm border-0 mb-4">
                            <div className="card-header align-items-center d-flex border-bottom border-light">
                                <h4 className="card-title mb-0 flex-grow-1">Billing & Progression</h4>
                            </div>
                            <div className="card-body p-4">
                                {isInstallment ? (
                                    <>
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

                                        <div className="row g-4">
                                            <div className="col-sm-6 col-md-3">
                                                <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Total Payable Amount</p>
                                                <h5 className="fs-14 mb-0 fw-semibold text-dark">{subscriptionDetails.payable_amount || '$0.00'}</h5>
                                            </div>
                                            <div className="col-sm-6 col-md-3">
                                                <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Down Payment</p>
                                                <h5 className="fs-14 mb-0 fw-semibold text-success">{subscriptionDetails.down_payment || '$0.00'}</h5>
                                            </div>
                                            <div className="col-sm-6 col-md-3">
                                                <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Subscription Per Month</p>
                                                <h5 className="fs-14 mb-0 fw-semibold text-dark">{subscriptionDetails.subscription_amount_per_month || '$0.00'}</h5>
                                            </div>
                                            <div className="col-sm-6 col-md-3">
                                                <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Installment Count & Paid</p>
                                                <h5 className="fs-14 mb-0 fw-semibold text-dark">{paidInst} of {totalInst} Paid</h5>
                                            </div>
                                            <div className="col-sm-6 col-md-3">
                                                <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Platform Fee</p>
                                                <h5 className="fs-14 mb-0 fw-semibold text-dark">{subscriptionDetails.monthly_platform_fee || '$0.00'}</h5>
                                            </div>
                                            <div className="col-sm-6 col-md-3">
                                                <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Next Billing Date</p>
                                                <h5 className="fs-14 mb-0 fw-semibold text-dark">{subscriptionDetails.next_billing_date || subscriptionDetails.subscription_end_date || 'N/A'}</h5>
                                            </div>
                                            {subscriptionDetails.enrollment_completed_at && (
                                                <div className="col-sm-6 col-md-3">
                                                    <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Enrollment Completed At</p>
                                                    <h5 className="fs-14 mb-0 fw-semibold text-dark">{subscriptionDetails.enrollment_completed_at}</h5>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="row g-4">
                                        <div className="col-sm-6 col-md-3">
                                            <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Total Payable Amount</p>
                                            <h5 className="fs-14 mb-0 fw-semibold text-dark">{subscriptionDetails.payable_amount || '$0.00'}</h5>
                                        </div>
                                        <div className="col-sm-6 col-md-3">
                                            <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Platform Fee</p>
                                            <h5 className="fs-14 mb-0 fw-semibold text-dark">{subscriptionDetails.monthly_platform_fee || '$0.00'}</h5>
                                        </div>
                                        <div className="col-sm-6 col-md-3">
                                            <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Next Billing Date</p>
                                            <h5 className="fs-14 mb-0 fw-semibold text-dark">{subscriptionDetails.next_billing_date || subscriptionDetails.subscription_end_date || 'N/A'}</h5>
                                        </div>
                                        {subscriptionDetails.enrollment_completed_at && (
                                            <div className="col-sm-6 col-md-3">
                                                <p className="text-muted mb-1 fs-12 text-uppercase fw-semibold">Enrollment Completed At</p>
                                                <h5 className="fs-14 mb-0 fw-semibold text-dark">{subscriptionDetails.enrollment_completed_at}</h5>
                                            </div>
                                        )}
                                    </div>
                                )}
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

            </div>
        </div>
    );
}
