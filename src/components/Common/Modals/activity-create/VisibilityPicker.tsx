import { getVisibilityIcon } from './options'

interface VisibilityPickerProps {
    options: ReadonlyArray<{ value: string; label: string }>
    value: string
    onChange: (value: string) => void
    error?: string
}

/** "Everyone (Including Borrower)": the level, with its note in brackets on a second line. */
function VisibilityLabel({ label }: { label: string }) {
    const match = label.match(/^(.*?)\s*(\(.+\))$/)
    if (!match) return <span className="acm-visibility__label">{label}</span>

    return (
        <span className="acm-visibility__label">
            <span className="acm-visibility__title">{match[1]}</span>{' '}
            <span className="acm-visibility__note">{match[2]}</span>
        </span>
    )
}

/** The visibility radios, as one selectable card per level. */
export default function VisibilityPicker({ options, value, onChange, error }: VisibilityPickerProps) {
    return (
        <div className="acm-field">
            <span className={`form-label d-block ${error ? 'text-danger' : ''}`} id="activityVisibilityLabel">
                Visibility <span className="text-danger">*</span>
            </span>
            <div
                className={`acm-visibility ${options.length === 4 ? 'has-4' : 'has-3'}`}
                role="radiogroup"
                aria-labelledby="activityVisibilityLabel"
            >
                {options.map((opt) => {
                    const checked = value === opt.value
                    return (
                        <label
                            key={opt.value}
                            className={`acm-visibility__option ${checked ? 'is-checked' : ''}`}
                            htmlFor={`activityVisibility_${opt.value}`}
                        >
                            <input
                                className="acm-visibility__input"
                                type="radio"
                                name="visibility"
                                id={`activityVisibility_${opt.value}`}
                                value={opt.value}
                                checked={checked}
                                onChange={(e) => onChange(e.target.value)}
                            />
                            <span className="acm-visibility__icon" aria-hidden="true">
                                <i className={getVisibilityIcon(opt.value)} />
                            </span>
                            <VisibilityLabel label={opt.label} />
                            <i className="ri-checkbox-circle-fill acm-visibility__check" aria-hidden="true" />
                        </label>
                    )
                })}
            </div>
            {error && <div className="text-danger mt-1 small">{error}</div>}
        </div>
    )
}
