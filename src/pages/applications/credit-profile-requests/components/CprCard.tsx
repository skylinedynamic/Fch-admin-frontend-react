import React, { useState } from 'react';

/**
 * The card and field primitives the credit profile request details screen is
 * built from.
 *
 * They live here rather than in the page because the skeleton loader draws the
 * SAME structure - three cards in a 2fr/1fr grid, each with an icon head and a
 * grid of fields. Sharing the class names is what keeps the waiting state and
 * the loaded state the same shape; previously the loader drew one full-width
 * card and the page reflowed into two columns the moment the data arrived.
 */

export type CardTone = 'primary' | 'warning' | 'success';

const TONE_CLASSES: Record<CardTone, string> = {
    primary: 'bg-primary-subtle text-primary',
    warning: 'bg-warning-subtle text-warning',
    success: 'bg-success-subtle text-success',
};

interface CprCardProps {
    icon: string;
    tone: CardTone;
    title: string;
    hint: string;
    children: React.ReactNode;
}

export const CprCard = ({ icon, tone, title, hint, children }: CprCardProps) => (
    <div className="cpr-card">
        <div className="cpr-card-head">
            <div className={`cpr-card-icon ${TONE_CLASSES[tone]}`}>
                <i className={icon}></i>
            </div>
            <div>
                <div className="cpr-card-title">{title}</div>
                <div className="cpr-card-hint">{hint}</div>
            </div>
        </div>
        <div className="cpr-card-body">{children}</div>
    </div>
);

interface CprFieldProps {
    label: string;
    value: React.ReactNode;
    icon?: string;
    copyValue?: string;
}

export const CprField = ({ label, value, icon, copyValue }: CprFieldProps) => {
    const [copied, setCopied] = useState(false);

    const textToCopy = copyValue || (typeof value === 'string' ? value : '');

    const handleCopy = () => {
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="cpr-field">
            {icon && <i className={`${icon} cpr-field-icon`}></i>}
            <div className="cpr-field-body">
                <div className="cpr-field-label">{label}</div>
                <div className="cpr-field-value">
                    <span className="text-truncate">
                        {value || <span className="cpr-field-empty">Not provided</span>}
                    </span>
                    {textToCopy && (
                        <button
                            type="button"
                            onClick={handleCopy}
                            className={`cpr-copy${copied ? ' is-copied' : ''}`}
                            title={copied ? 'Copied' : 'Copy'}
                            aria-label={`Copy ${label}`}
                        >
                            <i className={`ri-${copied ? 'check-line' : 'file-copy-line'}`}></i>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * A field that has not loaded yet.
 *
 * Deliberately built from the same `cpr-field` markup as CprField rather than a
 * lookalike, so the two occupy exactly the same space: same padding, same rule
 * under each row, same icon gutter. The loader only swaps the label and value
 * for bars.
 */
export const CprFieldSkeleton = ({ valueWidth = 'sk-w-150' }: { valueWidth?: string }) => (
    <div className="cpr-field">
        <span className="cpr-field-icon skeleton-line sk-w-20 sk-h-20"></span>
        <div className="cpr-field-body">
            <div className="skeleton-line sk-w-80 sk-h-14 mb-2"></div>
            <div className={`skeleton-line ${valueWidth} sk-h-18`}></div>
        </div>
    </div>
);

/**
 * A card that has not loaded yet.
 *
 * Built on the same `cpr-card` / `cpr-card-head` markup as CprCard so the box
 * takes exactly the same space - but the icon, the title and the hint are all
 * bars. None of that is data that could be wrong or missing; it is copy that
 * never changes, and printing it for real made the skeleton read as a preview
 * of the section rather than a placeholder for it, out of step with a screen
 * that is still visibly loading everywhere else.
 */
export const CprCardSkeleton = ({
    tone,
    children,
}: {
    tone: CardTone;
    children: React.ReactNode;
}) => (
    <div className="cpr-card">
        <div className="cpr-card-head">
            <div className={`cpr-card-icon ${TONE_CLASSES[tone]}`}>
                <span className="skeleton-line sk-w-20 sk-h-20"></span>
            </div>
            <div>
                <div className="skeleton-line sk-w-150 sk-h-16 mb-2"></div>
                <div className="skeleton-line sk-w-200 sk-h-14"></div>
            </div>
        </div>
        <div className="cpr-card-body">{children}</div>
    </div>
);
