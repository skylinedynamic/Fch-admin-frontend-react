/** Nothing matches the filters - say so, and offer to clear them. */
export default function ReminderEmptyState({ onClear }: { onClear: () => void }) {
    return (
        <div className="reminder-empty">
            <span className="reminder-empty__icon" aria-hidden="true">
                <i className="ri-calendar-todo-line"></i>
            </span>
            <h6 className="reminder-empty__title">No reminders found</h6>
            <p className="reminder-empty__hint">Try another date range or status, or clear the filters to see everything.</p>
            <button type="button" className="btn btn-sm btn-soft-primary fw-semibold" onClick={onClear}>
                Clear filters
            </button>
        </div>
    )
}
