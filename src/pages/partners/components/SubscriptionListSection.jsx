import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DataTable } from '../../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { fetchSubscriptions } from '../../../modules/partner/services';
import { toast } from 'react-toastify';
import { Skeleton } from 'primereact/skeleton';
import { Tag } from 'primereact/tag';

export default function SubscriptionListSection() {
    const { id } = useParams();
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);
    const [sortField, setSortField] = useState('id');
    const [sortOrder, setSortOrder] = useState('desc');
    const [filters, setFilters] = useState({});

    useEffect(() => {
        initFilters();
    }, []);

    const initFilters = () => {
        const initial = {
            global: { value: null, matchMode: FilterMatchMode.CONTAINS },
            partner_type: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            enrollment_type: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            subscription_start_date: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            subscription_end_date: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            status: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] }
        };
        setFilters(initial);
    };

    const loadSubscriptions = async () => {
        try {
            setLoading(true);
            const response = await fetchSubscriptions(id, {
                page: page,
                per_page: perPage,
                sort_field: sortField,
                sort_order: sortOrder,
                filters: filters
            });

            if (response && response.status) {
                setSubscriptions(response.data || []);
                if (response.meta) {
                    setTotalRecords(response.meta.total || 0);
                    setPage(response.meta.current_page || 1);
                    setPerPage(response.meta.per_page || 10);
                }
            } else if (Array.isArray(response)) {
                setSubscriptions(response);
                setTotalRecords(response.length);
            }
        } catch (error) {
            console.error('Failed to fetch subscriptions', error);
            // toast.error('Failed to load subscription list');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id && Object.keys(filters).length > 0) {
            loadSubscriptions();
        }
    }, [id, page, perPage, sortField, sortOrder, filters]);

    const onPage = (event) => {
        setPerPage(event.rows);
        setPage(Math.floor(event.first / event.rows) + 1);
    };

    const onSort = (event) => {
        setSortField(event.sortField || sortField);
        setSortOrder(event.sortOrder === 1 ? 'asc' : 'desc');
    };

    const onFilter = (e) => {
        setFilters(e.filters);
        setPage(1);
    };

    // Skeleton Logic
    const showSkeleton = loading && subscriptions.length === 0;
    const displayData = showSkeleton ? Array.from({ length: 5 }).map((_, i) => ({ id: `skeleton_${i}` })) : subscriptions;

    const renderBody = (rowData, field) => {
        if (showSkeleton) return <Skeleton width="100%" />;
        return rowData[field];
    };

    const statusBodyTemplate = (rowData) => {
        if (showSkeleton) return <Skeleton width="80px" />;
        
        const statusColors = {
            'Active': 'success',
            'Suspended': 'warning',
            'Delinquent': 'danger',
            'Canceled': 'secondary'
        };
        
        const severity = statusColors[rowData.status] || 'info';
        return <Tag value={rowData.status} severity={severity} />;
    };

    const amountBodyTemplate = (rowData, field) => {
        if (showSkeleton) return <Skeleton width="80px" />;
        const amount = rowData[field];
        return amount ? `$${parseFloat(amount).toFixed(2)}` : '-';
    };

    return (
        <div className="table-responsive table-card mt-1">
            <DataTable
                value={displayData}
                paginator={!showSkeleton}
                lazy
                totalRecords={totalRecords}
                first={(page - 1) * perPage}
                rows={perPage}
                rowsPerPageOptions={[10, 25, 50, 100]}
                sortMode="single"
                sortField={sortField}
                sortOrder={sortOrder === 'asc' ? 1 : -1}
                filterDisplay="menu"
                filters={filters}
                onFilter={onFilter}
                onPage={onPage}
                onSort={onSort}
                globalFilterFields={[
                    'partner_type',
                    'enrollment_type',
                    'subscription_start_date',
                    'subscription_end_date',
                    'status'
                ]}
                dataKey="id"
                responsiveLayout="scroll"
                className="p-datatable-sm"
                loading={false}
                emptyMessage="No subscriptions found"
            >
                <Column
                    field="partner_type"
                    header="Partner Type"
                    sortable
                    filter
                    showFilterMatchModes
                    filterPlaceholder="Search by type"
                    style={{ minWidth: '180px' }}
                    body={(r) => renderBody(r, 'partner_type')}
                />
                <Column
                    field="enrollment_type"
                    header="Enrollment Type"
                    sortable
                    filter
                    showFilterMatchModes
                    filterPlaceholder="Search by enrollment"
                    style={{ minWidth: '200px' }}
                    body={(r) => renderBody(r, 'enrollment_type')}
                />
                <Column
                    field="total_subscription_amount"
                    header="Total Amount"
                    sortable
                    style={{ minWidth: '150px' }}
                    body={(r) => amountBodyTemplate(r, 'total_subscription_amount')}
                />
                <Column
                    field="payable_amount"
                    header="Payable Amount"
                    sortable
                    style={{ minWidth: '120px' }}
                    body={(r) => amountBodyTemplate(r, 'payable_amount')}
                />
                <Column
                    field="monthly_platform_fee"
                    header="Platform Fee"
                    sortable
                    style={{ minWidth: '120px' }}
                    body={(r) => amountBodyTemplate(r, 'monthly_platform_fee')}
                />
                <Column
                    field="subscription_start_date"
                    header="Start Date"
                    sortable
                    filter
                    showFilterMatchModes
                    filterPlaceholder="Search by date"
                    style={{ minWidth: '130px' }}
                    body={(r) => renderBody(r, 'subscription_start_date')}
                />
                <Column
                    field="subscription_end_date"
                    header="End Date"
                    sortable
                    filter
                    showFilterMatchModes
                    filterPlaceholder="Search by date"
                    style={{ minWidth: '130px' }}
                    body={(r) => renderBody(r, 'subscription_end_date')}
                />
                <Column
                    field="status"
                    header="Status"
                    sortable
                    filter
                    showFilterMatchModes
                    filterPlaceholder="Search by status"
                    style={{ minWidth: '120px' }}
                    body={statusBodyTemplate}
                />
            </DataTable>
        </div>
    );
}
