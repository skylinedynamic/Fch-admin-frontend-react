import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../common/PageHeader';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { fetchGlobalSubscriptions } from '../../modules/partner/services';
import SubscriptionTable from './components/SubscriptionTable';
import SubscriptionFilters from './components/SubscriptionFilters';
import { toast } from 'react-toastify';
import StatisticsCard from '../../components/Common/StatisticsCard';
import StatisticsCardSkeleton from '../../components/Common/StatisticsCardSkeleton';

export default function Subscriptions() {
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [subscriptions, setSubscriptions] = useState([]);

    // Stats state
    const [stats, setStats] = useState({
        total_subscriptions: 0,
        active_subscriptions: 0,
        pending_subscriptions: 0,
        expiring_soon: 0,
        expired_subscriptions: 0,
        revenue_this_month: 0
    });

    // Pagination state
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);

    // Sorting state
    const [sortField, setSortField] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('desc');

    // Filter states
    const [filters, setFilters] = useState({});
    const [searchText, setSearchText] = useState('');
    const [selectedStatus, setSelectedStatus] = useState(null);

    // Applied states to trigger fetch
    const [appliedSearchText, setAppliedSearchText] = useState('');
    const [appliedStatus, setAppliedStatus] = useState(null);
    const [appliedFilters, setAppliedFilters] = useState({});

    const initFilters = () => {
        const initial = {
            global: { value: null, matchMode: FilterMatchMode.CONTAINS },
            subscriber_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            partner_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            entity_type: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            enrollment_type: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            payable_amount: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            subscription_start_date: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            subscription_end_date: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            enrollment_completed_at: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            created_at: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            status: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] }
        };
        setFilters(initial);
        setAppliedFilters(initial);
    };

    useEffect(() => {
        initFilters();

        // Add class to body to prevent global scroll
        document.body.classList.add('table-page-fit-active');

        return () => {
            document.body.classList.remove('table-page-fit-active');
        };
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const payload = {
                search: appliedSearchText,
                status: appliedStatus,
                filters: appliedFilters,
                page,
                per_page: perPage,
                sort_field: sortField,
                sort_order: sortOrder
            };

            const response = await fetchGlobalSubscriptions(payload);
            if (response.status) {
                setSubscriptions(response.data || []);
                setTotalRecords(response.meta?.total || 0);
                if (response.stats) {
                    setStats(response.stats);
                    setStatsLoading(false);
                }
            } else {
                toast.error(response.message || 'Failed to fetch subscriptions');
            }
        } catch (error) {
            console.error('Error fetching subscriptions:', error);
            toast.error('Failed to load subscriptions');
        } finally {
            setLoading(false);
            setStatsLoading(false);
        }
    };

    useEffect(() => {
        if (Object.keys(appliedFilters).length > 0) {
            loadData();
        }
    }, [appliedSearchText, appliedStatus, appliedFilters, page, perPage, sortField, sortOrder]);

    const handleApplyFilters = () => {
        setAppliedSearchText(searchText);
        setAppliedStatus(selectedStatus);
        setAppliedFilters(filters);
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearchText('');
        setSelectedStatus(null);
        setAppliedSearchText('');
        setAppliedStatus(null);
        initFilters();
        setPage(1);
    };

    const onPage = (event) => {
        setPerPage(event.rows);
        setPage(Math.floor(event.first / event.rows) + 1);
    };

    const onSort = (event) => {
        setSortField(event.sortField);
        setSortOrder(event.sortOrder === 1 ? 'asc' : 'desc');
    };

    const onFilter = (e) => {
        setFilters(e.filters);
        setAppliedFilters(e.filters);
        setPage(1);
    };

    const statWidgets = [
        {
            id: 1,
            label: "Total Subscriptions",
            counter: stats.total_subscriptions,
            icon: "ri-group-line",
            color: "primary",
        },
        {
            id: 2,
            label: "Active Subscriptions",
            counter: stats.active_subscriptions,
            icon: "ri-checkbox-circle-line",
            color: "success",
        },
        {
            id: 3,
            label: "Pending Subscriptions",
            counter: stats.pending_subscriptions || 0,
            icon: "ri-time-line",
            color: "warning",
        },
        {
            id: 4,
            label: "Expiring Soon",
            counter: stats.expiring_soon,
            icon: "ri-hourglass-2-line",
            color: "info",
        },
    ];

    return (
        <div className="page-content page-content-fit">
            <div className="container-fluid">
                <PageHeader 
                    title="Subscriptions" 
                    breadcrumbs={[{ label: 'Subscriptions' }]} 
                />

                <div className="row subscription-section">
                    {statsLoading && (!stats || stats.total_subscriptions === 0) ? (
                        <>
                            <StatisticsCardSkeleton />
                            <StatisticsCardSkeleton />
                            <StatisticsCardSkeleton />
                            <StatisticsCardSkeleton />
                        </>
                    ) : (
                        statWidgets.map((widget, index) => (
                            <StatisticsCard
                                key={index}
                                title={widget.label}
                                count={widget.counter}
                                icon={widget.icon}
                                colorVariant={widget.color}
                                colSize="col-xl-3 col-md-6"
                            />
                        ))
                    )}
                </div>
                <div className="row row-table-fit">
                    <div className="col-lg-12">
                        <div className="card">
                            <div className="card-body">
                                <SubscriptionFilters
                                    searchText={searchText} setSearchText={setSearchText}
                                    selectedStatus={selectedStatus} setSelectedStatus={setSelectedStatus}
                                    onApply={handleApplyFilters}
                                    onClear={handleClearFilters}
                                    loading={loading}
                                />

                                <SubscriptionTable
                                    data={subscriptions}
                                    loading={loading}
                                    totalRecords={totalRecords}
                                    page={page}
                                    perPage={perPage}
                                    onPage={onPage}
                                    onSort={onSort}
                                    onFilter={onFilter}
                                    filters={filters}
                                    sortField={sortField}
                                    sortOrder={sortOrder}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
