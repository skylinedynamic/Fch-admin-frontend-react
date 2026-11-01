import {
    REMINDER_STATUS_CANCELLED,
    REMINDER_STATUS_MISSED,
    REMINDER_STATUS_OPTIONS,
    REMINDER_STATUS_PENDING,
    REMINDER_STATUS_SENT,
} from '../../../config/reminders'
import type { ThemeTone } from '../../../config/activityTask'

/** The dot colour of each status tab. */
const STATUS_TAB_TONES: Record<string, ThemeTone> = {
    [REMINDER_STATUS_PENDING]: 'warning',
    [REMINDER_STATUS_SENT]: 'info',
    [REMINDER_STATUS_MISSED]: 'danger',
    [REMINDER_STATUS_CANCELLED]: 'secondary',
}

const TABS: Array<{ label: string; value: string | null }> = [
    { label: 'All', value: null },
    ...REMINDER_STATUS_OPTIONS,
]

interface ReminderStatusTabsProps {
    value: string | null
    onChange: (status: string | null) => void
}

/** All / Pending / Sent / Missed / Dismissed above the reminders table. */
export default function ReminderStatusTabs({ value, onChange }: ReminderStatusTabsProps) {
    return (
        <div className="reminder-tabs" role="tablist" aria-label="Reminder status">
            {TABS.map((tab) => {
                const selected = value === tab.value
                const tone = tab.value ? STATUS_TAB_TONES[tab.value] : 'primary'
                return (
                    <button
                        key={tab.label}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        className={`reminder-tabs__tab ${selected ? 'is-active' : ''}`}
                        onClick={() => onChange(tab.value)}
                    >
                        <span className={`reminder-tabs__dot bg-${tone}`} aria-hidden="true" />
                        {tab.label}
                    </button>
                )
            })}
        </div>
    )
}
