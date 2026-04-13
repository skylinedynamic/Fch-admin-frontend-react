import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from '../../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { toast } from 'react-toastify';
import TableLoader from '../../../components/Loader/TableLoader';
import { useChangeRequests, useUpdateChangeRequestStatus } from '../../../modules/change-request';
import type { ChangeRequest, ChangeRequestStatus } from '../../../modules/change-request';
import { fetchPartners, fetchBorrowers } from '../../../modules/partner/services';
import {
    CHANGE_REQUEST_STATUS,
    CHANGE_REQUEST_STATUS_OPTIONS,
    CHANGE_REQUEST_STATUS_CLASS_MAP
} from '../../../config/borrower';
import StatisticsCard from '../../../components/Common/StatisticsCard';
import StatisticsCardSkeleton from '../../../components/Common/StatisticsCardSkeleton';

const STATUS_OPTIONS = [
    { label: 'All Status', value: '' },
    ...CHANGE_REQUEST_STATUS_OPTIONS
];

export default function ChangeRequests() {
    // ── Filter state ─────────────────────────────────────────────────
    const [search, setSearch] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedPartnerId, setSelectedPartnerId] = useState<number | ''>('');
    const [selectedBorrowerId, setSelectedBorrowerId] = useState<number | ''>('');

    // Applied (what hits the API)
    const [applied, setApplied] = useState({ search: '', status: '', partner_id: '', borrower_id: '' });

    // Dropdown data
    const [partners, setPartners] = useState<{ label: string; value: number }[]>([]);
    const [borrowers, setBorrowers] = useState<{ label: string; value: number }[]>([]);
    const [loadingPartners, setLoadingPartners] = useState(false);
    const [loadingBorrowers, setLoadingBorrowers] = useState(false);

    // Pagination
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(15);

    // Sorting & Advanced Filters
    const [sortField, setSortField] = useState<string | undefined>(undefined);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filters, setFilters] = useState<any>(null);

    // Review modal
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState<ChangeRequest | null>(null);
    const [reviewStatus, setReviewStatus] = useState<ChangeRequestStatus>('Approved');
    const [reviewNote, setReviewNote] = useState('');
    const [animateShow, setAnimateShow] = useState(false);

    const { mutate: updateStatus, isPending: isUpdating } = useUpdateChangeRequestStatus();

    const { data: apiResponse, isLoading, isFetching } = useChangeRequests({
        page,
        per_page: perPage,
        search: applied.search || undefined,
        status: applied.status || undefined,
        partner_id: applied.partner_id || undefined,
        borrower_id: applied.borrower_id || undefined,
        sort_field: sortField,
        sort_order: sortOrder,
    });

    const records: ChangeRequest[] = apiResponse?.data || [];
    const totalRecords = apiResponse?.meta?.total || 0;
    const statistics = (apiResponse as any)?.statistics || {};
    const loading = isLoading || isFetching;

    // ── Load partners once ────────────────────────────────────────────
    useEffect(() => {
        setLoadingPartners(true);
        fetchPartners({ per_page: 500 })
            .then((res: any) => {
                const list = res?.data || [];
                setPartners(list.map((p: any) => ({
                    label: p.full_name && p.company_name
                        ? `${p.full_name} (${p.company_name})`
                        : (p.company_name || p.full_name || `Partner #${p.id}`),
                    value: p.id
                })));
            })
            .catch(() => { })
            .finally(() => setLoadingPartners(false));
    }, []);

    // ── Load borrowers (optionally filtered by partner) ──────────────
    useEffect(() => {
        setSelectedBorrowerId('');
        setLoadingBorrowers(true);
        fetchBorrowers({ partner_id: selectedPartnerId || undefined, per_page: 500 })
            .then((res: any) => {
                const list = res?.data || [];
                setBorrowers(list.map((b: any) => ({
                    label: b.full_name && b.business_name
                        ? `${b.full_name} (${b.business_name})`
                        : (b.business_name || b.full_name || `Borrower #${b.id}`),
                    value: b.id
                })));
            })
            .catch(() => { })
            .finally(() => setLoadingBorrowers(false));
    }, [selectedPartnerId]);

    // ── Filter handlers ───────────────────────────────────────────────
    const handleApply = () => {
        setApplied({
            search: search,
            status: selectedStatus,
            partner_id: selectedPartnerId as any,
            borrower_id: selectedBorrowerId as any,
        });
        setPage(1);
    };

    const handleClear = () => {
        setSearch('');
        setSelectedStatus('');
        setSelectedPartnerId('');
        setSelectedBorrowerId('');
        setBorrowers([]);
        setApplied({ search: '', status: '', partner_id: '', borrower_id: '' });
        setPage(1);
    };

    const onPage = (e: any) => {
        setPerPage(e.rows);
        setPage(Math.floor(e.first / e.rows) + 1);
    };

    const onSort = (e: any) => {
        setSortField(e.sortField);
        setSortOrder(e.sortOrder === 1 ? 'asc' : 'desc');
    };

    const onFilter = (e: any) => {
        setFilters(e.filters);
        setPage(1);
    };

    // ── Modal ─────────────────────────────────────────────────────────
    const openReviewModal = (row: ChangeRequest) => {
        setSelectedRow(row);
        setReviewStatus(row.status === CHANGE_REQUEST_STATUS.PENDING ? (CHANGE_REQUEST_STATUS.APPROVED as ChangeRequestStatus) : (row.status as ChangeRequestStatus));
        setReviewNote('');
        setModalOpen(true);
        setTimeout(() => setAnimateShow(true), 10);
    };

    const handleCloseModal = () => {
        setAnimateShow(false);
        setTimeout(() => {
            setModalOpen(false);
            setSelectedRow(null);
        }, 150);
    };

    const handleSubmitReview = () => {
        if (!selectedRow) return;
        updateStatus({ id: selectedRow.id, payload: { status: reviewStatus, note: reviewNote } }, {
            onSuccess: (res) => {
                if (res.status) {
                    toast.success(res.message || 'Status updated');
                    handleCloseModal();
                } else {
                    toast.error(res.message || 'Failed to update');
                }
            },
            onError: () => toast.error('Something went wrong'),
        });
    };

    // ── Column templates ──────────────────────────────────────────────
    const borrowerBody = (row: ChangeRequest) => {
        const businessName = row.borrower_business_name;
        const firstName = row.borrower_first_name;
        const lastName = row.borrower_last_name;

        if (!businessName && !firstName && !lastName) return <span className="text-muted">—</span>;

        const name = businessName || `${firstName ?? ''} ${lastName ?? ''}`.trim() || '—';
        return (
            <div>
                <div className="fw-medium">{name}</div>
                {businessName && (firstName || lastName) && (
                    <small className="text-muted">{`${firstName ?? ''} ${lastName ?? ''}`.trim()}</small>
                )}
            </div>
        );
    };

    const fieldBody = (row: ChangeRequest) => (
        <code className="bg-light rounded px-2 py-1 text-primary small">{row.field_name.replace(/_/g, ' ')}</code>
    );

    const oldValueBody = (row: ChangeRequest) => (
        <span className="text-danger text-decoration-line-through">
            {row.old_value || <span className="text-muted fst-italic">empty</span>}
        </span>
    );

    const newValueBody = (row: ChangeRequest) => (
        <span className="fw-medium text-success">
            {row.new_value || <span className="text-muted fst-italic">empty</span>}
        </span>
    );

    const statusBody = (row: ChangeRequest) => (
        <span className={`badge ${(row.status && CHANGE_REQUEST_STATUS_CLASS_MAP[row.status]) || 'bg-secondary-subtle text-secondary'}`}>
            {row.status}
        </span>
    );

    const noteBody = (row: ChangeRequest) => (
        row.note
            ? <span className="text-muted small" title={row.note}>{row.note.length > 40 ? row.note.slice(0, 40) + '…' : row.note}</span>
            : <span className="text-muted fst-italic small">—</span>
    );

    const dateBody = (row: ChangeRequest) => (
        <span className="text-muted small">
            {new Date(row.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
        </span>
    );


    return (
        <div className="page-content">
            <div className="container-fluid">

                {/* Page Header */}
                <div className="row pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between py-2">
                            <div>
                                <h4 className="fs-20 mb-1">Change Requests</h4>
                                <nav aria-label="breadcrumb" className="d-none d-sm-block">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item">Intake &amp; Review</li>
                                        <li className="breadcrumb-item active">Change Requests</li>
                                    </ol>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="row">
                    {loading ? (
                        [1, 2, 3, 4].map(i => <StatisticsCardSkeleton key={i} />)
                    ) : (
                        [
                            { title: 'Total Requests', icon: 'ri-swap-box-line', colorVariant: 'primary', value: statistics.total_requests || 0 },
                            { title: 'Pending', icon: 'ri-time-line', colorVariant: 'warning', value: statistics.pending_requests || 0 },
                            { title: 'Approved', icon: 'ri-checkbox-circle-line', colorVariant: 'success', value: statistics.approved_requests || 0 },
                            { title: 'Rejected', icon: 'ri-close-circle-line', colorVariant: 'danger', value: statistics.rejected_requests || 0 },
                        ].map((card, i) => (
                            <StatisticsCard
                                key={i}
                                title={card.title}
                                count={card.value}
                                icon={card.icon}
                                colorVariant={card.colorVariant}
                            />
                        ))
                    )}
                </div>

                {/* Table Card */}
                <div className="row">
                    <div className="col-12">
                        <div className="card shadow-sm">
                            <div className="card-body">

                                {/* Filters */}
                                <div className="row g-3 mb-3 align-items-end">

                                    {/* Search */}
                                    <div className="col-xxl-3 col-md-6">
                                        <div className="search-box">
                                            <input
                                                type="text"
                                                className="form-control search bg-light border-light"
                                                placeholder="Search borrower name..."
                                                value={search}
                                                onChange={e => setSearch(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleApply()}
                                            />
                                            <i className="ri-search-line search-icon"></i>
                                        </div>
                                    </div>

                                    {/* Partner */}
                                    <div className="col-xxl-2 col-md-6">
                                        <Dropdown
                                            value={selectedPartnerId}
                                            options={[{ label: 'All Partners', value: '' }, ...partners]}
                                            optionLabel="label"
                                            optionValue="value"
                                            onChange={e => setSelectedPartnerId(e.value)}
                                            placeholder={loadingPartners ? 'Loading…' : 'All Partners'}
                                            disabled={loadingPartners}
                                            filter
                                            className="w-100 employee-filter-dropdown"
                                        />
                                    </div>

                                    {/* Borrower (cascades from partner) */}
                                    <div className="col-xxl-2 col-md-6">
                                        <Dropdown
                                            value={selectedBorrowerId}
                                            options={[{ label: 'All Borrowers', value: '' }, ...borrowers]}
                                            optionLabel="label"
                                            optionValue="value"
                                            onChange={e => setSelectedBorrowerId(e.value)}
                                            placeholder={loadingBorrowers ? 'Loading…' : 'All Borrowers'}
                                            disabled={loadingBorrowers}
                                            filter
                                            className="w-100 employee-filter-dropdown"
                                        />
                                    </div>

                                    {/* Status */}
                                    <div className="col-xxl-2 col-md-6">
                                        <Dropdown
                                            value={selectedStatus}
                                            options={STATUS_OPTIONS}
                                            optionLabel="label"
                                            optionValue="value"
                                            onChange={e => setSelectedStatus(e.value)}
                                            placeholder="All Status"
                                            className="w-100 employee-filter-dropdown"
                                        />
                                    </div>

                                    {/* Buttons */}
                                    <div className="col-xxl-3 col-md-12">
                                        <div className="d-flex gap-2">
                                            <button type="button" className="btn btn-warning flex-grow-1" onClick={handleApply}>
                                                <i className="ri-equalizer-fill me-1 align-bottom"></i> Filter
                                            </button>
                                            <button type="button" className="btn btn-light flex-grow-1" onClick={handleClear}>
                                                <i className="ri-close-line me-1 align-bottom"></i> Clear
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {loading ? (
                                    <TableLoader rows={10} columns={new Array(7).fill({ style: { minWidth: '120px' } })} />
                                ) : (
                                    <div className="table-responsive table-card mt-1">
                                        <DataTable
                                            scrollable
                                            scrollHeight="520px"
                                            value={records}
                                            paginator
                                            lazy
                                            totalRecords={totalRecords}
                                            first={(page - 1) * perPage}
                                            rows={perPage}
                                            rowsPerPageOptions={[10, 15, 25, 50, 100]}
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
                                            onRowClick={(e: any) => openReviewModal(e.data as ChangeRequest)}
                                            responsiveLayout="scroll"
                                            className="p-datatable-sm"
                                            emptyMessage="No change requests found."
                                        >
                                            <Column header="Borrower" field="borrower_business_name" body={borrowerBody} sortable style={{ minWidth: '180px' }} />
                                            <Column header="Field" field="field_name" body={fieldBody} sortable style={{ minWidth: '160px' }} />
                                            <Column header="Old Value" field="old_value" body={oldValueBody} sortable style={{ minWidth: '150px' }} />
                                            <Column header="New Value" field="new_value" body={newValueBody} sortable style={{ minWidth: '150px' }} />
                                            <Column header="Status" field="status" body={statusBody} sortable style={{ minWidth: '110px' }} />
                                            <Column header="Note" field="note" body={noteBody} sortable style={{ minWidth: '180px' }} />
                                            <Column header="Date" field="created_at" body={dateBody} sortable style={{ minWidth: '120px' }} />
                                        </DataTable>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Review Modal ──────────────────────────────────────────── */}
            {modalOpen && selectedRow && (
                <>
                    <div className={`modal fade flip ${animateShow ? 'show' : ''} d-block`} tabIndex={-1} role="dialog" aria-modal="true">
                        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 520 }}>
                            <div className="modal-content border-0 shadow-lg">
                                <div className="modal-header border-bottom-0 pb-0">
                                    <div>
                                        <h5 className="modal-title fw-semibold">Review Change Request</h5>
                                        <p className="text-muted fs-13 mb-0">
                                            <code>{selectedRow.field_name.replace(/_/g, ' ')}</code>
                                            {' — '}
                                            {selectedRow.borrower_business_name
                                                || `${selectedRow.borrower_first_name ?? ''} ${selectedRow.borrower_last_name ?? ''}`.trim()
                                                || '—'}
                                        </p>
                                        {selectedRow.status !== CHANGE_REQUEST_STATUS.PENDING && (
                                            <div className="mt-1">
                                                <span className={`badge ${(selectedRow.status && CHANGE_REQUEST_STATUS_CLASS_MAP[selectedRow.status]) || 'bg-secondary-subtle text-secondary'} fs-11`}>
                                                    {selectedRow.status}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <button type="button" className="btn-close" onClick={handleCloseModal} />
                                </div>
                                <div className="modal-body pt-3">
                                    {selectedRow.status !== CHANGE_REQUEST_STATUS.PENDING && (
                                        <div className="alert alert-light border-0 shadow-sm mb-4 d-flex align-items-center">
                                            <div className="flex-grow-1">
                                                <div className="text-muted fs-11 text-uppercase fw-semibold mb-1" style={{ letterSpacing: '0.05em' }}>Review Summary</div>
                                                <div className="fs-13 fw-medium text-primary">
                                                    Processed by <span className="text-muted">{selectedRow.updater_name || 'System'}</span>
                                                </div>
                                                <div className="text-muted fs-12 mt-1">
                                                    <i className="ri-calendar-event-line me-1"></i>
                                                    {new Date(selectedRow.updated_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Old vs New */}
                                    <div className="row g-3 mb-4">
                                        <div className="col-6">
                                            <div className="p-3 rounded bg-danger-subtle">
                                                <p className="text-muted fs-11 mb-1 text-uppercase fw-semibold" style={{ letterSpacing: '0.08em' }}>
                                                    Current Value
                                                </p>
                                                <p className="mb-0 fw-medium text-danger text-decoration-line-through">
                                                    {selectedRow.old_value || <span className="fst-italic text-muted fw-normal">empty</span>}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="col-6">
                                            <div className="p-3 rounded bg-success-subtle">
                                                <p className="text-muted fs-11 mb-1 text-uppercase fw-semibold" style={{ letterSpacing: '0.08em' }}>
                                                    Requested Value
                                                </p>
                                                <p className="mb-0 fw-semibold text-success">
                                                    {selectedRow.new_value || <span className="fst-italic text-muted fw-normal">empty</span>}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Decision */}
                                    <div className="mb-3">
                                        <label className="form-label fw-medium">Decision <span className="text-danger">*</span></label>
                                        <div className="d-flex gap-2">
                                            {([CHANGE_REQUEST_STATUS.APPROVED, CHANGE_REQUEST_STATUS.REJECTED] as ChangeRequestStatus[]).map(s => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    disabled={selectedRow.status !== CHANGE_REQUEST_STATUS.PENDING}
                                                    className={`btn flex-grow-1 ${reviewStatus === s
                                                        ? s === CHANGE_REQUEST_STATUS.APPROVED ? 'btn-success' : 'btn-danger'
                                                        : 'btn-light'
                                                        }`}
                                                    onClick={() => setReviewStatus(s)}
                                                >
                                                    <i className={`${s === CHANGE_REQUEST_STATUS.APPROVED ? 'ri-checkbox-circle-line' : 'ri-close-circle-line'} me-1`}></i>
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Note */}
                                    <div className="mb-1">
                                        <label className="form-label fw-medium">
                                            Note {reviewStatus === CHANGE_REQUEST_STATUS.REJECTED && <span className="text-danger">*</span>}
                                        </label>
                                        <textarea
                                            className="form-control"
                                            rows={3}
                                            placeholder={reviewStatus === CHANGE_REQUEST_STATUS.REJECTED
                                                ? 'Please provide a reason for rejection…'
                                                : 'Optional note…'}
                                            value={reviewNote || (selectedRow.status !== CHANGE_REQUEST_STATUS.PENDING ? (selectedRow.note || '') : '')}
                                            onChange={e => setReviewNote(e.target.value)}
                                            autoFocus={selectedRow.status === CHANGE_REQUEST_STATUS.PENDING}
                                            disabled={selectedRow.status !== CHANGE_REQUEST_STATUS.PENDING}
                                        />
                                    </div>
                                    {reviewStatus === CHANGE_REQUEST_STATUS.REJECTED && !reviewNote.trim() && selectedRow.status === CHANGE_REQUEST_STATUS.PENDING && (
                                        <small className="text-danger">A note is required when rejecting.</small>
                                    )}
                                </div>

                                <div className="modal-footer border-top-0 pt-0">
                                    <button type="button" className="btn btn-light" onClick={handleCloseModal}>
                                        {selectedRow.status !== CHANGE_REQUEST_STATUS.PENDING ? 'Close' : 'Cancel'}
                                    </button>
                                    {selectedRow.status === CHANGE_REQUEST_STATUS.PENDING && (
                                        <button
                                            type="button"
                                            className={`btn px-4 ${reviewStatus === CHANGE_REQUEST_STATUS.APPROVED ? 'btn-success' : 'btn-danger'}`}
                                            disabled={isUpdating || (reviewStatus === CHANGE_REQUEST_STATUS.REJECTED && !reviewNote.trim())}
                                            onClick={handleSubmitReview}
                                        >
                                            {isUpdating ? (
                                                <><span className="spinner-border spinner-border-sm me-1" role="status" /> Processing…</>
                                            ) : (
                                                <><i className={`${reviewStatus === CHANGE_REQUEST_STATUS.APPROVED ? 'ri-checkbox-circle-line' : 'ri-close-circle-line'} me-1`}></i> Confirm {reviewStatus}</>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className={`modal-backdrop fade ${animateShow ? 'show' : ''}`} onClick={handleCloseModal} />
                </>
            )}
        </div>
    );
}
