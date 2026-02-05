import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';

import StatisticsCard from '../../components/Common/StatisticsCard';
import TableLoader from '../../components/Loader/TableLoader';
import { useCommissions } from '../../modules/commission/queries';
import { CommissionListItem } from '../../modules/commission/types';
import { fetchPartners } from '../../modules/partner/services';
import { useAuthStore } from '../../store/auth/authStore';
import { PAYMENT_STATUS_OPTIONS, COMMISSION_STATUS_OPTIONS, PAYMENT_STATUS_CLASS_MAP, COMMISSION_STATUS_CLASS_MAP } from '../../config/statusOptions';

export default function CommissionList() {
    const navigate = useNavigate();

    // Auth - Determine if current user is a partner
    const { user } = useAuthStore();
    const isPartner = user?.is_host == false;

    // State for partner dropdown options (only used for non-partner users)
    const [partnersList, setPartnersList] = useState<Array<{ label: string, value: number }>>([]);

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
        // @ts-ignore
        const apiSummary = commissionData?.summary || commissionData?.stats;

        if (apiSummary) {
            return {
                total_commissions_paid: apiSummary.total_commissions_paid || 0,
                pending_commissions: apiSummary.pending_commissions || 0,
                avg_commission_rate: apiSummary.avg_commission_rate || 0,
                deal_completed: apiSummary.deal_completed || 0
            };
        }

        // Fallback: Calculate from currently visible data (Page stats)
        const list = commissionData?.data || [];
        let totalPaid = 0;
        let totalPending = 0;
        let totalRate = 0;
        let dealCount = 0;

        list.forEach((item: CommissionListItem) => {
            const amountStr = isPartner ? item.partner_commission_amount : item.total_commission_amount;
            const rateStr = isPartner ? item.partner_commission : item.total_commission;

            const amount = parseFloat(amountStr) || 0;
            const rate = parseFloat(rateStr) || 0;

            if (item.payment_status?.toLowerCase() === 'paid') {
                totalPaid += amount;
            } else {
                totalPending += amount;
            }

            totalRate += rate;
            if (item.funded_amount && parseFloat(item.funded_amount) > 0) {
                dealCount++;
            }
        });

        return {
            total_commissions_paid: totalPaid,
            pending_commissions: totalPending,
            avg_commission_rate: list.length > 0 ? (totalRate / list.length).toFixed(1) : 0,
            deal_completed: dealCount
        };
    }, [commissionData, isPartner]);

    const statisticsConfig = useMemo(() => [
        { title: "Total Commissions Paid", value: statistics.total_commissions_paid, icon: "ri-money-dollar-circle-line", colorVariant: "secondary", isCurrency: true },
        { title: "Pending Commissions", value: statistics.pending_commissions, icon: "ri-time-line", colorVariant: "warning", isCurrency: true },
        { title: "Avg Commission Rate", value: statistics.avg_commission_rate, icon: "ri-percent-line", colorVariant: "info", isPercent: true },
        { title: "Deal Completed", value: statistics.deal_completed, icon: "ri-group-line", colorVariant: "success" }
    ], [statistics]);

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

    // Load partners for dropdown filter on mount (only for non-partner users)
    useEffect(() => {
        // Skip fetching partners if user is a partner (they won't see the filter)
        if (isPartner) return;

        const loadPartnersList = async () => {
            try {
                const result = await fetchPartners();
                if (result.status) {
                    setPartnersList((result.data || []).map((p: any) => ({
                        label: p.company_name || p.full_name,
                        value: p.id
                    })));
                }
            } catch (err) {
                console.error('Failed to load partners list:', err);
            }
        };
        loadPartnersList();
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

    // Currency Formatter
    const formatCurrency = useCallback((amount: number | string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }).format(Number(amount) || 0);
    }, []);

    // Template body
    const statusBodyTemplate = (rowData: CommissionListItem) => {
        const className = COMMISSION_STATUS_CLASS_MAP[rowData.commission_status?.toLowerCase()] || 'bg-light text-body';
        return <span className={`badge ${className} text-uppercase px-2`}>{rowData.commission_status}</span>;
    };

    // Payment Status Template body
    const paymentStatusBodyTemplate = (rowData: CommissionListItem) => {
        const className = PAYMENT_STATUS_CLASS_MAP[rowData.payment_status?.toLowerCase()] || 'bg-light text-body';
        return <span className={`badge ${className} text-uppercase px-2`}>{rowData.payment_status}</span>;
    };

    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Header Section */}
                <div className="row mb-3 pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
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
                                                    showClear
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
                                                showClear
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
                                                showClear
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
                                </form>

                                {isLoading ? (
                                    <TableLoader rows={10} columns={new Array(8).fill({ style: { minWidth: '100px' } })} />
                                ) : (
                                    <div className="table-responsive table-card mt-1">
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
                                            {!isPartner && <Column field="partner" header="Partner" sortable style={{ minWidth: '150px' }} />}
                                            <Column field="commission_status" header="Status" body={statusBodyTemplate} sortable style={{ minWidth: '110px' }} />
                                            <Column header="Requested Amount" field="requested_amount" body={(rowData: CommissionListItem) => formatCurrency(rowData.requested_amount ?? 0)} sortable style={{ minWidth: '140px' }} />
                                            <Column header="Funded Amount" field="funded_amount" body={(rowData: CommissionListItem) => formatCurrency(rowData.funded_amount ?? 0)} sortable style={{ minWidth: '140px' }} />
                                            {!isPartner && <Column header="Admin Comm." field="admin_commission_amount" body={(rowData: CommissionListItem) => formatCurrency(rowData.admin_commission_amount ?? 0)} sortable style={{ minWidth: '140px' }} />}
                                            <Column header="Partner Comm." field="partner_commission_amount" body={(rowData: CommissionListItem) => formatCurrency(rowData.partner_commission_amount ?? 0)} sortable style={{ minWidth: '140px' }} />
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
