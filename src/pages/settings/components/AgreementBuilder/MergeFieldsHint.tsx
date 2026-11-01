import React, { useState } from 'react';

const DISMISSED_KEY = 'ab4-merge-hint-dismissed';

const wasDismissed = () => {
    try { return localStorage.getItem(DISMISSED_KEY) === '1'; } catch { return false; }
};

/**
 * Explains the canvas's blue fields (merge fields, see mergeChips) once: they
 * are not text to type over, they fill in by themselves when someone signs.
 */
export const MergeFieldsHint: React.FC<{ hasMergeFields: boolean }> = ({ hasMergeFields }) => {
    const [dismissed, setDismissed] = useState(wasDismissed);
    if (!hasMergeFields || dismissed) return null;

    const dismiss = () => {
        setDismissed(true);
        try { localStorage.setItem(DISMISSED_KEY, '1'); } catch { /* shown again next time */ }
    };

    return (
        <div className="ab4-merge-hint" role="note" onClick={(e) => e.stopPropagation()}>
            <span className="ab4-merge-hint__chip" aria-hidden="true">{'{ }'} Signer's name</span>
            <p className="ab4-merge-hint__text">
                <strong>Blue fields fill in by themselves.</strong> When someone signs, each one is replaced with their own
                details (name, business, email, phone) or your company's. Preview shows example values. Add one from
                <strong> Insert field</strong> in the right panel.
            </p>
            <button type="button" className="btn btn-primary btn-sm ab4-merge-hint__ok" onClick={dismiss}>Got it</button>
        </div>
    );
};
