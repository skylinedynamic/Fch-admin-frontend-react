export const REMINDER_TYPES = [
    { label: 'Event', value: 'Event' },
    { label: 'Meeting', value: 'Meeting' },
    { label: 'Call', value: 'Call' },
    { label: 'Email', value: 'Email' },
    { label: 'Task', value: 'Task' },
    { label: 'Other', value: 'Other' }
];

export const REMINDER_TYPE_VALUES = REMINDER_TYPES.map(type => type.value);

export const REMINDER_STATUS_PENDING = 'pending';
export const REMINDER_STATUS_SENT = 'sent';
export const REMINDER_STATUS_CANCELLED = 'cancelled';
// Not a stored status — the backend's statusFilter scope treats this as a
// virtual filter (pending/sent whose activity date has already passed),
// matching isReminderMissed below.
export const REMINDER_STATUS_MISSED = 'missed';

export const REMINDER_STATUS_OPTIONS = [
    { label: 'Pending', value: REMINDER_STATUS_PENDING },
    { label: 'Sent', value: REMINDER_STATUS_SENT },
    { label: 'Missed', value: REMINDER_STATUS_MISSED },
    { label: 'Dismissed', value: REMINDER_STATUS_CANCELLED }
];

export const REMINDER_TYPE_ICONS: Record<string, string> = {
    'Call': 'ri-phone-line',
    'Email': 'ri-mail-line',
    'Text': 'ri-message-line',
    'Event': 'ri-calendar-event-line',
    'Task': 'ri-task-line',
    'Meeting': 'ri-group-line',
    'Other': 'ri-calendar-todo-line'
};

export const getReminderTypeIcon = (type: string | undefined): string => {
    return (type && REMINDER_TYPE_ICONS[type]) || 'ri-group-line';
};

export const getReminderStatusBadgeClasses = (status: string | undefined): string => {
    switch (status) {
        case REMINDER_STATUS_PENDING: return 'bg-warning-subtle text-warning';
        case REMINDER_STATUS_SENT: return 'bg-success-subtle text-success';
        case REMINDER_STATUS_CANCELLED: return 'bg-secondary-subtle text-secondary';
        default: return 'bg-light text-dark';
    }
};

export const getReminderStatusLabel = (status: string | undefined): string => {
    switch (status) {
        case REMINDER_STATUS_PENDING: return 'Pending';
        case REMINDER_STATUS_SENT: return 'Sent';
        case REMINDER_STATUS_CANCELLED: return 'Dismissed';
        default: return status || '';
    }
};

interface ReminderLike {
    status?: string;
    set_date_time?: string;
    send_at?: string;
    reminder_date_time?: string;
}

// "Missed" isn't a backend status — pending/sent both stay actionable
// (dismiss/reschedule) until the user handles them. This mirrors the due-
// reminder popup's isPastDue check: the activity's own date/time decides
// "missed", not whether the alert already fired, and only pending/sent
// reminders can be missed (a dismissed one is just dismissed).
export const isReminderMissed = (reminder: ReminderLike): boolean => {
    if (reminder.status !== REMINDER_STATUS_PENDING && reminder.status !== REMINDER_STATUS_SENT) return false;
    const d = reminder.set_date_time || reminder.send_at || reminder.reminder_date_time;
    return !!d && new Date(d).getTime() < Date.now();
};

export const getEffectiveReminderStatusLabel = (reminder: ReminderLike): string =>
    isReminderMissed(reminder) ? 'Missed' : getReminderStatusLabel(reminder.status);

export const getEffectiveReminderStatusBadgeClasses = (reminder: ReminderLike): string =>
    isReminderMissed(reminder) ? 'bg-danger-subtle text-danger' : getReminderStatusBadgeClasses(reminder.status);
