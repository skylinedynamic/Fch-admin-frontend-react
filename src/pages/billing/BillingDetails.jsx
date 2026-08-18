import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchBillingDetails } from '../../modules/billing';
import { fetchInvoices } from '../../modules/invoice/services';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { toast } from 'react-toastify';
import BillingDetailsLoader from '../../components/Loader/BillingDetailsLoader';
import PageHeader from '../common/PageHeader';
import { STATUS_PAID as INVOICE_STATUS_PAID, INVOICE_STATUS_COLORS } from '../../config/invoiceConfig';
import { STATUS_ACTIVE as SUBSCRIPTION_STATUS_ACTIVE } from '../../config/subscriptionConfig';
import { ENTITY_TYPE_PARTNER, ENTITY_TYPE_BORROWER } from '../../config/appConfig';

export default function BillingDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [billingDetails, setBillingDetails] = useState(null);

    const [invoices, setInvoices] = useState([]);
    const [invoicesLoading, setInvoicesLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);
    const [sortField, setSortField] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('desc');

    useEffect(() => {
        const loadDetails = async () => {
            try {
                setLoading(true);
                const response = await fetchBillingDetails(id);
                if (response.status) {
                    setBillingDetails(response.data);
                } else {
                    toast.error(response.message || 'Failed to load subscriber details');
                }
            } catch (error) {
                console.error('Error fetching subscriber details:', error);
                toast.error('Failed to load subscriber details');
            } finally {
                setLoading(false);
            }
        };
        loadDetails();
    }, [id]);

    useEffect(() => {
        const loadInvoices = async () => {
            try {
                setInvoicesLoading(true);
                const params = {
                    subscription_id: id,
                    page,
                    per_page: perPage,
                    sort_field: sortField,
                    sort_order: sortOrder,
                };
                const response = await fetchInvoices(params);
                if (response.status) {
                    setInvoices(response.data || []);
                    setTotalRecords(response.meta?.total || 0);
                }
            } catch (error) {
                console.error('Error fetching invoices:', error);
            } finally {
                setInvoicesLoading(false);
            }
        };
        if (id) {
            loadInvoices();
        }
    }, [id, page, perPage, sortField, sortOrder]);

    const onPage = (event) => {
        setPerPage(event.rows);
        setPage(Math.floor(event.first / event.rows) + 1);
    };

    const onSort = (event) => {
        setSortField(event.sortField);
        setSortOrder(event.sortOrder === 1 ? 'asc' : 'desc');
    };

    const statusBodyTemplate = (rowData) => {
        const severity = INVOICE_STATUS_COLORS[rowData.status] || 'primary';
        return (
            <span className={`badge bg-${severity}-subtle text-${severity} px-3 py-1 rounded-pill fw-medium`}>
                {rowData.status}
            </span>
        );
    };

    const amountBodyTemplate = (rowData) => (
        <span className="fw-semibold text-dark">{rowData.displayable_payment_amount || '-'}</span>
    );

    const actionBodyTemplate = (rowData) => (
        <button
            className="btn btn-soft-primary btn-sm p-0 d-flex align-items-center justify-content-center border-0 shadow-none"
            style={{ width: '32px', height: '32px', borderRadius: '6px' }}
            onClick={() => navigate(`/invoices/${rowData.id}`)}
            title="View Invoice"
        >
            <i className="ri-eye-line fs-16"></i>
        </button>
    );

    const { subscriber, subscription, entity_type } = billingDetails || {};
    const name = billingDetails
        ? (entity_type === ENTITY_TYPE_PARTNER ? subscriber?.full_name : `${subscriber?.first_name} ${subscriber?.last_name}`)
        : '';
    const email = subscriber?.email || '';
    const phone = subscriber?.phone || 'N/A';
    const company = subscriber?.company_name || 'N/A';

    const typeColor = entity_type === ENTITY_TYPE_PARTNER ? 'primary' : 'success';

    return (
        <div className="page-content">
            <div className="container-fluid">

                {/* Page Header — always visible in fixed position */}
                <PageHeader
                    title="Billing Details"
                    breadcrumbs={[
                        { label: 'Upcoming Billings', path: '/billing' },
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
                ) : !billingDetails ? (
                    <div className="alert alert-danger mt-3">Subscriber details not found.</div>
                ) : (
                    /* Main Detail Card — matches InvoiceDetails / PaymentDetails hero card pattern */
                    <div className="row">
                        <div className="col-12">
                            <div className="card shadow-sm border-0 overflow-hidden">

                                {/* Hero Header */}
                                <div className="card-header border-bottom border-primary border-opacity-25 p-4">
                                    <div className="d-flex align-items-center">
                                        <div className="flex-shrink-0 avatar-sm">
                                            <div className={`avatar-title bg-${typeColor} bg-opacity-10 text-${typeColor} rounded fs-24`}>
                                                <i className={entity_type === ENTITY_TYPE_PARTNER ? 'ri-building-2-line' : 'ri-user-3-line'}></i>
                                            </div>
                                        </div>
                                        <div className="flex-grow-1 ms-3">
                                            <h4 className="card-title text-primary mb-1 fs-18">{name}</h4>
                                            <p className="text-muted mb-0 fs-13">{email}</p>
                                        </div>
                                        <div className="flex-shrink-0 text-end">
                                            <span className={`badge bg-${typeColor} fs-12 text-uppercase px-3 py-2`}>
                                                {entity_type}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Subscriber Info + Subscription Details side by side */}
                                <div className="card-body p-4 border-bottom border-bottom-dashed">
                                    <div className="row g-4">

                                        {/* Left: Subscriber Info */}
                                        <div className="col-lg-6 col-md-6">
                                            <h5 className="fs-16 fw-semibold mb-3">
                                                Subscriber Information
                                            </h5>
                                            <div className="row g-3">
                                                <div className="col-sm-6">
                                                    <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Full Name</p>
                                                    <h5 className="fs-14 mb-0">{name}</h5>
                                                </div>
                                                <div className="col-sm-6">
                                                    <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Email</p>
                                                    <h5 className="fs-14 mb-0 text-break">{email}</h5>
                                                </div>
                                                <div className="col-sm-6">
                                                    <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Phone</p>
                                                    <h5 className="fs-14 mb-0">{phone}</h5>
                                                </div>
                                                <div className="col-sm-6">
                                                    <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Account Type</p>
                                                    <h5 className="fs-14 mb-0 text-capitalize">{entity_type}</h5>
                                                </div>
                                                {entity_type === ENTITY_TYPE_PARTNER && (
                                                    <div className="col-sm-6">
                                                        <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Company</p>
                                                        <h5 className="fs-14 mb-0">{company}</h5>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Right: Subscription Details */}
                                        <div className="col-lg-6 col-md-6">
                                            <h5 className="fs-16 fw-semibold mb-3">
                                                Subscription Details
                                            </h5>
                                            {subscription ? (
                                                <div className="row g-3">
                                                    <div className="col-sm-6">
                                                        <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Enrollment Model</p>
                                                        <span className="badge bg-primary-subtle text-primary fs-12 mt-1 px-2.5 py-1 text-uppercase fw-semibold">
                                                            {subscription.enrollment_type || 'Standard'}
                                                        </span>
                                                    </div>
                                                    <div className="col-sm-6">
                                                        <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Status</p>
                                                        <span className={`badge bg-${subscription.status?.toLowerCase() === SUBSCRIPTION_STATUS_ACTIVE.toLowerCase() ? 'success' : 'warning'}-subtle text-${subscription.status?.toLowerCase() === SUBSCRIPTION_STATUS_ACTIVE.toLowerCase() ? 'success' : 'warning'} fs-12 mt-1 px-2.5 py-1 text-uppercase fw-semibold`}>
                                                            {subscription.status || SUBSCRIPTION_STATUS_ACTIVE}
                                                        </span>
                                                    </div>

                                                    {/* Dynamic breakdown based on enrollment_type / installment_type */}
                                                    {((subscription.installment_type === 1 || String(subscription.installment_type) === '1') || subscription.enrollment_type === 'Installment') ? (
                                                        <>
                                                            <div className="col-sm-6">
                                                                <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Monthly Installment</p>
                                                                <h5 className="fs-14 mb-0">
                                                                    {subscription.subscription_amount_per_month || subscription.payable_amount || '$0.00'}
                                                                </h5>
                                                            </div>
                                                            <div className="col-sm-6">
                                                                <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Installments Progress</p>
                                                                <h5 className="fs-14 mb-0">
                                                                    {subscription.installments_paid || 0} of {subscription.installment_count || 1} Paid
                                                                </h5>
                                                            </div>
                                                            {subscription.down_payment && subscription.down_payment !== '$0.00' && (
                                                                <div className="col-sm-6">
                                                                    <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Down Payment</p>
                                                                    <h5 className="fs-14 mb-0 text-success">
                                                                        {subscription.down_payment}
                                                                    </h5>
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className="col-sm-6">
                                                            <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Total Subscription Amount</p>
                                                            <h5 className="fs-14 mb-0">
                                                                {subscription.total_subscription_amount || subscription.payable_amount || '$0.00'}
                                                            </h5>
                                                        </div>
                                                    )}

                                                    {/* Monthly Platform Fee for Partner */}
                                                    {entity_type === ENTITY_TYPE_PARTNER && subscription.monthly_platform_fee && (
                                                        <div className="col-sm-6">
                                                            <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Monthly Platform Fee</p>
                                                            <h5 className="fs-14 mb-0">
                                                                {subscription.monthly_platform_fee}
                                                            </h5>
                                                        </div>
                                                    )}

                                                    {/* Additional Seats details if user_seats > 0 */}
                                                    {subscription.user_seats > 0 && (
                                                        <div className="col-sm-6">
                                                            <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">User Seats</p>
                                                            <h5 className="fs-14 mb-0 text-primary">
                                                                {subscription.user_seats} Seats ({subscription.per_seat_amount || '$0.00'}/seat)
                                                            </h5>
                                                        </div>
                                                    )}

                                                    {/* Next Billing Due */}
                                                    <div className="col-sm-6">
                                                        <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Next Billing Due</p>
                                                        <h5 className="fs-14 mb-0 text-primary fw-semibold">
                                                            {subscription.next_billing_date ? (
                                                                <>
                                                                    {subscription.next_billing_date}
                                                                    {subscription.next_billing_type && (
                                                                        <span className="fs-12 text-muted ms-1">({subscription.next_billing_type}: {subscription.next_billing_amount})</span>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                subscription.subscription_end_date || 'N/A'
                                                            )}
                                                        </h5>
                                                    </div>

                                                    <div className="col-sm-6">
                                                        <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Start Date</p>
                                                        <h5 className="fs-14 mb-0">
                                                            <i className="ri-calendar-event-line text-muted align-middle me-1"></i>
                                                            {subscription.subscription_start_date || 'N/A'}
                                                        </h5>
                                                    </div>
                                                    <div className="col-sm-6">
                                                        <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">End Date</p>
                                                        <h5 className="fs-14 mb-0">
                                                            <i className="ri-calendar-event-line text-muted align-middle me-1"></i>
                                                            {subscription.subscription_end_date || 'N/A'}
                                                        </h5>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-muted text-center py-4 fs-14">
                                                    <i className="ri-information-line fs-22 d-block mb-2 text-warning"></i>
                                                    No active subscription found.
                                                </div>
                                            )}
                                        </div>

                                    </div>
                                </div>

                                {/* Invoices Ledger Table */}
                                <div className="card-body p-4">
                                    <h5 className="fs-16 fw-semibold mb-3 border-bottom pb-2">
                                        Billing Ledger (Invoices)
                                    </h5>
                                    <div className="table-responsive">
                                        <DataTable
                                            value={invoices}
                                            loading={invoicesLoading}
                                            paginator
                                            lazy
                                            totalRecords={totalRecords}
                                            first={(page - 1) * perPage}
                                            rows={perPage}
                                            rowsPerPageOptions={[10, 25, 50, 100]}
                                            onPage={onPage}
                                            onSort={onSort}
                                            sortField={sortField}
                                            sortOrder={sortOrder === 'asc' ? 1 : -1}
                                            dataKey="id"
                                            scrollable
                                            scrollHeight="400px"
                                            className="p-datatable-sm fs-13"
                                            responsiveLayout="scroll"
                                            emptyMessage="No invoices found."
                                        >
                                            <Column field="invoice_id" header="Invoice ID" style={{ minWidth: '130px' }} sortable className="text-dark fw-medium" />
                                            <Column field="created_at" header="Invoice Date" style={{ minWidth: '160px' }} sortable />
                                            <Column field="payment_amount" header="Amount" body={amountBodyTemplate} style={{ minWidth: '130px' }} sortable />
                                            <Column field="status" header="Status" body={statusBodyTemplate} style={{ minWidth: '130px' }} sortable />
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

