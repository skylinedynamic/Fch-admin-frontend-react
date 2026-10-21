import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../common/PageHeader';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';

// @ts-ignore
import StatisticsCard from '../../components/Common/StatisticsCard';
// @ts-ignore
import StatisticsCardSkeleton from '../../components/Common/StatisticsCardSkeleton';
import TableLoader from '../../components/Loader/TableLoader';
import FilterLoader from '../../components/Loader/FilterLoader';
import { useCommissions } from '../../modules/commission/queries';
import { CommissionListItem } from '../../modules/commission/types';
import { usePartnerOptions, partnerOptionLabel } from '../../modules/partner';
import { useAuthStore } from '../../store/auth/authStore';
import { PAYMENT_STATUS_OPTIONS, COMMISSION_STATUS_OPTIONS, PAYMENT_STATUS_CLASS_MAP, COMMISSION_STATUS_CLASS_MAP } from '../../config/statusOptions';
import { formatCurrency } from '../../utils/helper';

export default function CommissionList() {
    const navigate = useNavigate();

    // Auth - Determine if current user is a partner
    const { user } = useAuthStore();
    const isPartner = user?.is_host == false;

    // Partner dropdown options (only loaded for non-partner users, who see the filter)
    const { data: partnerOptions = [] } = usePartnerOptions(!isPartner);
    const partnersList = partnerOptions.map((p) => ({ label: partnerOptionLabel(p), value: p.id }));

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
        search: appliedFilters.searchText,
        partner_id: appliedFilters.selectedPartner,
        commission_status: appliedFilters.selectedStatus,
        payment_status: appliedFilters.selectedPaymentStatus,
        filters: [], // Add if needed based on API requirements, usually for complex filters
        page,
        per_page: perPage,
        sort_field: sortField,
        sort_order: sortOrder === 'asc' ? 'asc' : (sortOrder === 'desc' ? 'desc' : '')
    }), [appliedFilters, page, perPage, sortField, sortOrder]);

    // Use Query Wrapper
    const { data: commissionData, isLoading, isFetching } = useCommissions(queryPayload);

    // Calculate statistics from API data
    const statistics = useMemo(() => {
        // If the API provides summary data in the response, use it (Global stats)
        const apiStatistics = commissionData?.statistics;
        return {
            total_commissions: apiStatistics?.total_commission_amount || 0,
            avg_commission_rate: apiStatistics?.avg_commission_rate || 0,
            partner_commission_amount: apiStatistics?.partner_commission_amount || 0,
            total_funded_amount: apiStatistics?.total_funded_amount || 0,
            total_deals: apiStatistics?.total_deals || 0
        };
    }, [commissionData]);

    const statisticsConfig = useMemo(() => {
        const stats: Array<{
            title: string;
            value: number | string;
            icon: string;
            colorVariant: string;
            isCurrency?: boolean;
            isPercent?: boolean;
        }> = [
                { title: "Total Funded Amount", value: statistics.total_funded_amount, icon: "ri-time-line", colorVariant: "warning", isCurrency: true },
                { title: "Total Commission", value: statistics.total_commissions, icon: "ri-money-dollar-circle-line", colorVariant: "secondary", isCurrency: true },
                { title: "Avg Commission Rate", value: statistics.avg_commission_rate, icon: "ri-percent-line", colorVariant: "info", isPercent: true }
            ];

        if (!isPartner) {
            stats.push({ title: "Partner Commission", value: statistics.partner_commission_amount, icon: "ri-user-line", colorVariant: "success", isCurrency: true });
        }

        if (isPartner) {
            stats.push({ title: "Total Deals", value: statistics.total_deals, icon: "ri-group-line", colorVariant: "success" });
        }

        return stats;
    }, [statistics, isPartner]);

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

    useEffect(() => {
        if (isPartner) return;

        // Add class to body to prevent global scroll
        document.body.classList.add('table-page-fit-active');

        return () => {
            document.body.classList.remove('table-page-fit-active');
        };
    }, [isPartner]);

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



    // Template body
    const statusBodyTemplate = (rowData: CommissionListItem) => {
        const className = COMMISSION_STATUS_CLASS_MAP[rowData.commission_status] || 'bg-light text-body';
        return <span className={`badge ${className} text-uppercase px-2`}>{rowData.commission_status}</span>;
    };

    // Payment Status Template body
    const paymentStatusBodyTemplate = (rowData: CommissionListItem) => {
        const className = PAYMENT_STATUS_CLASS_MAP[rowData.payment_status] || 'bg-light text-body';
        return <span className={`badge ${className} text-uppercase px-2`}>{rowData.payment_status}</span>;
    };

    return (
        <div className="page-content page-content-fit">
            <div className="container-fluid">
                {/* Header Section */}
                <PageHeader 
                    title="Commissions" 
                    breadcrumbs={[{ label: 'Commissions' }]} 
                />

                {/* Statistics Cards */}
                <div className="row commission-section">
                    {isLoading ? (
                        <>
                            <StatisticsCardSkeleton colSize="col-xl-3 col-md-6" />
                            <StatisticsCardSkeleton colSize="col-xl-3 col-md-6" />
                            <StatisticsCardSkeleton colSize="col-xl-3 col-md-6" />
                            <StatisticsCardSkeleton colSize="col-xl-3 col-md-6" />
                        </>
                    ) : (
                        statisticsConfig.map((config, index) => {
                            const displayValue = config.isCurrency
                                ? formatCurrency(config.value, '$', 1, 0)
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
                                    colSize="col-xl-3 col-md-6"
                                />
                            );
                        })
                    )}
                </div>

                {/* Filters and Table */}
                <div className="row row-table-fit">
                    <div className="col-lg-12">
                        <div className="card shadow-sm border-0">
                            <div className="card-body">
                                <form className="table-filter mb-4" onSubmit={(e) => e.preventDefault()}>
                                    {isLoading ? (
                                        <FilterLoader />
                                    ) : (
                                        <div className="row g-3">
                                            <div className={isPartner ? "col-xxl-4 col-sm-6" : "col-xxl-3 col-sm-6"}>
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
                                            {!isPartner && (
                                                <div className="col-xxl-2 col-sm-6">
                                                    <Dropdown
                                                        value={selectedPartner}
                                                        options={partnersList}
                                                        optionLabel="label"
                                                        optionValue="value"
                                                        onChange={(e) => setSelectedPartner(e.value)}
                                                        placeholder="Select Partner"
                                                        className="w-100 employee-filter-dropdown"
                                                        showClear={selectedPartner !== null}
                                                        filter
                                                    />
                                                </div>
                                            )}
                                            <div className={isPartner ? "col-xxl-3 col-sm-6" : "col-xxl-2 col-sm-6"}>
                                                <Dropdown
                                                    value={selectedStatus}
                                                    options={COMMISSION_STATUS_OPTIONS}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    onChange={(e) => setSelectedStatus(e.value)}
                                                    placeholder="Commission Status"
                                                    className="w-100 employee-filter-dropdown"
                                                    showClear={selectedStatus !== ''}
                                                />
                                            </div>
                                            <div className={isPartner ? "col-xxl-2 col-sm-6" : "col-xxl-2 col-sm-6"}>
                                                <Dropdown
                                                    value={selectedPaymentStatus}
                                                    options={PAYMENT_STATUS_OPTIONS}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    onChange={(e) => setSelectedPaymentStatus(e.value)}
                                                    placeholder="Payment Status"
                                                    className="w-100 employee-filter-dropdown"
                                                    showClear={selectedPaymentStatus !== ''}
                                                />
                                            </div>

                                            <div className="col-xxl-3 col-sm-12">
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
                                    )}
                                </form>

                                {isLoading ? (
                                    <TableLoader rows={10} columns={new Array(8).fill({ style: { minWidth: '100px' } })} />
                                ) : (
                                    <div className="table-responsive table-card mt-1">
                                        <DataTable
                                            scrollable
                                            scrollHeight="flex"
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
                                            {!isPartner && <Column field="partner" header="Partner" sortable style={{ minWidth: '150px' }} />}
                                            <Column field="commission_status" header="Status" body={statusBodyTemplate} sortable style={{ minWidth: '110px' }} />
                                            <Column header="Requested Amount" field="requested_amount" body={(rowData: CommissionListItem) => formatCurrency(rowData.requested_amount ?? 0, rowData.currency_symbol, rowData.conversion_rate, 0)} sortable style={{ minWidth: '140px' }} />
                                            <Column header="Funded Amount" field="funded_amount" body={(rowData: CommissionListItem) => formatCurrency(rowData.funded_amount ?? 0, rowData.currency_symbol, rowData.conversion_rate, 0)} sortable style={{ minWidth: '140px' }} />
                                            {!isPartner && <Column header="Admin Comm." field="admin_commission_amount" body={(rowData: CommissionListItem) => formatCurrency(rowData.admin_commission_amount ?? 0, rowData.currency_symbol, rowData.conversion_rate, 0)} sortable style={{ minWidth: '140px' }} />}
                                            <Column header="Partner Comm." field="partner_commission_amount" body={(rowData: CommissionListItem) => formatCurrency(rowData.partner_commission_amount ?? 0, rowData.currency_symbol, rowData.conversion_rate, 0)} sortable style={{ minWidth: '140px' }} />
                                            <Column field="payment_status" header="Payment Status" body={paymentStatusBodyTemplate} sortable style={{ minWidth: '110px' }} />
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
