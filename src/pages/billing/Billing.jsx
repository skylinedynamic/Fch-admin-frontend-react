import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../common/PageHeader';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { fetchUpcomingBilling } from '../../modules/billing';
import BillingTable from './components/BillingTable';
import BillingFilters from './components/BillingFilters';
import BillingStats from './components/BillingStats';
import { BILLING_VIEW_ALL, BILLING_ENTITY_TYPE_ALL } from './components/BillingFilters';
import { toast } from 'react-toastify';

export default function Billing() {
    const [loading, setLoading] = useState(true);
    const [billings, setBillings] = useState([]);

    // Pagination state
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);
    const [windowDays, setWindowDays] = useState(null);
    const [summary, setSummary] = useState(null);

    // Draft filter values — edited freely, only committed to the applied* state
    // when the Filters button is clicked, so no dropdown change or Enter keypress
    // fires a request on its own.
    const [view, setView] = useState(BILLING_VIEW_ALL);
    const [entityType, setEntityType] = useState(BILLING_ENTITY_TYPE_ALL);
    const [appliedView, setAppliedView] = useState(BILLING_VIEW_ALL);
    const [appliedEntityType, setAppliedEntityType] = useState(BILLING_ENTITY_TYPE_ALL);

    // Sorting state
    const [sortField, setSortField] = useState('upcoming_billing_date');
    const [sortOrder, setSortOrder] = useState('desc');

    // Filter states
    const [filters, setFilters] = useState({});
    const [searchText, setSearchText] = useState('');

    // Applied states to trigger fetch
    const [appliedSearchText, setAppliedSearchText] = useState('');
    const [appliedFilters, setAppliedFilters] = useState({});

    const initFilters = () => {
        const initial = {
            global: { value: null, matchMode: FilterMatchMode.CONTAINS },
            partner_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            enrollment_type: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            upcoming_billing_amount: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            upcoming_billing_date: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            upcoming_billing_type: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
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
                filters: appliedFilters,
                page,
                per_page: perPage,
                sort_field: sortField,
                sort_order: sortOrder,
                view: appliedView,
                // 'all' is a UI-only sentinel — omit the key so the API applies no
                // entity filter at all.
                entity_type: appliedEntityType === BILLING_ENTITY_TYPE_ALL ? undefined : appliedEntityType
            };

            const response = await fetchUpcomingBilling(payload);
            if (response.status) {
                setBillings(response.data || []);
                setTotalRecords(response.meta?.total || 0);
                // Comes from config('subscription.upcoming_window_days') so the note
                // below cannot drift from the window the query actually uses.
                setWindowDays(response.window_days ?? null);
                setSummary(response.summary ?? null);
            } else {
                toast.error(response.message || 'Failed to fetch upcoming billing');
            }
        } catch (error) {
            console.error('Error fetching upcoming billing:', error);
            toast.error('Failed to load upcoming billing');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (Object.keys(appliedFilters).length > 0) {
            loadData();
        }
    }, [appliedSearchText, appliedFilters, page, perPage, sortField, sortOrder, appliedView, appliedEntityType]);

    const handleApplyFilters = () => {
        setAppliedSearchText(searchText);
        setAppliedFilters(filters);
        setAppliedView(view);
        setAppliedEntityType(entityType);
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearchText('');
        setAppliedSearchText('');
        setView(BILLING_VIEW_ALL);
        setEntityType(BILLING_ENTITY_TYPE_ALL);
        setAppliedView(BILLING_VIEW_ALL);
        setAppliedEntityType(BILLING_ENTITY_TYPE_ALL);
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

    return (
        <div className="page-content page-content-fit">
            <div className="container-fluid">
                <PageHeader
                    title="Upcoming Billings"
                    breadcrumbs={[{ label: 'Upcoming Billings' }]}
                />

                <BillingStats summary={summary} loading={loading} />

                <div className="row row-table-fit">
                    <div className="col-lg-12">
                        <div className="card">
                            <div className="card-body">
                                <BillingFilters
                                    searchText={searchText} setSearchText={setSearchText}
                                    view={view} setView={setView}
                                    entityType={entityType} setEntityType={setEntityType}
                                    onApply={handleApplyFilters}
                                    onClear={handleClearFilters}
                                    loading={loading}
                                />

                                <div className="alert alert-info bg-info-subtle border-0 text-dark p-3 rounded-3 mb-3 fs-13 shadow-xs d-flex align-items-center gap-2.5" role="alert">
                                    <i className="ri-information-fill fs-20 text-info flex-shrink-0 me-2"></i>
                                    <div>
                                        <strong>Note:</strong> This list shows <strong>Active Subscribers</strong> whose next charge falls within the next <strong>{windowDays ?? '…'} days</strong>, plus anyone still awaiting their first payment. Rows marked <span className="text-danger fw-medium">Overdue</span> have a missed cycle the system has not been able to collect, and <span className="text-warning fw-medium">Billing paused</span> means the subscriber is not Active so nothing is being charged.
                                    </div>
                                </div>

                                <BillingTable
                                    data={billings}
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
