import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from '../../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { useFundingReviews, useUpdateFundingReviewStatus } from '../../../modules/application';
import { usePermissions } from '../../../lib/auth/usePermissions';
import { useAuthStore } from '../../../store/auth/authStore';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputTextarea } from 'primereact/inputtextarea';
import { toast } from 'react-toastify';

import TableLoader from '../../../components/Loader/TableLoader';

export default function FundingReview() {
    const { hasPermission } = usePermissions();
    const currentUser = useAuthStore((state: any) => state.user)
    const isHost = currentUser?.is_host == 1;

    // Pagination state
    const [page, setPage] = useState<number>(1);
    const [perPage, setPerPage] = useState<number>(10);

    // Sorting state
    const [sortField, setSortField] = useState<string>('id');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Filter states
    const [searchText, setSearchText] = useState<string>('');
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [filters, setFilters] = useState<any>({});

    // Modal state
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [selectedReview, setSelectedReview] = useState<any>(null);
    const [newStatus, setNewStatus] = useState('');
    const [rejectReason, setRejectReason] = useState('');

    const updateStatusMutation = useUpdateFundingReviewStatus();

    // Applied Filters
    const [appliedFilters, setAppliedFilters] = useState<{
        search: string;
        status: string;
        filters: any;
    }>({
        search: '',
        status: '',
        filters: {}
    });

    // API Query
    const queryParams = {
        page,
        per_page: perPage,
        search: appliedFilters.search,
        status: appliedFilters.status,
        sort_field: sortField,
        sort_order: sortOrder,
    };

    const { data: apiResponse, isLoading, isFetching } = useFundingReviews(queryParams);
    const reviews = apiResponse?.data || [];
    const totalRecords = apiResponse?.meta?.total || 0;
    const loading = isLoading || isFetching;

    const initFilters = () => {
        const initial = {
            global: { value: null, matchMode: FilterMatchMode.CONTAINS },
            status: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
        };
        setFilters(initial);
        setAppliedFilters(prev => ({ ...prev, filters: initial }));
    };

    useEffect(() => {
        initFilters();
        document.body.classList.add('table-page-fit-active');
        return () => {
            document.body.classList.remove('table-page-fit-active');
        };
    }, []);

    const handleApplyFilters = () => {
        setAppliedFilters(prev => ({
            ...prev,
            search: searchText,
            status: selectedStatus,
            filters: filters
        }));
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearchText('');
        setSelectedStatus('');
        initFilters();
        setAppliedFilters({
            search: '',
            status: '',
            filters: {}
        });
        setPage(1);
    };

    const onPage = (event: any) => {
        const nextPerPage = event.rows;
        const nextPage = Math.floor(event.first / event.rows) + 1;
        setPerPage(nextPerPage);
        setPage(nextPage);
    };

    const onSort = (event: any) => {
        const field = event.sortField;
        const order = event.sortOrder === 1 ? 'asc' : 'desc';
        setSortField(field || sortField);
        setSortOrder(order);
    };

    const onFilter = (e: any) => {
        setFilters(e.filters);
        setAppliedFilters(prev => ({
            ...prev,
            filters: e.filters
        }));
        setPage(1);
    };

    const handleStatusUpdate = () => {
        if (!newStatus) return;

        updateStatusMutation.mutate(
            { id: selectedReview.id, status: newStatus, reject_reason: rejectReason },
            {
                onSuccess: () => {
                    toast.success('Status updated successfully');
                    setShowStatusModal(false);
                },
                onError: () => {
                    toast.error('Failed to update status');
                }
            }
        );
    };

    const statusBodyTemplate = (rowData: any) => {
        let className = 'bg-light text-body';
        if (rowData.status === 'Approved') className = 'bg-success-subtle text-success';
        if (rowData.status === 'Rejected') className = 'bg-danger-subtle text-danger';
        if (rowData.status === 'Pending') className = 'bg-warning-subtle text-warning';
        return <span className={`badge ${className} text-uppercase`}>{rowData.status}</span>;
    };

    const actionBodyTemplate = (rowData: any) => {
        return (
            <button 
                className="btn btn-sm btn-soft-primary"
                onClick={(e) => {
                    e.stopPropagation();
                    setSelectedReview(rowData);
                    setNewStatus(rowData.status);
                    setRejectReason(rowData.reject_reason || '');
                    setShowStatusModal(true);
                }}
            >
                Review
            </button>
        );
    };

    const statusOptions = [
        { label: 'Pending', value: 'Pending' },
        { label: 'Approved', value: 'Approved' },
        { label: 'Rejected', value: 'Rejected' },
    ];

    return (
        <div className="page-content page-content-fit">
            <div className="container-fluid">
                <div className="row pb-1 mobile-sticky-header">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Funding Reviews</h4>
                                <nav aria-label="breadcrumb" className="d-block">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">Funding Reviews</li>
                                    </ol>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row row-table-fit mt-3">
                    <div className="col-lg-12">
                        <div className="card">
                            <div className="card-body">
                                <form className="table-filter" onSubmit={(e) => { e.preventDefault(); handleApplyFilters(); }}>
                                    <div className="row g-3 mb-3">
                                        <div className="col-lg-4 col-md-6 col-12">
                                            <div className="search-box">
                                                <input
                                                    type="text"
                                                    className="form-control search bg-light border-light"
                                                    placeholder="Search borrower name..."
                                                    value={searchText}
                                                    onChange={(e) => setSearchText(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                                                />
                                                <i className="ri-search-line search-icon"></i>
                                            </div>
                                        </div>
                                        <div className="col-lg-4 col-md-6 col-12">
                                            <Dropdown
                                                value={selectedStatus}
                                                options={[{ label: 'All Status', value: '' }, ...statusOptions]}
                                                optionLabel="label"
                                                optionValue="value"
                                                onChange={(e) => setSelectedStatus(e.value)}
                                                placeholder="All Status"
                                                className="w-100 employee-filter-dropdown"
                                            />
                                        </div>
                                        <div className="col-lg-4 col-md-12 col-12">
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
                                            value={reviews}
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
                                            responsiveLayout="scroll"
                                            className="p-datatable-sm"
                                            emptyMessage="No funding reviews found"
                                        >
                                            <Column field="id" header="App No" sortable style={{ minWidth: '100px' }} />
                                            <Column header="Borrower Name" body={(r) => `${r.borrower?.first_name || ''} ${r.borrower?.last_name || ''}`} style={{ minWidth: '160px' }} />
                                            <Column header="Funding Sequence" body={(r) => r.funding_sequence?.name || '-'} style={{ minWidth: '160px' }} />
                                            <Column field="funding_type" header="Funding Type" sortable style={{ minWidth: '150px' }} />
                                            <Column field="use_of_funds" header="Purpose" sortable style={{ minWidth: '160px' }} />
                                            <Column header="Requested Amount" field="requested_amount" sortable style={{ minWidth: '150px' }} />
                                            <Column field="status" header="Status" body={statusBodyTemplate} sortable style={{ minWidth: '140px' }} />
                                            <Column header="Action" body={actionBodyTemplate} style={{ minWidth: '100px' }} />
                                        </DataTable>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            {/* ── Review Modal ──────────────────────────────────────────── */}
            {showStatusModal && selectedReview && (
                <>
                    <div className={`modal fade flip show d-block`} tabIndex={-1} role="dialog" aria-modal="true">
                        <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 520 }}>
                            <div className="modal-content border-0 shadow-lg">
                                <div className="modal-header border-bottom-0 pb-0">
                                    <div>
                                        <h5 className="modal-title fw-semibold">Review Funding Request</h5>
                                        <p className="text-muted fs-13 mb-0">
                                            <code>{selectedReview.funding_type || 'Funding Request'}</code>
                                            {' — '}
                                            {`${selectedReview.borrower?.first_name || ''} ${selectedReview.borrower?.last_name || ''}`.trim() || 'Unknown Borrower'}
                                        </p>
                                        {selectedReview.status !== 'Pending' && (
                                            <div className="mt-1">
                                                <span className={`badge ${selectedReview.status === 'Approved' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} fs-11`}>
                                                    {selectedReview.status}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <button type="button" className="btn-close" onClick={() => setShowStatusModal(false)} />
                                </div>
                                <div className="modal-body pt-3">
                                    {selectedReview.status !== 'Pending' && (
                                        <div className="alert alert-light border-0 shadow-sm mb-4 d-flex align-items-center">
                                            <div className="flex-grow-1">
                                                <div className="text-muted fs-11 text-uppercase fw-semibold mb-1" style={{ letterSpacing: '0.05em' }}>Review Summary</div>
                                                <div className="fs-13 fw-medium text-primary">
                                                    Processed by <span className="text-muted">{selectedReview.approved_by_name || 'System'}</span>
                                                </div>
                                                <div className="text-muted fs-12 mt-1">
                                                    <i className="ri-calendar-event-line me-1"></i>
                                                    {selectedReview.approved_at ? new Date(selectedReview.approved_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Unknown date'}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Summary */}
                                    <div className="row g-3 mb-4">
                                        <div className="col-6">
                                            <div className="p-3 rounded bg-light">
                                                <p className="text-muted fs-11 mb-1 text-uppercase fw-semibold" style={{ letterSpacing: '0.08em' }}>
                                                    Requested Amount
                                                </p>
                                                <p className="mb-0 fw-medium text-dark">
                                                    ${selectedReview.requested_amount || '0.00'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="col-6">
                                            <div className="p-3 rounded bg-light">
                                                <p className="text-muted fs-11 mb-1 text-uppercase fw-semibold" style={{ letterSpacing: '0.08em' }}>
                                                    Use of Funds
                                                </p>
                                                <p className="mb-0 fw-semibold text-dark">
                                                    {selectedReview.use_of_funds || 'Unknown'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Decision */}
                                    <div className="mb-3">
                                        <label className="form-label fw-medium">Decision <span className="text-danger">*</span></label>
                                        <div className="d-flex gap-2">
                                            {['Approved', 'Rejected'].map(s => (
                                                <button
                                                    key={s}
                                                    type="button"
                                                    className={`btn flex-grow-1 ${newStatus === s
                                                        ? s === 'Approved' ? 'btn-success' : 'btn-danger'
                                                        : 'btn-light'
                                                        }`}
                                                    disabled={selectedReview.status !== 'Pending'}
                                                    onClick={() => setNewStatus(s)}
                                                >
                                                    <i className={`${s === 'Approved' ? 'ri-checkbox-circle-line' : 'ri-close-circle-line'} me-1`}></i>
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Note */}
                                    {newStatus === 'Rejected' && (
                                        <div className="mb-1">
                                            <label className="form-label fw-medium">
                                                Rejection Reason <span className="text-danger">*</span>
                                            </label>
                                            <textarea
                                                className="form-control"
                                                rows={3}
                                                placeholder="Please provide a reason for rejection…"
                                                value={rejectReason}
                                                disabled={selectedReview.status !== 'Pending'}
                                                onChange={e => setRejectReason(e.target.value)}
                                            />
                                        </div>
                                    )}
                                    {selectedReview.status !== 'Pending' && newStatus !== 'Rejected' && selectedReview.reject_reason && (
                                        <div className="mb-1">
                                            <label className="form-label fw-medium">Previous Rejection Reason</label>
                                            <textarea
                                                className="form-control bg-light"
                                                rows={3}
                                                value={selectedReview.reject_reason}
                                                disabled
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="modal-footer border-top-0 pt-0">
                                    <button type="button" className="btn btn-light" onClick={() => setShowStatusModal(false)}>
                                        {selectedReview.status === 'Pending' ? 'Cancel' : 'Close'}
                                    </button>
                                    {selectedReview.status === 'Pending' && (
                                        <button
                                            type="button"
                                            className={`btn px-4 ${newStatus === 'Approved' ? 'btn-success' : newStatus === 'Rejected' ? 'btn-danger' : 'btn-primary'}`}
                                            disabled={updateStatusMutation.isPending || !newStatus || newStatus === 'Pending' || (newStatus === 'Rejected' && !rejectReason.trim())}
                                            onClick={handleStatusUpdate}
                                        >
                                            {updateStatusMutation.isPending ? (
                                                <><span className="spinner-border spinner-border-sm me-1" role="status" /> Processing…</>
                                            ) : (
                                                <><i className={`${newStatus === 'Approved' ? 'ri-checkbox-circle-line' : newStatus === 'Rejected' ? 'ri-close-circle-line' : 'ri-check-line'} me-1`}></i> Confirm {newStatus === 'Pending' ? 'Decision' : newStatus}</>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show" onClick={() => setShowStatusModal(false)} />
                </>
            )}

            </div>
        </div>
    );
}
