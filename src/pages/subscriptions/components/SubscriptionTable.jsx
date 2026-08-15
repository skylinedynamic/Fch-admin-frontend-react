import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { SUBSCRIPTION_STATUS_OPTIONS, SUBSCRIPTION_STATUS_COLORS } from '../../../config/subscriptionConfig';

export default function SubscriptionTable({
    data, loading, totalRecords, page, perPage,
    onPage, onSort, onFilter, filters,
    sortField, sortOrder
}) {
    const navigate = useNavigate();

    const statusBodyTemplate = (rowData) => {
        const status = rowData.status || 'N/A';
        const color = SUBSCRIPTION_STATUS_COLORS[status] || 'secondary';
        return <span className={`badge bg-${color}-subtle text-${color}`}>{status}</span>;
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
        return rowData[field] || '-';
    };

    const nameBodyTemplate = (rowData) => {
        const name = rowData.subscriber_name || rowData.partner_name || rowData.borrower_name || 'N/A';
        return <div className="fw-medium text-dark">{name}</div>;
    };

    const entityTypeBodyTemplate = (rowData) => {
        const type = rowData.entity_type || 'N/A';
        const lower = type.toLowerCase();
        const color = lower === 'partner' ? 'primary' : lower === 'borrower' ? 'success' : 'info';
        return <span className={`badge bg-${color}-subtle text-${color} text-uppercase px-2.5 py-1 fw-semibold`}>{type}</span>;
    };

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
                scrollable
                scrollHeight="flex"
                responsiveLayout="scroll"
                className="p-datatable-sm"
                emptyMessage="No subscriptions found"
                onRowClick={(e) => navigate(`/subscriptions/${e.data.id}`)}
                rowClassName={() => 'cursor-pointer'}
            >
                <Column field="subscriber_name" header="Name" body={nameBodyTemplate} sortable filter filterPlaceholder="Search by Name" style={{ minWidth: '180px' }} />
                <Column field="entity_type" header="Entity Type" body={entityTypeBodyTemplate} sortable filter filterPlaceholder="Search by Type" style={{ minWidth: '140px' }} />
                <Column field="enrollment_type" header="Enrollment Type" sortable filter filterPlaceholder="Search by type" style={{ minWidth: '160px' }} />
                <Column field="payable_amount" header="Payable Amount" body={amountBodyTemplate('payable_amount')} sortable filter filterPlaceholder="Search by amount" style={{ minWidth: '130px' }} />
                <Column field="subscription_start_date" header="Start Date" body={dateBodyTemplate('subscription_start_date')} sortable filter filterPlaceholder="Search by date" style={{ minWidth: '140px' }} />
                <Column field="subscription_end_date" header="End Date" body={dateBodyTemplate('subscription_end_date')} sortable filter filterPlaceholder="Search by date" style={{ minWidth: '140px' }} />
                <Column field="enrollment_completed_at" header="Completed At" body={dateBodyTemplate('enrollment_completed_at')} sortable filter filterPlaceholder="Search by date" style={{ minWidth: '170px' }} />
                <Column field="created_at" header="Created At" sortable filter filterPlaceholder="Search by date" style={{ minWidth: '140px' }} />
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
