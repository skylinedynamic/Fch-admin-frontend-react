import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import ListSkeletonLoader from '../../components/Loader/ListSkeletonLoader';
import PageHeader from '../common/PageHeader';
import ConfirmationModal from '../../components/Common/Modals/ConfirmationModal';
import ReminderViewModal from '../../components/Common/Modals/ReminderViewModal';
import { TASK_STATUS_OPTIONS, type TaskStatus } from '../../config/activityTask';
import { REMINDER_STATUS_PENDING, REMINDER_STATUS_SENT } from '../../config/reminders';
import type { Reminder } from '../../config/reminders';
import {
    useBulkDismissReminders,
    useDismissAllReminders,
    useHasDismissableReminders,
    useReminderList,
    type ReminderListFilters,
} from '../../modules/reminders';
import type { DataTablePageEvent, DataTableSortEvent } from 'primereact/datatable';
import ReminderStatusTabs from './components/ReminderStatusTabs';
import ReminderToolbar from './components/ReminderToolbar';
import ReminderActionsMenu from './components/ReminderActionsMenu';
import ReminderEmptyState from './components/ReminderEmptyState';
import { ClientCell, ReferenceCell, StatusCell, SubjectCell, WhenCell } from './components/ReminderCells';
import './reminderList.css';

type DateRange = (Date | null)[] | null;

/** The filters the table is showing - applied from the toolbar, not as the user types. */
interface AppliedFilters {
    search: string;
    type: string | null;
    status: string | null;
    dateRange: DateRange;
}

const todayRange = (): DateRange => {
    const today = new Date();
    return [today, today];
};

const toYmd = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Pending and sent reminders - including ones showing as Missed - can still be dismissed. */
const isDismissable = (reminder: Reminder) =>
    reminder.status === REMINDER_STATUS_PENDING || reminder.status === REMINDER_STATUS_SENT;

