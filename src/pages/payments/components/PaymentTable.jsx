import React from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import TableLoader from '../../../components/Loader/TableLoader';
import { PAYMENT_STATUS_OPTIONS, PAYMENT_STATUS_COLORS } from '../../../config/paymentConfig';

export default function PaymentTable({
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
    sortOrder
}) {
    const statusBodyTemplate = (rowData) => {
        const color = PAYMENT_STATUS_COLORS[rowData.status?.toLowerCase()] || 'primary';
        return (
            <span className={`badge bg-${color} text-uppercase`}>
                {rowData.status}
            </span>
        );
    };

    const amountBodyTemplate = (rowData) => {
        return `$${Number(rowData.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const nameBodyTemplate = (rowData) => {
        return rowData.partner_name || rowData.borrower_name || '-';
    };

    const statusFilterElement = (options) => {
        return (
            <Dropdown
                value={options.value}
                options={PAYMENT_STATUS_OPTIONS}
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

    if (loading && (!data || data.length === 0)) {
        return <TableLoader rows={10} columns={Array(8).fill({})} />;
    }

    return (
        <div className="table-responsive table-card mt-1">
            <DataTable
                value={data}
                paginator
                lazy
                first={(page - 1) * perPage}
                rows={perPage}
                totalRecords={totalRecords}
                onPage={onPage}
                onSort={onSort}
                sortField={sortField}
                sortOrder={sortOrder === 'asc' ? 1 : -1}
                onFilter={onFilter}
                filters={filters}
                filterDisplay="menu"
                globalFilterFields={['transaction_date', 'from', 'payment_type', 'borrower_name', 'partner_name', 'transaction_id', 'amount', 'status']}
                loading={loading}
                dataKey="id"
                className="p-datatable-sm"
                emptyMessage="No payments found."
                responsiveLayout="scroll"
            >
                <Column field="transaction_date" header="Date" sortable filter showFilterMatchModes filterPlaceholder="Search by date" style={{ minWidth: '100px' }}></Column>
                <Column field="from" header="From" sortable filter showFilterMatchModes filterPlaceholder="Search by from" style={{ minWidth: '100px' }}></Column>
                <Column 
                    field="payment_type" 
                    header="Payment Type" 
                    body={(rowData) => {
                        const type = rowData.partner_name ? 'Partner' : 'Borrower';
                        return (
                            <div>
                                <div className="fw-medium">{rowData.payment_type}</div>
                                <div className="text-muted fs-11">{type} Payment</div>
                            </div>
                        );
                    }}
                    sortable filter showFilterMatchModes filterPlaceholder="Search by type" style={{ minWidth: '120px' }}
                ></Column>
                <Column 
                    header="Name" 
                    body={nameBodyTemplate} 
                    sortable 
                    filter 
                    filterField="borrower_name" // Default to one field for Primereact filtering, global search handles both
                    showFilterMatchModes 
                    filterPlaceholder="Search name" 
                    style={{ minWidth: '150px' }}
                ></Column>
                <Column field="transaction_id" header="Transaction ID" sortable filter showFilterMatchModes filterPlaceholder="Search by ID" style={{ minWidth: '130px' }}></Column>
                <Column field="amount" header="Amount" body={amountBodyTemplate} sortable filter showFilterMatchModes filterPlaceholder="Search by amount" style={{ minWidth: '100px' }}></Column>
                <Column field="status" header="Status" body={statusBodyTemplate} sortable filter filterElement={statusFilterElement} showFilterMatchModes={false} style={{ minWidth: '100px' }}></Column>
                <Column 
                    header="Action" 
                    body={(rowData) => {
                        const isFailed = rowData.status?.toLowerCase() === 'failed';
                        return (
                            <div className="d-flex">
                                {isFailed && (
                                    <button 
                                        className="btn btn-primary btn-sm waves-effect waves-light fw-medium border-0"
                                        onClick={(e) => { e.stopPropagation(); }}
                                    >
                                        <i className="ri-secure-payment-line align-middle me-1"></i>
                                        Pay Now
                                    </button>
                                )}
                            </div>
                        );
                    }}
                    style={{ minWidth: '100px' }}
                />
            </DataTable>
        </div>
    );
}
