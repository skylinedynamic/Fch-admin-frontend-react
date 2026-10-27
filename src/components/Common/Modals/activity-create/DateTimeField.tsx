import { Calendar } from 'primereact/calendar'
import { TimeInputs } from '../../TimeInputs'

/** "YYYY-MM-DD HH:mm:ss" in the viewer's own timezone — the API converts it. */
export const toLocalDateTimeString = (date: Date): string => {
    const tzOffset = date.getTimezoneOffset() * 60000
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 19).replace('T', ' ')
}

export const parseLocalDateTime = (value: string | null | undefined): Date | null =>
    value ? new Date(value.replace(' ', 'T')) : null

interface DateTimeFieldProps {
    inputId: string
    /** "YYYY-MM-DD HH:mm:ss", or '' for none. */
    value: string
    onChange: (value: string) => void
    minDate?: Date | null
    invalid?: boolean
    placeholder?: string
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
                    const merged = new Date(picked)
                    if (current) merged.setHours(current.getHours(), current.getMinutes(), 0, 0)
                    onChange(toLocalDateTimeString(merged))
                }}
                minDate={minDate ?? undefined}
                dateFormat="dd M, yy"
                showTime
                hourFormat="12"
                placeholder={placeholder}
                showIcon
                icon="ri-calendar-2-line"
                className={`w-100 ${invalid ? 'p-invalid' : ''}`}
                inputClassName={`form-control ${invalid ? 'is-invalid' : ''}`}
                appendTo="self"
                footerTemplate={() => (
                    <TimeInputs
                        value={current}
                        onChange={(next: Date) => onChange(toLocalDateTimeString(next))}
                    />
                )}
            />
        </div>
    )
}
