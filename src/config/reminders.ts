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

// Dates and times exactly as the reminder screens show them — formatted by the
// API's toTimezone() helper in the viewer's timezone, displayed as-is.
export interface ReminderDisplay {
    activity_date?: string | null;          // September 17, 2026
    activity_time?: string | null;          // 1:48 PM
    activity_weekday?: string | null;       // Thursday
    activity_weekday_short?: string | null; // Thu
    activity_day?: string | null;           // 17
    activity_month_year?: string | null;    // Sep 2026
    activity_datetime?: string | null;      // Sep 17, 2026, 01:48 PM
    reminder_date?: string | null;          // September 17, 2026
    reminder_date_short?: string | null;    // Sep 17, 2026
    reminder_time?: string | null;          // 1:33 PM
}

interface ReminderLike {
    status?: string;
    // The activity's own time has passed — decided by the API.
    is_past_due?: boolean;
}

// "Missed" isn't a backend status — pending/sent both stay actionable
// (dismiss/reschedule) until the user handles them. The activity's own
// date/time decides "missed" (the API's is_past_due), not whether the alert
// already fired, and only pending/sent reminders can be missed (a dismissed
// one is just dismissed).
export const isReminderMissed = (reminder: ReminderLike): boolean =>
    (reminder.status === REMINDER_STATUS_PENDING || reminder.status === REMINDER_STATUS_SENT)
    && !!reminder.is_past_due;

export const getEffectiveReminderStatusLabel = (reminder: ReminderLike): string =>
    isReminderMissed(reminder) ? 'Missed' : getReminderStatusLabel(reminder.status);

export interface ReminderClient {
    type: 'borrower' | 'lead' | 'partner' | 'employee' | 'admin' | 'user' | null;
    type_label: string;
    id: number | null;
    name: string | null;
    business_name?: string | null;
    email?: string | null;
    phone?: string | null;
}

export interface ReminderRelated {
    type: 'funding_request' | 'funding_application';
    id: number;
    label: string;
}

export interface ReminderSnoozeEntry {
    action: 'snoozed' | 'rescheduled';
    minutes?: number | null;
    note?: string | null;
    snoozed_at?: string | null;
    snoozed_until?: string | null;
    // Formatted by the API's toTimezone() — shown as-is.
    snoozed_at_display?: string | null;
    snoozed_until_display?: string | null;
    snoozed_by?: string | null;
}

export const SNOOZE_MAX_MINUTES = 1440;

// Each kind of record the reminder can be for, with its details page and the
// wording of the button that opens it. A reminder raised on a funding request
// or application resolves to its borrower server-side, so it lands on the
// client's page — never on the application itself.
const CLIENT_LINKS: Record<string, { route: string; label: string }> = {
    borrower: { route: '/clients', label: 'Go to Client' },
    lead: { route: '/leads', label: 'Go to Lead' },
    partner: { route: '/partners', label: 'Go to Partner' },
    employee: { route: '/employee-details', label: 'Go to Employee' },
    // admin/user accounts and applicants without a client record have no
    // details page, so no button is shown for them
};

export const getReminderClientPath = (client?: ReminderClient | null): string | null => {
    const link = client?.type ? CLIENT_LINKS[client.type] : undefined;
    return link && client?.id ? `${link.route}/${client.id}` : null;
};

export const getReminderClientLinkLabel = (client?: ReminderClient | null): string =>
    (client?.type && CLIENT_LINKS[client.type]?.label) || 'Go to Client';

export const formatSnoozeMinutes = (minutes: number): string => {
    if (minutes % 1440 === 0) return `${minutes / 1440} day${minutes === 1440 ? '' : 's'}`;
    if (minutes % 60 === 0) return `${minutes / 60} hour${minutes === 60 ? '' : 's'}`;
    return `${minutes} min${minutes === 1 ? '' : 's'}`;
};

export const getEffectiveReminderStatusBadgeClasses = (reminder: ReminderLike): string =>
    isReminderMissed(reminder) ? 'bg-danger-subtle text-danger' : getReminderStatusBadgeClasses(reminder.status);

/** A reminder row as returned by the /common/reminders list endpoint. */
export interface Reminder extends ReminderLike {
    id: number;
    reference?: string;
    reference_type?: string;
    summary?: string;
    organizer?: string;
    duration?: string;
    location?: string;
    message?: string;
    set_date_time?: string;
    reminder_date_time?: string;
    send_at?: string;
    status?: string;
    notes?: string;
    attachments?: Array<{ name: string; path: string }>;
    activity_log_id?: number | null;
    activity_can_edit?: boolean;
    client?: ReminderClient | null;
    related?: ReminderRelated | null;
    snooze_history?: ReminderSnoozeEntry[];
    display?: ReminderDisplay;
}
