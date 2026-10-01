import React, { useState, useEffect, useRef } from 'react';
import { Modal } from 'reactstrap';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { apiClient as api } from '../../lib/http/apiClient';
import { useAuthStore } from '../../store/auth/authStore';
import '../../../assets/css/reminder.css';
import { getEcho, userChannelName } from '../../lib/realtime/echo';
import { ReminderRescheduleForm } from './ReminderRescheduleForm';
import ReminderClientCard from './ReminderClientCard';
import { getReminderClientPath, getReminderClientLinkLabel } from '../../config/reminders';
import ReminderSnoozeForm, { ReminderSnoozeErrors } from './ReminderSnoozeForm';
import ReminderAttachments from './ReminderAttachments';
import ActivityEditModal from './Modals/ActivityEditModal';
import { getActivityLog } from '../../modules/activity-log/services';

// After "Go to Client" the popup stays out of the way this long while the
// user works on the file (a newly due reminder still pops up immediately).
const GO_TO_CLIENT_QUIET_MS = 5 * 60 * 1000;

// Notes longer than this get their own line below the details; past the second
// length they are clamped to two lines with "See more".
const NOTE_INLINE_MAX_LENGTH = 40;
const NOTE_CLAMP_MIN_LENGTH = 150;

const ReminderModal = () => {
    const { token } = useAuthStore();

    const [reminders, setReminders] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);
    const [showCustomReschedule, setShowCustomReschedule] = useState(false);
    const [showSnooze, setShowSnooze] = useState(false);
    const [snoozeErrors, setSnoozeErrors] = useState<ReminderSnoozeErrors | null>(null);
    const [notesExpanded, setNotesExpanded] = useState(false);
    // Reminder picked from the multi-reminder list to act on individually.
    const [focusedId, setFocusedId] = useState<number | null>(null);
    const quietUntilRef = useRef(0);
    // The activity being edited from "Edit Reminder". While its form is open
    // the popup stays hidden (it can't sit on top of it).
    const [editingActivity, setEditingActivity] = useState<any>(null);
    const editingRef = useRef(false);

    const location = useLocation();

    // Fetch due reminders
    const fetchDueReminders = async ({ keepOpenState = false }: { keepOpenState?: boolean } = {}) => {
        if (!token) return;

        try {
            const response = await api.get('/common/reminders/due');

            if (
                response.data &&
                response.data.data &&
                response.data.data.reminders
            ) {
                const fetchedReminders = (response.data.data.reminders || []).filter(
                    (r: any) => r && r.status !== 'cancelled'
                );

                setReminders(fetchedReminders);
                if (keepOpenState) {
                    // Refreshing an open popup: only close it if nothing is left.
                    if (fetchedReminders.length === 0) setIsOpen(false);
                } else {
                    // Never pop up over the activity edit form.
                    setIsOpen(fetchedReminders.length > 0 && !editingRef.current);
                }
            }
        } catch (error) {
            console.error(
                'Failed to fetch due reminders:',
                error
            );
        }
    };

    // Fetch once on mount/login to catch reminders that were already due
    // before the socket connected. Reverb (.reminder.due, queued broadcast)
    // pushes anything that becomes due afterward, and the 30s poll below
    // covers dropped connections — no need to refetch on every route change.
    useEffect(() => {
        fetchDueReminders();
    }, [token]);

    // Periodically re-check so if you just closed the popup (X) without dismissing,
    // it resurfaces again and again until actually dismissed or rescheduled.
    useEffect(() => {
        if (!token) return;

        const interval = setInterval(() => {
            if (editingRef.current) return;
            if (isOpen) {
                // Already showing — refresh the data only (Missed/Pending, dates).
                fetchDueReminders({ keepOpenState: true });
            } else if (Date.now() >= quietUntilRef.current) {
                fetchDueReminders();
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [token, isOpen]);

    // WebSocket listener on the shared Reverb connection. The user channel is
    // shared with the notification bell and the trial listener, so cleanup
    // removes only this listener rather than leaving the channel.
    useEffect(() => {
        const userId = useAuthStore.getState().user?.id;
        const echo = token && userId ? getEcho() : null;
        if (!echo || !userId) return;

        const channel = echo.private(userChannelName(userId));
        const handleDue = (e: any) => {
            if (e?.reminder?.status === 'cancelled') return;
            // Refetch rather than using the broadcast payload so the
            // reminder arrives with its client details resolved.
            fetchDueReminders();
        };
        channel.listen('.reminder.due', handleDue);

        return () => {
            channel.stopListening('.reminder.due', handleDue);
        };
    }, [token]);

    const resetPanels = () => {
        setShowCustomReschedule(false);
        setShowSnooze(false);
        setSnoozeErrors(null);
        setNotesExpanded(false);
    };

    const focusReminder = (id: number | null) => {
        setFocusedId(id);
        resetPanels();
    };

    // Snooze / Reschedule from a row of the multi-reminder list: open that
    // reminder with its panel already showing — the very same panel, checks
    // and API call as the single-reminder view, not a second copy.
    const openReminderPanel = (id: number, panel: 'snooze' | 'reschedule') => {
        focusReminder(id);
        if (panel === 'snooze') {
            setShowSnooze(true);
        } else {
            setShowCustomReschedule(true);
        }
    };

    // Toggle modal. Closing (X) hides the popup.
    const toggle = () => {
        setIsOpen(false);
        setFocusedId(null);
        resetPanels();
    };

    const goToClient = () => {
        quietUntilRef.current = Date.now() + GO_TO_CLIENT_QUIET_MS;
        toggle();
    };

    const removeReminder = (id: any) => {
        setReminders((prev) => {
            const next = prev.filter((r) => r.id !== id);
            if (next.length === 0) {
                setIsOpen(false);
            }
            return next;
        });
        setFocusedId(null);
        resetPanels();
    };

    // Dismiss reminder
    const dismissReminder = async (id: any) => {
        setLoadingAction('dismiss');

        try {
            const response = await api.post(
                `/common/reminders/${id}/dismiss`
            );

            toast.success(
                response.data?.message ||
                'Reminder dismissed successfully'
            );

            removeReminder(id);
        } catch (error: any) {
            toast.error(
                error.response?.data?.message ||
                'Failed to dismiss reminder'
            );

            console.error(
                'Failed to dismiss reminder:',
                error
            );
        } finally {
            setLoadingAction(null);
        }
    };

    // Dismiss all reminders
    const dismissAllReminders = async () => {
        setLoadingAction('dismissAll');

        try {
            await api.post('/common/reminders/dismiss-all');

            toast.success('All reminders dismissed successfully');

            setReminders([]);
            setIsOpen(false);
        } catch (error) {
            toast.error('Failed to dismiss reminders');
            console.error('Failed to dismiss all reminders:', error);
        } finally {
            setLoadingAction(null);
        }
    };

    // Snooze reminder by any number of minutes, optionally noting why
    const snoozeReminder = async (id: any, minutes: number, note: string) => {
        setSnoozeErrors(null);
        await postSnooze(id, { minutes, note: note || null }, 'Reminder snoozed successfully', 'Failed to snooze reminder', setSnoozeErrors);
    };

    // Reschedule reminder to an exact date & time, alerting the given number
    // of minutes before it (matching the "Remind me X before" dropdown used
    // when creating an activity, instead of silently preserving whatever the
    // reminder's lead time happened to be before).
    const rescheduleReminder = async (id: any, rescheduleAt: string, leadMinutes: number, note: string) => {
        await postSnooze(id, { reschedule_at: rescheduleAt, lead_minutes: leadMinutes, note: note || null }, 'Reminder rescheduled successfully', 'Failed to reschedule reminder');
    };

    // On failure the open form keeps what the user entered — closing it right
    // after telling them it failed would force them to redo it.
    const postSnooze = async (
        id: any,
        payload: any,
        successMessage: string,
        failureMessage: string,
        onFieldErrors?: (errors: ReminderSnoozeErrors) => void
    ): Promise<boolean> => {
        setLoadingAction('snooze');

        try {
            const response = await api.post(
                `/common/reminders/${id}/snooze`,
                payload
            );

            toast.success(response.data?.message || successMessage);

            removeReminder(id);

            return true;
        } catch (error: any) {
            toast.error(
                error.response?.data?.message || failureMessage
            );

            const fieldErrors = error.response?.status === 422 ? error.response?.data?.errors : null;
            if (fieldErrors && onFieldErrors) {
                onFieldErrors(fieldErrors);
            }

            console.error(failureMessage, error);

            return false;
        } finally {
            setLoadingAction(null);
        }
    };

    // Edit the activity behind the reminder — same flow as the Task & Reminder
    // Details modal. The popup hides while the form is open and refreshes
    // once it closes.
    const editReminder = async (reminder: any) => {
        if (!reminder.activity_log_id) return;
        setLoadingAction(`edit:${reminder.id}`);
        try {
            const response: any = await getActivityLog(reminder.activity_log_id);
            editingRef.current = true;
            setEditingActivity(response?.data ?? response);
            setIsOpen(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to load activity');
        } finally {
            setLoadingAction(null);
        }
    };

    const closeEdit = () => {
        editingRef.current = false;
        setEditingActivity(null);
        setFocusedId(null);
        resetPanels();
        fetchDueReminders();
    };

    const editModal = (
        <ActivityEditModal
            activity={editingActivity}
            show={!!editingActivity}
            onClose={closeEdit}
            onUpdated={undefined}
        />
    );

    const activeReminders = reminders.filter((r: any) => r && r.status !== 'cancelled');
    const isBusy = loadingAction !== null;

    // Don't show if there are no reminders, or on the reminders page
    if (activeReminders.length === 0 || location.pathname.startsWith('/reminders')) {
        return editModal;
    }

    const focusedReminder = focusedId !== null ? activeReminders.find((r: any) => r.id === focusedId) : undefined;
    const isMultiple = activeReminders.length > 1 && !focusedReminder;
    const canGoBack = activeReminders.length > 1 && !!focusedReminder;

    // Multi-reminder header: same "missed" definition as the single-reminder
    // view and the per-item badges below (the activity's own date/time, not
    // whether the alert already fired) so the summary text at the top
    // actually matches what the list underneath shows.
    const missedCount = activeReminders.reduce((count, r) => (r.is_past_due ? count + 1 : count), 0);
    const allMissed = isMultiple && missedCount === activeReminders.length;
    const someMissed = isMultiple && missedCount > 0 && !allMissed;

    // For single view
    const mainReminder = focusedReminder ?? activeReminders[0];
    // Every date/time below is formatted by the API (toTimezone) in the
    // viewer's timezone and shown as-is. The calendar box and header show the
    // activity's own date/time; "Reminder Time" is when the reminder fires.
    const display = mainReminder.display ?? {};
    const dayNum = display.activity_day ?? '—';
    const dayName = (display.activity_weekday_short ?? '').toUpperCase();
    const monthYear = (display.activity_month_year ?? '').toUpperCase();
    const fullDateStr = display.activity_date
        ? `${display.activity_date}${display.activity_weekday ? ` (${display.activity_weekday})` : ''}`
        : '—';
    const timeStr = display.activity_time ?? '—';
    const reminderTimeStr = display.reminder_time ?? '—';
    const reminderTimeShortStr = display.reminder_date_short ?? '—';
    const typeStr = mainReminder.reference_type || 'Meeting';
    const lowerType = typeStr.toLowerCase();
    // "an Event" / "an Email", "a Call" / "a Meeting".
    const typeArticle = /^[aeiou]/i.test(typeStr) ? 'an' : 'a';
    // Whether the activity itself (the call/meeting) already happened — NOT
    // whether the alert already fired. reminder_date_time is deliberately
    // earlier than set_date_time (e.g. "10 minutes before"), so a
    // due-but-still-upcoming reminder must not read as "missed".
    const isPastDue = !!mainReminder.is_past_due;
    // Edit Reminder opens the activity behind the reminder, which only the
    // person who logged that activity may change (the API enforces it too).
    const canEdit = !!mainReminder.activity_log_id && !!mainReminder.activity_can_edit;

    // Snooze, Reschedule and Dismiss work on upcoming and missed reminders
    // alike — an upcoming call can be moved just as well as a missed one.
    const panelOpen = showSnooze || showCustomReschedule;

    const stripHtml = (html: string) => {
        if (!html) return '';
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    };

    const noteText = stripHtml(mainReminder.message);

    // Details line: Reminder Time, a short note and Attached Files side by side,
    // each only as wide as it needs so the file name keeps one line. A long
    // note gets its own line below, clamped with "See more" when very long.
    const hasAttachments = (mainReminder.attachments?.length ?? 0) > 0;
    const noteOnOwnLine = noteText.length > NOTE_INLINE_MAX_LENGTH;
    const noteNeedsSeeMore = noteText.length > NOTE_CLAMP_MIN_LENGTH;

    return (
        <>
            {editModal}
            <Modal
                isOpen={isOpen}
                toggle={toggle}
                centered
                size="md"
                className="reminder-popup-dialog"
                modalClassName="flip"
                contentClassName="border-0 shadow-lg bg-transparent"
            >
                <div className="reminder-modal-content">
                    {isMultiple ? (
                        <>
                            <div className="px-4 py-3 position-relative reminder-premium-header">
                                <div className="reminder-header-glow"></div>
                                <button
                                    type="button"
                                    className="position-absolute bg-transparent border-0 text-white reminder-close-btn"
                                    onClick={toggle}
                                >
                                    <i className="ri-close-line"></i>
                                </button>

                                <div className="d-flex align-items-start position-relative z-1">
                                    <div className="flex-shrink-0 me-3">
                                        <div className="avatar-md reminder-header-avatar">
                                            <span className="avatar-title rounded-circle reminder-icon-wrapper">
                                                <i className="ri-notification-3-fill reminder-header-bell"></i>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex-grow-1 text-white">
                                        <span className="badge fw-bold mb-2 reminder-badge">
                                            {allMissed ? 'MISSED REMINDERS' : someMissed ? 'REMINDERS' : 'PENDING REMINDERS'}
                                        </span>
                                        <h5 className="mb-1 text-white fw-bold fs-18">
                                            {allMissed
                                                ? `You Have ${activeReminders.length} Missed Reminders!`
                                                : someMissed
                                                    ? `You Have ${activeReminders.length} Reminders (${missedCount} Missed)`
                                                    : `You Have ${activeReminders.length} Pending Reminders`}
                                        </h5>
                                        <p className="mb-0 fs-13 reminder-desc-text">
                                            {allMissed
                                                ? 'These activities have already passed — select one to snooze, reschedule or edit it.'
                                                : someMissed
                                                    ? 'Some of these activities have already passed — select one to review it.'
                                                    : 'Select a reminder to see its client and snooze, edit or dismiss it.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white px-4 py-3">
                                {/* Last 5 reminder items list */}
                                <div className="mb-3">
                                    {activeReminders.slice(0, 5).map((r, idx) => {
                                        // Same as the single-reminder view: the activity's own
                                        // date/time decides "missed", not when the alert fired.
                                        const dateLabel = r.display?.activity_datetime ?? '—';
                                        const itemIsPastDue = !!r.is_past_due;
                                        const client = r.client;
                                        return (
                                            <div
                                                key={r.id}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => focusReminder(r.id)}
                                                onKeyDown={(e) => { if (e.key === 'Enter') focusReminder(r.id); }}
                                                className={`py-2 px-2 reminder-list-item-clickable ${idx < Math.min(activeReminders.length, 5) - 1 ? 'border-bottom' : ''}`}
                                            >
                                                {/* Compact row so five reminders fit without scrolling:
                                                    1) title + status, 2) who (type, name, business, phone, email) and
                                                    when, 3) the actions. */}
                                                <div className="d-flex align-items-center justify-content-between gap-2">
                                                    <p className="mb-0 fw-semibold text-dark text-truncate fs-13">{r.summary || r.title || 'Reminder'}</p>
                                                    {itemIsPastDue ? (
                                                        <span className="badge bg-danger-subtle text-danger fs-11 fw-medium flex-shrink-0">Missed</span>
                                                    ) : (
                                                        <span className="badge bg-warning-subtle text-warning fs-11 fw-medium flex-shrink-0">Pending</span>
                                                    )}
                                                </div>
                                                <div className="d-flex align-items-center flex-wrap column-gap-2 reminder-list-client">
                                                    {client?.name ? (
                                                        <>
                                                            <span className="badge bg-primary-subtle text-primary fs-10 fw-semibold">{client.type_label}</span>
                                                            <span className="fw-medium text-dark">{client.name}</span>
                                                            {client.business_name && client.business_name !== client.name && (
                                                                <span><i className="ri-building-line me-1"></i>{client.business_name}</span>
                                                            )}
                                                            {client.phone && (
                                                                <a href={`tel:${client.phone}`} className="text-muted" onClick={(e) => e.stopPropagation()}>
                                                                    <i className="ri-phone-line me-1"></i>{client.phone}
                                                                </a>
                                                            )}
                                                            {client.email && (
                                                                <a href={`mailto:${client.email}`} className="text-muted text-break" onClick={(e) => e.stopPropagation()}>
                                                                    <i className="ri-mail-line me-1"></i>{client.email}
                                                                </a>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span><i className="ri-user-unfollow-line me-1"></i>No client linked</span>
                                                    )}
                                                    {/* toTimezone()-formatted by the API */}
                                                    <span><i className="ri-time-line me-1"></i>{dateLabel}</span>
                                                </div>

                                                {/* The same Snooze / Reschedule panels and Edit flow as the
                                                    single-reminder view. Edit only on activities you created. */}
                                                <div className="d-flex flex-wrap gap-1 mt-1" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                                                    <button
                                                        type="button"
                                                        className="btn fw-semibold d-flex align-items-center btn-reminder-secondary reminder-list-action"
                                                        onClick={() => openReminderPanel(r.id, 'snooze')}
                                                        disabled={isBusy}
                                                    >
                                                        <i className="ri-timer-line me-1"></i> Snooze
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn fw-semibold d-flex align-items-center btn-reminder-secondary reminder-list-action"
                                                        onClick={() => openReminderPanel(r.id, 'reschedule')}
                                                        disabled={isBusy}
                                                    >
                                                        <i className="ri-calendar-event-line me-1"></i> Reschedule
                                                    </button>
                                                    {r.activity_log_id && r.activity_can_edit && (
                                                        <button
                                                            type="button"
                                                            className="btn fw-semibold d-flex align-items-center btn-light reminder-list-action"
                                                            onClick={() => editReminder(r)}
                                                            disabled={isBusy}
                                                        >
                                                            {loadingAction === `edit:${r.id}`
                                                                ? <span className="spinner-border spinner-border-sm me-1"></span>
                                                                : <i className="ri-edit-2-line me-1"></i>}
                                                            Edit Reminder
                                                        </button>
                                                    )}
                                                    {getReminderClientPath(client) && (
                                                        <Link
                                                            to={getReminderClientPath(client) as string}
                                                            onClick={goToClient}
                                                            className="btn btn-soft-primary fw-semibold d-flex align-items-center reminder-list-action"
                                                        >
                                                            <i className="ri-user-shared-line me-1"></i> {getReminderClientLinkLabel(client)}
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {activeReminders.length > 5 && (
                                        <div className="reminder-more-badge">
                                            + {activeReminders.length - 5} more reminders
                                        </div>
                                    )}
                                </div>

                                <div className="d-flex gap-3">
                                    <button
                                        type="button"
                                        className="btn w-50 fw-bold d-flex align-items-center justify-content-center btn-reminder-secondary"
                                        onClick={dismissAllReminders}
                                        disabled={loadingAction === 'dismissAll'}
                                    >
                                        {loadingAction === 'dismissAll' ? (
                                            <><span className="spinner-border spinner-border-sm me-2"></span> Dismissing All...</>
                                        ) : (
                                            <><i className="ri-check-double-line me-2 fs-16"></i> Dismiss All</>
                                        )}
                                    </button>
                                    <Link
                                        to="/reminders"
                                        onClick={toggle}
                                        className="btn w-50 fw-bold d-flex align-items-center justify-content-center btn-light"
                                    >
                                        <i className="ri-list-check-2 me-2 fs-16"></i> All Reminders
                                    </Link>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="px-4 py-3 position-relative reminder-premium-header">
                                <div className="reminder-header-glow"></div>

                                <button
                                    type="button"
                                    className="position-absolute bg-transparent border-0 text-white reminder-close-btn"
                                    onClick={toggle}
                                >
                                    <i className="ri-close-line"></i>
                                </button>

                                {canGoBack && (
                                    <button
                                        type="button"
                                        className="btn btn-link p-0 mb-2 fs-12 fw-semibold text-decoration-none position-relative reminder-desc-text"
                                        onClick={() => focusReminder(null)}
                                        disabled={isBusy}
                                    >
                                        <i className="ri-arrow-left-line me-1"></i> Back to all reminders ({activeReminders.length})
                                    </button>
                                )}

                                <div className="d-flex align-items-start position-relative">
                                    <div className="flex-shrink-0 me-3">
                                        <div className="avatar-md reminder-header-avatar">
                                            <span className="avatar-title rounded-circle reminder-icon-wrapper">
                                                <i className="ri-notification-3-fill reminder-header-bell"></i>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex-grow-1 text-white">
                                        <span className="badge fw-bold mb-2 reminder-badge">{isPastDue ? 'MISSED' : 'REMINDER'}</span>
                                        <h5 className="mb-1 text-white fw-bold fs-18">
                                            {isPastDue ? `You Missed ${typeArticle} ${typeStr}!` : `You Have an Upcoming ${typeStr}!`}
                                        </h5>
                                        <p className="mb-0 fs-13 reminder-desc-text">
                                            {isPastDue ? 'This activity has already passed — snooze, reschedule or dismiss it.' : 'Stay on track and never miss important activities.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white px-4 py-3">
                                <div className="d-flex mb-3">
                                    <div className="flex-shrink-0 me-4 rounded border border-light reminder-calendar-box">
                                        <div className="text-center py-1 fw-bold text-uppercase reminder-calendar-header">
                                            {monthYear}
                                        </div>
                                        <div className="text-center bg-white py-2">
                                            <h3 className="mb-0 fw-bold text-dark lh-1 reminder-calendar-day">{dayNum}</h3>
                                            <span className="fs-11 fw-bold d-block mt-1 reminder-calendar-weekday">{dayName}</span>
                                        </div>
                                    </div>

                                    <div className="flex-grow-1 pt-1 overflow-hidden">
                                        <div className="d-flex align-items-start mb-1 gap-2">
                                            <h5 className="mb-0 text-dark fw-bold fs-16 text-break">{mainReminder.summary || mainReminder.title || 'Reminder'}</h5>
                                            <span className="badge fw-bold rounded-pill px-2 flex-shrink-0 reminder-type-badge">{typeStr.toUpperCase()}</span>
                                        </div>
                                        <p className="fs-13 mb-2 reminder-desc-text">
                                            {isPastDue ? `You missed ${typeArticle} ${lowerType}` : `You have an upcoming ${lowerType}`}
                                        </p>
                                        <div className="d-flex align-items-center fs-13 fw-medium reminder-meta-text">
                                            <i className="ri-time-line me-1"></i> {timeStr} <span className="mx-2">•</span> {fullDateStr}
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <ReminderClientCard
                                        client={mainReminder.client}
                                        onNavigate={goToClient}
                                    />
                                </div>

                                {/* The activity's details in their own box, like the client card above:
                                    label above value, side by side, wrapping only when there isn't room. */}
                                <div className="reminder-details-box rounded border p-3 mb-3 fs-13">
                                    <h6 className="fw-bold text-dark mb-2 fs-14 d-flex align-items-center">
                                        <i className="ri-file-list-3-line me-2 text-dark reminder-section-icon"></i> {typeStr} Details
                                    </h6>

                                    <div className="d-flex flex-wrap column-gap-4 row-gap-2">
                                        <div className="flex-shrink-0">
                                            <div className="fw-medium d-flex align-items-center reminder-meta-text">
                                                <i className="ri-calendar-line me-2 fs-15 reminder-desc-text"></i> Reminder Time
                                            </div>
                                            <div className="text-dark fw-bold">{reminderTimeShortStr} at {reminderTimeStr}</div>
                                        </div>
                                        {!noteOnOwnLine && (
                                            <div className="flex-shrink-0">
                                                <div className="fw-medium d-flex align-items-center reminder-meta-text">
                                                    <i className="ri-file-text-line me-2 fs-15 reminder-desc-text"></i> Notes
                                                </div>
                                                <div className="text-dark fw-medium text-break">{noteText || 'No notes provided.'}</div>
                                            </div>
                                        )}
                                        {hasAttachments && (
                                            <div className="reminder-detail-files">
                                                <div className="fw-medium d-flex align-items-center reminder-meta-text">
                                                    <i className="ri-attachment-2 me-2 fs-15 reminder-desc-text"></i> Attached Files
                                                </div>
                                                <ReminderAttachments
                                                    reminderId={mainReminder.id}
                                                    attachments={mainReminder.attachments}
                                                    compact
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* A long note always gets its own row. */}
                                    {noteOnOwnLine && (
                                        <div className="mt-2 pt-2 border-top reminder-details-divider">
                                            <div className="fw-medium d-flex align-items-center reminder-meta-text">
                                                <i className="ri-file-text-line me-2 fs-15 reminder-desc-text"></i> Notes
                                            </div>
                                            <div className={`text-dark fw-medium text-break ${noteNeedsSeeMore && !notesExpanded ? 'reminder-note-clamped' : ''}`}>
                                                {noteText}
                                            </div>
                                            {noteNeedsSeeMore && (
                                                <button
                                                    type="button"
                                                    className="btn btn-link p-0 fs-12 fw-semibold text-decoration-none"
                                                    onClick={() => setNotesExpanded((v) => !v)}
                                                >
                                                    {notesExpanded
                                                        ? <><i className="ri-arrow-up-s-line"></i> See less</>
                                                        : <><i className="ri-arrow-down-s-line"></i> See more</>}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {mainReminder.last_snooze_note && (
                                        <div className="mt-2 pt-2 border-top reminder-details-divider">
                                            <div className="fw-medium d-flex align-items-center reminder-meta-text">
                                                <i className="ri-timer-line me-2 fs-15 reminder-desc-text"></i> Snooze / Reschedule Note
                                            </div>
                                            <div className="text-dark fw-medium text-break">{mainReminder.last_snooze_note}</div>
                                        </div>
                                    )}
                                </div>

                                {/* Snooze | Reschedule | Dismiss on one row. */}
                                <div className="row g-2">
                                    <div className="col-4">
                                        <button
                                            type="button"
                                            className={`btn w-100 fw-semibold d-flex align-items-center justify-content-center btn-reminder-secondary ${showSnooze ? 'is-active' : ''}`}
                                            onClick={() => { setShowCustomReschedule(false); setShowSnooze((v) => !v); }}
                                            disabled={isBusy}
                                        >
                                            <i className="ri-timer-line me-2 fs-16"></i> Snooze
                                        </button>
                                    </div>
                                    <div className="col-4">
                                        <button
                                            type="button"
                                            className={`btn w-100 fw-semibold d-flex align-items-center justify-content-center btn-reminder-secondary ${showCustomReschedule ? 'is-active' : ''}`}
                                            onClick={() => { setShowSnooze(false); setShowCustomReschedule((v) => !v); }}
                                            disabled={isBusy}
                                        >
                                            <i className="ri-calendar-event-line me-2 fs-16"></i> Reschedule
                                        </button>
                                    </div>
                                    <div className="col-4">
                                        <button
                                            type="button"
                                            className="btn w-100 fw-semibold d-flex align-items-center justify-content-center btn-light"
                                            onClick={() => dismissReminder(mainReminder.id)}
                                            disabled={isBusy}
                                        >
                                            {loadingAction === 'dismiss' ? (
                                                <><span className="spinner-border spinner-border-sm me-2"></span> Dismissing...</>
                                            ) : (
                                                <><i className="ri-notification-off-line me-2 fs-16"></i> Dismiss</>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {showSnooze && (
                                    <div className="mt-3">
                                        <ReminderSnoozeForm
                                            key={mainReminder.id}
                                            loading={loadingAction === 'snooze'}
                                            serverErrors={snoozeErrors}
                                            onConfirm={(minutes, note) => snoozeReminder(mainReminder.id, minutes, note)}
                                            onCancel={() => { setShowSnooze(false); setSnoozeErrors(null); }}
                                        />
                                    </div>
                                )}

                                {showCustomReschedule && (
                                    <div className="mt-3">
                                        <ReminderRescheduleForm
                                            key={mainReminder.id}
                                            loading={loadingAction === 'snooze'}
                                            onConfirm={(rescheduleAt, leadMinutes, note) => rescheduleReminder(mainReminder.id, rescheduleAt, leadMinutes, note)}
                                            onCancel={() => setShowCustomReschedule(false)}
                                        />
                                    </div>
                                )}

                                {/* Edit Reminder | All Reminders — the same row as the Task &
                                    Reminder Details modal's Edit Reminder | Close. Edit only
                                    on activities you created; otherwise All Reminders takes
                                    the full row. */}
                                <div className={`row g-2 ${panelOpen ? 'mt-3' : 'mt-2'}`}>
                                    {canEdit && (
                                        <div className="col-md-6">
                                            <button
                                                type="button"
                                                className="btn w-100 fw-semibold d-flex align-items-center justify-content-center btn-light"
                                                onClick={() => editReminder(mainReminder)}
                                                disabled={isBusy}
                                            >
                                                {loadingAction === `edit:${mainReminder.id}`
                                                    ? <span className="spinner-border spinner-border-sm me-2"></span>
                                                    : <i className="ri-edit-2-line me-2 fs-16"></i>}
                                                Edit Reminder
                                            </button>
                                        </div>
                                    )}
                                    <div className={canEdit ? 'col-md-6' : 'col-12'}>
                                        <Link
                                            to="/reminders"
                                            onClick={toggle}
                                            className="btn w-100 fw-semibold d-flex align-items-center justify-content-center btn-light"
                                        >
                                            <i className="ri-list-check-2 me-2 fs-16"></i> All Reminders
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </>
    );
};

export default ReminderModal;
