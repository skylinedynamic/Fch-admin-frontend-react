import React, { useState, useEffect } from 'react';
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

const ReminderModal = () => {
    const { token } = useAuthStore();

    const [reminders, setReminders] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loadingAction, setLoadingAction] = useState(null);

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
                const fetchedReminders =
                    response.data.data.reminders;

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

    // Fetch on mount and on route change
    useEffect(() => {
        fetchDueReminders();
    }, [token, location.pathname]);

    // WebSocket listener (only initialize once per user session)
    useEffect(() => {
        if (token) {
            const userId = useAuthStore.getState().user?.id;

            if (userId) {
                const echo = initEcho();
                if (echo) {
                    echo.private(`App.Models.User.${userId}`)
                        .listen('.reminder.due', (e) => {
                            if (e && e.reminder) {
                                // Add the new reminder to the top of the list and open modal
                                setReminders(prev => {
                                    // Avoid duplicates
                                    if (prev.find(r => r.id === e.reminder.id)) return prev;
                                    return [e.reminder, ...prev];
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

    // Toggle modal
    const toggle = () => {
        setIsOpen(!isOpen);
    };

    // Dismiss reminder
    const dismissReminder = async (id) => {
        setLoadingAction('dismiss');

        try {
            const response = await api.post(
                `/common/reminders/${id}/dismiss`
            );

            toast.success(
                response.data?.message ||
                'Reminder dismissed successfully'
            );

            setIsOpen(false);

            setTimeout(() => {
                setReminders((prev) =>
                    prev.filter((r) => r.id !== id)
                );
            }, 300);
        } catch (error) {
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
            const ids = reminders.map(r => r.id);
            await api.post('/common/reminders/bulk-dismiss', { ids });

            toast.success('All reminders dismissed successfully');

            setIsOpen(false);

            setTimeout(() => {
                setReminders([]);
            }, 300);
        } catch (error) {
            toast.error('Failed to dismiss reminders');
            console.error('Failed to dismiss all reminders:', error);
        } finally {
            setLoadingAction(null);
        }
    };

    // Snooze reminder
    const snoozeReminder = async (id, minutes) => {
        setLoadingAction('snooze');

        try {
            const response = await api.post(
                `/common/reminders/${id}/snooze`,
                { minutes }
            );

            toast.success(
                response.data?.message ||
                'Reminder snoozed successfully'
            );

            setIsOpen(false);

            setTimeout(() => {
                setReminders((prev) =>
                    prev.filter((r) => r.id !== id)
                );
            }, 300);
        } catch (error) {
            toast.error(
                error.response?.data?.message ||
                'Failed to snooze reminder'
            );

            console.error(
                'Failed to snooze reminder:',
                error
            );
        } finally {
            setLoadingAction(null);
        }
    };

    // Don't show if there are no reminders
    if (reminders.length === 0) return null;

    // Don't show on reminders page
    if (location.pathname.startsWith('/reminders')) {
        return null;
    }

    const isMultiple = reminders.length > 1;

    // For single view
    const mainReminder = reminders[0];
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

    const stripHtml = (html) => {
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
                                    <span className="badge fw-bold mb-2 reminder-badge">PENDING REMINDERS</span>
                                    <h5 className="mb-1 text-white fw-bold fs-18">You Have {reminders.length} Pending Reminders</h5>
                                    <p className="mb-0 fs-13 reminder-desc-text">Stay on track and never miss important activities.</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white px-4 py-3">
                            {/* Last 5 reminder items list */}
                            <div className="mb-3">
                                {reminders.slice(0, 5).map((r, idx) => {
                                    const d = r.reminder_date_time || r.set_date_time || r.send_at;
                                    const dateObj = d ? new Date(d) : null;
                                    const dateLabel = dateObj
                                        ? dateObj.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
                                        : '—';
                                    return (
                                        <div key={r.id} className={`d-flex align-items-center gap-3 py-2 ${idx < Math.min(reminders.length, 5) - 1 ? 'border-bottom' : ''}`}>
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
                                            <span className="badge bg-warning-subtle text-warning fs-11 fw-medium">Pending</span>
                                        </div>
                                    );
                                })}
                                {reminders.length > 5 && (
                                    <div className="reminder-more-badge">
                                        + {reminders.length - 5} more reminders
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
                                    <span className="badge fw-bold mb-2 reminder-badge">REMINDER</span>
                                    <h5 className="mb-1 text-white fw-bold fs-18">You Have an Upcoming {typeStr}!</h5>
                                    <p className="mb-0 fs-13 reminder-desc-text">Stay on track and never miss important activities.</p>
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
                                    <p className="fs-13 mb-2 reminder-desc-text">You have an upcoming {lowerType}</p>
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

                            <div className="text-center mt-3">
                                <Link
                                    to="/reminders"
                                    onClick={toggle}
                                    className="d-inline-flex align-items-center fw-semibold fs-14 text-decoration-none reminder-meta-text"
                                >
                                    <i className="ri-list-check-2 me-1 fs-18"></i> All Reminders
                                </Link>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
};

export default ReminderModal;