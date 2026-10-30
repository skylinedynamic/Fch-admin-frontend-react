import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmDialogProps {
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    icon?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * The builder's own confirmation (Clear All, closing with unsaved changes),
 * above the full-screen editor. Escape or the backdrop cancels.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    title, message, confirmLabel, cancelLabel = 'Cancel', icon = 'ri-error-warning-line', onConfirm, onCancel,
}) => {
    const titleId = useId();
    const messageId = useId();
    const cancelRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        cancelRef.current?.focus();
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onCancel]);

    return createPortal(
        <div className="ab4-confirm-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
            <div className="ab4-confirm" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={messageId}>
                <div className="ab4-confirm__icon" aria-hidden="true"><i className={icon} /></div>
                <h6 id={titleId} className="ab4-confirm__title">{title}</h6>
                <p id={messageId} className="ab4-confirm__message">{message}</p>
                <div className="ab4-confirm__actions">
                    <button ref={cancelRef} type="button" className="btn btn-light" onClick={onCancel}>{cancelLabel}</button>
                    <button type="button" className="btn btn-danger" onClick={onConfirm}>{confirmLabel}</button>
                </div>
            </div>
        </div>,
        document.body
    );
};
