import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, DataTableFilterMeta, DataTablePageEvent, DataTableSortEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { FilterMatchMode } from 'primereact/api';
import { toast } from 'react-toastify';
import PageHeader from '../common/PageHeader';
import TableLoader from '../../components/Loader/TableLoader';
import FilterLoader from '../../components/Loader/FilterLoader';
import StatisticsCard from '../../components/Common/StatisticsCard';
import StatisticsCardSkeleton from '../../components/Common/StatisticsCardSkeleton';
import {
    fetchEmbedFormSubmissions,
    convertEmbedFormSubmissionToBorrower,
} from '../../modules/embed-form/services';
import { useAuthStore } from '../../store/auth/authStore';
import { PARTNER_TYPES } from '../../config/partnerTypeOptions';
import EmbedFormConvertModal from './components/EmbedFormConvertModal';
// @ts-ignore
import LeadPaymentModal from '../leads/components/LeadPaymentModal';

const STATUS_OPTIONS = [
    { label: 'New', value: 'new' },
    { label: 'Reviewing', value: 'reviewing' },
    { label: 'Converted', value: 'converted' },
    { label: 'Rejected', value: 'rejected' },
];

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
    const currentUser = useAuthStore((state) => state.user);
    const isHost = Boolean(currentUser?.is_host == 1 || currentUser?.is_host == true);
    const isWLOrCP = currentUser?.partner_type === PARTNER_TYPES.WHITE_LABEL || currentUser?.partner_type === PARTNER_TYPES.CERTIFIED;

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

    // Conversion Modal & Payment Modal states
    const [targetSubmission, setTargetSubmission] = useState<any>(null);
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [conversionLoading, setConversionLoading] = useState(false);

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentBorrowerId, setPaymentBorrowerId] = useState<any>(null);
    const [paymentInvoiceId, setPaymentInvoiceId] = useState<any>(null);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);

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
                const total = res.data?.meta?.total ?? res.data?.total ?? data.length;
                setSubmissions(data);
                setTotalRecords(total);

                const backendStats = res.data?.meta?.stats || res.data?.stats;
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
                const data = res.data?.data || res.data || {};
                const borrowerId = data.id || data.borrower_id || data.borrower?.id;
                const invoiceId = data.invoice_id;
                const amount = Number(payload.payment_amount || payload.enrollment_amount || data.payment_amount || 0);

                setSubmissions(prev => prev.map(s => s.id === targetSubmission.id ? { ...s, status: 'converted' } : s));
                setStats(prev => ({
                    ...prev,
                    converted_count: prev.converted_count + 1,
                }));

                setShowConvertModal(false);

                if (!isHost && !isWLOrCP && borrowerId && amount > 0 && !payload.is_free_trail) {
                    setPaymentBorrowerId(borrowerId);
                    setPaymentInvoiceId(invoiceId);
                    setPaymentAmount(amount);
                    setShowPaymentModal(true);
                    toast.success(res?.message || "Borrower created. Please complete the enrollment payment.");
                } else {
                    toast.success(res?.message || 'Submission successfully converted to Borrower!');
                }
            } else {
                toast.error(res?.message || 'Failed to convert to borrower.');
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.message || 'Failed to convert to borrower.');
        } finally {
            setConversionLoading(false);
        }
    };

    const handlePaymentSuccess = () => {
        setShowPaymentModal(false);
        toast.success("Payment completed successfully!");
        loadData();
    };

    // ── Table Column Templates ──
    const applicantBodyTemplate = (rowData: any) => {
        const initials = `${rowData.first_name?.[0] || ''}${rowData.last_name?.[0] || ''}`.toUpperCase() || 'AP';
        return (
            <div className="d-flex align-items-center gap-2">
                <div className="avatar-xs flex-shrink-0 d-flex align-items-center justify-content-center bg-primary-subtle text-primary rounded-circle fw-bold fs-12">
                    {initials}
                </div>
                <div className="min-w-0">
                    <span className="fw-medium text-dark fs-13 d-block text-truncate">
                        {rowData.first_name} {rowData.last_name}
                    </span>
                    {rowData.occupation ? (
                        <span className="text-muted fs-11 d-block text-truncate">{rowData.occupation}</span>
                    ) : (
                        <span className="text-muted fs-11">Applicant</span>
                    )}
                </div>
            </div>
        );
    };

    const contactBodyTemplate = (rowData: any) => {
        return (
            <div>
                <div className="text-dark fs-13 text-truncate" title={rowData.email}>
                    <i className="ri-mail-line text-muted me-1 fs-12" />
                    {rowData.email || '—'}
                </div>
                {rowData.phone && (
                    <div className="text-muted fs-11 mt-0.5">
                        <i className="ri-phone-line me-1 fs-11" />
                        {rowData.phone}
                    </div>
                )}
            </div>
        );
    };

    const amountBodyTemplate = (rowData: any) => {
        const amount = rowData.desired_funding_amount_formatted
            ? rowData.desired_funding_amount_formatted
            : rowData.desired_funding_amount
            ? `$${parseFloat(rowData.desired_funding_amount).toLocaleString()}`
            : '—';

        return (
            <div>
                <div className="fw-semibold text-success fs-13">{amount}</div>
                {rowData.credit_score && (
                    <div className="text-muted fs-11">Score: {rowData.credit_score}</div>
                )}
            </div>
        );
    };

    const statusBodyTemplate = (rowData: any) => {
        const statusMap: Record<string, string> = {
            new: 'bg-primary-subtle text-primary',
            reviewing: 'bg-warning-subtle text-warning',
            converted: 'bg-success-subtle text-success',
            rejected: 'bg-danger-subtle text-danger',
        };
        const className = statusMap[rowData.status?.toLowerCase()] || 'bg-light text-body';
        return <span className={`badge ${className} px-2.5 py-1 rounded-pill text-uppercase fs-11`}>{rowData.status}</span>;
    };

    const docsBodyTemplate = (rowData: any) => {
        const count = rowData.attachments?.length ?? 0;
        return (
            <span className="text-muted fs-12">
                <i className="ri-attachment-line me-1 text-primary" />
                {count} {count === 1 ? 'file' : 'files'}
            </span>
        );
    };

    const dateBodyTemplate = (rowData: any) => {
        return (
            <div className="text-muted fs-12">
                <i className="ri-calendar-line me-1 fs-11" />
                {rowData.created_at ? new Date(rowData.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
            </div>
        );
    };

    const actionBodyTemplate = (rowData: any) => {
        const isConverted = rowData.status === 'converted';
        return (
            <div className="d-flex align-items-center justify-content-center">
                {isConverted ? (
                    <span className="badge bg-success-subtle text-success fs-11 px-2.5 py-1 rounded-pill text-nowrap d-inline-flex align-items-center gap-1">
                        <i className="ri-checkbox-circle-fill" /> Converted
                    </span>
                ) : (
                    <button
                        type="button"
                        className="btn btn-sm btn-soft-success d-inline-flex align-items-center gap-1 fs-12 fw-semibold px-2.5 py-1 text-nowrap"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenConvertModal(rowData);
                        }}
                        title="Convert this applicant to a Borrower"
                    >
                        <i className="ri-user-add-line" />
                        <span className="text-nowrap">Convert to Borrower</span>
                    </button>
                )}
            </div>
        );
    };

    const statisticsConfig = [
        { title: 'Total Submissions', count: stats.total, icon: 'ri-file-list-3-line', colorVariant: 'primary' },
        { title: 'New Applications', count: stats.new_count, icon: 'ri-flashlight-line', colorVariant: 'warning' },
        { title: 'In Review', count: stats.reviewing_count, icon: 'ri-time-line', colorVariant: 'info' },
        { title: 'Converted', count: stats.converted_count, icon: 'ri-user-follow-line', colorVariant: 'success' },
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
                    title="Form Submissions"
                    breadcrumbs={[
                        { label: 'Embedded Form', path: '/embed-form/settings' },
                        { label: 'Submissions' },
                    ]}
                >
                    <div className="btn-group">
                        <button
                            type="button"
                            className="btn btn-primary fw-medium waves-effect waves-light"
                            onClick={() => navigate('/embed-form/settings')}
                        >
                            <i className="ri-settings-4-line me-1 align-bottom" /> Form Settings
                        </button>
                    </div>
                </PageHeader>

                {/* Statistics Cards Row mirrored from Partners.jsx */}
                <div className="row embed-stats-section partner-section">
                    {loading && !submissions.length ? (
                        [1, 2, 3, 4].map((i) => <StatisticsCardSkeleton key={i} />)
                    ) : (
                        statisticsConfig.map((config, index) => (
                            <StatisticsCard
                                key={index}
                                title={config.title}
                                count={config.count}
                                icon={config.icon}
                                colorVariant={config.colorVariant}
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
                                                if (!isButton) navigate(`/embed-form/submissions/${e.data.id}`);
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
                                                style={{ width: '180px', minWidth: '180px' }}
                                            />
                                        </DataTable>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Conversion Confirmation & Plan Modal */}
                <EmbedFormConvertModal
                    show={showConvertModal}
                    onHide={() => setShowConvertModal(false)}
                    onConfirm={handleConvertConfirm}
                    submission={targetSubmission}
                    loading={conversionLoading}
                    isHost={isHost}
                />

                {/* Non-Host Borrower Payment Modal */}
                <LeadPaymentModal
                    show={showPaymentModal}
                    onHide={() => setShowPaymentModal(false)}
                    amount={paymentAmount}
                    lead={{
                        contact_person: targetSubmission
                            ? `${targetSubmission.first_name || ''} ${targetSubmission.last_name || ''}`.trim()
                            : 'Borrower',
                        email: targetSubmission?.email,
                        phone_number: targetSubmission?.phone,
                        partner_id: targetSubmission?.partner_id,
                        invoice_id: paymentInvoiceId,
                        entity_type: 'Borrower',
                    }}
                    borrowerId={paymentBorrowerId}
                    invoiceId={paymentInvoiceId}
                    onPaymentSuccess={handlePaymentSuccess}
                    loading={conversionLoading}
                />
            </div>
        </div>
    );
}
