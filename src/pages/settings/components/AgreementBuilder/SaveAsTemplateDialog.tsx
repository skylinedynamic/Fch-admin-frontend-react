import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import { Dropdown, type DropdownChangeEvent } from 'primereact/dropdown';
import {
    SAVED_AGREEMENT_TEMPLATE_NAME_MAX,
    useSaveAgreementAsTemplate,
    useSavedAgreementTemplates,
    useUpdateSavedAgreementTemplate,
} from '../../../../modules/agreement';
import type { AgreementAudience } from './starterTemplates';

interface SaveAsTemplateDialogProps {
    /** The agreement being edited; the template is offered for it in Templates. */
    audience: AgreementAudience;
    /** The agreement on the page, as Save Agreement sends it ({ blocks, pagePad, docBg }). */
    templateJson: string;
    onClose: () => void;
}

/** Save as a new template, or replace one already saved (it keeps its name). */
const SAVE_MODE = { NEW: 'new', REPLACE: 'replace' } as const;
type SaveMode = typeof SAVE_MODE[keyof typeof SAVE_MODE];

/** A refused save: the reason to show under the field (422), else null. */
export const fieldErrorFrom = (error: any): string | null => {
    if (error?.response?.status !== 422) return null;
    const errors = error.response.data?.errors ?? {};
    return errors.name?.[0] ?? errors.slug?.[0] ?? errors.template_json?.[0] ?? error.response.data?.message ?? null;
};

/**
 * Save as Template: keeps the agreement on the page under a name, so it can be
 * started from later (Templates › Your templates) - or puts it in place of a
 * template already saved, which keeps its name. The agreement itself is not
 * saved - that is Save Agreement.
 */
export const SaveAsTemplateDialog: React.FC<SaveAsTemplateDialogProps> = ({ audience, templateJson, onClose }) => {
    const titleId = useId();
    const inputId = useId();
    const selectId = useId();
    const errorId = useId();
    const modeName = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [mode, setMode] = useState<SaveMode>(SAVE_MODE.NEW);
    const [name, setName] = useState('');
    const [replaceId, setReplaceId] = useState('');
    const [error, setError] = useState<string | null>(null);
    const { data: saved = [], isPending: loadingSaved } = useSavedAgreementTemplates(audience);
    const saveMutation = useSaveAgreementAsTemplate();
    const updateMutation = useUpdateSavedAgreementTemplate();
    const saving = saveMutation.isPending || updateMutation.isPending;
    const canReplace = saved.length > 0;
    const replacing = mode === SAVE_MODE.REPLACE;

    useEffect(() => { inputRef.current?.focus(); }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, saving]);

    const chooseMode = (next: SaveMode) => { setMode(next); setError(null); };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;
        try {
            if (replacing) {
                if (!replaceId) return;
                const res = await updateMutation.mutateAsync({ id: Number(replaceId), slug: audience, template_json: templateJson });
                toast.success(res.message || 'Template updated');
            } else {
                const trimmed = name.trim();
                if (!trimmed) return;
                const res = await saveMutation.mutateAsync({ slug: audience, name: trimmed, template_json: templateJson });
                toast.success(res.message || 'Template saved');
            }
            onClose();
        } catch (err) {
            const reason = fieldErrorFrom(err);
            if (reason) setError(reason);
            else toast.error('Failed to save the template');
        }
    };

    const fieldClass = `${error ? 'is-invalid' : ''}`;
    const describedBy = error ? errorId : undefined;

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

                <div className="ab4-save-template__modes" role="radiogroup" aria-label="How to save">
                    <label className="ab4-save-template__mode">
                        <input type="radio" name={modeName} checked={!replacing} onChange={() => chooseMode(SAVE_MODE.NEW)} />
                        <span>Save as a new template</span>
                    </label>
                    <label className={`ab4-save-template__mode ${canReplace ? '' : 'is-disabled'}`}>
                        <input type="radio" name={modeName} checked={replacing} disabled={!canReplace} onChange={() => chooseMode(SAVE_MODE.REPLACE)} />
                        <span>
                            Replace an existing template
                            {!loadingSaved && !canReplace && <small className="ab4-save-template__hint">No saved templates to replace yet.</small>}
                        </span>
                    </label>
                </div>

                {replacing ? (
                    <>
                        <label htmlFor={selectId} className="form-label ab4-save-template__label">
                            Template to replace <span className="text-danger" aria-hidden="true">*</span>
                        </label>
                        {/* Opens inside the dialog (appendTo self), so the backdrop never covers its list. */}
                        <Dropdown
                            inputId={selectId}
                            value={replaceId || null}
                            options={saved.map((template) => ({ label: template.name, value: String(template.id) }))}
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Choose a template"
                            appendTo="self"
                            className={error ? 'p-invalid' : ''}
                            aria-invalid={error ? 'true' : 'false'}
                            aria-describedby={describedBy}
                            onChange={(e: DropdownChangeEvent) => { setReplaceId(e.value ?? ''); setError(null); }}
                        />
                        <small className="ab4-save-template__hint">It keeps its name; its content becomes the agreement on this page.</small>
                    </>
                ) : (
                    <>
                        <label htmlFor={inputId} className="form-label ab4-save-template__label">
                            Template name <span className="text-danger" aria-hidden="true">*</span>
                        </label>
                        <input
                            ref={inputRef}
                            id={inputId}
                            type="text"
                            className={`form-control ${fieldClass}`}
                            placeholder="e.g. Short form agreement"
                            value={name}
                            maxLength={SAVED_AGREEMENT_TEMPLATE_NAME_MAX}
                            aria-required="true"
                            aria-invalid={error ? 'true' : 'false'}
                            aria-describedby={describedBy}
                            onChange={(e) => { setName(e.target.value); setError(null); }}
                        />
                    </>
                )}
                {error && <div id={errorId} className="invalid-feedback d-block">{error}</div>}

                <div className="ab4-save-template__actions">
                    <button type="button" className="btn btn-light" onClick={onClose} disabled={saving}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={saving || (replacing ? !replaceId : !name.trim())}>
                        {saving
                            ? <span className="spinner-border spinner-border-sm me-1" aria-hidden="true" />
                            : <i className={`${replacing ? 'ri-refresh-line' : 'ri-bookmark-line'} me-1`} aria-hidden="true" />}
                        {replacing ? 'Replace Template' : 'Save Template'}
                    </button>
                </div>
            </form>
        </div>,
        document.body
    );
};
