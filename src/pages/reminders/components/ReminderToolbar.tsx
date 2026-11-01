import React from 'react'
import { Calendar } from 'primereact/calendar'
import { Dropdown } from 'primereact/dropdown'
import { REMINDER_TYPES } from '../../../config/reminders'

interface ReminderToolbarProps {
    search: string
    onSearchChange: (value: string) => void
    type: string | null
    onTypeChange: (value: string | null) => void
    dateRange: (Date | null)[] | null
    onDateRangeChange: (value: (Date | null)[] | null) => void
    onApply: () => void
    onClear: () => void
}

/** Search, reference type and date range, with Filters / Clear. */
export default function ReminderToolbar({
    search,
    onSearchChange,
    type,
    onTypeChange,
    dateRange,
    onDateRangeChange,
    onApply,
    onClear,
}: ReminderToolbarProps) {
    const submit = (e?: React.FormEvent) => {
        e?.preventDefault()
        onApply()
    }

    return (
        <form className="reminder-toolbar" onSubmit={submit}>
            <div className="reminder-toolbar__search search-box">
                <input
                    type="text"
                    className="form-control search"
                    placeholder="Search subject or client..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
                <i className="ri-search-line search-icon"></i>
            </div>
            <Dropdown
                value={type}
                options={REMINDER_TYPES}
                placeholder="All Reference Types"
                className="reminder-toolbar__type employee-filter-dropdown"
                onChange={(e) => onTypeChange(e.value ?? null)}
                showClear
            />
            <div className="reminder-toolbar__dates search-box">
                <Calendar
                    value={dateRange}
                    onChange={(e) => onDateRangeChange(e.value ?? null)}
                    placeholder="Date Range"
                    selectionMode="range"
                    readOnlyInput
                    hideOnRangeSelection
                    dateFormat="dd M, yy"
                    className="w-100"
                    inputClassName="form-control search"
                />
                <i className="ri-calendar-2-line search-icon"></i>
            </div>
            <div className="reminder-toolbar__actions">
                <button type="submit" className="btn btn-warning">
                    <i className="ri-equalizer-fill align-bottom me-1"></i> Filters
                </button>
                <button type="button" className="btn btn-default" onClick={onClear}>
                    <i className="ri-close-line align-bottom me-1"></i> Clear
                </button>
            </div>
        </form>
    )
}
