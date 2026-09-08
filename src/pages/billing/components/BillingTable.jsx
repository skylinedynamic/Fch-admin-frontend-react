import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { SUBSCRIPTION_STATUS_COLORS } from '../../../config/subscriptionConfig';
import { parseDateOnly, startOfToday } from '../../../utils/helper';

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

    // What has already been invoiced and is still owed — the number that was
    // previously invisible for anyone whose billing is paused.
    const outstandingBodyTemplate = (rowData) => {
        const value = Number(rowData.outstanding_amount || 0);

        if (!value) {
            return <span className="text-muted">-</span>;
        }

        const tone = rowData.is_billing_paused ? 'warning' : 'danger';

        return (
            <span className={`fw-semibold text-${tone}`}>
                ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
        );
    };

    const typeBodyTemplate = (rowData) => {
        const type = rowData.upcoming_billing_type || 'Installment';
        const color = 'primary';
        return <span className={`badge bg-${color}-subtle text-${color}`}>{type}</span>;
    };

    const nameBodyTemplate = (rowData) => {
        // Seat subscriptions (User / Employee) carry no partner_id/borrower_id, so
        // those two used to be the only branches checked here and a seat row fell
        // through to the "Partner" branch with nothing to show. subscriber_name/
        // subscriber_email/subscriber_type cover all four entity kinds uniformly.
        const name = rowData.subscriber_name
            || rowData.borrower_name
            || rowData.partner_name
            || rowData.user_name
            || rowData.employee_name;
        const email = rowData.subscriber_email
            || rowData.borrower_email
            || rowData.partner_email
            || rowData.user_email
            || rowData.employee_email;
        const typeLabel = rowData.subscriber_type || (rowData.borrower_id ? 'Borrower' : 'Partner');

        return (
            <div>
                <span className="fw-medium text-primary-emphasis">
                    {name || '-'}
                </span>
                <span className="text-muted small ms-1">({typeLabel})</span>
                {email && <div className="text-muted small">{email}</div>}
            </div>
        );
    };

    const dateBodyTemplate = (rowData) => {
        // Paused wins over everything else: the cron will not bill this subscriber
        // at all while their account is not Active, so showing a date would be a lie.
        if (rowData.is_billing_paused) {
            return (
                <div>
                    <span className="badge bg-warning-subtle text-warning">Billing paused</span>
                    {rowData.billing_paused_reason && (
                        <div className="text-muted small">{rowData.billing_paused_reason}</div>
                    )}
                    {rowData.paid_through_date && (
                        <div className="text-muted small">Paid through {rowData.paid_through_date}</div>
                    )}
                </div>
            );
        }

        if (!rowData.upcoming_billing_date) {
            return <span className="text-muted">Awaiting first payment</span>;
        }

        // A billing date in the past means the cycle is overdue and the cron has not
        // been able to collect — worth calling out rather than showing a plain date
        // that reads as "upcoming".
        // upcoming_billing_date is date-only; new Date() would read it as midnight
        // UTC and flag a bill due today as overdue for any user behind UTC.
        const billingDate = parseDateOnly(rowData.upcoming_billing_date);
        const isOverdue = !!billingDate && billingDate < startOfToday();

        return (
            <div>
                <span className={isOverdue ? 'text-danger fw-medium' : ''}>{rowData.upcoming_billing_date}</span>
                {isOverdue && <div className="text-danger small">Overdue</div>}
                {rowData.paid_through_date && (
                    <div className="text-muted small">Paid through {rowData.paid_through_date}</div>
                )}
            </div>
        );
    };

    const statusBodyTemplate = (rowData) => {
        const status = rowData.status;
        // Colour by the actual status — hardcoding success rendered a Past Due
        // subscription in green.
        const color = SUBSCRIPTION_STATUS_COLORS[status] || 'secondary';
        return <span className={`badge bg-${color}-subtle text-${color}`}>{status}</span>;
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
                <Column field="upcoming_billing_date" header="Upcoming Billing Date" body={dateBodyTemplate} sortable filter filterPlaceholder="Search by date" style={{ minWidth: '200px' }} />
                <Column field="outstanding_amount" header="Outstanding" body={outstandingBodyTemplate} style={{ minWidth: '130px' }} />
                <Column field="enrollment_type" header="Enrollment Type" sortable filter filterPlaceholder="Search by type" style={{ minWidth: '180px' }} />
                <Column field="status" header="Status" body={statusBodyTemplate} sortable style={{ minWidth: '120px' }} />
            </DataTable>
        </div>
    );
}
