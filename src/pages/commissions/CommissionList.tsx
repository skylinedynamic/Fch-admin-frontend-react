import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';

import StatisticsCard from '../../components/Common/StatisticsCard';
import TableLoader from '../../components/Loader/TableLoader';
import { useCommissions } from '../../modules/commission/queries';
import { Commission } from '../../modules/commission/types';

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

const DEMO_STATS = {
  total_commissions_paid: 0,
  pending_commissions: 0,
  avg_commission_rate: 0,
  active_advisors: 0
};

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

    // Stats state (Assuming stats might come from elsewhere or we use demo/meta for now)
    const [stats, setStats] = useState(DEMO_STATS);

    // Construct Payload for React Query
    const queryPayload = {
         search_text: appliedFilters.searchText,
         partner_id: appliedFilters.selectedPartner,
         status: appliedFilters.selectedStatus,
         payment_status: appliedFilters.selectedPaymentStatus,
         date_range: appliedFilters.dateRange,
         page,
         per_page: perPage,
         sort_field: sortField,
         sort_order: sortOrder === 'asc' ? 'asc' : (sortOrder === 'desc' ? 'desc' : '')
    };

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
        const nextPerPage = event.rows;
        const nextPage = Math.floor(event.first / event.rows) + 1;
        setPerPage(nextPerPage);
        setPage(nextPage);
    };

    // Sort handler
    const onSort = (event: any) => {
        const field = event.sortField;
        const order = event.sortOrder === 1 ? 'asc' : 'desc';
        setSortField(field);
        setSortOrder(order);
    };

    // Template body
    const statusBodyTemplate = (rowData: Commission) => {
        const statusMap: { [key: string]: string } = {
            'pending': 'bg-warning-subtle text-warning',
            'approved': 'bg-success-subtle text-success',
            'declined': 'bg-danger-subtle text-danger'
        };
        const className = statusMap[rowData.commission_status?.toLowerCase()] || 'bg-light text-body';
        return <span className={`badge ${className} text-uppercase`}>{rowData.commission_status}</span>;
    };
    
    // Payment Status Template body
    const paymentStatusBodyTemplate = (rowData: Commission) => {
        const statusMap: { [key: string]: string } = {
            'pending': 'bg-warning-subtle text-warning',
            'paid': 'bg-success-subtle text-success',
            'cancelled': 'bg-danger-subtle text-danger'
        };
        const className = statusMap[rowData.payment_status?.toLowerCase()] || 'bg-light text-body';
        return <span className={`badge ${className} text-uppercase`}>{rowData.payment_status}</span>;
    };

    const statisticsConfig = [
        { title: "Total Commissions Paid", value: stats.total_commissions_paid, icon: "ri-money-dollar-circle-line", colorVariant: "secondary", isCurrency: true },
        { title: "Pending Commissions", value: stats.pending_commissions, icon: "ri-time-line", colorVariant: "warning", isCurrency: true },
        { title: "Avg Commission Rate", value: stats.avg_commission_rate, icon: "ri-percent-line", colorVariant: "info", isPercent: true },
        { title: "Active Advisors", value: stats.active_advisors, icon: "ri-group-line", colorVariant: "success" }
    ];

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
                         let displayValue: string | number = config.value;
                         if (config.isCurrency) {
                             displayValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(Number(config.value));
                         } else if (config.isPercent) {
                             displayValue = `${config.value}%`;
                         }
                         
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
                        <div className="card">
                            <div className="card-body">
                                <form className="table-filter" onSubmit={(e) => {
                                    e.preventDefault();
                                }}>
                                    <div className="row g-3 mb-3">
                                        <div className="col-xxl-2 col-sm-12">
                                            <div className="search-box">
                                                <input
                                                    type="text"
                                                    className="form-control search bg-light border-light"
                                                    placeholder="Search..."
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
                                                placeholder="Partner"
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
                                        <div className="col-xxl-2 col-sm-6">
                                            <Calendar
                                                value={dateRange}
                                                onChange={(e: any) => setDateRange(e.value)}
                                                selectionMode="range"
                                                readOnlyInput
                                                placeholder="Date Range"
                                                className="w-100 employee-filter-dropdown"
                                                showIcon
                                            />
                                        </div>
                                        <div className="col-xxl-2 col-sm-12">
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
                                            scrollHeight="510px"
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
                                            dataKey="id"
                                            rowClassName={() => 'cursor-pointer'}
                                            responsiveLayout="scroll"
                                            className="p-datatable-sm"
                                            emptyMessage="No commissions found"
                                            loading={isFetching}
                                        >
                                            <Column field="date" header="Date" sortable style={{ minWidth: '120px' }} />
                                            <Column field="borrower" header="Borrower" sortable style={{ minWidth: '160px' }} />
                                            <Column field="partner" header="Partner" sortable style={{ minWidth: '160px' }} />
                                            <Column field="commission_status" header="Status" body={statusBodyTemplate} sortable style={{ minWidth: '120px' }} />
                                            <Column header="Funded Amount" field="funded_amount" body={(rowData: Commission) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(rowData.funded_amount) || 0)} sortable style={{ minWidth: '140px' }} />
                                            <Column header="Admin Commission" field="admin_commission_amount" body={(rowData: Commission) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(rowData.admin_commission_amount) || 0)} sortable style={{ minWidth: '150px' }} />
                                            <Column header="Partner Commission" field="partner_commission_amount" body={(rowData: Commission) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(rowData.partner_commission_amount) || 0)} sortable style={{ minWidth: '150px' }} />
                                            <Column field="payment_status" header="Payment Status" body={paymentStatusBodyTemplate} sortable style={{ minWidth: '140px' }} />
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
