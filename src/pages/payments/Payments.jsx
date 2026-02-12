import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import PaymentStats from './components/PaymentStats';
import PaymentFilters from './components/PaymentFilters';
import PaymentTable from './components/PaymentTable';
import { fetchPayments, fetchPaymentStats } from '../../modules/payment';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Payments() {
    const [loading, setLoading] = useState(true);
    const [payments, setPayments] = useState([]);
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);

    // Pagination state
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);

    // Sorting state
    const [sortField, setSortField] = useState('transaction_date');
    const [sortOrder, setSortOrder] = useState('desc');

    // Filter states
    const [filters, setFilters] = useState({});
    const [searchText, setSearchText] = useState('');
    const [selectedStatus, setSelectedStatus] = useState(null);
    const [selectedPayee, setSelectedPayee] = useState(null);
    const [selectedCycle, setSelectedCycle] = useState(null);
    const [dateRange, setDateRange] = useState([]);

    // Applied filter states (to trigger fetch)
    const [appliedSearchText, setAppliedSearchText] = useState('');
    const [appliedStatus, setAppliedStatus] = useState(null);
    const [appliedPayee, setAppliedPayee] = useState(null);
    const [appliedCycle, setAppliedCycle] = useState(null);
    const [appliedDateRange, setAppliedDateRange] = useState(null);
    const [appliedFilters, setAppliedFilters] = useState({});

    // Initialize filters
    const initFilters = () => {
        const initial = {
            global: { value: null, matchMode: FilterMatchMode.CONTAINS },
            transaction_id: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            from: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            company: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            payment_type: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            transaction_date: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            amount: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            borrower_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            partner_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            status: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] }
        };
        setFilters(initial);
        setAppliedFilters(initial);
    };

    useEffect(() => {
        initFilters();
    }, []);

    const loadStats = async (params = {}) => {
        try {
            setStatsLoading(true);
            const response = await fetchPaymentStats(params);
            if (response.status) {
                setStats(response.data);
            }
        } catch (error) {
            console.error('Error fetching payment stats:', error);
        } finally {
            setStatsLoading(false);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            // Format date range for backend if present
            let dateFrom = null;
            let dateTo = null;
            if (appliedDateRange && appliedDateRange.length === 2) {
                // Ensure date formatting uses local timezone to prevent shift
                const formatDate = (date) => {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                };
                dateFrom = formatDate(appliedDateRange[0]);
                dateTo = formatDate(appliedDateRange[1]);
            }

            const payload = {
                search: appliedSearchText,
                status: appliedStatus,
                payee_id: appliedPayee,
                cycle: appliedCycle,
                date_from: dateFrom,
                date_to: dateTo,
                filters: appliedFilters,
                page,
                per_page: perPage,
                sort_field: sortField,
                sort_order: sortOrder
            };

            const response = await fetchPayments(payload);
            if (response.status) {
                setPayments(response.data || []);
                setTotalRecords(response.meta?.total || 0);
            } else {
                toast.error(response.message || 'Failed to fetch payments');
            }

            // Also load stats with the same filter parameters
            loadStats({
                date_from: dateFrom,
                date_to: dateTo,
                status: appliedStatus
            });
        } catch (error) {
            console.error('Error fetching payments:', error);
            toast.error('Failed to load payments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (Object.keys(appliedFilters).length > 0) {
            loadData();
        }
    }, [appliedSearchText, appliedStatus, appliedPayee, appliedCycle, appliedDateRange, appliedFilters, page, perPage, sortField, sortOrder]);

    const handleApplyFilters = () => {
        setAppliedSearchText(searchText);
        setAppliedStatus(selectedStatus);
        setAppliedPayee(selectedPayee);
        setAppliedCycle(selectedCycle);
        setAppliedDateRange(dateRange);
        setAppliedFilters(filters);
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearchText('');
        setSelectedStatus(null);
        setSelectedPayee(null);
        setSelectedCycle(null);
        setDateRange([]);
        setAppliedSearchText('');
        setAppliedStatus(null);
        setAppliedPayee(null);
        setAppliedCycle(null);
        setAppliedDateRange(null);
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
        <div className="page-content">
            <div className="container-fluid">
                {/* Header */}
                <div className="row pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Payments</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0 fs-12 text-muted">
                                        <li className="breadcrumb-item"><Link to="/" className="text-muted">Dashboard</Link></li>
                                        <li className="breadcrumb-item active text-primary font-weight-bold" aria-current="page">Payments</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="mt-0">
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <PaymentStats stats={stats} loading={statsLoading} />

                {/* Filters and Table Section */}
                <div className="row">
                    <div className="col-lg-12">
                        <div className="card">
                            <div className="card-body list-fluid-card">
                                <PaymentFilters
                                    searchText={searchText} setSearchText={setSearchText}
                                    selectedStatus={selectedStatus} setSelectedStatus={setSelectedStatus}
                                    selectedPayee={selectedPayee} setSelectedPayee={setSelectedPayee}
                                    selectedCycle={selectedCycle} setSelectedCycle={setSelectedCycle}
                                    dateRange={dateRange} setDateRange={setDateRange}
                                    onApply={handleApplyFilters}
                                    onClear={handleClearFilters}
                                    loading={loading}
                                />

                                <PaymentTable
                                    data={payments}
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
