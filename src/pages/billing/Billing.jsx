import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { fetchUpcomingBilling } from '../../modules/partner/services';
import BillingTable from './components/BillingTable';
import BillingFilters from './components/BillingFilters';
import { toast } from 'react-toastify';

export default function Billing() {
    const [loading, setLoading] = useState(true);
    const [billings, setBillings] = useState([]);

    // Pagination state
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);

    // Sorting state
    const [sortField, setSortField] = useState('upcoming_billing_date');
    const [sortOrder, setSortOrder] = useState('asc');

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
                sort_order: sortOrder
            };

            const response = await fetchUpcomingBilling(payload);
            if (response.status) {
                setBillings(response.data || []);
                setTotalRecords(response.meta?.total || 0);
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
    }, [appliedSearchText, appliedFilters, page, perPage, sortField, sortOrder]);

    const handleApplyFilters = () => {
        setAppliedSearchText(searchText);
        setAppliedFilters(filters);
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearchText('');
        setAppliedSearchText('');
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
                <div className="row pb-1 mobile-sticky-header">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Upcoming Billings</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0 fs-12 text-muted">
                                        <li className="breadcrumb-item"><Link to="/" className="text-muted">Dashboard</Link></li>
                                        <li className="breadcrumb-item active text-primary font-weight-bold" aria-current="page">Upcoming Billings</li>
                                    </ol>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row row-table-fit">
                    <div className="col-lg-12">
                        <div className="card">
                            <div className="card-body">
                                <BillingFilters
                                    searchText={searchText} setSearchText={setSearchText}
                                    onApply={handleApplyFilters}
                                    onClear={handleClearFilters}
                                    loading={loading}
                                />

                                <div className="alert alert-info bg-info-subtle border-0 text-dark p-3 rounded-3 mb-3 fs-13 shadow-xs d-flex align-items-center gap-2.5" role="alert">
                                    <i className="ri-information-fill fs-20 text-info flex-shrink-0 me-2"></i>
                                    <div>
                                        <strong>Note:</strong> This Upcoming Billing list only includes <strong>Active Subscribers</strong> whose subscription ends within the next <strong>10 days</strong>.
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
