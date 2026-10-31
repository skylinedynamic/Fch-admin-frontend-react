import ActivitySelect from './ActivitySelect'
import DateTimeField from './DateTimeField'
import { REMINDER_PRESET_SELECT_OPTIONS, REMINDER_UNIT_SELECT_OPTIONS } from './options'

export interface ReminderFieldValues {
    reminder_preset: string
    reminder_time_value: string
    reminder_time_unit: string
    remind_at: string
}

interface ReminderFieldsProps {
    values: ReminderFieldValues
    onChange: (field: keyof ReminderFieldValues, value: string) => void
    error?: string
    /** Live check: the chosen lead time lands in the past. */
    warning?: string | null
    /** Prefix of the element ids, so New Activity and Edit never share them. */
    idPrefix?: string
}

/** "Reminder Time" inside the Set Reminder card. */
export default function ReminderFields({ values, onChange, error, warning, idPrefix = 'activity' }: ReminderFieldsProps) {
    const invalid = !!error
    const preset = values.reminder_preset

    return (
        <div className="acm-field">
            <label className="form-label" htmlFor={`${idPrefix}ReminderPreset`}>
                Reminder Time <span className="text-danger">*</span>
            </label>
            <div className="row g-2">
                <div className={preset === 'custom_time_before' ? 'col-sm-6' : 'col-12'}>
                    <ActivitySelect
                        id={`${idPrefix}ReminderPreset`}
                        value={preset}
                        options={REMINDER_PRESET_SELECT_OPTIONS}
                        onChange={(value) => onChange('reminder_preset', value)}
                        invalid={invalid}
                    />
                </div>

                {preset === 'custom_time_before' && (
                    <>
                        <div className="col-4 col-sm-2">
                            <input
                                type="number"
                                className={`form-control ${invalid ? 'is-invalid' : ''}`}
                                name="reminder_time_value"
                                aria-label="Reminder amount"
                                value={values.reminder_time_value}
                                onChange={(e) => onChange('reminder_time_value', e.target.value)}
                                min="1"
                            />
                        </div>
                        <div className="col-8 col-sm-4">
                            <ActivitySelect
                                id={`${idPrefix}ReminderUnit`}
                                value={values.reminder_time_unit}
                                options={REMINDER_UNIT_SELECT_OPTIONS}
                                onChange={(value) => onChange('reminder_time_unit', value)}
                                invalid={invalid}
                            />
                        </div>
                    </>
                )}

                {preset === 'custom_date_time' && (
                    <div className="col-12">
                        <DateTimeField
                            inputId={`${idPrefix}RemindAt`}
                            value={values.remind_at}
                            onChange={(value) => onChange('remind_at', value)}
                            invalid={invalid}
                        />
                    </div>
                )}
            </div>
            {error && <div className="text-danger mt-1 small">{error}</div>}
            {!error && warning && <div className="text-danger mt-1 small">{warning}</div>}
        </div>
    )
}
