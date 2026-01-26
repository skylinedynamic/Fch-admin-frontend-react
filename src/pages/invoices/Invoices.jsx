import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import InvoiceStats from './components/InvoiceStats';
import InvoiceFilters from './components/InvoiceFilters';
import InvoiceTable from './components/InvoiceTable';
import { fetchInvoices, fetchInvoiceStats } from '../../modules/invoice';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Invoices() {
    const [loading, setLoading] = useState(true);
    const [invoices, setInvoices] = useState([]);
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    
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
            invoice_id: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            customer_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            email: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            status: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            cycle: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            country: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            payment_date: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            payment_amount: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] }
        };
        setFilters(initial);
        setAppliedFilters(initial);
    };

    useEffect(() => {
        initFilters();
        loadStats();
    }, []);

    const loadStats = async (params = {}) => {
        try {
            setStatsLoading(true);
            const response = await fetchInvoiceStats(params);
            setStats(response);
        } catch (error) {
            console.error('Error fetching stats:', error);
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

            const response = await fetchInvoices(payload);
            if (response.status) {
                setInvoices(response.data || []);
                setTotalRecords(response.meta?.total || 0);
            } else {
                toast.error(response.message || 'Failed to fetch invoices');
            }
            
            // Also load stats with the same payload (excluding pagination/sorting usually, but backend handles it)
            loadStats(payload);
        } catch (error) {
            console.error('Error fetching invoices:', error);
            toast.error('Failed to load invoices');
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
            <ToastContainer position="top-right" autoClose={3000} />
            <div className="container-fluid">
                {/* Header */}
                <div className="row mb-3 pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Invoices</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0 fs-12 text-muted">
                                        <li className="breadcrumb-item"><Link to="/" className="text-muted">Dashboard</Link></li>
                                        <li className="breadcrumb-item active text-primary font-weight-bold" aria-current="page">Invoices</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="mt-0">
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <InvoiceStats stats={stats} loading={statsLoading} />

                {/* Filters and Table Section */}
                <div className="row mt-4">
                    <div className="col-lg-12">
                        <div className="card">
                            <div className="card-body list-fluid-card">
                                <InvoiceFilters 
                                    searchText={searchText} setSearchText={setSearchText}
                                    selectedStatus={selectedStatus} setSelectedStatus={setSelectedStatus}
                                    selectedPayee={selectedPayee} setSelectedPayee={setSelectedPayee}
                                    selectedCycle={selectedCycle} setSelectedCycle={setSelectedCycle}
                                    dateRange={dateRange} setDateRange={setDateRange}
                                    onApply={handleApplyFilters}
                                    onClear={handleClearFilters}
                                />
                                
                                <InvoiceTable 
                                    data={invoices} 
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
                                    onRefresh={loadData}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
