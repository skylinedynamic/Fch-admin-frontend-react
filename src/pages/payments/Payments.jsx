import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../common/PageHeader';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import PaymentStats from './components/PaymentStats';
import PaymentFilters from './components/PaymentFilters';
import PaymentTable from './components/PaymentTable';
import { fetchPayments, approvePayment } from '../../modules/payment';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ListSkeletonLoader from '../../components/Loader/ListSkeletonLoader';

export default function Payments() {
    const [initialLoading, setInitialLoading] = useState(true);
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
    // The invoice list's "Review" button links here with ?search=<invoice id>.
    const urlSearch = new URLSearchParams(window.location.search).get('search') || '';
    const [searchText, setSearchText] = useState(urlSearch);
    const [selectedStatus, setSelectedStatus] = useState(null);
    const [selectedEnvironment, setSelectedEnvironment] = useState(null);
    const [selectedMethod, setSelectedMethod] = useState(null);
    const [selectedType, setSelectedType] = useState(null);
    const [selectedPayee, setSelectedPayee] = useState(null);
    const [selectedCycle, setSelectedCycle] = useState(null);
    const [dateRange, setDateRange] = useState([]);

    // Applied filter states (to trigger fetch)
    const [appliedSearchText, setAppliedSearchText] = useState(urlSearch);
    const [appliedStatus, setAppliedStatus] = useState(null);
    const [appliedEnvironment, setAppliedEnvironment] = useState(null);
    const [appliedMethod, setAppliedMethod] = useState(null);
    const [appliedType, setAppliedType] = useState(null);
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
            invoice_id: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            status: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
            is_environment: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] }
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
        setStatsLoading(true);
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
                is_environment: appliedEnvironment,
                payment_from: appliedMethod,
                transaction_type: appliedType,
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
                if (response.stats) {
                    setStats(response.stats);
                }
            } else {
                toast.error(response.message || 'Failed to fetch payments');
            }
        } catch (error) {
            console.error('Error fetching payments:', error);
            toast.error('Failed to load payments');
        } finally {
            setLoading(false);
            setStatsLoading(false);
            setLoading(false);
            setInitialLoading(false);
        }
    };

    useEffect(() => {
        if (Object.keys(appliedFilters).length > 0) {
            loadData();
        }
    }, [appliedSearchText, appliedStatus, appliedEnvironment, appliedMethod, appliedType, appliedPayee, appliedCycle, appliedDateRange, appliedFilters, page, perPage, sortField, sortOrder]);

    const handleApplyFilters = () => {
        setAppliedSearchText(searchText);
        setAppliedStatus(selectedStatus);
        setAppliedEnvironment(selectedEnvironment);
        setAppliedMethod(selectedMethod);
        setAppliedType(selectedType);
        setAppliedPayee(selectedPayee);
        setAppliedCycle(selectedCycle);
        setAppliedDateRange(dateRange);
        setAppliedFilters(filters);
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearchText('');
        setSelectedStatus(null);
        setSelectedEnvironment(null);
        setSelectedMethod(null);
        setSelectedType(null);
        setSelectedPayee(null);
        setSelectedCycle(null);
        setDateRange([]);
        setAppliedSearchText('');
        setAppliedStatus(null);
        setAppliedEnvironment(null);
        setAppliedMethod(null);
        setAppliedType(null);
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

    const handleApprovePayment = async (paymentId) => {
        try {
            const response = await approvePayment(paymentId);
            if (response.status || response.data) {
                toast.success(response.message || 'Payment approved successfully!');
                loadData();
            } else {
                toast.error(response.message || 'Failed to approve payment');
            }
        } catch (error) {
            console.error('Error approving payment:', error);
            toast.error(error.response?.data?.message || 'Failed to approve payment');
        }
    };

    return (
        <div className="page-content page-content-fit">
            <div className="container-fluid">
                {/* Header */}
                <PageHeader 
                    title="Payments" 
                    breadcrumbs={[{ label: 'Payments' }]} 
                />

                {initialLoading ? (
                    <ListSkeletonLoader />
                ) : (
                    <>
                        {/* Stats Cards */}
                        <PaymentStats stats={stats} loading={statsLoading} />

                        {/* Filters and Table Section */}
                        <div className="row row-table-fit">
                            <div className="col-lg-12">
                                <div className="card">
                                    <div className="card-body list-fluid-card">
                                        <PaymentFilters
                                            searchText={searchText} setSearchText={setSearchText}
                                            selectedStatus={selectedStatus} setSelectedStatus={setSelectedStatus}
                                            selectedEnvironment={selectedEnvironment} setSelectedEnvironment={setSelectedEnvironment}
                                            selectedMethod={selectedMethod} setSelectedMethod={setSelectedMethod}
                                            selectedType={selectedType} setSelectedType={setSelectedType}
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
                                            onApprove={handleApprovePayment}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
