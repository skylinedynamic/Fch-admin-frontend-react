interface ReminderEmptyStateProps {
    /** Names what is empty, e.g. "No reminders for today." */
    title?: string
    onClear: () => void
}

/** Nothing matches the filters - say so, and offer to clear them. */
export default function ReminderEmptyState({ title = 'No reminders found', onClear }: ReminderEmptyStateProps) {
    return (
        <div className="reminder-empty">
            <span className="reminder-empty__icon" aria-hidden="true">
                <i className="ri-calendar-todo-line"></i>
            </span>
            <h6 className="reminder-empty__title">{title}</h6>
            <p className="reminder-empty__hint">Try another date range or status, or clear the filters to see everything.</p>
            <button type="button" className="btn btn-sm btn-soft-primary fw-semibold" onClick={onClear}>
                Clear filters
            </button>
        </div>
    )
}
