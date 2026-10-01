import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import TableLoader from '../../../components/Loader/TableLoader';
import {
    PAYMENT_STATUS_OPTIONS,
    PAYMENT_STATUS_COLORS,
    PAYMENT_ENVIRONMENT_COLORS,
    PAYMENT_ENVIRONMENT_LABELS,
    PAYMENT_ENVIRONMENT_OPTIONS,
    TRANSACTION_TYPE_DEBIT,
    TRANSACTION_TYPE_CREDIT
} from '../../../config/paymentConfig';

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
    const navigate = useNavigate();

    const statusBodyTemplate = (rowData) => {
        const status = rowData.status?.toLowerCase();
        const color = PAYMENT_STATUS_COLORS[status] || 'primary';
        return (
            <span className={`badge bg-${color} text-uppercase`}>
                {rowData.status}
            </span>
        );
    };

    const environmentBodyTemplate = (rowData) => {
        const envVal = rowData.is_environment ? 1 : 0;
        const color = PAYMENT_ENVIRONMENT_COLORS[envVal] || 'info';
        const label = PAYMENT_ENVIRONMENT_LABELS[envVal] || 'Sandbox';
        return (
            <span className={`badge bg-${color} text-uppercase`}>
                {label}
            </span>
        );
    };

    const amountBodyTemplate = (rowData) => {
        return rowData.amount;
    };

    const nameBodyTemplate = (rowData) => {
        return rowData.partner_name || rowData.borrower_name || rowData.name || '-';
    };

    const transactionTypeBodyTemplate = (rowData) => {
        const type = rowData.transaction_type || (rowData.is_partner_paying ? TRANSACTION_TYPE_DEBIT : TRANSACTION_TYPE_CREDIT);
        const isDebit = String(type).toLowerCase() === TRANSACTION_TYPE_DEBIT.toLowerCase();
        return (
            <span className={`badge bg-${isDebit ? 'danger-subtle text-danger' : 'success-subtle text-success'} text-uppercase fw-semibold`}>
                {type}
            </span>
        );
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

    const environmentFilterElement = (options) => {
        return (
            <Dropdown
                value={options.value}
                options={PAYMENT_ENVIRONMENT_OPTIONS}
                onChange={(e) => options.filterApplyCallback(e.value)}
                optionLabel="label"
                optionValue="value"
                placeholder="Select Environment"
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
                globalFilterFields={['transaction_date', 'from', 'payment_type', 'borrower_name', 'partner_name', 'transaction_id', 'invoice_id', 'amount', 'status', 'is_environment']}
                loading={loading}
                dataKey="id"
                className="p-datatable-sm"
                emptyMessage="No payments found."
                scrollable
                scrollHeight="flex"
                responsiveLayout="scroll"
                onRowClick={(e) => navigate(`/payments/${e.data.id}`)}
                rowClassName={() => 'cursor-pointer'}
            >
                <Column field="transaction_date" header="Date" sortable filter showFilterMatchModes filterPlaceholder="Search by date" style={{ minWidth: '100px' }}></Column>
                <Column field="invoice_id" header="Invoice ID" sortable filter showFilterMatchModes filterPlaceholder="Search by invoice ID" style={{ minWidth: '100px' }}></Column>
                <Column field="from" header="Payment Method" sortable filter showFilterMatchModes filterPlaceholder="Search by from" style={{ minWidth: '100px' }}></Column>
                <Column
                    field="transaction_type"
                    header="Type"
                    body={transactionTypeBodyTemplate}
                    sortable
                    filter
                    showFilterMatchModes
                    filterPlaceholder="Search type"
                    style={{ minWidth: '110px' }}
                ></Column>

                <Column
                    header="Name"
                    body={nameBodyTemplate}
                    sortable
                    filter
                    filterField="borrower_name"
                    showFilterMatchModes
                    filterPlaceholder="Search name"
                    style={{ minWidth: '150px' }}
                ></Column>
                <Column field="amount" header="Amount" body={amountBodyTemplate} sortable filter showFilterMatchModes filterPlaceholder="Search by amount" style={{ minWidth: '100px' }}></Column>
                <Column field="status" header="Status" body={statusBodyTemplate} sortable filter filterElement={statusFilterElement} showFilterMatchModes={false} style={{ minWidth: '100px' }}></Column>
                <Column
                    field="is_environment"
                    header="Environment"
                    body={environmentBodyTemplate}
                    sortable
                    filter
                    filterElement={environmentFilterElement}
                    showFilterMatchModes={false}
                    alignHeader="center"
                    align="center"
                    headerClassName="text-center"
                    bodyClassName="text-center"
                    style={{ minWidth: '130px' }}
                ></Column>
            </DataTable>
        </div>
    );
}
