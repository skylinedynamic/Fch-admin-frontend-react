import React, { useState, useEffect, useRef } from 'react';
// bootstrap ships no type declarations for this subpath export
// @ts-expect-error -- untyped third-party module, used only as a constructor below
import Modal from 'bootstrap/js/dist/modal';
import { toast } from 'react-toastify';
import { Skeleton } from 'primereact/skeleton';
import '../../../../assets/css/reminder.css';
import './reminderViewModal.css';
import {
    isSilentReminder,
    REMINDER_STATUS_PENDING,
    REMINDER_STATUS_SENT,
    REMINDER_TYPE_TONES,
    getEffectiveReminderStatusBadgeClasses,
    getEffectiveReminderStatusLabel,
    getReminderTypeIcon,
    formatSnoozeMinutes,
    ReminderClient,
    ReminderRelated,
    ReminderSnoozeEntry,
    ReminderDisplay,
    Reminder,
} from '../../../config/reminders';
import { ReminderRescheduleForm } from '../ReminderRescheduleForm';
import ReminderClientCard from '../ReminderClientCard';
import ReminderSnoozeForm, { ReminderSnoozeErrors } from '../ReminderSnoozeForm';
import ReminderAttachments from '../ReminderAttachments';
import ReminderTaskStatus from '../ReminderTaskStatus';
import type { TaskStatus } from '../../../config/activityTask';
import ActivityEditModal from './ActivityEditModal';
import { useFetchActivityLog } from '../../../modules/activity-log';
import { useDismissReminder, useSnoozeReminder } from '../../../modules/reminders';

interface ReminderViewModalProps {
    show: boolean;
    onHide: () => void;
    onSuccess?: () => void;
    /** The task's status was changed here - the list updates its row. */
    onTaskStatusChanged?: (reminderId: number, status: TaskStatus) => void;
    reminder: Reminder | null;
}

/* ── ScheduleItem: one "when" of the Schedule card ───── */
const ScheduleItem = ({ icon, label, date, time }: { icon: string; label: string; date: string; time: string }) => (
    <div className="rvm-schedule__item">
        <span className="rvm-schedule__icon" aria-hidden="true"><i className={icon}></i></span>
        <div className="min-w-0">
            <div className="rvm-label">{label}</div>
            <div className="rvm-schedule__value">{`${date} · ${time}`}</div>
        </div>
    </div>
);

