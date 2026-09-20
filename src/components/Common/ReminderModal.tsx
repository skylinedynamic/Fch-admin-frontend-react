import React, { useState, useEffect, useRef } from 'react';
import {
    Modal,
    UncontrolledDropdown,
    DropdownToggle,
    DropdownMenu,
    DropdownItem
} from 'reactstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { apiClient as api } from '../../lib/http/apiClient';
import { useAuthStore } from '../../store/auth/authStore';
import '../../assets/css/reminder.css';
import { initEcho } from '../../lib/echo';
import { ReminderRescheduleForm, ReminderRescheduleFormHandle } from './ReminderRescheduleForm';

const ReminderModal = () => {
    const { token } = useAuthStore();

    const [reminders, setReminders] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loadingAction, setLoadingAction] = useState<'dismiss' | 'dismissAll' | 'snooze' | null>(null);
    const [showCustomReschedule, setShowCustomReschedule] = useState(false);
    // Only meaningful when showCustomReschedule is true — drive the
    // ReminderRescheduleForm's Confirm button from outside it (combined with
    // the "All Reminders" link below) when the lead time is a simple preset;
    // custom mode keeps Confirm grouped inside the form with Value/Unit.
    const rescheduleFormRef = useRef<ReminderRescheduleFormHandle>(null);
    const [canConfirmReschedule, setCanConfirmReschedule] = useState(false);
    const [isCustomLeadReschedule, setIsCustomLeadReschedule] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();

    // Fetch due reminders
    const fetchDueReminders = async () => {
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

                if (fetchedReminders.length > 0) {
                    setReminders(fetchedReminders);
                    setIsOpen(true);
                } else {
                    setReminders([]);
                    setIsOpen(false);
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
            if (!isOpen) fetchDueReminders();
        }, 30000);
        return () => clearInterval(interval);
    }, [token, isOpen]);

    // WebSocket listener (only initialize once per user session)
    useEffect(() => {
        if (token) {
            const userId = useAuthStore.getState().user?.id;

            if (userId) {
                const echo = initEcho();
                if (echo) {
                    echo.private(`App.Models.User.${userId}`)
                        .listen('.reminder.due', (e: { reminder?: any }) => {
                            if (e && e.reminder) {
                                // Only process if not cancelled
                                if (e.reminder.status === 'cancelled') return;

                                setReminders(prev => {
                                    if (prev.find(r => r.id === e.reminder.id)) return prev;
                                    return [e.reminder, ...prev.filter(r => r.status !== 'cancelled')];
                                });
                                setIsOpen(true);
                            } else {
                                fetchDueReminders();
                            }
                        });

                    return () => {
                        echo.leave(`App.Models.User.${userId}`);
                    };
                }
            }
        }
    }, [token]);

    // Toggle modal. Closing (X) hides the popup.
    const toggle = () => {
        setIsOpen(false);
        setShowCustomReschedule(false);
    };

    // Dismiss reminder
    const dismissReminder = async (id: number) => {
        setLoadingAction('dismiss');

        try {
            const response = await api.post(
                `/common/reminders/${id}/dismiss`
            );

            toast.success(
                response.data?.message ||
                'Reminder dismissed successfully'
            );

            setReminders((prev) => {
                const next = prev.filter((r) => r.id !== id);
                if (next.length === 0) {
                    setIsOpen(false);
                }
                return next;
            });
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

    // Snooze reminder by a fixed number of minutes
    const snoozeReminder = async (id: any, minutes: number) => {
        await postSnooze(id, { minutes }, 'Reminder snoozed successfully', 'Failed to snooze reminder');
    };

    // Reschedule reminder to an exact date & time, alerting the given number
    // of minutes before it (matching the "Remind me X before" dropdown used
    // when creating an activity, instead of silently preserving whatever the
    // reminder's lead time happened to be before).
    const rescheduleReminder = async (id: any, rescheduleAt: string, leadMinutes: number) => {
        const succeeded = await postSnooze(id, { reschedule_at: rescheduleAt, lead_minutes: leadMinutes }, 'Reminder rescheduled successfully', 'Failed to reschedule reminder');
        // Only collapse the picker once the reschedule actually saved — on
        // failure, closing here would silently discard what the user just
        // entered right after telling them it failed, forcing them to redo it.
        if (succeeded) {
            setShowCustomReschedule(false);
        }
    };

    const postSnooze = async (id: any, payload: any, successMessage: string, failureMessage: string): Promise<boolean> => {
        setLoadingAction('snooze');

        try {
            const response = await api.post(
                `/common/reminders/${id}/snooze`,
                payload
            );

            toast.success(response.data?.message || successMessage);

            setReminders((prev) => {
                const next = prev.filter((r) => r.id !== id);
                if (next.length === 0) {
                    setIsOpen(false);
                }
                return next;
            });

            return true;
        } catch (error: any) {
            toast.error(
                error.response?.data?.message || failureMessage
            );

            console.error(failureMessage, error);

            return false;
        } finally {
            setLoadingAction(null);
        }
    };

    const activeReminders = reminders.filter((r: any) => r && r.status !== 'cancelled');

    // Don't show if there are no reminders
    if (activeReminders.length === 0) return null;

    // Don't show on reminders page
    if (location.pathname.startsWith('/reminders')) {
        return null;
    }

    const isMultiple = activeReminders.length > 1;

    // Multi-reminder header: same "missed" definition as the single-reminder
    // view and the per-item badges below (the activity's own date/time, not
    // whether the alert already fired) so the summary text at the top
    // actually matches what the list underneath shows.
    const missedCount = activeReminders.reduce((count, r) => {
        const d = r.set_date_time || r.send_at || r.reminder_date_time;
        return d && new Date(d).getTime() < Date.now() ? count + 1 : count;
    }, 0);
    const allMissed = isMultiple && missedCount === activeReminders.length;
    const someMissed = isMultiple && missedCount > 0 && !allMissed;

    // For single view
    const mainReminder = activeReminders[0];
    // Calendar box + header: the activity's own date/time
    const remindDateSource = mainReminder.set_date_time || mainReminder.send_at || mainReminder.reminder_date_time;
    const remindDate = remindDateSource
        ? new Date(remindDateSource)
        : new Date();
    const dayNum = remindDate.getDate();
    const dayName = remindDate.toLocaleString('en-US', { weekday: 'short' }).toUpperCase();
    const monthName = remindDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const fullDateStr = remindDate.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + ' (' + remindDate.toLocaleString('en-US', { weekday: 'long' }) + ')';
    const timeStr = remindDate.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    // "Reminder Time" row: when the reminder itself is set to fire
    const reminderTimeSource = mainReminder.reminder_date_time || mainReminder.set_date_time || mainReminder.send_at;
    const reminderTimeDate = reminderTimeSource
        ? new Date(reminderTimeSource)
        : new Date();
    const reminderTimeFullDateStr = reminderTimeDate.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) + ' (' + reminderTimeDate.toLocaleString('en-US', { weekday: 'long' }) + ')';
    const reminderTimeStr = reminderTimeDate.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const typeStr = mainReminder.reference_type || 'Meeting';
    const lowerType = typeStr.toLowerCase();
    // Whether the activity itself (the call/meeting, i.e. remindDate) already
    // happened — NOT whether the alert already fired. reminder_date_time is
    // deliberately earlier than set_date_time (e.g. "10 minutes before"), so
    // a due-but-still-upcoming reminder must not read as "missed".
    const isPastDue = remindDate.getTime() < Date.now();

    const stripHtml = (html?: string | null) => {
        if (!html) return '';
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    };

    const noteText = stripHtml(mainReminder.message);

    return (
        <Modal
            isOpen={isOpen}
            toggle={toggle}
            centered
            size="md"
            modalClassName="flip"
            contentClassName="border-0 shadow-lg bg-transparent"
        >
            <div className="reminder-modal-content">
                {isMultiple ? (
                    <>
                        <div className="px-4 py-4 position-relative reminder-premium-header">
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
                                    <div className="avatar-md" style={{ width: '48px', height: '48px' }}>
                                        <span className="avatar-title rounded-circle reminder-icon-wrapper">
                                            <i className="ri-notification-3-fill" style={{ fontSize: '22px' }}></i>
                                        </span>
                                    </div>
                                </div>
                                <div className="flex-grow-1 text-white">
                                    <span className="badge fw-bold mb-2 reminder-badge">
                                        {allMissed ? 'MISSED REMINDERS' : someMissed ? 'REMINDERS' : 'PENDING REMINDERS'}
                                    </span>
                                    <h5 className="mb-1 text-white fw-bold fs-18">
                                        {allMissed
                                            ? `You Have ${reminders.length} Missed Reminders!`
                                            : someMissed
                                                ? `You Have ${reminders.length} Reminders (${missedCount} Missed)`
                                                : `You Have ${reminders.length} Pending Reminders`}
                                    </h5>
                                    <p className="mb-0 fs-13 reminder-desc-text">
                                        {allMissed
                                            ? 'These activities have already passed — reschedule or dismiss them.'
                                            : someMissed
                                                ? 'Some of these activities have already passed — review them below.'
                                                : 'Stay on track and never miss important activities.'}
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
                                    const d = r.set_date_time || r.send_at || r.reminder_date_time;
                                    const dateObj = d ? new Date(d) : null;
                                    const dateLabel = dateObj
                                        ? dateObj.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
                                        : '—';
                                    const itemIsPastDue = dateObj ? dateObj.getTime() < Date.now() : false;
                                    return (
                                        <div key={r.id} className={`d-flex align-items-center gap-3 py-2 ${idx < Math.min(activeReminders.length, 5) - 1 ? 'border-bottom' : ''}`}>
                                            <div className="avatar-xs flex-shrink-0">
                                                <span className="avatar-title rounded-circle reminder-feature-icon fs-14">
                                                    <i className="ri-notification-3-line"></i>
                                                </span>
                                            </div>
                                            <div className="flex-grow-1 overflow-hidden">
                                                <p className="mb-0 fw-semibold text-dark text-truncate fs-13">{r.summary || r.title || 'Reminder'}</p>
                                                <span className="text-muted fs-12">
                                                    <i className="ri-time-line me-1"></i>{dateLabel}
                                                </span>
                                            </div>
                                            {itemIsPastDue ? (
                                                <span className="badge bg-danger-subtle text-danger fs-11 fw-medium">Missed</span>
                                            ) : (
                                                <span className="badge bg-warning-subtle text-warning fs-11 fw-medium">Pending</span>
                                            )}
                                        </div>
                                    );
                                })}
                                {activeReminders.length > 5 && (
                                    <div className="reminder-more-badge">
                                        + {activeReminders.length - 5} more reminders
                                    </div>
                                )}
                            </div>

                            <div className="d-flex gap-3 mt-3">
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
                        <div className="px-4 py-4 position-relative reminder-premium-header">
                            <div className="reminder-header-glow"></div>

                            <button
                                type="button"
                                className="position-absolute bg-transparent border-0 text-white reminder-close-btn"
                                onClick={toggle}
                            >
                                <i className="ri-close-line"></i>
                            </button>

                            <div className="d-flex align-items-start position-relative">
                                <div className="flex-shrink-0 me-3">
                                    <div className="avatar-md" style={{ width: '48px', height: '48px' }}>
                                        <span className="avatar-title rounded-circle reminder-icon-wrapper">
                                            <i className="ri-notification-3-fill" style={{ fontSize: '22px' }}></i>
                                        </span>
                                    </div>
                                </div>
                                <div className="flex-grow-1 text-white">
                                    <span className="badge fw-bold mb-2 reminder-badge">{isPastDue ? 'MISSED' : 'REMINDER'}</span>
                                    <h5 className="mb-1 text-white fw-bold fs-18">
                                        {isPastDue ? `You Missed a ${typeStr}!` : `You Have an Upcoming ${typeStr}!`}
                                    </h5>
                                    <p className="mb-0 fs-13 reminder-desc-text">
                                        {isPastDue ? 'This activity has already passed — reschedule it or dismiss it.' : 'Stay on track and never miss important activities.'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white px-4 py-4">
                            <div className="d-flex mb-4">
                                <div className="flex-shrink-0 me-4 rounded border border-light reminder-calendar-box">
                                    <div className="text-center py-1 fw-bold text-uppercase reminder-calendar-header">
                                        {monthName} {remindDate.getFullYear()}
                                    </div>
                                    <div className="text-center bg-white py-2">
                                        <h3 className="mb-0 fw-bold text-dark lh-1 reminder-calendar-day">{dayNum}</h3>
                                        <span className="fs-11 fw-bold d-block mt-1 reminder-calendar-weekday">{dayName}</span>
                                    </div>
                                </div>

                                <div className="flex-grow-1 pt-1">
                                    <div className="d-flex align-items-center mb-1 gap-2">
                                        <h5 className="mb-0 text-dark fw-bold fs-16">{mainReminder.summary || mainReminder.title || 'Reminder'}</h5>
                                        <span className="badge fw-bold rounded-pill px-2 reminder-type-badge">{typeStr.toUpperCase()}</span>
                                    </div>
                                    <p className="fs-13 mb-2 reminder-desc-text">
                                        {isPastDue ? `You missed a ${lowerType}` : `You have an upcoming ${lowerType}`}
                                    </p>
                                    <div className="d-flex align-items-center fs-13 fw-medium reminder-meta-text">
                                        <i className="ri-time-line me-1"></i> {timeStr} <span className="mx-2">•</span> {fullDateStr}
                                    </div>
                                </div>
                            </div>

                            <hr className="border-dashed mb-4 reminder-border-dashed" />

                            <h6 className="fw-bold text-dark mb-3 fs-14 d-flex align-items-center">
                                <i className="ri-file-list-3-line me-2 text-dark" style={{ fontSize: '18px' }}></i> {typeStr} Details
                            </h6>

                            <div className="mb-4">
                                <div className="d-flex justify-content-between mb-3">
                                    <span className="fw-medium fs-13 d-flex align-items-center reminder-meta-text">
                                        <i className="ri-calendar-line me-2 fs-15 reminder-desc-text"></i> Reminder Time
                                    </span>
                                    <span className="text-dark fw-bold fs-13">{reminderTimeFullDateStr} at {reminderTimeStr}</span>
                                </div>
                                <div className="d-flex justify-content-between mb-3">
                                    <span className="fw-medium fs-13 d-flex align-items-center reminder-meta-text flex-shrink-0">
                                        <i className="ri-file-text-line me-2 fs-15 reminder-desc-text"></i> Notes
                                    </span>
                                    <span className="text-dark fw-medium fs-13 text-truncate d-inline-block" style={{ maxWidth: '70%' }} title={noteText}>
                                        {noteText || 'No notes provided.'}
                                    </span>
                                </div>
                            </div>

                            <div className="rounded p-3 mb-4 d-flex justify-content-between text-center reminder-features-box">
                                <div className="px-1">
                                    <div className="avatar-xs mx-auto mb-2">
                                        <span className="avatar-title rounded-circle reminder-feature-icon"><i className="ri-calendar-todo-line fs-16"></i></span>
                                    </div>
                                    <span className="fw-bold text-dark d-block reminder-feature-text">Stay<br />Organized</span>
                                </div>
                                <div className="px-1">
                                    <div className="avatar-xs mx-auto mb-2">
                                        <span className="avatar-title rounded-circle reminder-feature-icon"><i className="ri-time-line fs-16"></i></span>
                                    </div>
                                    <span className="fw-bold text-dark d-block reminder-feature-text">Meet on<br />Time</span>
                                </div>
                                <div className="px-1">
                                    <div className="avatar-xs mx-auto mb-2">
                                        <span className="avatar-title rounded-circle reminder-feature-icon"><i className="ri-bar-chart-box-line fs-16"></i></span>
                                    </div>
                                    <span className="fw-bold text-dark d-block reminder-feature-text">Boost<br />Productivity</span>
                                </div>
                                <div className="px-1">
                                    <div className="avatar-xs mx-auto mb-2">
                                        <span className="avatar-title rounded-circle reminder-feature-icon"><i className="ri-notification-3-line fs-16"></i></span>
                                    </div>
                                    <span className="fw-bold text-dark d-block reminder-feature-text">Never Miss<br />Important Calls</span>
                                </div>
                            </div>

                            <div className="d-flex gap-3 mb-2">
                                {isPastDue ? (
                                    <button
                                        type="button"
                                        className="btn w-50 fw-semibold d-flex align-items-center justify-content-center btn-reminder-secondary"
                                        onClick={() => setShowCustomReschedule((v) => !v)}
                                        disabled={loadingAction === 'snooze' || loadingAction === 'dismiss'}
                                    >
                                        <i className="ri-calendar-event-line me-2 fs-16"></i> Reschedule
                                    </button>
                                ) : (
                                    <UncontrolledDropdown className="w-50">
                                        <DropdownToggle
                                            caret={false}
                                            className="btn w-100 fw-semibold d-flex align-items-center justify-content-center btn-reminder-secondary"
                                            disabled={loadingAction === 'snooze' || loadingAction === 'dismiss'}
                                        >
                                            {loadingAction === 'snooze' ? (
                                                <><span className="spinner-border spinner-border-sm me-2"></span> Snoozing...</>
                                            ) : (
                                                <><i className="ri-timer-line me-2 fs-16"></i> Snooze <i className="ri-arrow-down-s-line ms-1"></i></>
                                            )}
                                        </DropdownToggle>

                                        <DropdownMenu className="w-100 shadow-lg border-0 mt-1">
                                            <DropdownItem onClick={() => snoozeReminder(mainReminder.id, 5)} className="py-2 fs-14 fw-medium text-dark">Snooze for 5 mins</DropdownItem>
                                            <DropdownItem onClick={() => snoozeReminder(mainReminder.id, 15)} className="py-2 fs-14 fw-medium text-dark">Snooze for 15 mins</DropdownItem>
                                            <DropdownItem onClick={() => snoozeReminder(mainReminder.id, 60)} className="py-2 fs-14 fw-medium text-dark">Snooze for 1 hour</DropdownItem>
                                            <DropdownItem onClick={() => snoozeReminder(mainReminder.id, 1440)} className="py-2 fs-14 fw-medium text-dark">Snooze for 1 day</DropdownItem>
                                        </DropdownMenu>
                                    </UncontrolledDropdown>
                                )}

                                <button
                                    type="button"
                                    className="btn w-50 fw-semibold d-flex align-items-center justify-content-center btn-light"
                                    onClick={() => dismissReminder(mainReminder.id)}
                                    disabled={loadingAction === 'dismiss' || loadingAction === 'snooze'}
                                >
                                    {loadingAction === 'dismiss' ? (
                                        <><span className="spinner-border spinner-border-sm me-2"></span> Dismissing...</>
                                    ) : (
                                        <><i className="ri-notification-off-line me-2 fs-16"></i> Dismiss</>
                                    )}
                                </button>
                            </div>

                            {isPastDue && showCustomReschedule && (
                                <ReminderRescheduleForm
                                    ref={rescheduleFormRef}
                                    externalConfirm
                                    loading={loadingAction === 'snooze'}
                                    onConfirm={(rescheduleAt, leadMinutes) => rescheduleReminder(mainReminder.id, rescheduleAt, leadMinutes)}
                                    onValidityChange={setCanConfirmReschedule}
                                    onModeChange={setIsCustomLeadReschedule}
                                />
                            )}

                            {isPastDue && showCustomReschedule && !isCustomLeadReschedule ? (
                                <div className="row g-2 mt-3">
                                    <div className="col-6">
                                        <button
                                            type="button"
                                            className="btn w-100 fw-semibold d-flex align-items-center justify-content-center btn-reminder-secondary"
                                            style={{ height: '38px' }}
                                            disabled={!canConfirmReschedule}
                                            onClick={() => rescheduleFormRef.current?.confirm()}
                                        >
                                            {loadingAction === 'snooze' ? (
                                                <span className="spinner-border spinner-border-sm"></span>
                                            ) : (
                                                <><i className="ri-check-line me-1 fs-16"></i> Confirm</>
                                            )}
                                        </button>
                                    </div>
                                    <div className="col-6">
                                        <Link
                                            to="/reminders"
                                            onClick={toggle}
                                            className="btn w-100 fw-bold d-flex align-items-center justify-content-center btn-light"
                                            style={{ height: '38px' }}
                                        >
                                            <i className="ri-list-check-2 me-2 fs-16"></i> All Reminders
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-3">
                                    <Link
                                        to="/reminders"
                                        onClick={toggle}
                                        className="btn w-100 fw-bold d-flex align-items-center justify-content-center btn-light"
                                    >
                                        <i className="ri-list-check-2 me-2 fs-16"></i> All Reminders
                                    </Link>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default ReminderModal;