export default function ReminderList() {
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [sortField, setSortField] = useState('set_date_time');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // What the toolbar holds, and what the table is filtered by
    const [searchText, setSearchText] = useState('');
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<DateRange>(todayRange);
    const [applied, setApplied] = useState<AppliedFilters>(() => ({ search: '', type: null, status: null, dateRange: todayRange() }));

    // `type` decides the confirmation's wording and which dismiss runs
    const [dismissModal, setDismissModal] = useState<{ show: boolean; type?: 'all' | 'selected' }>({ show: false });
    const [viewModal, setViewModal] = useState<{ show: boolean; data: Reminder | null }>({ show: false, data: null });
    const [selectedReminders, setSelectedReminders] = useState<Reminder[]>([]);

    const filters = useMemo<ReminderListFilters>(() => {
        const [start, end] = applied.dateRange ?? [];
        return {
            page,
            per_page: perPage,
            sort_by: sortField,
            sort_order: sortOrder,
            search: applied.search,
            reference_type: applied.type,
            status: applied.status,
            ...(start ? { start_date: toYmd(start), end_date: toYmd(end ?? start) } : {}),
        };
    }, [page, perPage, sortField, sortOrder, applied]);

    const list = useReminderList(filters);
    const reminders = list.data?.data ?? [];
    const { data: hasDismissable = false } = useHasDismissableReminders();
    const dismissAllMutation = useDismissAllReminders();
    const bulkDismissMutation = useBulkDismissReminders();

    useEffect(() => {
        if (list.isError) toast.error('Failed to load reminders');
    }, [list.isError]);

    // Drop selected rows that are no longer on screen or no longer dismissable,
    // so "Dismiss selected" never targets a stale row.
    useEffect(() => {
        if (!list.data) return;
        setSelectedReminders((prev) => prev.filter((sel) => list.data.data.some((r) => r.id === sel.id && isDismissable(r))));
    }, [list.data]);

    const apply = (changes: Partial<AppliedFilters> = {}) => {
        setPage(1);
        setApplied({ search: searchText, type: selectedType, status: applied.status, dateRange, ...changes });
    };

    // Apply a date range once both ends are picked (the calendar reports the start first)
    const isFirstDateRangeRun = useRef(true);
    useEffect(() => {
        if (isFirstDateRangeRun.current) {
            isFirstDateRangeRun.current = false;
            return;
        }
        if (dateRange && dateRange[0] && dateRange[1]) apply({ dateRange });
    }, [dateRange]);

    const clearFilters = () => {
        setSearchText('');
        setSelectedType(null);
        setDateRange(null);
        setSelectedReminders([]);
        setPage(1);
        setApplied({ search: '', type: null, status: null, dateRange: null });
    };

    const confirmDismiss = async () => {
        try {
            if (dismissModal.type === 'all') {
                const res = await dismissAllMutation.mutateAsync();
                const count = res?.data?.count ?? 0;
                if (count > 0) {
                    toast.success(`${count} reminder${count > 1 ? 's' : ''} dismissed successfully`);
                } else {
                    toast.info('There are no reminders to dismiss');
                }
            } else {
                if (selectedReminders.length === 0) return;
                await bulkDismissMutation.mutateAsync(selectedReminders.map((r) => r.id));
                toast.success('Reminders dismissed successfully');
            }
            setDismissModal({ show: false });
            setSelectedReminders([]);
        } catch (error) {
            console.error('Failed to dismiss reminders', error);
            toast.error(dismissModal.type === 'all' ? 'Failed to dismiss all reminders' : 'Failed to dismiss reminders');
        }
    };

    // A task's status changed in Task & Reminder Details: show it there at
    // once, and reload the list.
    const applyTaskStatus = (reminderId: number, status: TaskStatus) => {
        const label = TASK_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? null;
        setViewModal((v) => (v.data?.id === reminderId && v.data.task
            ? { ...v, data: { ...v.data, task: { ...v.data.task, status, status_label: label } } }
            : v));
        list.refetch();
    };

    const onPage = (event: DataTablePageEvent) => {
        setPerPage(event.rows);
        setPage(Math.floor(event.first / event.rows) + 1);
    };

    const onSort = (event: DataTableSortEvent) => {
        setSortField(event.sortField);
        setSortOrder(event.sortOrder === 1 ? 'asc' : 'desc');
    };

    useEffect(() => {
        // Fit the table to the page instead of scrolling the whole page
        document.body.classList.add('table-page-fit-active');
        return () => document.body.classList.remove('table-page-fit-active');
    }, []);

    const dismissing = dismissAllMutation.isPending || bulkDismissMutation.isPending;

    return (
        <div className="page-content page-content-fit reminder-list">
            <div className="container-fluid">
                <PageHeader title="Task & Reminder Events" breadcrumbs={[{ label: 'Task & Reminder Events' }]}>
                    <div className="d-flex align-items-center gap-2">
                        <button
                            type="button"
                            className="btn btn-soft-warning fw-semibold text-nowrap"
                            disabled={!hasDismissable}
                            onClick={() => setDismissModal({ show: true, type: 'all' })}
                        >
                            <i className="ri-check-double-line me-1 align-bottom"></i>Dismiss all
                        </button>
                        <ReminderActionsMenu
                            count={selectedReminders.length}
                            onDismissSelected={() => setDismissModal({ show: true, type: 'selected' })}
                        />
                    </div>
                </PageHeader>

                {list.isLoading && !list.data ? (
                    <ListSkeletonLoader />
                ) : (
                    <div className="row row-table-fit">
                        <div className="col-lg-12">
                            <div className="card reminder-list__card">
                                <div className="reminder-list__head">
                                    <ReminderStatusTabs
                                        value={applied.status}
                                        onChange={(status) => apply({ status })}
                                    />
                                    <ReminderToolbar
                                        search={searchText}
                                        onSearchChange={setSearchText}
                                        type={selectedType}
                                        onTypeChange={(type) => { setSelectedType(type); apply({ type }); }}
                                        dateRange={dateRange}
                                        onDateRangeChange={setDateRange}
                                        onApply={() => apply()}
                                        onClear={clearFilters}
                                    />
                                </div>

                                <div className="card-body list-fluid-card reminder-list__body">
                                    <div className="table-responsive table-card">
                                        <DataTable
                                            value={reminders}
                                            loading={list.isFetching}
                                            paginator
                                            lazy
                                            totalRecords={list.data?.total ?? 0}
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
                                            className="p-datatable-sm fs-13 reminder-table"
                                            responsiveLayout="scroll"
                                            emptyMessage={<ReminderEmptyState onClear={clearFilters} />}
                                            // Rows are selected by their checkbox only - a row click opens its details
                                            selectionMode="checkbox"
                                            selection={selectedReminders}
                                            onSelectionChange={(e: { value: Reminder[] }) => setSelectedReminders(e.value)}
                                            isDataSelectable={(e: { data: Reminder }) => isDismissable(e.data)}
                                            onRowClick={(e: { originalEvent: React.MouseEvent; data: Reminder }) => {
                                                const target = e.originalEvent.target as HTMLElement;
                                                // Not from the checkbox or a link
                                                if (target.closest('.p-checkbox') || target.closest('.p-selection-column') || target.closest('a') || target.tagName.toLowerCase() === 'input') {
                                                    return;
                                                }
                                                setViewModal({ show: true, data: e.data });
                                            }}
                                            rowHover
                                        >
                                            <Column selectionMode="multiple" headerStyle={{ width: '3rem' }}></Column>
                                            <Column field="reference" header="Reference" body={(row: Reminder) => <ReferenceCell reminder={row} />} style={{ minWidth: '130px' }} sortable></Column>
                                            <Column field="summary" header="Subject" body={(row: Reminder) => <SubjectCell reminder={row} />} style={{ minWidth: '260px' }} sortable></Column>
                                            <Column header="Client" body={(row: Reminder) => <ClientCell reminder={row} />} style={{ minWidth: '200px', maxWidth: '260px' }}></Column>
                                            <Column field="set_date_time" header="When" body={(row: Reminder) => <WhenCell reminder={row} />} style={{ minWidth: '190px' }} sortable></Column>
                                            <Column field="status" header="Status" body={(row: Reminder) => <StatusCell reminder={row} />} style={{ minWidth: '120px' }} sortable></Column>
                                            <Column body={() => <i className="ri-arrow-right-s-line reminder-row__chevron" aria-hidden="true"></i>} style={{ width: '2.5rem' }}></Column>
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
                onHide={() => setDismissModal({ show: false })}
                onConfirm={confirmDismiss}
                loading={dismissing}
                title={dismissModal.type === 'all' ? 'Dismiss All Reminders' : 'Dismiss Selected Reminders'}
                message={dismissModal.type === 'all' ? 'Are you sure? All pending, sent, and missed reminders will be dismissed.' : 'Are you sure? The selected reminders will be dismissed.'}
                confirmText="Yes, Dismiss"
                variant="danger"
            />

            <ReminderViewModal
                show={viewModal.show}
                onHide={() => setViewModal({ show: false, data: null })}
                onSuccess={() => list.refetch()}
                onTaskStatusChanged={applyTaskStatus}
                reminder={viewModal.data}
            />
        </div>
    );
}
