import React from 'react';
import { Dropdown, DropdownChangeEvent } from 'primereact/dropdown';
import type { MailProviderOption } from '../../../../modules/settings/types';
import { SECRET_MASK, type MailFormState } from './mailForm';

interface MailSettingsFieldsProps {
    /** Keeps the inputs of the partner and fallback forms apart. */
    idPrefix: string;
    provider: MailProviderOption;
    form: MailFormState;
    errors: Record<string, string>;
    /** Which secrets are already stored, so their inputs say so. */
    savedSecrets: Record<string, boolean>;
    disabled: boolean;
    onChange: (field: string, value: string) => void;
}

const LABEL_STYLE: React.CSSProperties = { minWidth: '130px', justifyContent: 'center' };

interface FieldProps {
    id: string;
    label: string;
    required?: boolean;
    error?: string;
    children: React.ReactNode;
}

/** A labelled input in the Email Configuration style, with its message. */
const Field: React.FC<FieldProps> = ({ id, label, required = false, error, children }) => (
    <div className="col-md-6">
        <div className="input-group">
            <label htmlFor={id} className="input-group-text bg-light text-muted fw-medium mb-0" style={LABEL_STYLE}>
                {label}
                {required && <span className="text-danger ms-1">*</span>}
            </label>
            {children}
        </div>
        {error && (
            <div className="text-danger small mt-1 ps-2">
                <i className="ri-error-warning-line me-1"></i>
                {error}
            </div>
        )}
    </div>
);

/** The sender address, then the chosen provider's own fields. */
const MailSettingsFields: React.FC<MailSettingsFieldsProps> = ({
    idPrefix,
    provider,
    form,
    errors,
    savedSecrets,
    disabled,
    onChange,
}) => {
    const id = (key: string) => `${idPrefix}-${key}`;
    const inputClass = (key: string) => `form-control fs-14 ${errors[key] ? 'is-invalid border-danger' : ''}`;

    return (
        <div className="row g-4 mb-4">
            <Field id={id('from_address')} label="From Address" required error={errors.from_address}>
                <input
                    id={id('from_address')}
                    type="email"
                    className={inputClass('from_address')}
                    value={form.from_address}
                    onChange={(e) => onChange('from_address', e.target.value)}
                    placeholder="no-reply@domain.com"
                    autoComplete="off"
                    style={{ boxShadow: 'none' }}
                    disabled={disabled}
                />
            </Field>

            {provider.fields.map((field) => (
                <Field key={field.key} id={id(field.key)} label={field.label} required={field.required} error={errors[field.key]}>
                    {field.type === 'select' ? (
                        <div className="flex-grow-1">
                            <Dropdown
                                inputId={id(field.key)}
                                value={form[field.key] ?? ''}
                                options={field.options}
                                optionLabel="label"
                                optionValue="value"
                                onChange={(e: DropdownChangeEvent) => onChange(field.key, e.value)}
                                placeholder={`Select ${field.label}`}
                                className={`w-100 rounded-start-0 ${errors[field.key] ? 'p-invalid' : ''}`}
                                disabled={disabled}
                            />
                        </div>
                    ) : (
                        <input
                            id={id(field.key)}
                            type={field.type === 'password' ? 'password' : 'text'}
                            inputMode={field.type === 'number' ? 'numeric' : undefined}
                            maxLength={field.type === 'number' ? 5 : undefined}
                            className={inputClass(field.key)}
                            value={form[field.key] ?? ''}
                            onChange={(e) => onChange(field.key, field.type === 'number' ? e.target.value.replace(/\D/g, '') : e.target.value)}
                            // A stored secret shows as the mask: cleared to type a new
                            // one, and put back if nothing was typed.
                            onFocus={field.secret ? () => form[field.key] === SECRET_MASK && onChange(field.key, '') : undefined}
                            onBlur={field.secret ? () => savedSecrets[field.key] && (form[field.key] ?? '') === '' && onChange(field.key, SECRET_MASK) : undefined}
                            placeholder={field.secret ? '........' : field.label}
                            autoComplete={field.secret ? 'new-password' : 'off'}
                            style={{ boxShadow: 'none' }}
                            disabled={disabled}
                        />
                    )}
                </Field>
            ))}
        </div>
    );
};

export default MailSettingsFields;
