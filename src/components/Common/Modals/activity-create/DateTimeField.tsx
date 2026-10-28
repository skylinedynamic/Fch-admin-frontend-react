import { Calendar } from 'primereact/calendar'
import { TimeInputs } from '../../TimeInputs'

/** "YYYY-MM-DD HH:mm:ss" in the viewer's own timezone — the API converts it. */
export const toLocalDateTimeString = (date: Date): string => {
    const tzOffset = date.getTimezoneOffset() * 60000
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 19).replace('T', ' ')
}

/** "YYYY-MM-DD" in the viewer's own calendar. */
export const toLocalDateString = (date: Date): string => toLocalDateTimeString(date).slice(0, 10)

// A bare "YYYY-MM-DD" would parse as UTC midnight (the day before, west of
// UTC), so it is read as local midnight.
export const parseLocalDateTime = (value: string | null | undefined): Date | null => {
    if (!value) return null
    return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value.replace(' ', 'T'))
}

interface DateTimeFieldProps {
    inputId: string
    /** "YYYY-MM-DD HH:mm:ss" ("YYYY-MM-DD" when withTime is off), or '' for none. */
    value: string
    onChange: (value: string) => void
    minDate?: Date | null
    invalid?: boolean
    placeholder?: string
    /** Off: a day only — no time inputs, value "YYYY-MM-DD". */
    withTime?: boolean
}

/**
 * Date + time picker used by the New Activity modal: the calendar picks the
 * day (keeping the time already chosen) and the footer's TimeInputs set the
 * time.
 */
export default function DateTimeField({
    inputId,
    value,
    onChange,
    minDate = null,
    invalid = false,
    placeholder = 'Select date & time',
    withTime = true,
}: DateTimeFieldProps) {
    const current = parseLocalDateTime(value)

    return (
        <div className={`acm-datetime custom-datepicker ${invalid ? 'is-invalid' : ''}`}>
            <Calendar
                inputId={inputId}
                value={current}
                onChange={(e) => {
                    const picked = e.value as Date | null | undefined
                    if (!picked) {
                        onChange('')
                        return
                    }
                    if (!withTime) {
                        onChange(toLocalDateString(picked))
                        return
                    }
                    const merged = new Date(picked)
                    if (current) merged.setHours(current.getHours(), current.getMinutes(), 0, 0)
                    onChange(toLocalDateTimeString(merged))
                }}
                minDate={minDate ?? undefined}
                dateFormat="dd M, yy"
                showTime={withTime}
                hourFormat="12"
                placeholder={placeholder}
                showIcon
                icon="ri-calendar-2-line"
                className={`w-100 ${invalid ? 'p-invalid' : ''}`}
                inputClassName={`form-control ${invalid ? 'is-invalid' : ''}`}
                appendTo="self"
                footerTemplate={withTime ? () => (
                    <TimeInputs
                        value={current}
                        onChange={(next: Date) => onChange(toLocalDateTimeString(next))}
                    />
                ) : undefined}
            />
        </div>
    )
}
