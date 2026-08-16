import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchBillingDetails } from '../../modules/partner/services';
import { fetchInvoices } from '../../modules/invoice/services';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { toast } from 'react-toastify';
import BillingDetailsLoader from '../../components/Loader/BillingDetailsLoader';
import StatisticsCard from '../../components/Common/StatisticsCard';
import { INVOICE_STATUS_COLORS } from '../../config/invoiceConfig';
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
                    page,
                    per_page: perPage,
                    sort_field: sortField,
                    sort_order: sortOrder,
                    entity_id: billingDetails?.entity_id,
                    entity_type: billingDetails?.entity_type,

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
        if (id && billingDetails) {
            loadInvoices();
        }
    }, [id, billingDetails, page, perPage, sortField, sortOrder]);

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

    const totalInvoiced = invoices.reduce((sum, inv) => sum + parseFloat(inv.payment_amount || 0), 0);
    const totalPaid = invoices.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + parseFloat(inv.payment_amount || 0), 0);
    const balanceDue = invoices.filter(inv => inv.status !== 'Paid').reduce((sum, inv) => sum + parseFloat(inv.payment_amount || 0), 0);

    const typeColor = entity_type === ENTITY_TYPE_PARTNER ? 'primary' : 'success';

    return (
        <div className="page-content">
            <div className="container-fluid">

                {/* Page Header — Always static & visible */}
                <div className="row">
                    <div className="col-12 d-flex justify-content-between align-items-center py-2">
                        <div>
                            <h4 className="fs-20 mb-1 fw-semibold">Billing Details</h4>
                            <nav aria-label="breadcrumb">
                                <ol className="breadcrumb m-0 fs-12 text-muted">
                                    <li className="breadcrumb-item"><Link to="/" className="text-muted">Dashboard</Link></li>
                                    <li className="breadcrumb-item"><Link to="/billing" className="text-muted">Upcoming Billings</Link></li>
                                    <li className="breadcrumb-item active text-primary fw-medium" aria-current="page">Details</li>
                                </ol>
                            </nav>
                        </div>
                        <button onClick={() => navigate(-1)} className="btn btn-soft-secondary waves-effect btn-sm">
                            <i className="ri-arrow-left-line align-middle me-1"></i> Back
                        </button>
                    </div>
                </div>

                {loading ? (
                    <BillingDetailsLoader />
                ) : !billingDetails ? (
                    <div className="alert alert-danger mt-3">Subscriber details not found.</div>
                ) : (
                    <>
                        {/* Stats Row — matches CommissionDetails pattern */}
                        <div className="row">
                            <StatisticsCard
                                title="Total Invoiced"
                                count={`$${totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                icon="ri-hand-coin-line"
                                colorVariant="primary"
                            />
                            <StatisticsCard
                                title="Total Paid"
                                count={`$${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                icon="ri-checkbox-circle-line"
                                colorVariant="success"
                            />
                            <StatisticsCard
                                title="Outstanding Balance"
                                count={`$${balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                icon="ri-error-warning-line"
                                colorVariant="danger"
                            />
                        </div>

                        {/* Main Detail Card — matches InvoiceDetails / PaymentDetails hero card pattern */}
                        <div className="row">
                            <div className="col-12">
                                <div className="card shadow-sm border-0 overflow-hidden">

                                    {/* Hero Header */}
                                    <div className="card-header bg-soft-primary border-bottom border-primary border-opacity-25 p-4">
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
                                                            <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Enrollment Type</p>
                                                            <span className="badge bg-primary-subtle text-primary fs-12 mt-1 px-2.5 py-1 text-uppercase">
                                                                {subscription.enrollment_type || 'N/A'}
                                                            </span>
                                                        </div>
                                                        <div className="col-sm-6">
                                                            <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Status</p>
                                                            <span className={`badge bg-${subscription.status?.toLowerCase() === 'active' ? 'success' : 'warning'}-subtle text-${subscription.status?.toLowerCase() === 'active' ? 'success' : 'warning'} fs-12 mt-1 px-2.5 py-1 text-uppercase`}>
                                                                {subscription.status}
                                                            </span>
                                                        </div>
                                                        <div className="col-sm-6">
                                                            <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Installment Amount</p>
                                                            <h5 className="fs-14 mb-0 text-dark fw-bold">
                                                                ${parseFloat(subscription.payable_amount || 0).toFixed(2)}
                                                            </h5>
                                                        </div>
                                                        <div className="col-sm-6">
                                                            <p className="text-muted mb-1 text-uppercase fw-semibold fs-12">Monthly Platform Fee</p>
                                                            <h5 className="fs-14 mb-0 text-dark fw-bold">
                                                                ${parseFloat(subscription.monthly_platform_fee || 0).toFixed(2)}
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
                    </>
                )}

            </div>
        </div>
    );
}
