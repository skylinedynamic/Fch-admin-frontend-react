import { Link } from 'react-router-dom'
import {
    REMINDER_TYPE_TONES,
    getEffectiveReminderStatusBadgeClasses,
    getEffectiveReminderStatusLabel,
    getReminderClientLinkLabel,
    getReminderClientPath,
    getReminderTypeIcon,
    isReminderMissed,
    type Reminder,
} from '../../../config/reminders'
import { formatRelativeToNow } from '../../../utils/reminders'
import { getInitials } from '../../../components/Common/Modals/activity-create/options'

// The reminders table's cells, one component per column.

/** Reference: the type's coloured icon tile and its name. */
export function ReferenceCell({ reminder }: { reminder: Reminder }) {
    const type = reminder.reference_type || reminder.reference || ''
    const tone = REMINDER_TYPE_TONES[type] ?? 'secondary'

    return (
        <div className="d-flex align-items-center gap-2">
            <span className={`reminder-row__icon bg-${tone}-subtle text-${tone}`} aria-hidden="true">
                <i className={getReminderTypeIcon(type)}></i>
            </span>
            <span className="reminder-row__type">{reminder.reference || type}</span>
        </div>
    )
}

/** Subject: the summary, and who has the task (or the call's organizer, duration, place). */
export function SubjectCell({ reminder }: { reminder: Reminder }) {
    const task = reminder.task
    const meta = [
        task?.assigned_to_name && { icon: 'ri-user-shared-line', text: `Assigned to ${task.assigned_to_name}` },
        task?.assigned_by_name && { icon: 'ri-user-star-line', text: `by ${task.assigned_by_name}` },
        reminder.organizer && { icon: 'ri-user-line', text: reminder.organizer },
        reminder.duration && { icon: 'ri-time-line', text: reminder.duration },
        reminder.location && { icon: 'ri-map-pin-line', text: reminder.location },
    ].filter(Boolean) as Array<{ icon: string; text: string }>

    return (
        <div className="reminder-row__subject">
            <div className="reminder-row__summary">{reminder.summary}</div>
            {meta.length > 0 && (
                <div className="reminder-row__meta">
                    {meta.map((m) => (
                        <span key={m.text}><i className={`${m.icon} me-1`} aria-hidden="true"></i>{m.text}</span>
                    ))}
                </div>
            )}
        </div>
    )
}

/** Client: initials, name (linked to their file), type and business. */
export function ClientCell({ reminder }: { reminder: Reminder }) {
    const client = reminder.client
    if (!client) return <span className="text-muted">—</span>

    const path = getReminderClientPath(client)
    const name = client.name || 'Unnamed'

    return (
        <div className="d-flex align-items-center gap-2 overflow-hidden">
            <span className="reminder-row__avatar" aria-hidden="true">{getInitials(name)}</span>
            <div className="overflow-hidden">
                {path
                    ? <Link to={path} className="reminder-row__client" title={getReminderClientLinkLabel(client)}>{name}</Link>
                    : <span className="reminder-row__client">{name}</span>}
                <div className="reminder-row__meta text-truncate">
                    {client.type_label}
                    {client.business_name && client.business_name !== client.name ? ` · ${client.business_name}` : ''}
                </div>
            </div>
        </div>
    )
}

/** When: the activity's date and time (formatted by the API) and how far off it is. */
export function WhenCell({ reminder }: { reminder: Reminder }) {
    const date = reminder.display?.activity_datetime
    if (!date) return <span className="text-muted">—</span>

    const relative = formatRelativeToNow(reminder.set_date_time)
    return (
        <div>
            <div className="fw-medium text-dark text-nowrap">{date}</div>
            {relative && (
                <div className={`fs-12 ${isReminderMissed(reminder) ? 'text-danger' : 'text-muted'}`}>{relative}</div>
            )}
        </div>
    )
}

/** Status: the reminder's own status (Pending, Missed, No Popup...). */
export function StatusCell({ reminder }: { reminder: Reminder }) {
    return (
        <span className={`reminder-status badge ${getEffectiveReminderStatusBadgeClasses(reminder)}`}>
            <span className="reminder-status__dot" aria-hidden="true" />
            {getEffectiveReminderStatusLabel(reminder)}
        </span>
    )
}
