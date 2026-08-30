import React from 'react';
import { DataTable } from '../../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';

export default function SubscriptionListSection({ subscriptions = [] }) {
    const statusBodyTemplate = (rowData) => {
        const status = rowData.status;
        if (status === null || status === undefined || status === '') {
            return 'Null';
        }

        const statusColors = {
            'Active': '#0ab39c',      // text-success
            'Suspended': '#f7b84b',   // text-warning
            'Delinquent': '#f06548',  // text-danger
            'Canceled': '#878a99'     // text-secondary
        };

        const color = statusColors[status] || '#299cdb'; // text-info
        return <span style={{ color, fontWeight: '600', backgroundColor: 'transparent' }}>{status}</span>;
    };

    const textBodyTemplate = (rowData, field) => {
        const val = rowData[field];
        return val === null || val === undefined || val === '' ? 'Null' : val;
    };

    return (
        <div className="table-responsive table-card mt-1">
            <DataTable
                value={subscriptions}
                paginator
                rows={10}
                rowsPerPageOptions={[10, 25, 50, 100]}
                sortMode="single"
                dataKey="id"
                responsiveLayout="scroll"
                className="p-datatable-sm"
                emptyMessage="No subscriptions found"
            >
                <Column
                    field="partner_type"
                    header="Partner Type"
                    sortable
                    style={{ minWidth: '220px' }}
                    body={(r) => textBodyTemplate(r, 'partner_type')}
                />
                <Column
                    field="enrollment_type"
                    header="Enrollment Type"
                    sortable
                    style={{ minWidth: '200px' }}
                    body={(r) => textBodyTemplate(r, 'enrollment_type')}
                />
                <Column
                    field="total_subscription_amount"
                    header="Total Amount"
                    sortable
                    style={{ minWidth: '180px' }}
                    body={(r) => textBodyTemplate(r, 'total_subscription_amount')}
                />
                <Column
                    field="payable_amount"
                    header="Payable Amount"
                    sortable
                    style={{ minWidth: '180px' }}
                    body={(r) => textBodyTemplate(r, 'payable_amount')}
                />
                <Column
                    field="monthly_platform_fee"
                    header="Platform Fee"
                    sortable
                    style={{ minWidth: '160px' }}
                    body={(r) => textBodyTemplate(r, 'monthly_platform_fee')}
                />
                <Column
                    field="subscription_start_date"
                    header="Start Date"
                    sortable
                    style={{ minWidth: '150px' }}
                    body={(r) => textBodyTemplate(r, 'subscription_start_date')}
                />
                <Column
                    field="subscription_end_date"
                    header="End Date"
                    sortable
                    style={{ minWidth: '130px' }}
                    body={(r) => textBodyTemplate(r, 'subscription_end_date')}
                />
                <Column
                    field="status"
                    header="Status"
                    sortable
                    style={{ minWidth: '120px' }}
                    body={statusBodyTemplate}
                />
            </DataTable>
        </div>
    );
}
