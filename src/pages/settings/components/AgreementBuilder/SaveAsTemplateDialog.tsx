import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import { SAVED_AGREEMENT_TEMPLATE_NAME_MAX, useSaveAgreementAsTemplate } from '../../../../modules/agreement';
import type { AgreementAudience } from './starterTemplates';

interface SaveAsTemplateDialogProps {
    /** The agreement being edited; the template is offered for it in Templates. */
    audience: AgreementAudience;
    /** The agreement on the page, as Save Agreement sends it ({ blocks, pagePad, docBg }). */
    templateJson: string;
    onClose: () => void;
}

/** A refused save: the reason for the name field (422), else null. */
const nameErrorFrom = (error: any): string | null => {
    if (error?.response?.status !== 422) return null;
    const errors = error.response.data?.errors ?? {};
    return errors.name?.[0] ?? errors.slug?.[0] ?? errors.template_json?.[0] ?? error.response.data?.message ?? null;
};

/**
 * Save as Template: keeps the agreement on the page under a name, so it can be
 * started from later (Templates › Your templates). The agreement itself is not
 * saved - that is Save Agreement.
 */
export const SaveAsTemplateDialog: React.FC<SaveAsTemplateDialogProps> = ({ audience, templateJson, onClose }) => {
    const titleId = useId();
    const inputId = useId();
    const errorId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const saveMutation = useSaveAgreementAsTemplate();
    const saving = saveMutation.isPending;

    useEffect(() => { inputRef.current?.focus(); }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, saving]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed || saving) return;
        try {
            const res = await saveMutation.mutateAsync({ slug: audience, name: trimmed, template_json: templateJson });
            toast.success(res.message || 'Template saved');
            onClose();
        } catch (err) {
            const reason = nameErrorFrom(err);
            if (reason) setError(reason);
            else toast.error('Failed to save the template');
        }
    };

    return createPortal(
        <div className="ab4-confirm-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
            <form className="ab4-save-template" role="dialog" aria-modal="true" aria-labelledby={titleId} onSubmit={submit} noValidate>
                <div className="ab4-templates__head">
                    <div>
                        <h6 id={titleId} className="ab4-templates__title">Save as template</h6>
                        <p className="ab4-templates__sub">
                            Keep this {audience === 'partner' ? 'partner' : 'borrower'} agreement as a template to start from later. It shows under Templates.
                        </p>
                    </div>
                    <button type="button" className="ab4-templates__close" aria-label="Close" onClick={onClose} disabled={saving}>
                        <i className="ri-close-line" aria-hidden="true" />
                    </button>
                </div>

                <label htmlFor={inputId} className="form-label ab4-save-template__label">
                    Template name <span className="text-danger" aria-hidden="true">*</span>
                </label>
                <input
                    ref={inputRef}
                    id={inputId}
                    type="text"
                    className={`form-control ${error ? 'is-invalid' : ''}`}
                    placeholder="e.g. Short form agreement"
                    value={name}
                    maxLength={SAVED_AGREEMENT_TEMPLATE_NAME_MAX}
                    aria-required="true"
                    aria-invalid={error ? 'true' : 'false'}
                    aria-describedby={error ? errorId : undefined}
                    onChange={(e) => { setName(e.target.value); setError(null); }}
                />
                {error && <div id={errorId} className="invalid-feedback d-block">{error}</div>}

                <div className="ab4-save-template__actions">
                    <button type="button" className="btn btn-light" onClick={onClose} disabled={saving}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={!name.trim() || saving}>
                        {saving
                            ? <span className="spinner-border spinner-border-sm me-1" aria-hidden="true" />
                            : <i className="ri-bookmark-line me-1" aria-hidden="true" />}
                        Save Template
                    </button>
                </div>
            </form>
        </div>,
        document.body
    );
};
