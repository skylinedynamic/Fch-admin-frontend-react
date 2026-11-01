import { REMINDER_RECIPIENT_SELECT_OPTIONS } from './options'

interface ReminderRecipientPickerProps {
    value: string
    onChange: (value: string) => void
    error?: string
    /** Prefix of the element ids, so New Activity and Edit never share them. */
    idPrefix?: string
}

/** "Who gets the reminder" on an assigned Task: one selectable card each for Me, Assignee and Both. */
export default function ReminderRecipientPicker({ value, onChange, error, idPrefix = 'activity' }: ReminderRecipientPickerProps) {
    return (
        <div className="acm-field acm-recipient">
            <span className={`form-label d-block ${error ? 'text-danger' : ''}`} aria-hidden="true">
                Who gets the reminder <span className="text-danger">*</span>
            </span>
            <div className="acm-visibility has-3" role="radiogroup" aria-label="Who gets the reminder">
                {REMINDER_RECIPIENT_SELECT_OPTIONS.map((opt) => {
                    const id = `${idPrefix}ReminderRecipient_${opt.value}`
                    const checked = value === opt.value
                    return (
                        <label key={opt.value} className={`acm-visibility__option ${checked ? 'is-checked' : ''}`} htmlFor={id}>
                            <input
                                className="acm-visibility__input"
                                type="radio"
                                name={`${idPrefix}ReminderRecipient`}
                                id={id}
                                value={opt.value}
                                checked={checked}
                                aria-label={opt.label}
                                onChange={(e) => onChange(e.target.value)}
                            />
                            <span className="acm-visibility__icon" aria-hidden="true">
                                <i className={opt.icon} />
                            </span>
                            <span className="acm-visibility__label">
                                <span className="acm-visibility__title">{opt.label}</span>
                                <span className="acm-visibility__note">{opt.note}</span>
                            </span>
                            <i className="ri-checkbox-circle-fill acm-visibility__check" aria-hidden="true" />
                        </label>
                    )
                })}
            </div>
            {error && <div className="text-danger mt-1 small">{error}</div>}
        </div>
    )
}
