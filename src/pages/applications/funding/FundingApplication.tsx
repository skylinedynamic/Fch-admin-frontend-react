import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataTable } from '../../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { useFundingApplications, useFundingApplicationStats } from '../../../modules/application';
import { usePermissions } from '../../../lib/auth/usePermissions';
import { useAuthStore } from '../../../store/auth/authStore';

import StatisticsCard from '../../../components/Common/StatisticsCard';
import StatisticsCardSkeleton from '../../../components/Common/StatisticsCardSkeleton';
import TableLoader from '../../../components/Loader/TableLoader';
import { FundingApplication as FundingApplicationType, ApplicationQueryParams, ApplicationStatistics } from '../../../modules/application/types';
import { downloadFundingApplication, downloadFundingSignature } from '../../../modules/application/services';
import { toast } from 'react-toastify';

import { FUNDING_APPLICATION_STATUS_OPTIONS, FUNDING_APPLICATION_STATUS_CLASS_MAP } from '../../../config/borrower';
import PageHeader from '../../common/PageHeader';
import { toLocalYmd } from '../../../utils/dates';
export default function FundingApplication() {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const currentUser = useAuthStore((state: any) => state.user)
    const isHost = currentUser?.is_host == 1;

    // Pagination state
    const [page, setPage] = useState<number>(1);
    const [perPage, setPerPage] = useState<number>(10);

    // Sorting state
    const [sortField, setSortField] = useState<string>('id');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Filter states (Inputs)
    const [searchText, setSearchText] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [dateRange, setDateRange] = useState<Date[] | null>(null);
    const [filters, setFilters] = useState<any>({});

    // Applied Filters (For API Query)
    const [appliedFilters, setAppliedFilters] = useState<{
        search: string;
        status: string;
        date_range: Date[] | null;
        filters: any;
    }>({
        search: '',
        status: '',
        date_range: null,
        filters: {}
    });

    // API Query
    const queryParams: ApplicationQueryParams = {
        page,
        per_page: perPage,
        search: appliedFilters.search,
        status: appliedFilters.status,
        start_date: toLocalYmd(appliedFilters.date_range?.[0]),
        end_date: toLocalYmd(appliedFilters.date_range?.[1]),
        filters: appliedFilters.filters,
        sort_field: sortField,
        sort_order: sortOrder,
    };

    const { data: apiResponse, isLoading, isFetching } = useFundingApplications(queryParams);
    const leads = apiResponse?.data || [];
    const totalRecords = apiResponse?.meta?.total || 0;
    const loading = isLoading || isFetching;



    // Statistics data
    const { data: statsResponse, isLoading: statsLoading } = useFundingApplicationStats();
    const stats = statsResponse?.data || { total_applications: 0, approved: 0, pending: 0, approved_amount: 0 };

    // Initialize filters
    const initFilters = () => {
        const initial = {
            global: { value: null, matchMode: FilterMatchMode.CONTAINS },
            full_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            industry_type: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            entity_type: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            purpose_of_funds: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            status: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
        };
        setFilters(initial);
        setAppliedFilters(prev => ({ ...prev, filters: initial }));
    };

    // Initialize
    useEffect(() => {
        initFilters();

        // Add class to body to prevent global scroll
        document.body.classList.add('table-page-fit-active');

        return () => {
            document.body.classList.remove('table-page-fit-active');
        };
    }, []);

    const statisticsConfig = [
        { title: "Total Applications", dataKey: "total_applications", icon: "ri-coupon-line", colorVariant: "secondary" },
        { title: "Approved", dataKey: "approved", icon: "ri-folder-open-line", colorVariant: "warning" },
        { title: "Pending", dataKey: "pending", icon: "ri-time-line", colorVariant: "info" },
        { title: "Approved Amount", dataKey: "approved_amount", icon: "ri-star-line", colorVariant: "success" }
    ];

    const handleApplyFilters = () => {
        setAppliedFilters(prev => ({
            ...prev,
            search: searchText,
            status: selectedStatus,
            date_range: dateRange,
            filters: filters
        }));
        setPage(1);
    };

    const handleClearFilters = () => {
        // Reset Inputs
        setSearchText('');
        setSelectedStatus('');
        setDateRange(null);
        initFilters();

        // Reset Applied Filters
        setAppliedFilters(prev => ({
            ...prev,
            search: '',
            status: '',
            date_range: null,
            filters: {}
        }));

        // Re-call initFilters to reset state properly
        const initial = {
            global: { value: null, matchMode: FilterMatchMode.CONTAINS },
            full_name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            industry_type: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            entity_type: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            purpose_of_funds: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
            status: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
        };
        setFilters(initial);
        setAppliedFilters({
            search: '',
            status: '',
            date_range: null,
            filters: initial
        });

        setPage(1);
    };

    // Pagination handler
    const onPage = (event: any) => {
        const nextPerPage = event.rows;
        const nextPage = Math.floor(event.first / event.rows) + 1;
        setPerPage(nextPerPage);
        setPage(nextPage);
    };

    // Sort handler
    const onSort = (event: any) => {
        const field = event.sortField;
        const order = event.sortOrder === 1 ? 'asc' : 'desc';
        setSortField(field || sortField);
        setSortOrder(order);
    };

    // Filter handler
    const onFilter = (e: any) => {
        setFilters(e.filters);
        setAppliedFilters(prev => ({
            ...prev,
            filters: e.filters
        }));
        setPage(1);
    };

    // Template body
    const statusBodyTemplate = (rowData: FundingApplicationType) => {
        const className = FUNDING_APPLICATION_STATUS_CLASS_MAP[rowData.status] || 'bg-light text-body';
        return <span className={`badge ${className} text-uppercase`}>{rowData.status}</span>;
    };


    return (
        <div className="page-content page-content-fit">
            <div className="container-fluid">
                {/* Header Section */}
                <PageHeader 
                    title="Funding Applications" 
                    breadcrumbs={[{ label: 'Funding Applications' }]} 
                />

                {/* Statistics Cards */}
                <div className="row funding-section">
                    {statsLoading ? (
                        [1, 2, 3, 4].map(i => <StatisticsCardSkeleton key={i} colSize="col-xl-3 col-md-6" />)
                    ) : (
                        statisticsConfig.map((config, index) => (
                            <StatisticsCard
                                key={index}
                                title={config.title}
                                count={config.dataKey.includes('rate') ? `${stats[config.dataKey]}` : stats[config.dataKey]}
                                icon={config.icon}
                                colorVariant={config.colorVariant}
                                colSize="col-xl-3 col-md-6"
                            />
                        ))
                    )}
                </div>

                {/* Filters and Table */}
                <div className="row row-table-fit">
                    <div className="col-lg-12">
                        <div className="card">
                            <div className="card-body">
                                <form className="table-filter" onSubmit={(e) => {
                                    e.preventDefault();
                                    handleApplyFilters();
                                }}>
                                    <div className="row g-3 mb-3">
                                        <div className="col-lg-3 col-md-6 col-12">
                                            <div className="search-box">
                                                <input
                                                    type="text"
                                                    className="form-control search bg-light border-light"
                                                    placeholder="Search here..."
                                                    value={searchText}
                                                    onChange={(e) => setSearchText(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                                                />
                                                <i className="ri-search-line search-icon"></i>
                                            </div>
                                        </div>
                                        <div className="col-lg-3 col-md-6 col-12">
                                            <Dropdown
                                                value={selectedStatus}
                                                options={[{ label: 'All Status', value: '' }, ...FUNDING_APPLICATION_STATUS_OPTIONS]}
                                                optionLabel="label"
                                                optionValue="value"
                                                onChange={(e) => setSelectedStatus(e.value)}
                                                placeholder="All Status"
                                                className="w-100 employee-filter-dropdown"
                                            />
                                        </div>
                                        <div className="col-lg-3 col-md-6 col-12">
                                            <div className="search-box">
                                                <Calendar
                                                    value={dateRange}
                                                    onChange={(e: any) => setDateRange(e.value)}
                                                    selectionMode="range"
                                                    readOnlyInput
                                                    placeholder="Select Date Range"
                                                    className="w-100"
                                                    inputClassName="form-control search bg-light border-light"
                                                />
                                                <i className="ri-calendar-2-line search-icon"></i>
                                            </div>
                                        </div>
                                        <div className="col-lg-3 col-md-6 col-12">
                                            <div className="d-flex gap-2">
                                                <button type="button" className="btn btn-warning flex-grow-1" onClick={handleApplyFilters}>
                                                    <i className="ri-equalizer-fill me-1 align-bottom"></i> Filters
                                                </button>
                                                <button type="button" className="btn btn-default flex-grow-1" onClick={handleClearFilters}>
                                                    <i className="ri-close-line me-1 align-bottom"></i> Clear
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </form>

                                {loading ? (
                                    <TableLoader rows={10} columns={new Array(8).fill({ style: { minWidth: '100px' } })} />
                                ) : (
                                    <div className="table-responsive table-card mt-1">
                                        <DataTable
                                            scrollable
                                            scrollHeight="flex"
                                            value={leads}
                                            paginator
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
                                            dataKey="id"
                                            rowClassName={() => 'cursor-pointer'}
                                            onRowClick={(e: any) => {
                                                navigate(`/intake-review/funding-application/${e.data.id}`);
                                            }}
                                            responsiveLayout="scroll"
                                            className="p-datatable-sm"
                                            emptyMessage="No applications found"
                                        >
                                            <Column header="Name" field="full_name" sortable filter filterPlaceholder="Search name" style={{ minWidth: '160px' }} />
                                            <Column
                                                field="application_number"
                                                header="App No"
                                                body={(rowData: FundingApplicationType) => {
                                                    return rowData.application_number || <span className="text-muted">-</span>;
                                                }}
                                                sortable
                                                filter
                                                filterPlaceholder="Search application no"
                                                style={{ minWidth: '150px' }}
                                            />
                                            <Column field="industry_type" header="Industry Type" sortable filter filterPlaceholder="Search industry" style={{ minWidth: '150px' }} />
                                            <Column field="entity_type" header="Entity Type" sortable filter filterPlaceholder="Search entity" style={{ minWidth: '150px' }} />
                                            <Column field="purpose_of_funds" header="Purpose" sortable filter filterPlaceholder="Search purpose" style={{ minWidth: '160px' }} />
                                            <Column header="Requested Amount" field="requested_amount" body={(rowData: FundingApplicationType) => rowData.requested_amount || 0} sortable style={{ minWidth: '160px' }} />
                                            <Column field="date" header="Date" body={(rowData: FundingApplicationType) => rowData.date || '-'} sortable style={{ minWidth: '120px' }} />
                                            <Column field="status" header="Status" body={statusBodyTemplate} sortable filter filterPlaceholder="Search status" style={{ minWidth: '140px' }} />
                                        </DataTable>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
