import React, { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { STARTER_TEMPLATES, type AgreementAudience, type StarterTemplate } from './starterTemplates';

interface StarterTemplatesDialogProps {
    /** The agreement being edited; only its templates are offered. */
    audience: AgreementAudience;
    onPick: (template: StarterTemplate) => void;
    onClose: () => void;
}

/**
 * "Start from a template": replaces the agreement with a starting point
 * (undoable). The partner agreement offers partner templates, the borrower
 * agreement borrower templates.
 */
export const StarterTemplatesDialog: React.FC<StarterTemplatesDialogProps> = ({ audience, onPick, onClose }) => {
    const titleId = useId();
    const templates = STARTER_TEMPLATES.filter((t) => t.audience.includes(audience));

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return createPortal(
        <div className="ab4-confirm-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="ab4-templates" role="dialog" aria-modal="true" aria-labelledby={titleId}>
                <div className="ab4-templates__head">
                    <div>
                        <h6 id={titleId} className="ab4-templates__title">Start from a template</h6>
                        <p className="ab4-templates__sub">{audience === 'partner' ? 'Partner' : 'Borrower'} agreement templates. Replaces what is on the page now; you can undo it.</p>
                    </div>
                    <button type="button" className="ab4-templates__close" aria-label="Close" onClick={onClose}>
                        <i className="ri-close-line" aria-hidden="true" />
                    </button>
                </div>
                <div className="ab4-templates__grid">
                    {templates.map((template) => (
                        <button key={template.id} type="button" className="ab4-templates__card" onClick={() => onPick(template)}>
                            <span className="ab4-templates__icon" aria-hidden="true"><i className={template.icon} /></span>
                            <span className="ab4-templates__name">{template.name}</span>
                            <span className="ab4-templates__desc">{template.description}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>,
        document.body
    );
};
