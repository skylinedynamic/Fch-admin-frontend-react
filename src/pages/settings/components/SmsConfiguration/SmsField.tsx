import React from 'react';

interface SmsFieldProps {
    id: string;
    label: string;
    required?: boolean;
    error?: string;
    help?: string;
    children: React.ReactNode;
}

/** A labelled settings input with its validation message, in the Email Configuration style. */
const SmsField: React.FC<SmsFieldProps> = ({ id, label, required = false, error, help, children }) => (
    <div className="col-md-6">
        <div className="input-group">
            <label
                htmlFor={id}
                className="input-group-text bg-light text-muted fw-medium mb-0"
                style={{ minWidth: '150px', justifyContent: 'center' }}
            >
                {label}
                {required && <span className="text-danger ms-1">*</span>}
            </label>
            {children}
        </div>
        {help && !error && <div className="text-muted fs-12 mt-1 ps-2">{help}</div>}
        {error && (
            <div className="text-danger small mt-1 ps-2">
                <i className="ri-error-warning-line me-1"></i>
                {error}
            </div>
        )}
    </div>
);

export default SmsField;
