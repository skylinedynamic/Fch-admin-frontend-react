import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import {
    useDeleteSavedAgreementTemplate,
    useLoadSavedAgreementTemplate,
    useSavedAgreementTemplates,
    type SavedAgreementTemplate,
} from '../../../../modules/agreement';
import { STARTER_TEMPLATES, type AgreementAudience, type StarterTemplate } from './starterTemplates';
import type { AgreementTemplate } from './types';
import { ConfirmDialog } from './ConfirmDialog';

interface StarterTemplatesDialogProps {
    /** The agreement being edited; only its templates are offered. */
    audience: AgreementAudience;
    onPick: (template: StarterTemplate) => void;
    /** A template the partner saved (Save as Template): the agreement as it was kept. */
    onPickSaved: (template: AgreementTemplate) => void;
    onClose: () => void;
}

const savedOn = (date?: string) => {
    if (!date) return 'Saved template';
    const d = new Date(date);
    return Number.isNaN(d.getTime()) ? 'Saved template' : `Saved ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
};

/** A saved template's JSON as the builder holds it; legacy arrays are blocks alone. */
const parseSaved = (json: string | undefined): AgreementTemplate => {
    const parsed = JSON.parse(json || '{}');
    if (Array.isArray(parsed)) return { blocks: parsed, pagePad: 80, docBg: '#ffffff' };
    return { blocks: parsed.blocks ?? [], pagePad: parsed.pagePad ?? 80, docBg: parsed.docBg ?? '#ffffff' };
};

/**
 * "Start from a template": replaces the agreement with a starting point
 * (undoable). The partner's own saved templates (Save as Template) come first,
 * then the built-in ones. The partner agreement offers partner templates, the
 * borrower agreement borrower templates.
 */
export const StarterTemplatesDialog: React.FC<StarterTemplatesDialogProps> = ({ audience, onPick, onPickSaved, onClose }) => {
    const titleId = useId();
    const savedTitleId = useId();
    const defaultTitleId = useId();
    const templates = STARTER_TEMPLATES.filter((t) => t.audience.includes(audience));
    const { data: saved = [], isPending: loadingSaved, isError: savedFailed } = useSavedAgreementTemplates(audience);
    const loadMutation = useLoadSavedAgreementTemplate();
    const deleteMutation = useDeleteSavedAgreementTemplate();
    const [deleting, setDeleting] = useState<SavedAgreementTemplate | null>(null);
    const [loadingId, setLoadingId] = useState<number | null>(null);
    // The delete confirmation handles its own Escape; this dialog stays open under it.
    const deletingRef = useRef(deleting);
    deletingRef.current = deleting;

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !deletingRef.current) onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const pickSaved = async (template: SavedAgreementTemplate) => {
        if (loadingId !== null) return;
        setLoadingId(template.id);
        try {
            const full = await loadMutation.mutateAsync(template.id);
            onPickSaved(parseSaved(full?.template_json));
        } catch {
            toast.error('Failed to open the template');
        } finally {
            setLoadingId(null);
        }
    };

    const confirmDelete = async () => {
        const template = deleting;
        setDeleting(null);
        if (!template) return;
        try {
            await deleteMutation.mutateAsync({ id: template.id, slug: audience });
            toast.success('Template deleted');
        } catch {
            toast.error('Failed to delete the template');
        }
    };

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

                <section className="ab4-templates__section" aria-labelledby={savedTitleId}>
                    <h6 id={savedTitleId} className="ab4-templates__section-title">Your templates</h6>
                    {loadingSaved ? (
                        <p className="ab4-templates__empty"><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Loading your templates…</p>
                    ) : savedFailed ? (
                        <p className="ab4-templates__empty">Your templates could not be loaded.</p>
                    ) : saved.length === 0 ? (
                        <p className="ab4-templates__empty">No saved templates yet. Use <strong>Save as Template</strong> to keep this agreement as one.</p>
                    ) : (
                        <div className="ab4-templates__grid">
                            {saved.map((template) => (
                                <div key={template.id} className="ab4-templates__saved">
                                    <button
                                        type="button"
                                        className="ab4-templates__card"
                                        onClick={() => pickSaved(template)}
                                        disabled={loadingId !== null}
                                        aria-busy={loadingId === template.id}
                                    >
                                        <span className="ab4-templates__icon" aria-hidden="true">
                                            {loadingId === template.id
                                                ? <span className="spinner-border spinner-border-sm" />
                                                : <i className="ri-bookmark-line" />}
                                        </span>
                                        <span className="ab4-templates__name">{template.name}</span>
                                        <span className="ab4-templates__desc">{savedOn(template.created_at)}</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="ab4-templates__delete"
                                        aria-label={`Delete template ${template.name}`}
                                        title="Delete template"
                                        onClick={() => setDeleting(template)}
                                        disabled={deleteMutation.isPending}
                                    >
                                        <i className="ri-delete-bin-line" aria-hidden="true" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="ab4-templates__section" aria-labelledby={defaultTitleId}>
                    <h6 id={defaultTitleId} className="ab4-templates__section-title">Default templates</h6>
                    <div className="ab4-templates__grid">
                        {templates.map((template) => (
                            <button key={template.id} type="button" className="ab4-templates__card" onClick={() => onPick(template)}>
                                <span className="ab4-templates__icon" aria-hidden="true"><i className={template.icon} /></span>
                                <span className="ab4-templates__name">{template.name}</span>
                                <span className="ab4-templates__desc">{template.description}</span>
                            </button>
                        ))}
                    </div>
                </section>
            </div>
            {deleting && (
                <ConfirmDialog
                    title="Delete this template?"
                    message={`"${deleting.name}" will be removed from your templates. Agreements already saved from it do not change.`}
                    confirmLabel="Delete template"
                    icon="ri-delete-bin-line"
                    onCancel={() => setDeleting(null)}
                    onConfirm={confirmDelete}
                />
            )}
        </div>,
        document.body
    );
};
