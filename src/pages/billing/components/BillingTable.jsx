import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';

export default function BillingTable({ 
    data, loading, totalRecords, page, perPage, 
    onPage, onSort, onFilter, filters, 
    sortField, sortOrder 
}) {
    const navigate = useNavigate();

    const amountBodyTemplate = (rowData) => {
        const value = rowData.upcoming_billing_amount;
        return value ? `$${parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-';
    };

    const typeBodyTemplate = (rowData) => {
        const type = rowData.upcoming_billing_type || 'Installment';
        const color = type === 'Platform Fee' ? 'info' : 'primary';
        return <span className={`badge bg-${color}-subtle text-${color}`}>{type}</span>;
    };

    const nameBodyTemplate = (rowData) => {
        return (
            <div>
                {rowData.borrower_id ? (
                    <>
                        <span className="fw-medium text-primary-emphasis">
                            {rowData.borrower_name}
                        </span>
                        <span className="text-muted small ms-1">(Borrower)</span>
                        <div className="text-muted small">{rowData.borrower_email}</div>
                    </>
                ) : (
                    <>
                        <span className="fw-medium text-primary-emphasis">
                            {rowData.partner_name}
                        </span>
                        <span className="text-muted small ms-1">(Partner)</span>
                        <div className="text-muted small">{rowData.partner_email}</div>
                    </>
                )}
            </div>
        );
    };

    const dateBodyTemplate = (rowData) => {
        return rowData.upcoming_billing_date || <span className="text-muted">-</span>;
    };

    const statusBodyTemplate = (rowData) => {
        const status = rowData.status || 'Active';
        return <span className="badge bg-success-subtle text-success">{status}</span>;
    };

    return (
        <div className="table-responsive table-card mt-1">
            <DataTable
                value={data}
                paginator
                lazy
                loading={loading}
                totalRecords={totalRecords}
                first={(page - 1) * perPage}
                rows={perPage}
                rowsPerPageOptions={[10, 25, 50, 100]}
                sortMode="single"
                sortField={sortField}
                sortOrder={sortOrder === 'asc' ? 1 : -1}
                filterDisplay="menu"
                filters={filters}
                onPage={onPage}
                onSort={onSort}
                onFilter={onFilter}
                dataKey="id"
                scrollable
                scrollHeight="flex"
                responsiveLayout="scroll"
                className="p-datatable-sm"
                emptyMessage="No upcoming billing found"
                onRowClick={(e) => navigate(`/billing/${e.data.subscription_id}`)}
                rowClassName={() => 'cursor-pointer'}
            >
                <Column field="partner_name" header="Name" body={nameBodyTemplate} sortable filter filterPlaceholder="Search by Name" style={{ minWidth: '200px' }} />
                <Column field="upcoming_billing_type" header="Billing Type" body={typeBodyTemplate} sortable filter filterPlaceholder="Search by type" style={{ minWidth: '150px' }} />
                <Column field="upcoming_billing_amount" header="Amount" body={amountBodyTemplate} sortable filter filterPlaceholder="Search by amount" style={{ minWidth: '130px' }} />
                <Column field="upcoming_billing_date" header="Upcoming Billing Date" body={dateBodyTemplate} sortable filter filterPlaceholder="Search by date" style={{ minWidth: '180px' }} />
                <Column field="enrollment_type" header="Enrollment Type" sortable filter filterPlaceholder="Search by type" style={{ minWidth: '180px' }} />
                <Column field="status" header="Status" body={statusBodyTemplate} sortable style={{ minWidth: '120px' }} />
            </DataTable>
        </div>
    );
}