/* ── Modal ───────────────────────────────────────────── */
export default function ReminderViewModal({ show, onHide, onSuccess, onTaskStatusChanged, reminder }: ReminderViewModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const modalInstanceRef = useRef<any>(null);
    const [loadingDismiss, setLoadingDismiss] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [showReschedule, setShowReschedule] = useState(false);
    const [loadingReschedule, setLoadingReschedule] = useState(false);
    const [showSnooze, setShowSnooze] = useState(false);
    const [loadingSnooze, setLoadingSnooze] = useState(false);
    const [snoozeErrors, setSnoozeErrors] = useState<ReminderSnoozeErrors | null>(null);
    const [loadingEdit, setLoadingEdit] = useState(false);
    const [editingActivity, setEditingActivity] = useState<any>(null);

    /* Bootstrap modal lifecycle */
    useEffect(() => {
        if (!modalRef.current || modalInstanceRef.current) return;
        modalInstanceRef.current = new Modal(modalRef.current, { backdrop: 'static', keyboard: false });
    }, [modalRef]);

    useEffect(() => {
        const m = modalInstanceRef.current;
        if (!m) return;
        show ? m.show() : m.hide();
    }, [show]);

    useEffect(() => {
        // reset state when reminder changes
        setExpanded(false);
        setShowReschedule(false);
        setShowSnooze(false);
        setSnoozeErrors(null);
    }, [reminder?.id]);

    useEffect(() => {
        return () => {
            try {
                modalInstanceRef.current?.hide();
                modalInstanceRef.current?.dispose();
            } catch (_) { }
            modalInstanceRef.current = null;
        };
    }, []);

    /* derived values */
    const typeStr = reminder?.reference || 'Activity';
    const typeKey = reminder?.reference_type || reminder?.reference || '';
    const typeTone = REMINDER_TYPE_TONES[typeKey] ?? 'primary';
    const fetchActivityLog = useFetchActivityLog();
    const actionable = reminder?.status === REMINDER_STATUS_PENDING || reminder?.status === REMINDER_STATUS_SENT;
    const dismissMutation = useDismissReminder();
    const snoozeMutation = useSnoozeReminder();
    // An assigned Task's date is its creator's to move - its assignee only snoozes or dismisses.
    const canReschedule = reminder?.can_reschedule !== false;
    const actionCol = canReschedule ? 'col-4' : 'col-6';

    // All dates/times are formatted by the API (toTimezone) in the viewer's
    // timezone and shown as-is. Activity = when the call/task is scheduled;
    // Reminder = when the user gets reminded (may differ from the activity).
    const display = reminder?.display ?? {};
    const activityDateStr = display.activity_date ?? '—';
    const activityTimeStr = display.activity_time ?? '—';
    const reminderDateStr = display.reminder_date ?? '—';
    const reminderTimeStr = display.reminder_time ?? '—';

    /* dismiss */
    const dismissReminder = async () => {
        if (!reminder) return;
        setLoadingDismiss(true);
        try {
            const res = await dismissMutation.mutateAsync(reminder.id);
            toast.success(res?.message || 'Reminder dismissed successfully');
            if (onSuccess) onSuccess();
            onHide();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to dismiss reminder');
        } finally {
            setLoadingDismiss(false);
        }
    };

    /* reschedule — same endpoint/payload as the due-reminder popup's
       ReminderModal, so a missed reminder rescheduled from this details page
       behaves identically to one rescheduled from the popup. */
    const rescheduleReminder = async (rescheduleAt: string, leadMinutes: number, note: string) => {
        if (!reminder) return;
        setLoadingReschedule(true);
        try {
            const res = await snoozeMutation.mutateAsync({
                id: reminder.id,
                payload: { reschedule_at: rescheduleAt, lead_minutes: leadMinutes, note: note || null },
            });
            toast.success(res?.message || 'Reminder rescheduled successfully');
            setShowReschedule(false);
            if (onSuccess) onSuccess();
            onHide();
        } catch (err: any) {
            // Keep the form open with the picked date/time intact on failure —
            // closing here would discard what the user just entered right
            // after telling them it failed.
            toast.error(err.response?.data?.message || 'Failed to reschedule reminder');
        } finally {
            setLoadingReschedule(false);
        }
    };

    /* snooze for N minutes, optionally noting why */
    const snoozeReminder = async (minutes: number, note: string) => {
        if (!reminder) return;
        setLoadingSnooze(true);
        setSnoozeErrors(null);
        try {
            const res = await snoozeMutation.mutateAsync({ id: reminder.id, payload: { minutes, note: note || null } });
            toast.success(res?.message || 'Reminder snoozed successfully');
            setShowSnooze(false);
            if (onSuccess) onSuccess();
            onHide();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to snooze reminder');
            if (err.response?.status === 422 && err.response?.data?.errors) {
                setSnoozeErrors(err.response.data.errors);
            }
        } finally {
            setLoadingSnooze(false);
        }
    };

    /* edit the activity behind the reminder — this modal closes first, since
       the edit form can't take focus while a Bootstrap modal is open. */
    const editReminder = async () => {
        if (!reminder?.activity_log_id) return;
        setLoadingEdit(true);
        try {
            const res: any = await fetchActivityLog(reminder.activity_log_id);
            setEditingActivity(res?.data ?? res);
            onHide();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to load activity');
        } finally {
            setLoadingEdit(false);
        }
    };

    /* description expand/collapse */
    const rawDescription = reminder?.message || reminder?.notes || '';
    const plainText = rawDescription.replace(/<[^>]*>/g, '').trim();
    const needsExpansion = plainText.length > 220;
    const busy = loadingDismiss || loadingReschedule || loadingSnooze || loadingEdit;
    const snoozeHistory = reminder?.snooze_history || [];

    return (
        <>
            <ActivityEditModal
                activity={editingActivity}
                show={!!editingActivity}
                onClose={() => setEditingActivity(null)}
                onUpdated={onSuccess}
            />
            <div className="modal fade flip" ref={modalRef} tabIndex={-1} aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable reminder-view-modal-dialog">
                    <div className="modal-content border-0 shadow-lg">

                        {/* Header: the type, the title and where the reminder stands */}
                        <header className="modal-header rvm-header" role="banner" aria-labelledby="reminderViewTitle">
                            <span className={`rvm-header__icon bg-${typeTone}-subtle text-${typeTone}`} aria-hidden="true">
                                <i className={reminder ? getReminderTypeIcon(typeKey) : 'ri-calendar-todo-line'}></i>
                            </span>
                            <div className="flex-grow-1 min-w-0">
                                <h5 className="modal-title rvm-header__title" id="reminderViewTitle">Task &amp; Reminder Details</h5>
                                {reminder && (
                                    <div className="rvm-header__meta">
                                        <span className={`text-${typeTone} fw-semibold`}>{typeStr}</span>
                                        <span className={`badge rvm-status ${getEffectiveReminderStatusBadgeClasses(reminder)}`}>
                                            <span className="rvm-status__dot" aria-hidden="true"></span>
                                            {getEffectiveReminderStatusLabel(reminder)}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <button type="button" className="btn-close" onClick={onHide} aria-label="Close"></button>
                        </header>

                        {/* Body */}
                        <div className="modal-body reminder-view-modal-body">
                            {!reminder ? (
                                /* Skeleton */
                                <div>
                                    <Skeleton width="120px" height="11px" className="mb-2" />
                                    <Skeleton width="70%" height="26px" className="mb-4" />
                                    <Skeleton width="100px" height="11px" className="mb-2" />
                                    <Skeleton width="100%" height="70px" className="mb-4 rounded-3" />
                                    <div className="row g-3 mb-4">
                                        {[1, 2, 3, 4].map(i => (
                                            <div className="col-6" key={i}>
                                                <div className="d-flex align-items-center gap-2">
                                                    <Skeleton shape="circle" size="32px" />
                                                    <div className="flex-grow-1">
                                                        <Skeleton width="60px" height="10px" className="mb-2" />
                                                        <Skeleton width="90px" height="13px" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="d-flex justify-content-end gap-2 pt-3 border-top">
                                        <Skeleton width="70px" height="34px" borderRadius="6px" />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    {/* Subject */}
                                    <section className="rvm-section">
                                        <div className="rvm-label">Subject</div>
                                        <h4 className="rvm-subject">{reminder.summary || 'Activity'}</h4>
                                    </section>

                                    {/* The creator's copy of a task only its assignee is reminded of. */}
                                    {isSilentReminder(reminder) && (
                                        <div className="alert alert-light border d-flex align-items-start gap-2 fs-13 py-2 mb-3">
                                            <i className="ri-notification-off-line fs-16 text-muted" aria-hidden="true"></i>
                                            <span>You won't get a popup for this task — only the assignee is reminded. It is listed here so you can follow it.</span>
                                        </div>
                                    )}

                                    {/* When: the activity, and the reminder before it */}
                                    <section className="rvm-section">
                                        <div className="rvm-schedule" role="group" aria-label="Schedule">
                                            <ScheduleItem icon="ri-calendar-event-line" label="Activity" date={activityDateStr} time={activityTimeStr} />
                                            <ScheduleItem icon="ri-alarm-line" label="Reminder" date={reminderDateStr} time={reminderTimeStr} />
                                        </div>
                                    </section>

                                    {/* Who this reminder is for */}
                                    <section className="rvm-section">
                                        <div className="rvm-label mb-2">{reminder.client?.type_label || 'Client'}</div>
                                        <ReminderClientCard client={reminder.client} onNavigate={onHide} />
                                    </section>

                                    {/* Description: 4 lines, then See more */}
                                    {rawDescription ? (
                                        <section className="rvm-section">
                                            <div className="rvm-label mb-2">Description</div>
                                            <div className="rvm-description">
                                                <div
                                                    className={`text-dark fs-14 ${expanded ? 'reminder-description-expanded' : 'reminder-description-collapsed'}`}
                                                    dangerouslySetInnerHTML={{ __html: rawDescription }}
                                                />
                                                {needsExpansion && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-link p-0 mt-2 fs-12 fw-semibold text-primary text-decoration-none shadow-none d-flex align-items-center gap-1"
                                                        onClick={() => setExpanded(v => !v)}
                                                    >
                                                        {expanded
                                                            ? <><i className="ri-arrow-up-s-line fs-14"></i> See less</>
                                                            : <><i className="ri-arrow-down-s-line fs-14"></i> See more</>
                                                        }
                                                    </button>
                                                )}
                                            </div>
                                        </section>
                                    ) : null}

                                    {/* An assigned Task: its creator or assignee can move it along here. */}
                                    {reminder.task && reminder.activity_log_id && (
                                        <ReminderTaskStatus
                                            key={reminder.id}
                                            activityLogId={reminder.activity_log_id}
                                            task={reminder.task}
                                            canUpdate={!!reminder.task_can_update_status}
                                            summary={reminder.summary}
                                            onChanged={(status) => onTaskStatusChanged?.(reminder.id, status)}
                                        />
                                    )}

                                    {/* Attachments list */}
                                    <ReminderAttachments reminderId={reminder.id} attachments={reminder.attachments} />

                                    {/* Snooze history with the notes on why */}
                                    {snoozeHistory.length > 0 && (
                                        <div className="mb-3">
                                            <label className="text-muted fs-11 text-uppercase fw-bold mb-2 d-block">Snooze History</label>
                                            <div className="d-flex flex-column gap-2">
                                                {[...snoozeHistory].reverse().map((entry, idx) => {
                                                    const at = entry.snoozed_at_display;
                                                    const until = entry.snoozed_until_display;
                                                    return (
                                                        <div key={idx} className="bg-light rounded border border-light-subtle px-3 py-2">
                                                            <div className="d-flex flex-wrap justify-content-between gap-2 fs-12">
                                                                <span className="fw-semibold text-dark">
                                                                    <i className="ri-timer-line me-1 text-primary"></i>
                                                                    {entry.action === 'rescheduled'
                                                                        ? 'Rescheduled'
                                                                        : `Snoozed ${entry.minutes ? formatSnoozeMinutes(entry.minutes) : ''}`}
                                                                    {until && <span className="text-muted fw-normal"> · until {until}</span>}
                                                                </span>
                                                                <span className="text-muted">
                                                                    {entry.snoozed_by ? `${entry.snoozed_by} · ` : ''}{at ?? ''}
                                                                </span>
                                                            </div>
                                                            {entry.note && <div className="fs-13 text-dark mt-1 text-break">{entry.note}</div>}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}


                                    {/* Same layout as the due-reminder popup: Snooze | Reschedule | Dismiss as
                                    three equal buttons, the panel below them, then Edit | Close. */}
                                    <div className="rvm-actions">
                                        {actionable && (
                                            <div className="row g-2">
                                                <div className={actionCol}>
                                                    <button
                                                        type="button"
                                                        className={`btn w-100 fw-semibold d-flex align-items-center justify-content-center btn-reminder-secondary ${showSnooze ? 'is-active' : ''}`}
                                                        onClick={() => { setShowReschedule(false); setShowSnooze((v) => !v); }}
                                                        disabled={busy}
                                                    >
                                                        <i className="ri-timer-line me-2 fs-16"></i> Snooze
                                                    </button>
                                                </div>
                                                {canReschedule && (
                                                    <div className="col-4">
                                                        <button
                                                            type="button"
                                                            className={`btn w-100 fw-semibold d-flex align-items-center justify-content-center btn-reminder-secondary ${showReschedule ? 'is-active' : ''}`}
                                                            onClick={() => { setShowSnooze(false); setShowReschedule((v) => !v); }}
                                                            disabled={busy}
                                                        >
                                                            <i className="ri-calendar-event-line me-2 fs-16"></i> Reschedule
                                                        </button>
                                                    </div>
                                                )}
                                                <div className={actionCol}>
                                                    <button
                                                        type="button"
                                                        className="btn w-100 fw-semibold d-flex align-items-center justify-content-center btn-light"
                                                        onClick={dismissReminder}
                                                        disabled={busy}
                                                    >
                                                        {loadingDismiss
                                                            ? <><span className="spinner-border spinner-border-sm me-2"></span> Dismissing...</>
                                                            : <><i className="ri-notification-off-line me-2 fs-16"></i> Dismiss</>}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {actionable && showSnooze && (
                                            <div className="mt-3">
                                                <ReminderSnoozeForm
                                                    loading={loadingSnooze}
                                                    serverErrors={snoozeErrors}
                                                    onConfirm={snoozeReminder}
                                                    onCancel={() => { setShowSnooze(false); setSnoozeErrors(null); }}
                                                />
                                            </div>
                                        )}

                                        {actionable && canReschedule && showReschedule && (
                                            <div className="mt-3">
                                                <ReminderRescheduleForm
                                                    loading={loadingReschedule}
                                                    onConfirm={rescheduleReminder}
                                                    onCancel={() => setShowReschedule(false)}
                                                />
                                            </div>
                                        )}

                                        <div className={`row g-2 ${actionable ? (showSnooze || showReschedule ? 'mt-3' : 'mt-2') : ''}`}>
                                            {/* Only the activity's own author may edit it. */}
                                            {reminder.activity_log_id && reminder.activity_can_edit && (
                                                <div className="col-md-6">
                                                    <button
                                                        type="button"
                                                        className="btn w-100 fw-semibold d-flex align-items-center justify-content-center btn-light"
                                                        onClick={editReminder}
                                                        disabled={busy}
                                                    >
                                                        {loadingEdit
                                                            ? <span className="spinner-border spinner-border-sm me-2"></span>
                                                            : <i className="ri-edit-2-line me-2 fs-16"></i>}
                                                        Edit Reminder
                                                    </button>
                                                </div>
                                            )}
                                            <div className="col-md-6">
                                                <button
                                                    type="button"
                                                    className="btn w-100 fw-semibold d-flex align-items-center justify-content-center btn-light"
                                                    onClick={onHide}
                                                >
                                                    <i className="ri-close-line me-2 fs-16"></i> Close
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
