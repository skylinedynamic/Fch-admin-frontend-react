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
    sortOrder,
    selectedPayments,
    setSelectedPayments
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
                filterDisplay="menu"
                globalFilterFields={['date', 'from', 'payment_type', 'company', 'transaction_id', 'amount', 'status']}
                loading={loading}
                selection={selectedPayments}
                onSelectionChange={(e) => setSelectedPayments(e.value)}
                dataKey="id"
                className="p-datatable-sm"
                emptyMessage="No payments found."
                responsiveLayout="scroll"
            >
                <Column selectionMode="multiple" headerStyle={{ width: '3rem' }}></Column>
                <Column field="date" header="DATE" sortable filter showFilterMatchModes filterPlaceholder="Search by date" style={{ minWidth: '100px' }}></Column>
                <Column field="from" header="FROM" sortable filter showFilterMatchModes filterPlaceholder="Search by from" style={{ minWidth: '100px' }}></Column>
                <Column field="payment_type" header="PAYMENT TYPE" sortable filter showFilterMatchModes filterPlaceholder="Search by type" style={{ minWidth: '120px' }}></Column>
                <Column field="company" header="COMPANY" sortable filter showFilterMatchModes filterPlaceholder="Search by company" style={{ minWidth: '150px' }}></Column>
                <Column field="details" header="DETAILS" filter showFilterMatchModes filterPlaceholder="Search by details" style={{ minWidth: '150px' }}></Column>
                <Column field="transaction_id" header="TRANSACTION ID" sortable filter showFilterMatchModes filterPlaceholder="Search by ID" style={{ minWidth: '130px' }}></Column>
                <Column field="amount" header="AMOUNT" body={amountBodyTemplate} sortable filter showFilterMatchModes filterPlaceholder="Search by amount" style={{ minWidth: '100px' }}></Column>
                <Column field="status" header="STATUS" body={statusBodyTemplate} sortable filter filterElement={statusFilterElement} showFilterMatchModes={false} style={{ minWidth: '100px' }}></Column>
            </DataTable>
        </div>
    );
}
