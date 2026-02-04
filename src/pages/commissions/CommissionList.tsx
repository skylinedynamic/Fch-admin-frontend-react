import React, { useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';

import StatisticsCard from '../../components/Common/StatisticsCard';
import TableLoader from '../../components/Loader/TableLoader';
import { useCommissions } from '../../modules/commission/queries';
import { Commission } from '../../modules/commission/types';
import { MOCK_STATS } from '../../modules/commission/mockData';

const PAYMENT_STATUS_OPTIONS = [
    { label: 'Paid', value: 'paid' },
    { label: 'Pending', value: 'pending' },
    { label: 'Cancelled', value: 'cancelled' }
];

const COMMISSION_STATUS_OPTIONS = [
    { label: 'Pending', value: 'Pending' },
    { label: 'Approved', value: 'Approved' },
    { label: 'Declined', value: 'Declined' }
];

const PARTNER_OPTIONS = [
    { label: 'Acme Corp', value: 101 },
    { label: 'Stark Ind', value: 102 },
    { label: 'Wayne Ent', value: 103 },
    { label: 'Cyberdyne', value: 104 },
    { label: 'Massive Dynamic', value: 105 },
    { label: 'Hooli', value: 106 },
    { label: 'Pied Piper', value: 107 },
];

export default function CommissionList() {
    const navigate = useNavigate();

    // Pagination state
    const [page, setPage] = useState<number>(1);
    const [perPage, setPerPage] = useState<number>(10);

    // Sorting state
    const [sortField, setSortField] = useState<string>('');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | ''>('');

    // Filter states (Inputs)
    const [searchText, setSearchText] = useState<string>('');
    const [selectedPartner, setSelectedPartner] = useState<any>(null);
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('');
    const [dateRange, setDateRange] = useState<Date[] | null>(null);

    // Applied Filters state (triggers query)
    const [appliedFilters, setAppliedFilters] = useState({
        searchText: '',
        selectedPartner: null,
        selectedStatus: '',
        selectedPaymentStatus: '',
        dateRange: null as Date[] | null
    });

    // Construct Payload for React Query
    const queryPayload = useMemo(() => ({
        search_text: appliedFilters.searchText,
        partner_id: appliedFilters.selectedPartner,
        status: appliedFilters.selectedStatus,
        payment_status: appliedFilters.selectedPaymentStatus,
        date_range: appliedFilters.dateRange,
        page,
        per_page: perPage,
        sort_field: sortField,
        sort_order: sortOrder === 'asc' ? 'asc' : (sortOrder === 'desc' ? 'desc' : '')
    }), [appliedFilters, page, perPage, sortField, sortOrder]);

    // Use Query Wrapper
    const { data: commissionData, isLoading, isFetching } = useCommissions(queryPayload);

    const handleApplyFilters = () => {
        setPage(1);
        setAppliedFilters({
            searchText,
            selectedPartner,
            selectedStatus,
            selectedPaymentStatus,
            dateRange
        });
    };

    const handleClearFilters = () => {
        setSearchText('');
        setSelectedPartner(null);
        setSelectedStatus('');
        setSelectedPaymentStatus('');
        setDateRange(null);
        setPage(1);
        setSortField('');
        setSortOrder('');

        setAppliedFilters({
            searchText: '',
            selectedPartner: null,
            selectedStatus: '',
            selectedPaymentStatus: '',
            dateRange: null
        });
    };

    // Pagination handler
    const onPage = (event: any) => {
        setPerPage(event.rows);
        setPage(Math.floor(event.first / event.rows) + 1);
    };

    // Sort handler
    const onSort = (event: any) => {
        setSortField(event.sortField);
        setSortOrder(event.sortOrder === 1 ? 'asc' : 'desc');
    };

    // Row Click handler
    const onRowClick = useCallback((event: any) => {
        navigate(`/commissions/${event.data.id}`);
    }, [navigate]);

    // Currency Formatter
    const formatCurrency = useCallback((amount: number | string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }).format(Number(amount) || 0);
    }, []);

    // Template body
    const statusBodyTemplate = (rowData: Commission) => {
        const statusMap: { [key: string]: string } = {
            'pending': 'bg-warning-subtle text-warning',
            'approved': 'bg-success-subtle text-success',
            'declined': 'bg-danger-subtle text-danger'
        };
        const className = statusMap[rowData.commission_status?.toLowerCase()] || 'bg-light text-body';
        return <span className={`badge ${className} text-uppercase px-2`}>{rowData.commission_status}</span>;
    };

    // Payment Status Template body
    const paymentStatusBodyTemplate = (rowData: Commission) => {
        const statusMap: { [key: string]: string } = {
            'pending': 'bg-warning-subtle text-warning',
            'paid': 'bg-success-subtle text-success',
            'cancelled': 'bg-danger-subtle text-danger'
        };
        const className = statusMap[rowData.commission_payment_status?.toLowerCase()] || 'bg-light text-body';
        return <span className={`badge ${className} text-uppercase px-2`}>{rowData.commission_payment_status}</span>;
    };

    const statisticsConfig = useMemo(() => [
        { title: "Total Commissions Paid", value: MOCK_STATS.total_commissions_paid, icon: "ri-money-dollar-circle-line", colorVariant: "secondary", isCurrency: true },
        { title: "Pending Commissions", value: MOCK_STATS.pending_commissions, icon: "ri-time-line", colorVariant: "warning", isCurrency: true },
        { title: "Avg Commission Rate", value: MOCK_STATS.avg_commission_rate, icon: "ri-percent-line", colorVariant: "info", isPercent: true },
        { title: "Active Advisors", value: MOCK_STATS.active_advisors, icon: "ri-group-line", colorVariant: "success" }
    ], []);

    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Header Section */}
                <div className="row mb-3 pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Commissions</h4>
                                <nav aria-label="breadcrumb" className="d-none d-sm-block">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">Commissions</li>
                                    </ol>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="row">
                    {statisticsConfig.map((config, index) => {
                        const displayValue = config.isCurrency
                            ? formatCurrency(config.value)
                            : config.isPercent
                                ? `${config.value}%`
                                : config.value;

                        return (
                            <StatisticsCard
                                key={index}
                                title={config.title}
                                count={displayValue}
                                icon={config.icon}
                                colorVariant={config.colorVariant}
                            />
                        );
                    })}
                </div>

                {/* Filters and Table */}
                <div className="row">
                    <div className="col-lg-12">
                        <div className="card shadow-sm border-0">
                            <div className="card-body">
                                <form className="table-filter mb-4" onSubmit={(e) => e.preventDefault()}>
                                    <div className="row g-3">
                                        <div className="col-xxl-3 col-sm-6">
                                            <div className="search-box">
                                                <input
                                                    type="text"
                                                    className="form-control search bg-light border-light"
                                                    placeholder="Search borrower or ID..."
                                                    value={searchText}
                                                    onChange={(e) => setSearchText(e.target.value)}
                                                />
                                                <i className="ri-search-line search-icon"></i>
                                            </div>
                                        </div>
                                        <div className="col-xxl-2 col-sm-6">
                                            <Dropdown
                                                value={selectedPartner}
                                                options={PARTNER_OPTIONS}
                                                optionLabel="label"
                                                optionValue="value"
                                                onChange={(e) => setSelectedPartner(e.value)}
                                                placeholder="Select Partner"
                                                className="w-100 employee-filter-dropdown"
                                                showClear
                                                filter
                                            />
                                        </div>
                                        <div className="col-xxl-2 col-sm-6">
                                            <Dropdown
                                                value={selectedStatus}
                                                options={COMMISSION_STATUS_OPTIONS}
                                                optionLabel="label"
                                                optionValue="value"
                                                onChange={(e) => setSelectedStatus(e.value)}
                                                placeholder="Commission Status"
                                                className="w-100 employee-filter-dropdown"
                                                showClear
                                            />
                                        </div>
                                        <div className="col-xxl-2 col-sm-6">
                                            <Dropdown
                                                value={selectedPaymentStatus}
                                                options={PAYMENT_STATUS_OPTIONS}
                                                optionLabel="label"
                                                optionValue="value"
                                                onChange={(e) => setSelectedPaymentStatus(e.value)}
                                                placeholder="Payment Status"
                                                className="w-100 employee-filter-dropdown"
                                                showClear
                                            />
                                        </div>
                                        <div className="col-xxl-3 col-sm-12">
                                            <div className="d-flex gap-2">
                                                <button type="button" className="btn btn-primary flex-grow-1" onClick={handleApplyFilters}>
                                                    <i className="ri-equalizer-fill me-1 align-bottom"></i> Search
                                                </button>
                                                <button type="button" className="btn btn-soft-secondary py-2" onClick={handleClearFilters} title="Clear Filters">
                                                    <i className="ri-refresh-line align-bottom"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </form>

                                {isLoading ? (
                                    <TableLoader rows={10} columns={new Array(8).fill({ style: { minWidth: '100px' } })} />
                                ) : (
                                    <div className="table-responsive table-card">
                                        <DataTable
                                            scrollable
                                            scrollHeight="600px"
                                            value={commissionData?.data || []}
                                            paginator
                                            lazy
                                            totalRecords={commissionData?.meta?.total || 0}
                                            first={(page - 1) * perPage}
                                            rows={perPage}
                                            rowsPerPageOptions={[10, 25, 50, 100]}
                                            sortMode="single"
                                            sortField={sortField}
                                            sortOrder={sortOrder === 'asc' ? 1 : -1}
                                            onPage={onPage}
                                            onSort={onSort}
                                            onRowClick={onRowClick}
                                            dataKey="id"
                                            rowClassName={() => 'cursor-pointer'}
                                            responsiveLayout="scroll"
                                            className="p-datatable-sm"
                                            emptyMessage="No commissions found"
                                            loading={isFetching}
                                        >
                                            <Column field="date" header="Date" sortable style={{ minWidth: '110px' }} />
                                            <Column field="borrower" header="Borrower" sortable style={{ minWidth: '150px' }} className="fw-medium" />
                                            <Column field="partner" header="Partner" sortable style={{ minWidth: '150px' }} />
                                            <Column field="commission_status" header="Status" body={statusBodyTemplate} sortable style={{ minWidth: '110px' }} />
                                            <Column header="Funded Amount" field="funded_amount" body={(rowData: Commission) => formatCurrency(rowData.funded_amount ?? 0)} sortable style={{ minWidth: '140px' }} />
                                            <Column header="Admin Comm." field="admin_commission_amount" body={(rowData: Commission) => formatCurrency(rowData.admin_commission_amount ?? 0)} sortable style={{ minWidth: '140px' }} />
                                            <Column header="Partner Comm." field="partner_commission_amount" body={(rowData: Commission) => formatCurrency(rowData.partner_commission_amount ?? 0)} sortable style={{ minWidth: '140px' }} />
                                            <Column field="commission_payment_status" header="Payment" body={paymentStatusBodyTemplate} sortable style={{ minWidth: '110px' }} />
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
