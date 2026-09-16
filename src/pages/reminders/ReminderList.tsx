import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiClient as api } from '../../lib/http/apiClient';
import { toast } from 'react-toastify';
import { parseDate, parseDateTime } from '../../utils/formatters';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import ListSkeletonLoader from '../../components/Loader/ListSkeletonLoader';
import PageHeader from '../common/PageHeader';
import ConfirmationModal from '../../components/Common/Modals/ConfirmationModal';
import ReminderViewModal from '../../components/Common/Modals/ReminderViewModal';
import {
    REMINDER_TYPES,
    REMINDER_STATUS_OPTIONS,
    REMINDER_STATUS_PENDING,
    REMINDER_STATUS_SENT,
    getEffectiveReminderStatusBadgeClasses,
    getEffectiveReminderStatusLabel,
    getReminderClientPath,
    getReminderTypeIcon
} from '../../config/reminders';

export default function ReminderList() {
    const [reminders, setReminders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true);

    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);
    const [sortField, setSortField] = useState('set_date_time');
    const [sortOrder, setSortOrder] = useState('desc');

    const [searchText, setSearchText] = useState('');
    const [selectedType, setSelectedType] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState(null);
    const [dateRange, setDateRange] = useState(() => {
        const today = new Date();
        return [today, today];
    });

    const [dismissModal, setDismissModal] = useState({ show: false, loading: false });
    const [viewModal, setViewModal] = useState({ show: false, data: null });
    const [selectedReminders, setSelectedReminders] = useState([]);
    // Server-side truth for "does this user have ANY dismissable (pending or
    // sent — sent includes ones showing as Missed) reminder at all",
    // independent of the table's current page/date/type/status filters.
    const [hasPendingReminders, setHasPendingReminders] = useState(true);

    const checkPendingReminders = async () => {
        try {
            const res = await api.get('/common/reminders?status=dismissable&per_page=1');
            const total = res.data?.status ? (res.data.data.reminders.meta?.total ?? res.data.data.reminders.total ?? 0) : 0;
            setHasPendingReminders(total > 0);
        } catch (error) {
            console.error('Failed to check pending reminders:', error);
        }
    };
    // Bumped whenever a filter is applied (search submit, type/status change,
    // a completed date-range pick, or Clear) so the fetch effect below always
    // re-runs — even when the filter values themselves land back on their
    // previous state (e.g. Clear when only the date range had been touched).
    const [filtersVersion, setFiltersVersion] = useState(0);

    // Guards against out-of-order responses: if filters/page change again
    // before an in-flight request resolves, only the response for the most
    // recently issued request is applied, and only that request clears the
    // loading state. Without this, a slow earlier response could overwrite
    // newer data or drop the loading indicator while a newer fetch is still
    // running.
    const fetchRequestIdRef = useRef(0);

    const fetchReminders = async (pageNumber = page) => {
        const requestId = ++fetchRequestIdRef.current;
        setIsLoading(true);
        try {
            let url = `/common/reminders?page=${pageNumber}&per_page=${perPage}&sort_by=${sortField}&sort_order=${sortOrder}`;
            if (searchText) url += `&search=${encodeURIComponent(searchText)}`;
            if (selectedType) url += `&reference_type=${encodeURIComponent(selectedType)}`;
            if (selectedStatus) url += `&status=${encodeURIComponent(selectedStatus)}`;

            if (dateRange && dateRange[0]) {
                const start = dateRange[0];
                const end = dateRange[1] || dateRange[0];
                const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
                const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
                url += `&start_date=${startStr}&end_date=${endStr}`;
            }
            const res = await api.get(url);
            if (requestId !== fetchRequestIdRef.current) return; // a newer request superseded this one
            if (res.data?.status) {
                const list = res.data.data.reminders.data || [];
                setReminders(list);
                setTotalRecords(res.data.data.reminders.meta?.total || res.data.data.reminders.total || 0);
                // Drop any selected rows that are no longer dismissable (dismissed
                // via another action, another tab, or no longer in this filtered/
                // paged view) so "Dismiss Selected" never targets a stale,
                // already-dismissed row. Sent is included alongside pending since
                // a "Missed" row is just a sent one whose date has passed —
                // still fully actionable, not merely selectable when literally
                // "pending".
                setSelectedReminders(prev => prev.filter(sel =>
                    list.some((r: any) => r.id === sel.id && (r.status === REMINDER_STATUS_PENDING || r.status === REMINDER_STATUS_SENT))
                ));
            }
        } catch (error) {
            if (requestId !== fetchRequestIdRef.current) return;
            console.error('Failed to fetch reminders:', error);
            toast.error('Failed to load reminders');
        } finally {
            if (requestId === fetchRequestIdRef.current) {
                setIsLoading(false);
                setInitialLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchReminders();
    }, [page, perPage, sortField, sortOrder, filtersVersion]);

    // Check the true pending count once on mount (not tied to table filters).
    useEffect(() => {
        checkPendingReminders();
    }, []);

    // Apply whatever filter values are currently in state: jump back to page 1
    // (a stale page number on a newly filtered set can look like missing/wrong
    // data) and bump filtersVersion to force the fetch effect to re-run.
    const applyFilters = () => {
        setPage(1);
        setFiltersVersion(v => v + 1);
    };

    // Auto-apply once a full date range is picked (skip the initial mount,
    // and skip a half-picked range — the calendar fires onChange once the
    // start date is clicked, before the end date is chosen).
    const isFirstDateRangeRun = useRef(true);
    useEffect(() => {
        if (isFirstDateRangeRun.current) {
            isFirstDateRangeRun.current = false;
            return;
        }
        if (dateRange && dateRange[0] && dateRange[1]) {
            applyFilters();
        }
    }, [dateRange]);

    const handleSearchSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        applyFilters();
    };

    const handleClear = () => {
        setSearchText('');
        setSelectedType(null);
        setSelectedStatus(null);
        setDateRange(null);
        setSelectedReminders([]);
        applyFilters();
    };

    const handleConfirmDismissAll = async () => {
        setDismissModal({ show: true, type: 'all', loading: true });
        try {
            const res = await api.post(`/common/reminders/dismiss-all`);
            const count = res.data?.data?.count ?? 0;
            if (count > 0) {
                toast.success(`${count} reminder${count > 1 ? 's' : ''} dismissed successfully`);
            } else {
                toast.info('There are no reminders to dismiss');
            }
            setDismissModal({ show: false, loading: false });
            setSelectedReminders([]);
            fetchReminders();
            checkPendingReminders();
        } catch (error) {
            console.error('Failed to dismiss all reminders', error);
            toast.error('Failed to dismiss all reminders');
            setDismissModal({ show: true, type: 'all', loading: false });
        }
    };

    const handleConfirmDismiss = async () => {
        if (dismissModal.type === 'all') {
            return handleConfirmDismissAll();
        }

        if (!selectedReminders || selectedReminders.length === 0) return;
        setDismissModal({ show: true, type: 'selected', loading: true });
        try {
            const ids = selectedReminders.map(r => r.id);
            await api.post(`/common/reminders/bulk-dismiss`, { ids });
            toast.success('Reminders dismissed successfully');
            setDismissModal({ show: false, loading: false });
            setSelectedReminders([]);
            fetchReminders(); // Refresh the list
            checkPendingReminders();
        } catch (error) {
            console.error('Failed to dismiss reminders', error);
            toast.error('Failed to dismiss reminders');
            setDismissModal({ show: true, type: 'selected', loading: false });
        }
    };

    const TYPE_OPTIONS = REMINDER_TYPES;

    const STATUS_OPTIONS = REMINDER_STATUS_OPTIONS;

    const getStatusBadge = (rowData) => {
        return (
            <span className={`badge text-uppercase px-3 py-1 rounded-pill fw-medium ${getEffectiveReminderStatusBadgeClasses(rowData)}`}>
                {getEffectiveReminderStatusLabel(rowData)}
            </span>
        );
    };

    const subjectBodyTemplate = (rowData) => {
        return (
            <div className="d-flex align-items-center">
                <div className="flex-shrink-0 me-3">
                    <div className="avatar-sm">
                        <span className="avatar-title bg-primary-subtle text-primary rounded-circle fs-16">
                            <i className={getReminderTypeIcon(rowData.reference_type)}></i>
                        </span>
                    </div>
                </div>
                <div className="flex-grow-1">
                    <div className="fs-14 mb-1 d-flex align-items-center gap-2">
                        <h5 className="fs-15 mb-0 text-dark">{rowData.summary}</h5>
                    </div>
                    <div className="text-muted mb-1 fs-12 d-flex flex-wrap gap-2">
                        {rowData.organizer && (
                            <span><i className="ri-user-line align-middle me-1"></i> {rowData.organizer}</span>
                        )}
                        {rowData.duration && (
                            <span><i className="ri-time-line align-middle me-1"></i> {rowData.duration}</span>
                        )}
                        {rowData.location && (
                            <span><i className="ri-map-pin-line align-middle me-1"></i> {rowData.location}</span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const clientBodyTemplate = (rowData) => {
        const client = rowData.client;
        if (!client) return <span className="text-muted">—</span>;

        const clientPath = getReminderClientPath(client, rowData.related);
        return (
            <div className="overflow-hidden">
                {clientPath ? (
                    <Link to={clientPath} className="fw-semibold text-dark d-block text-truncate">{client.name || 'Unnamed'}</Link>
                ) : (
                    <span className="fw-semibold text-dark d-block text-truncate">{client.name || 'Unnamed'}</span>
                )}
                <div className="text-muted fs-12 text-truncate">
                    {client.type_label}
                    {client.business_name && client.business_name !== client.name ? ` · ${client.business_name}` : ''}
                </div>
                {rowData.related && (
                    <div className="text-muted fs-12 text-truncate">{rowData.related.label}</div>
                )}
            </div>
        );
    };

    const activityDateBodyTemplate = (rowData) => {
        // set_date_time/send_at from the API are already full ISO-8601 strings
        // with an offset (ReminderResource converts to X-Timezone server-side)
        // — pass them straight to parseDateTime. Round-tripping through
        // `new Date(...).toISOString()` first converts to UTC and drops the
        // offset, so parseDateTime's own `new Date(...)` re-parses that naive
        // string as local time again — shifting the displayed time by the
        // browser's UTC offset instead of showing the correct local time.
        const dateStr = rowData.set_date_time || rowData.send_at;
        if (!dateStr) return <span>—</span>;

        return <span className="fw-medium">{parseDateTime(dateStr)}</span>;
    };

    const onPage = (event) => {
        setPerPage(event.rows);
        setPage(Math.floor(event.first / event.rows) + 1);
    };

    const onSort = (event) => {
        setSortField(event.sortField);
        setSortOrder(event.sortOrder === 1 ? 'asc' : 'desc');
    };

    useEffect(() => {
        // Add class to body to prevent global scroll just like invoices
        document.body.classList.add('table-page-fit-active');
        return () => {
            document.body.classList.remove('table-page-fit-active');
        };
    }, []);

    return (
        <div className="page-content page-content-fit">
            <div className="container-fluid">
                {/* Header Section */}
                <PageHeader
                    title="Task & Reminder Events"
                    breadcrumbs={[{ label: 'Task & Reminder Events' }]}
                >
                    <div className="d-flex gap-2">
                        <div className="btn-group">
                            <button type="button" className="btn bg-success text-white fw-medium">Actions</button>
                            <button type="button" className="btn bg-success text-white fw-medium dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
                                <span className="visually-hidden">Toggle dropdown</span>
                            </button>
                            <ul className="dropdown-menu dropdown-menu-end">
                                <li>
                                    <button
                                        type="button"
                                        className="dropdown-item text-danger"
                                        disabled={selectedReminders.length === 0}
                                        onClick={() => setDismissModal({ show: true, type: 'selected', loading: false })}
                                    >
                                        <i className="ri-delete-bin-line me-1 align-bottom"></i> Dismiss Selected {selectedReminders.length > 0 ? `(${selectedReminders.length})` : ''}
                                    </button>
                                </li>
                                <li>
                                    <button
                                        type="button"
                                        className="dropdown-item text-warning"
                                        disabled={!hasPendingReminders}
                                        onClick={() => setDismissModal({ show: true, type: 'all', loading: false })}
                                    >
                                        <i className="ri-check-double-line me-1 align-bottom"></i> Dismiss All
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </PageHeader>

                {initialLoading ? (
                    <ListSkeletonLoader />
                ) : (
                    <div className="row row-table-fit">
                        <div className="col-lg-12">
                            <div className="card shadow-sm border-0">
                                <div className="card-header align-items-center d-flex bg-white">
                                    <h4 className="card-title mb-0 flex-grow-1">Task & Reminder Events</h4>
                                </div>

                                <div className="card-body list-fluid-card">
                                    <form className="table-filter mb-4" onSubmit={handleSearchSubmit}>
                                        <div className="row g-3">
                                            <div className="col-xxl-3 col-sm-12">
                                                <div className="search-box">
                                                    <input
                                                        type="text"
                                                        className="form-control search bg-light border-light"
                                                        placeholder="Search subject or client..."
                                                        value={searchText}
                                                        onChange={(e) => setSearchText(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                                                    />
                                                    <i className="ri-search-line search-icon"></i>
                                                </div>
                                            </div>
                                            <div className="col-xxl-2 col-sm-6">
                                                <Dropdown
                                                    value={selectedType}
                                                    options={TYPE_OPTIONS}
                                                    placeholder="All Reference Types"
                                                    className="w-100 employee-filter-dropdown"
                                                    onChange={(e) => { setSelectedType(e.value); applyFilters(); }}
                                                    showClear
                                                />
                                            </div>
                                            <div className="col-xxl-2 col-sm-6">
                                                <Dropdown
                                                    value={selectedStatus}
                                                    options={STATUS_OPTIONS}
                                                    placeholder="All Status"
                                                    className="w-100 employee-filter-dropdown"
                                                    onChange={(e) => { setSelectedStatus(e.value); applyFilters(); }}
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
                                                        hideOnRangeSelection
                                                        dateFormat="dd M, yy"
                                                        className="w-100"
                                                        inputClassName="form-control search bg-light border-light"
                                                    />
                                                    <i className="ri-calendar-2-line search-icon"></i>
                                                </div>
                                            </div>
                                            <div className="col-xxl-2 col-sm-6">
                                                <div className="d-flex gap-2">
                                                    <button type="button" className="btn btn-success flex-grow-1" onClick={handleSearchSubmit}>
                                                        <i className="ri-equalizer-fill align-bottom me-1"></i> Filters
                                                    </button>
                                                    <button type="button" className="btn btn-light flex-grow-1" onClick={handleClear}>
                                                        <i className="ri-close-line align-bottom me-1"></i> Clear
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </form>

                                    <div className="table-responsive table-card mt-1">
                                        <DataTable
                                            value={reminders}
                                            loading={isLoading}
                                            paginator
                                            lazy
                                            totalRecords={totalRecords}
                                            first={(page - 1) * perPage}
                                            rows={perPage}
                                            rowsPerPageOptions={[10, 25, 50, 100]}
                                            onPage={onPage}
                                            onSort={onSort}
                                            sortField={sortField}
                                            sortOrder={sortOrder === 'asc' ? 1 : -1}
                                            dataKey="id"
                                            scrollable
                                            scrollHeight="flex"
                                            className="p-datatable-sm fs-13"
                                            responsiveLayout="scroll"
                                            emptyMessage="No reminders found"
                                            selectionMode="checkbox"
                                            selection={selectedReminders}
                                            onSelectionChange={(e) => setSelectedReminders(e.value)}
                                            isDataSelectable={(e) => e.data.status === REMINDER_STATUS_PENDING || e.data.status === REMINDER_STATUS_SENT}
                                            onRowClick={(e) => {
                                                const target = e.originalEvent.target as HTMLElement;
                                                // Do not open modal if clicking the checkbox column or the client link
                                                if (target.closest('.p-checkbox') || target.closest('.p-selection-column') || target.closest('a') || target.tagName.toLowerCase() === 'input') {
                                                    return;
                                                }
                                                setViewModal({ show: true, data: e.data });
                                            }}
                                            rowHover
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <Column selectionMode="multiple" headerStyle={{ width: '3rem' }}></Column>
                                            <Column field="reference" header="Reference" body={(rowData) => <span className="badge bg-primary-subtle text-primary px-2 py-1">{rowData.reference}</span>} style={{ minWidth: '120px' }} sortable></Column>
                                            <Column field="summary" header="Subject" body={subjectBodyTemplate} style={{ minWidth: '300px' }} sortable></Column>
                                            <Column header="Client" body={clientBodyTemplate} style={{ minWidth: '200px', maxWidth: '260px' }}></Column>
                                            <Column field="set_date_time" header="Activity Date & Time" body={activityDateBodyTemplate} style={{ minWidth: '180px' }} sortable></Column>
                                            <Column field="status" header="Status" body={(rowData) => getStatusBadge(rowData)} style={{ minWidth: '120px' }} sortable></Column>
                                        </DataTable>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <ConfirmationModal
                show={dismissModal.show}
                onHide={() => setDismissModal({ show: false, loading: false })}
                onConfirm={handleConfirmDismiss}
                loading={dismissModal.loading}
                title={dismissModal.type === 'all' ? "Dismiss All Reminders" : "Dismiss Selected Reminders"}
                message={dismissModal.type === 'all' ? "Are you sure? All pending, sent, and missed reminders will be dismissed." : "Are you sure? The selected reminders will be dismissed."}
                confirmText="Yes, Dismiss"
                variant="danger"
            />

            <ReminderViewModal
                show={viewModal.show}
                onHide={() => setViewModal({ show: false, data: null })}
                onSuccess={() => { fetchReminders(); checkPendingReminders(); }}
                reminder={viewModal.data}
            />
        </div>
    );
}
