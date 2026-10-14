import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, DataTableFilterMeta, DataTablePageEvent, DataTableSortEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { FilterMatchMode } from 'primereact/api';
import { toast } from 'react-toastify';
import PageHeader from '../common/PageHeader';
import { usePermissions } from '../../lib/auth/usePermissions';
import TableLoader from '../../components/Loader/TableLoader';
import FilterLoader from '../../components/Loader/FilterLoader';
import StatisticsCard from '../../components/Common/StatisticsCard';
import StatisticsCardSkeleton from '../../components/Common/StatisticsCardSkeleton';
import {
    fetchEmbedFormSubmissions,
    convertEmbedFormSubmissionToBorrower,
} from '../../modules/embed-form/services';
// @ts-ignore
import EmbedFormConvertModal from './components/EmbedFormConvertModal';

const STATUS_OPTIONS = [
    { label: 'New', value: 'new' },
    { label: 'Reviewing', value: 'reviewing' },
    { label: 'Converted', value: 'converted' },
    { label: 'Rejected', value: 'rejected' },
];

const STATUS_META: Record<string, { label: string; badge: string; icon: string }> = {
    new: { label: 'New', badge: 'bg-primary-subtle text-primary', icon: 'ri-flashlight-line' },
    reviewing: { label: 'Reviewing', badge: 'bg-warning-subtle text-warning', icon: 'ri-time-line' },
    converted: { label: 'Converted', badge: 'bg-success-subtle text-success', icon: 'ri-checkbox-circle-line' },
    rejected: { label: 'Rejected', badge: 'bg-danger-subtle text-danger', icon: 'ri-close-circle-line' },
};


