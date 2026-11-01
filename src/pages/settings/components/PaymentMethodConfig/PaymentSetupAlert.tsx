import React from 'react';

type Props = {
    title: string;
    description: string;
    /** What the method still needs, as the API words it; nothing is shown when empty. */
    issues: string[];
};

/**
 * A payment method switched on but not set up for its mode isn't offered to
 * payers. Shown on the method's own page to say what is missing.
 */
export default function PaymentSetupAlert({ title, description, issues }: Props): React.JSX.Element | null {
    if (issues.length === 0) {
        return null;
    }

    return (
        <div role="alert" className="alert alert-warning d-flex gap-3 mb-0 px-3 py-3" style={{ borderRadius: 4 }}>
            <i className="ri-error-warning-line fs-20 lh-1 flex-shrink-0"></i>
            <div className="flex-grow-1 min-w-0">
                <h6 className="alert-heading fs-14 fw-semibold mb-1">{title}</h6>
                <p className="fs-13 mb-2">{description}</p>
                <ul className="fs-13 mb-0 ps-3">
                    {issues.map((issue) => (
                        <li key={issue}>{issue}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
