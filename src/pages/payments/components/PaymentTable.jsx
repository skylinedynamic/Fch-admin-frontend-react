import React from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import TableLoader from '../../../components/Loader/TableLoader';

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
    sortOrder,
    selectedPayments,
    setSelectedPayments
}) {
    const statusBodyTemplate = (rowData) => {
        const statuses = {
            'SUCCESS': 'success',
            'PENDING': 'warning',
            'FAILED': 'danger',
            'DISPUTED': 'info',
            'REFUNDED': 'secondary'
        };
        const color = statuses[rowData.status] || 'primary';
        return (
            <span className={`badge bg-${color} text-uppercase`}>
                {rowData.status}
            </span>
        );
    };

    const amountBodyTemplate = (rowData) => {
        return `$${Number(rowData.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    if (loading && (!data || data.length === 0)) {
        return <TableLoader rows={10} columns={Array(8).fill({})} />;
    }

    return (
        <div className="table-responsive table-card">
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
                loading={loading}
                selection={selectedPayments}
                onSelectionChange={(e) => setSelectedPayments(e.value)}
                dataKey="id"
                className="p-datatable-sm"
                emptyMessage="No payments found."
                responsiveLayout="scroll"
            >
                <Column selectionMode="multiple" headerStyle={{ width: '3rem' }}></Column>
                <Column field="date" header="DATE" sortable style={{ minWidth: '100px' }}></Column>
                <Column field="from" header="FROM" sortable style={{ minWidth: '100px' }}></Column>
                <Column field="payment_type" header="PAYMENT TYPE" sortable style={{ minWidth: '120px' }}></Column>
                <Column field="company" header="COMPANY" sortable style={{ minWidth: '150px' }}></Column>
                <Column field="details" header="DETAILS" style={{ minWidth: '150px' }}></Column>
                <Column field="transaction_id" header="TRANSACTION ID" sortable style={{ minWidth: '130px' }}></Column>
                <Column field="amount" header="AMOUNT" body={amountBodyTemplate} sortable style={{ minWidth: '100px' }}></Column>
                <Column field="status" header="STATUS" body={statusBodyTemplate} sortable style={{ minWidth: '100px' }}></Column>
            </DataTable>
        </div>
    );
}
