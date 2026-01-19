import React from 'react';
import { DataTable } from '../../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';

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
    selectedInvoices,
    setSelectedInvoices
}) {
    
    const statusBodyTemplate = (rowData) => {
        const statusMap = {
            'Paid': 'success',
            'Pending': 'warning',
            'Overdue': 'danger',
            'Cancelled': 'secondary',
            'Unpaid': 'warning',
            'Disputed': 'info',
            'Failed': 'danger'
        };

        const severity = statusMap[rowData.status] || 'primary';
        
        return (
            <span className={`badge bg-${severity}-subtle text-${severity} px-3 py-2 rounded-2 fw-bold`}>
                {rowData.status}
            </span>
        );
    };

    const amountBodyTemplate = (rowData) => {
        const amount = typeof rowData.payment_amount === 'string' 
            ? parseFloat(rowData.payment_amount) 
            : rowData.payment_amount;
        return <span className="fw-bold">${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>;
    };

    const actionBodyTemplate = (rowData) => {
        return (
            <div className="d-flex gap-2 justify-content-center">
                <Button 
                    icon="ri-file-text-line" 
                    className="p-button-text p-button-danger p-0" 
                    style={{ fontSize: '1.2rem', color: '#f06548' }}
                />
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
                selection={selectedInvoices}
                onSelectionChange={(e) => setSelectedInvoices(e.value)}
                dataKey="id"
                scrollable
                scrollHeight="510px"
                className="p-datatable-sm fs-13" 
                responsiveLayout="scroll"
                emptyMessage="No invoices found."
            >
                <Column selectionMode="multiple" headerStyle={{ width: '3rem' }} exportable={false}></Column>
                <Column field="invoice_id" header="ID" bodyClassName="fw-medium text-dark" style={{ minWidth: '100px' }} sortable></Column>
                <Column field="customer_name" header="CUSTOMER" bodyClassName="fw-bold" style={{ minWidth: '180px' }} sortable filter filterPlaceholder="Search by name"></Column>
                <Column field="email" header="EMAIL" bodyClassName="text-muted" style={{ minWidth: '220px' }} sortable filter filterPlaceholder="Search by email"></Column>
                <Column field="country" header="COUNTRY" style={{ minWidth: '100px' }} sortable></Column>
                <Column field="payment_date" header="DATE" style={{ minWidth: '120px' }} sortable></Column>
                <Column field="payment_amount" header="AMOUNT" body={amountBodyTemplate} style={{ minWidth: '120px' }} sortable></Column>
                <Column field="status" header="PAYMENT STATUS" body={statusBodyTemplate} style={{ minWidth: '150px' }} sortable></Column>
                <Column header="ACTION" body={actionBodyTemplate} align="center" style={{ minWidth: '80px' }}></Column>
            </DataTable>
        </div>
    );
}
