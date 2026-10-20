import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
// bootstrap ships no type declarations for this subpath export
// @ts-expect-error -- untyped third-party module
import Modal from 'bootstrap/js/dist/modal';
import { clearStrayModalBackdrops } from '../../../utils/modalBackdrop';

export interface BlockedItem {
    id: number | string;
    name: string;
}

interface DeleteBlockedModalProps {
    show: boolean;
    title: string;
    /** One short sentence: what cannot be deleted, and what to do instead. */
    message: string;
    /** When several records are blocked, they are listed under the message. */
    items?: BlockedItem[];
    /** Makes each listed record a link (e.g. to open it). */
    onItemClick?: (id: BlockedItem['id']) => void;
    /** A small note under the message, e.g. how to delete the rest of the selection. */
    note?: string;
    /** An optional second button next to Close. */
    primaryAction?: { label: string; icon?: string; onClick: () => void };
    onClose: () => void;
}

/**
 * Shown instead of the delete confirmation when a record must be kept. Nothing
 * is deleted or changed; it only tells the user why.
 *
 * Built like DeleteConfirmationModal - a Bootstrap "flip" modal portalled to
 * <body> - so it opens the same way and is not clipped by the page layout.
 * Buttons stack full width on phones.
 */
export default function DeleteBlockedModal({ show, title, message, items = [], onItemClick, note, primaryAction, onClose }: DeleteBlockedModalProps) {
    const titleId = useId();
    const modalRef = useRef<HTMLDivElement>(null);
    const modalInstanceRef = useRef<{ show(): void; hide(): void; dispose(): void } | null>(null);

    useEffect(() => {
        if (modalRef.current && !modalInstanceRef.current) {
            modalInstanceRef.current = new Modal(modalRef.current, { backdrop: 'static', keyboard: false });
        }
    }, []);

    useEffect(() => {
        const modal = modalInstanceRef.current;
        if (!modal) return;
        if (show) modal.show();
        else modal.hide();
    }, [show]);

    useEffect(() => () => {
        const modal = modalInstanceRef.current;
        if (modal) {
            try {
                modal.hide();
                modal.dispose();
            } catch { /* already torn down */ }
        }
        modalInstanceRef.current = null;
        clearStrayModalBackdrops();
    }, []);

    const content = (
        <div
            className="modal fade flip"
            ref={modalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-hidden="true"
        >
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-body p-4 p-sm-5 text-center position-relative">
                        <button type="button" className="btn-close position-absolute top-0 end-0 m-3" aria-label="Close" onClick={onClose}></button>
                        <div
                            className="bg-warning-subtle text-warning rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4"
                            style={{ width: '80px', height: '80px' }}
                        >
                            <i className="ri-error-warning-line display-5"></i>
                        </div>
                        <h4 id={titleId} className="fw-bold mb-2">{title}</h4>
                        <div className="text-muted fs-14 mb-4 mx-auto text-break" style={{ maxWidth: '360px', lineHeight: 1.6, textWrap: 'balance' }}>
                            <p className={items.length > 1 ? 'mb-2' : 'mb-0'} data-testid="blocked-message">{message}</p>
                            {items.length > 1 && (
                                <ul className="list-unstyled mb-0">
                                    {items.map(item => (
                                        <li key={item.id}>
                                            {onItemClick ? (
                                                <button type="button" className="btn btn-link p-0" onClick={() => onItemClick(item.id)}>
                                                    {item.name}
                                                </button>
                                            ) : (
                                                <span>{item.name}</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {note && (
                                <div className="alert alert-info fs-13 text-start mt-3 mb-0 py-2" data-testid="blocked-others">
                                    <i className="ri-information-line me-1 align-bottom"></i>
                                    {note}
                                </div>
                            )}
                        </div>
                        <div className="d-flex flex-column flex-sm-row gap-2 justify-content-center">
                            {/* Alone, Close is the main button; next to an action it steps back. */}
                            <button type="button" className={`btn fw-medium ${primaryAction ? 'btn-light' : 'btn-primary'}`} style={{ minWidth: '140px' }} onClick={onClose}>
                                Close
                            </button>
                            {primaryAction && (
                                <button type="button" className="btn btn-primary fw-medium" style={{ minWidth: '140px' }} onClick={primaryAction.onClick}>
                                    {primaryAction.icon && <i className={`${primaryAction.icon} me-1 align-bottom`}></i>}{primaryAction.label}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') return null;
    return createPortal(content, document.body);
}
