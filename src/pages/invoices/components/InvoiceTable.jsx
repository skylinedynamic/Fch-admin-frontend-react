import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import TableLoader from '../../../components/Loader/TableLoader';
import { INVOICE_STATUS_COLORS, INVOICE_STATUS_OPTIONS, STATUS_PAID } from '../../../config/invoiceConfig';
import InvoicePaymentModal from './InvoicePaymentModal';
import InvoicePreviewModal from './InvoicePreviewModal';
import { useAuthStore } from '../../../store/auth';
import { ENTITY_TYPE_PARTNER } from '../../../config/appConfig';

export default function InvoiceTable({
    data,
    loading,
    totalRecords,
    page,
    perPage,
    onPage,
    onSort,
    onFilter,
    filters,
    sortField,
    sortOrder,
    onRefresh // Add onRefresh prop to reload data after payment
}) {
    const user = useAuthStore((state) => state.user);
    const navigate = useNavigate();
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    const handlePreviewClick = (invoice) => {
        setSelectedInvoice(invoice);
        setShowPreviewModal(true);
    };

    const handlePayClick = (invoice) => {
        setSelectedInvoice(invoice);
        setShowPaymentModal(true);
    };

    const handlePaymentSuccess = () => {
        setShowPaymentModal(false);
        if (onRefresh) onRefresh();
    };

    const statusFilterElement = (options) => {
        return (
            <Dropdown
                value={options.value}
                options={INVOICE_STATUS_OPTIONS}
                onChange={(e) => options.filterApplyCallback(e.value)}
                optionLabel="label"
                optionValue="value"
                placeholder="Select Status"
                className="p-column-filter"
                showClear
                style={{ minWidth: '10rem' }}
            />
        );
    };

    const statusBodyTemplate = (rowData) => {
        const severity = INVOICE_STATUS_COLORS[rowData.status] || 'primary';

        return (
            <span className={`badge bg-${severity}-subtle text-${severity} px-3 py-1 rounded-pill fw-medium`}>
                {rowData.status}
            </span>
        );
    };

    const amountBodyTemplate = (rowData) => {
        return <span>{rowData.displayable_payment_amount || '-'}</span>;
    };

    const customerBodyTemplate = (rowData) => {
        const customerName = rowData.customer_name || '-';
        const entityType = rowData.entity_type
            ? rowData.entity_type : null;

        return (
            <span>
                {customerName}
                {entityType && <span className="text-muted ms-1">({entityType})</span>}
            </span>
        );
    };

    const typeBodyTemplate = (rowData) => {
        return <span className="fw-medium">{rowData.type || '-'}</span>;
    };

    const actionBodyTemplate = (rowData) => {
        const isNotPaid = rowData.status !== STATUS_PAID;
        const isNotHost = user?.is_host == 0;
        return (
            <div className="d-flex align-items-center gap-2">
                <button
                    className="btn btn-soft-danger btn-sm p-1 d-flex align-items-center justify-content-center"
                    style={{ width: '28px', height: '28px' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        handlePreviewClick(rowData);
                    }}
                    title="View Details"
                >
                    <i className="ri-file-pdf-line fs-14"></i>
                </button>
                {isNotPaid && isNotHost && rowData.entity_type?.includes(ENTITY_TYPE_PARTNER) && (
                    <button
                        className="btn btn-primary btn-sm waves-effect waves-light fw-medium border-0"
                        onClick={(e) => {
                            e.stopPropagation();
                            handlePayClick(rowData);
                        }}
                    >
                        <i className="ri-secure-payment-line align-middle me-1"></i>
                        Pay Now
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="table-responsive table-card mt-1">
            <DataTable
                value={data}
                loading={loading}
                paginator
                lazy
                totalRecords={totalRecords}
                first={(page - 1) * perPage}
                rows={perPage}
                rowsPerPageOptions={[10, 25, 50, 100]}
                onPage={onPage}
                onSort={onSort}
                onFilter={onFilter}
                filters={filters}
                sortField={sortField}
                sortOrder={sortOrder === 'asc' ? 1 : -1}
                globalFilterFields={['invoice_id', 'customer_name', 'email', 'country', 'payment_date', 'payment_amount', 'status', 'type']}
                dataKey="id"
                scrollable
                scrollHeight="flex"
                className="p-datatable-sm fs-13"
                responsiveLayout="scroll"
                emptyMessage="No invoices found."
                onRowClick={(e) => navigate(`/invoices/${e.data.id}`)}
                rowClassName={() => 'cursor-pointer'}
            >
                <Column field="invoice_id" header="Invoice ID" style={{ minWidth: '100px' }} sortable filter showFilterMatchModes filterPlaceholder="Search by ID"></Column>
                <Column field="customer_name" header="Customer" body={customerBodyTemplate} style={{ minWidth: '180px' }} sortable filter showFilterMatchModes filterPlaceholder="Search by name"></Column>
                <Column field="email" header="Email" bodyClassName="text-muted" style={{ minWidth: '100px' }} sortable filter showFilterMatchModes filterPlaceholder="Search by email"></Column>
                <Column field="created_at" header="Invoice Date" style={{ minWidth: '120px' }} sortable filter showFilterMatchModes filterPlaceholder="Search by date"></Column>
                <Column field="payment_amount" header="Amount" body={amountBodyTemplate} style={{ minWidth: '120px' }} sortable filter showFilterMatchModes filterPlaceholder="Search by amount"></Column>
                <Column field="type" header="Type" body={typeBodyTemplate} style={{ minWidth: '120px' }} sortable filter showFilterMatchModes filterPlaceholder="Search by type"></Column>
                <Column field="status" header="Status" body={statusBodyTemplate} style={{ minWidth: '150px' }} sortable filter filterElement={statusFilterElement} showFilterMatchModes={false}></Column>
                <Column header="Action" body={actionBodyTemplate} style={{ minWidth: '120px' }}></Column>
            </DataTable>

            <InvoicePaymentModal
                show={showPaymentModal}
                onHide={() => setShowPaymentModal(false)}
                onSuccess={handlePaymentSuccess}
                invoice={selectedInvoice}
            />

            <InvoicePreviewModal
                show={showPreviewModal}
                onHide={() => setShowPreviewModal(false)}
                invoice={selectedInvoice}
            />
        </div>
    );
}
