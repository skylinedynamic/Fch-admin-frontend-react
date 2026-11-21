import React, { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { AGREEMENT_SLUG, useAgreementPreviewSigners, type AgreementPreviewSigner, type AgreementSlug } from '../../../../modules/agreement';

/** What each agreement's list is called: its partners, or its clients. */
export const signerListNoun = (type: AgreementSlug) => (type === AGREEMENT_SLUG.PARTNER ? 'partners' : 'clients');

/** How long typing pauses before the list is searched. */
export const SIGNER_SEARCH_DEBOUNCE_MS = 300;

/** "Partner" / "Borrower": who signs the agreement type, as the button and list name them. */
export const previewSignerLabel = (type: AgreementSlug) => (type === AGREEMENT_SLUG.PARTNER ? 'Partner' : 'Borrower');

interface PreviewAsSignerDialogProps {
    /** The agreement being edited: its signers are listed. */
    type: AgreementSlug;
    /** The signer the preview is shown as now, marked in the list. */
    selectedUserId?: number | null;
    onPick: (signer: AgreementPreviewSigner) => void;
    onClose: () => void;
}

/** What a signer's row says about them. */
export const SIGNER_ROW_LABELS = {
    NO_ENROLLMENT: 'No enrollment',
    SIGNED: 'Signed',
    NOT_SIGNED: 'Not signed',
} as const;

const initials = (name: string) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]!.toUpperCase()).join('') || '?';

/**
 * Agreement Builder › Preview › Preview as Partner / Preview as Borrower: pick
 * who to see the agreement being edited as. The partner agreement lists
 * partners only, the borrower agreement clients only. Which ones is the API's
 * call (fch-api AgreementPreviewSigners): the host's team sees every partner and
 * every client, a partner's team only its own clients.
 */
export const PreviewAsSignerDialog: React.FC<PreviewAsSignerDialogProps> = ({ type, selectedUserId, onPick, onClose }) => {
    const titleId = useId();
    const label = previewSignerLabel(type);
    const plural = signerListNoun(type);
    const [search, setSearch] = useState('');
    const [term, setTerm] = useState('');
    const { data: signers = [], isPending, isError, isFetching } = useAgreementPreviewSigners(type, term);

    useEffect(() => {
        const timer = window.setTimeout(() => setTerm(search), SIGNER_SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return createPortal(
        <div className="ab4-confirm-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="ab4-templates ab4-signers" role="dialog" aria-modal="true" aria-labelledby={titleId}>
                <div className="ab4-templates__head">
                    <div>
                        <h6 id={titleId} className="ab4-templates__title">Preview as {label}</h6>
                        <p className="ab4-templates__sub">
                            {type === AGREEMENT_SLUG.PARTNER
                                ? 'Pick a partner to see this agreement filled with their details, as they will see it.'
                                : "Pick a client to see this agreement filled with their details and their partner's company details, as they will see it."}{' '}
                            Nothing is saved or sent.
                        </p>
                    </div>
                    <button type="button" className="ab4-templates__close" aria-label="Close" onClick={onClose}>
                        <i className="ri-close-line" aria-hidden="true" />
                    </button>
                </div>

                <div className="ab4-signers__search">
                    <i className="ri-search-line" aria-hidden="true" />
                    <input
                        type="search"
                        className="form-control"
                        placeholder={`Search ${plural} by name or email`}
                        aria-label={`Search ${plural}`}
                        value={search}
                        autoFocus
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {isFetching && !isPending && <span className="spinner-border spinner-border-sm ab4-signers__busy" aria-hidden="true" />}
                </div>

                <div className="ab4-signers__list">
                    {isPending ? (
                        <p className="ab4-templates__empty"><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Loading {plural}…</p>
                    ) : isError ? (
                        <p className="ab4-templates__empty">The {plural} could not be loaded.</p>
                    ) : signers.length === 0 ? (
                        <p className="ab4-templates__empty">No {plural} found.</p>
                    ) : (
                        signers.map((signer) => {
                            const selected = signer.user_id === selectedUserId;
                            return (
                                <button
                                    key={signer.user_id}
                                    type="button"
                                    className={`ab4-signers__row${selected ? ' ab4-signers__row--on' : ''}`}
                                    aria-pressed={selected}
                                    onClick={() => onPick(signer)}
                                >
                                    <span className="ab4-signers__avatar" aria-hidden="true">{initials(signer.name)}</span>
                                    <span className="ab4-signers__text">
                                        <span className="ab4-signers__name">{signer.name}</span>
                                        <span className="ab4-signers__meta">
                                            {[signer.business_name, signer.partner_name && `Client of ${signer.partner_name}`, signer.email].filter(Boolean).join(' · ')}
                                        </span>
                                        <span className="ab4-signers__tags">
                                            <span className={`ab4-signers__tag${signer.enrollment_type ? '' : ' ab4-signers__tag--muted'}`}>
                                                <i className="ri-bank-card-line" aria-hidden="true" />
                                                {signer.enrollment_type || SIGNER_ROW_LABELS.NO_ENROLLMENT}
                                            </span>
                                        </span>
                                    </span>
                                    <span className={`ab4-signers__status ab4-signers__status--${signer.has_sign ? 'signed' : 'unsigned'}`}>
                                        <i className={signer.has_sign ? 'ri-checkbox-circle-fill' : 'ri-time-line'} aria-hidden="true" />
                                        {signer.has_sign ? SIGNER_ROW_LABELS.SIGNED : SIGNER_ROW_LABELS.NOT_SIGNED}
                                    </span>
                                    <span className={`ab4-signers__radio${selected ? ' ab4-signers__radio--on' : ''}`} aria-hidden="true" />
                                </button>
                            );
                        })
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
