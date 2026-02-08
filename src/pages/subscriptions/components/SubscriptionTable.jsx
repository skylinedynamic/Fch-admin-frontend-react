import React from 'react';
import { DataTable } from '../../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Badge } from 'primereact/badge';
import { Dropdown } from 'primereact/dropdown';
import { SUBSCRIPTION_STATUS_OPTIONS, SUBSCRIPTION_STATUS_COLORS } from '../../../config/subscriptionConfig';

export default function SubscriptionTable({ 
    data, loading, totalRecords, page, perPage, 
    onPage, onSort, onFilter, filters, 
    sortField, sortOrder 
}) {
    const statusBodyTemplate = (rowData) => {
        const severity = SUBSCRIPTION_STATUS_COLORS[rowData.status] || 'info';
        return <Badge value={rowData.status} severity={severity}></Badge>;
    };

    const statusFilterTemplate = (options) => {
        return (
            <Dropdown 
                value={options.value} 
                options={SUBSCRIPTION_STATUS_OPTIONS} 
                onChange={(e) => options.filterApplyCallback(e.value)} 
                placeholder="Select Status" 
                className="p-column-filter" 
                showClear 
            />
        );
    };

    const amountBodyTemplate = (field) => (rowData) => {
        const value = rowData[field];
        return value ? `$${parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-';
    };

    const nameBodyTemplate = (rowData) => (
        <div>
            {rowData.borrower_id ? (
                <>
                    <div className="fw-medium">{rowData.borrower_name} <span className="text-muted small">(Borrower)</span></div>
                </>
            ) : (
                <>
                    <div className="fw-medium">{rowData.partner_name} <span className="text-muted small">(Partner)</span></div>
                </>
            )}
        </div>
    );



    const dateBodyTemplate = (field) => (rowData) => {
        return rowData[field] || <span className="text-muted">-</span>;
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
                responsiveLayout="scroll"
                className="p-datatable-sm"
                emptyMessage="No subscriptions found"
            >
                <Column field="partner_name" header="Name" body={nameBodyTemplate} sortable filter filterPlaceholder="Search by Name" style={{ minWidth: '200px' }} />
                <Column field="enrollment_type" header="Enrollment Type" sortable filter filterPlaceholder="Search by type" style={{ minWidth: '180px' }} />
                <Column field="payable_amount" header="Payable Amount" body={amountBodyTemplate('payable_amount')} sortable filter filterPlaceholder="Search by amount" style={{ minWidth: '130px' }} />
                <Column field="next_installment_date" header="Next Installment" body={dateBodyTemplate('next_installment_date')} sortable filter filterPlaceholder="Search by date" style={{ minWidth: '150px' }} />
                <Column field="next_platform_fee_date" header="Next Platform Fee" body={dateBodyTemplate('next_platform_fee_date')} sortable filter filterPlaceholder="Search by date" style={{ minWidth: '150px' }} />
                <Column field="created_at" header="Created At" sortable filter filterPlaceholder="Search by date" style={{ minWidth: '150px' }} />
                <Column 
                    field="status" 
                    header="Status" 
                    body={statusBodyTemplate} 
                    sortable 
                    filter 
                    filterElement={statusFilterTemplate} 
                    showFilterMatchModes={false}
                    showFilterOperator={false}
                    showAddButton={false}
                    filterMenuStyle={{ width: '14rem' }} 
                    style={{ minWidth: '120px' }} 
                />
            </DataTable>
        </div>
    );
}