const relativeTime = (value: string) => {
    const then = new Date(value).getTime();
    if (Number.isNaN(then)) return '';
    const minutes = Math.round((Date.now() - then) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.round(days / 30);
    return months < 12 ? `${months}mo ago` : `${Math.round(months / 12)}y ago`;
};

const extractValue = (val: any) => {
    if (val === undefined || val === null || val === '') return undefined;
    if (typeof val === 'object' && val !== null && 'value' in val) return val.value;
    return val;
};

const formatDateLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function EmbedFormSubmissions() {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();

    const [submissions, setSubmissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);

    // Sorting state
    const [sortField, setSortField] = useState<string>('id');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Filter states
    const [searchText, setSearchText] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [dateRange, setDateRange] = useState<any>(null);

    // Applied filter states
    const [appliedSearchText, setAppliedSearchText] = useState('');
    const [appliedStatus, setAppliedStatus] = useState<string>('');
    const [appliedDateRange, setAppliedDateRange] = useState<any>(null);
    const [filters, setFilters] = useState<DataTableFilterMeta>({
        first_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
        email: { value: null, matchMode: FilterMatchMode.CONTAINS },
        phone: { value: null, matchMode: FilterMatchMode.CONTAINS },
        status: { value: null, matchMode: FilterMatchMode.EQUALS },
    });

    // Free trial conversion modal state
    const [targetSubmission, setTargetSubmission] = useState<any>(null);
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [existingBorrower, setExistingBorrower] = useState<any>(null);
    const [conversionLoading, setConversionLoading] = useState(false);

    // Statistics state
    const [stats, setStats] = useState({
        total: 0,
        new_count: 0,
        reviewing_count: 0,
        converted_count: 0,
    });

    // Add class to body to prevent global scroll
    useEffect(() => {
        document.body.classList.add('table-page-fit-active');
        return () => {
            document.body.classList.remove('table-page-fit-active');
        };
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const payload: any = {
                page,
                per_page: perPage,
                sort_field: sortField,
                sort_order: sortOrder,
            };

            const searchVal = extractValue(appliedSearchText);
            if (searchVal && typeof searchVal === 'string' && searchVal.trim()) {
                payload.search = searchVal.trim();
            }

            const statusVal = extractValue(appliedStatus);
            if (statusVal) {
                payload.status = statusVal;
            }

            if (appliedDateRange && Array.isArray(appliedDateRange) && appliedDateRange[0]) {
                const startDate = formatDateLocal(new Date(appliedDateRange[0]));
                payload.date_from = startDate;
                if (appliedDateRange[1]) {
                    const endDate = formatDateLocal(new Date(appliedDateRange[1]));
                    payload.date_to = endDate;
                }
            }

            const res = await fetchEmbedFormSubmissions(payload);

            if (res.status) {
                const data = res.data?.data || res.data || [];
                // The API answers { status, message, data: [...], meta }, so meta
                // sits beside data, not inside it. Reading it from data left the
                // total at the size of the current page - the cards and the
                // paginator both stopped at ten.
                const total = res.meta?.total ?? res.data?.meta?.total ?? res.data?.total ?? data.length;
                setSubmissions(data);
                setTotalRecords(total);

                const backendStats = res.meta?.stats || res.data?.meta?.stats || res.data?.stats;
                if (backendStats) {
                    setStats(backendStats);
                } else {
                    const newCount = data.filter((s: any) => s.status === 'new').length;
                    const reviewingCount = data.filter((s: any) => s.status === 'reviewing').length;
                    const convertedCount = data.filter((s: any) => s.status === 'converted').length;
                    setStats({
                        total,
                        new_count: newCount,
                        reviewing_count: reviewingCount,
                        converted_count: convertedCount,
                    });
                }
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.message || 'Failed to fetch form submissions');
        } finally {
            setLoading(false);
        }
    }, [appliedSearchText, appliedStatus, appliedDateRange, perPage, page, sortField, sortOrder]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            loadData();
        }, 150);
        return () => clearTimeout(timeout);
    }, [loadData]);

    const handleApplyFilters = () => {
        setAppliedSearchText(searchText);
        setAppliedStatus(selectedStatus);
        setAppliedDateRange(dateRange);
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearchText('');
        setSelectedStatus('');
        setDateRange(null);
        setAppliedSearchText('');
        setAppliedStatus('');
        setAppliedDateRange(null);
        setFilters({
            first_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
            email: { value: null, matchMode: FilterMatchMode.CONTAINS },
            phone: { value: null, matchMode: FilterMatchMode.CONTAINS },
            status: { value: null, matchMode: FilterMatchMode.EQUALS },
        });
        setPage(1);
    };

    const onPage = (event: DataTablePageEvent) => {
        const nextPerPage = event.rows;
        const nextPage = Math.floor((event.first || 0) / event.rows) + 1;
        setPerPage(nextPerPage);
        setPage(nextPage);
    };

    const onSort = (event: DataTableSortEvent) => {
        const field = event.sortField;
        const order = event.sortOrder === 1 ? 'asc' : 'desc';
        setSortField(field || 'id');
        setSortOrder(order);
    };

    const onFilter = (e: any) => {
        setFilters(e.filters);
    };

    const handleOpenConvertModal = (rowData: any) => {
        setTargetSubmission(rowData);
        setShowConvertModal(true);
    };

    const handleConvertConfirm = async (payload: any) => {
        if (!targetSubmission?.id) return;
        setConversionLoading(true);
        try {
            const res = await convertEmbedFormSubmissionToBorrower(targetSubmission.id, payload);
            if (res.status) {
                const previousStatus = targetSubmission.status;
                setSubmissions(prev => prev.map(s => s.id === targetSubmission.id ? { ...s, status: 'converted' } : s));
                setStats(prev => ({
                    ...prev,
                    converted_count: prev.converted_count + 1,
                    new_count: previousStatus === 'new' ? Math.max(prev.new_count - 1, 0) : prev.new_count,
                    reviewing_count: previousStatus === 'reviewing' ? Math.max(prev.reviewing_count - 1, 0) : prev.reviewing_count,
                }));

                setShowConvertModal(false);
                setExistingBorrower(null);
                toast.success(res?.message || 'Submission converted to a Free Plan Borrower!');
            } else {
                toast.error(res?.message || 'Failed to convert to free plan borrower.');
            }
        } catch (err: any) {
            const body = err?.response?.data;
            if (err?.response?.status === 409 && body?.code === 'existing_borrower_confirmation_required') {
                // Show who already exists and let the user confirm before anything is created.
                setExistingBorrower(body?.data?.existing_borrower ?? {});
                return;
            }
            toast.error(body?.message || err?.message || 'Failed to convert to free plan borrower.');
        } finally {
            setConversionLoading(false);
        }
    };

    // ── Table Column Templates ──
    const applicantBodyTemplate = (rowData: any) => {
        const initials = `${rowData.first_name?.[0] || ''}${rowData.last_name?.[0] || ''}`.toUpperCase() || 'AP';
        return (
            <div className="d-flex align-items-center gap-2">
                <div className="ef-avatar ef-avatar--sm flex-shrink-0">{initials}</div>
                <div className="min-w-0">
                    <span className="fw-semibold text-dark fs-13 d-block text-truncate">
                        {rowData.first_name} {rowData.last_name}
                    </span>
                    <span className="text-muted fs-11 d-block text-truncate">
                        {rowData.business_name || rowData.occupation || 'Applicant'}
                        {rowData.submission_uid && (
                            <span className="ef-uid ms-1">#{String(rowData.submission_uid).slice(0, 8)}</span>
                        )}
                    </span>
                </div>
            </div>
        );
    };

    const contactBodyTemplate = (rowData: any) => {
        return (
            <div className="min-w-0">
                <div className="text-dark fs-13 text-truncate" title={rowData.email}>
                    <i className="ri-mail-line text-muted me-1 fs-12" />
                    {rowData.email || '—'}
                </div>
                {rowData.phone && (
                    <div className="text-muted fs-11 text-truncate">
                        <i className="ri-phone-line me-1 fs-11" />
                        {rowData.phone}
                    </div>
                )}
            </div>
        );
    };

    const amountBodyTemplate = (rowData: any) => {
        const rawAmount = rowData.requested_amount ?? rowData.desired_funding_amount;
        const amount =
            rowData.requested_amount_formatted ||
            rowData.desired_funding_amount_formatted ||
            (rawAmount ? `$${parseFloat(rawAmount).toLocaleString()}` : '—');

        // Score and band both come from the API - this screen holds no
        // thresholds of its own, so it can never disagree with the detail page.
        const creditScore = rowData.credit_score_display ?? rowData.credit_score;
        const bandLabel = rowData.credit_score_band_label;
        const bandTone = rowData.credit_score_band_tone || 'secondary';

        return (
            <div>
                <div className="fw-semibold text-success fs-13">{amount}</div>
                {creditScore ? (
                    <span className="d-inline-flex align-items-center gap-1 fs-11">
                        <i className="ri-speed-up-line" /> {creditScore}
                        {bandLabel && (
                            <span className={`badge bg-${bandTone}-subtle text-${bandTone} fs-11`}>{bandLabel}</span>
                        )}
                    </span>
                ) : (
                    <span className="text-muted fs-11">No credit score</span>
                )}
            </div>
        );
    };

    const statusBodyTemplate = (rowData: any) => {
        const meta = STATUS_META[rowData.status?.toLowerCase()] || STATUS_META.new;
        return (
            <span className={`badge ${meta.badge} ef-status-pill`}>
                <i className={meta.icon} /> {meta.label}
            </span>
        );
    };

    const docsBodyTemplate = (rowData: any) => {
        const count = rowData.attachments?.length ?? 0;
        return (
            <span className={`ef-doc-chip ${count ? 'ef-doc-chip--has' : ''}`}>
                <i className={count ? 'ri-attachment-2' : 'ri-file-forbid-line'} />
                {count ? `${count} ${count === 1 ? 'file' : 'files'}` : 'None'}
            </span>
        );
    };

    const dateBodyTemplate = (rowData: any) => {
        if (!rowData.created_at) return <span className="text-muted fs-12">—</span>;
        const date = new Date(rowData.created_at);
        return (
            <div>
                <div className="text-dark fs-13">
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <div className="text-muted fs-11">{relativeTime(rowData.created_at)}</div>
            </div>
        );
    };

    const actionBodyTemplate = (rowData: any) => {
        const isConverted = rowData.status === 'converted';
        return (
            <div className="d-flex align-items-center justify-content-center gap-1">
                {isConverted ? (
                    <span
                        className="badge bg-success-subtle text-success ef-status-pill"
                        title="Already converted to a free plan borrower"
                    >
                        <i className="ri-vip-crown-2-fill" /> Free Plan
                    </span>
                ) : hasPermission('convert application') ? (
                    <button
                        type="button"
                        className="btn btn-sm btn-soft-primary ef-convert-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenConvertModal(rowData);
                        }}
                        title="Convert this applicant to a Free Plan Borrower"
                    >
                        <i className="ri-vip-crown-2-line" />
                        <span>Convert to Free Plan Borrower</span>
                    </button>
                ) : (
                    <span className="text-muted fs-11">—</span>
                )}
            </div>
        );
    };

    const statisticsConfig = [
        { title: 'Total Applications', count: stats.total, icon: 'ri-file-list-3-line', colorVariant: 'primary' },
        { title: 'New Applications', count: stats.new_count, icon: 'ri-flashlight-line', colorVariant: 'warning' },
        { title: 'In Review', count: stats.reviewing_count, icon: 'ri-time-line', colorVariant: 'info' },
        { title: 'Free Plan Borrowers', count: stats.converted_count, icon: 'ri-vip-crown-2-line', colorVariant: 'success' },
    ];

    const filterLoaderConfig = [
        { col: 'col-xxl-3 col-sm-6' }, // Search
        { col: 'col-xxl-3 col-sm-6' }, // Status
        { col: 'col-xxl-3 col-sm-6' }, // Date Range
        { col: 'col-xxl-3 col-sm-6', isButton: true }, // Buttons
    ];

    return (
        <div className="page-content page-content-fit">
            <div className="container-fluid">
                {/* Header Section */}
                <PageHeader
                    title="Loan Applications"
                    breadcrumbs={[
                        { label: 'Embedded Form', path: '/embed-form/settings' },
                        { label: 'Loan Applications' },
                    ]}
                />

                {/* Statistics Cards Row mirrored from Partners.jsx */}
                <div className="row embed-stats-section partner-section">
                    {loading && !submissions.length ? (
                        [1, 2, 3, 4].map((i) => <StatisticsCardSkeleton key={i} colSize="col-xl-3 col-md-6" />)
                    ) : (
                        statisticsConfig.map((config, index) => (
                            <StatisticsCard
                                key={index}
                                title={config.title}
                                count={config.count}
                                icon={config.icon}
                                colorVariant={config.colorVariant}
                                colSize="col-xl-3 col-md-6"
                            />
                        ))
                    )}
                </div>

                {/* Filters and Table mirrored from Partners.jsx */}
                <div className="row row-table-fit">
                    <div className="col-lg-12">
                        <div className="card">
                            <div className="card-body">
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        handleApplyFilters();
                                    }}
                                >
                                    {loading && !submissions.length ? (
                                        <FilterLoader config={filterLoaderConfig} />
                                    ) : (
                                        <div className="row g-3 mb-3">
                                            <div className="col-xxl-3 col-sm-6">
                                                <div className="search-box">
                                                    <input
                                                        type="text"
                                                        className="form-control search bg-light border-light"
                                                        placeholder="Search here..."
                                                        value={searchText}
                                                        onChange={(e) => setSearchText(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                                                    />
                                                    <i className="ri-search-line search-icon" />
                                                </div>
                                            </div>

                                            <div className="col-xxl-3 col-sm-6">
                                                <Dropdown
                                                    value={selectedStatus}
                                                    options={[{ label: 'All Status', value: '' }, ...STATUS_OPTIONS]}
                                                    onChange={(e) => setSelectedStatus(e.value)}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    placeholder="All Status"
                                                    className="w-100 employee-filter-dropdown"
                                                    showClear
                                                />
                                            </div>

                                            <div className="col-xxl-3 col-sm-6">
                                                <div className="search-box">
                                                    <Calendar
                                                        value={dateRange}
                                                        onChange={(e) => setDateRange(e.value)}
                                                        placeholder="Date Range"
                                                        selectionMode="range"
                                                        readOnlyInput
                                                        className="w-100"
                                                        inputClassName="form-control search bg-light border-light"
                                                    />
                                                    <i className="ri-calendar-2-line search-icon" />
                                                </div>
                                            </div>

                                            <div className="col-xxl-3 col-sm-6">
                                                <div className="d-flex gap-2">
                                                    <button
                                                        type="button"
                                                        className="btn btn-warning flex-grow-1"
                                                        onClick={handleApplyFilters}
                                                    >
                                                        <i className="ri-equalizer-fill me-1 align-bottom" /> Filters
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-default flex-grow-1"
                                                        onClick={handleClearFilters}
                                                    >
                                                        <i className="ri-close-line me-1 align-bottom" /> Clear
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </form>

                                {loading && !submissions.length ? (
                                    <TableLoader
                                        rows={10}
                                        columns={new Array(7).fill({ style: { minWidth: '150px' } })}
                                    />
                                ) : (
                                    <div className="table-responsive table-card mt-1">
                                        <DataTable
                                            scrollable
                                            scrollHeight="flex"
                                            value={submissions}
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
                                            onRowClick={(e) => {
                                                const isButton = (e.originalEvent.target as HTMLElement)?.closest('button');
                                                if (!isButton) navigate(`/embed-form/loan-applications/${e.data.id}`);
                                            }}
                                            responsiveLayout="scroll"
                                            className="p-datatable-sm"
                                            emptyMessage="No form submissions found"
                                        >
                                            <Column
                                                field="first_name"
                                                header="Applicant"
                                                body={applicantBodyTemplate}
                                                sortable
                                                filter
                                                filterPlaceholder="Search by applicant"
                                                style={{ minWidth: '220px' }}
                                            />
                                            <Column
                                                field="email"
                                                header="Contact Info"
                                                body={contactBodyTemplate}
                                                sortable
                                                filter
                                                filterPlaceholder="Search by email"
                                                style={{ minWidth: '200px' }}
                                            />
                                            <Column
                                                field="desired_funding_amount"
                                                header="Desired Funding"
                                                body={amountBodyTemplate}
                                                sortable
                                                style={{ minWidth: '160px' }}
                                            />
                                            <Column
                                                header="Documents"
                                                body={docsBodyTemplate}
                                                style={{ minWidth: '120px' }}
                                            />
                                            <Column
                                                field="status"
                                                header="Status"
                                                body={statusBodyTemplate}
                                                sortable
                                                filter
                                                filterPlaceholder="Search by status"
                                                style={{ minWidth: '130px' }}
                                            />
                                            <Column
                                                field="created_at"
                                                header="Date Submitted"
                                                body={dateBodyTemplate}
                                                sortable
                                                style={{ minWidth: '140px' }}
                                            />
                                            <Column
                                                header="Action"
                                                body={actionBodyTemplate}
                                                alignHeader="center"
                                                align="center"
                                                headerClassName="text-center"
                                                bodyClassName="text-center"
                                                style={{ width: '270px', minWidth: '270px' }}
                                            />
                                        </DataTable>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Free Trial Borrower Conversion Modal */}
                <EmbedFormConvertModal
                    show={showConvertModal}
                    onHide={() => { setShowConvertModal(false); setExistingBorrower(null); }}
                    onConfirm={handleConvertConfirm}
                    submission={targetSubmission}
                    loading={conversionLoading}
                    existingBorrower={existingBorrower}
                />

            </div>
        </div>
    );
}
