import React from 'react'

interface ToggleCardProps {
    id: string
    title: string
    icon: string
    checked: boolean
    onChange: (checked: boolean) => void
    error?: string
    children?: React.ReactNode
}

/** An option block ("Set Reminder", "Want to Assign"): a switch row that opens its fields inside the block. */
export default function ToggleCard({ id, title, icon, checked, onChange, error, children }: ToggleCardProps) {
    return (
        <div className={`acm-option ${checked ? 'is-on' : ''}`}>
            <div className="acm-option__head">
                <span className="acm-option__icon" aria-hidden="true">
                    <i className={icon} />
                </span>
                <label className="acm-option__label" htmlFor={id}>{title}</label>
                <div className="form-check form-switch acm-option__switch">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id={id}
                        checked={checked}
                        onChange={(e) => onChange(e.target.checked)}
                    />
                </div>
            </div>
            {error && <div className="acm-option__error text-danger small">{error}</div>}
            {checked && children && <div className="acm-option__panel">{children}</div>}
        </div>
    )
}
