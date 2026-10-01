import React, { useEffect, useRef } from 'react';
import Modal from 'bootstrap/js/dist/modal';
import { clearStrayModalBackdrops } from '../../../utils/modalBackdrop';

export default function ConfirmationModal({ show, onHide, onConfirm, loading, title, message, confirmText = 'Confirm', cancelText = 'Close', variant = 'primary' }) {
    const modalRef = useRef(null);
    const modalInstanceRef = useRef(null);

    // Initialize Modal
    useEffect(() => {
        if (!modalRef.current) return;
        if (!modalInstanceRef.current) {
            modalInstanceRef.current = new Modal(modalRef.current, {
                backdrop: 'static',
                keyboard: false,
            });
        }

        const handleHidden = () => {
            if (onHide) onHide();
        };

        const modalEl = modalRef.current;
        modalEl?.addEventListener('hidden.bs.modal', handleHidden);

        return () => {
            modalEl?.removeEventListener('hidden.bs.modal', handleHidden);
            const modal = modalInstanceRef.current;
            if (modal) {
                try {
                    modal.hide();
                    if (typeof modal.dispose === 'function') modal.dispose();
                } catch (_) {}
            }
            modalInstanceRef.current = null;
            // Stray backdrops only. Unmounting while another modal is still open
            // used to delete that modal's overlay too, leaving it over an
            // undimmed, still-scrollable page.
            clearStrayModalBackdrops();
        };
    }, []);

    // Show/Hide Logic
    useEffect(() => {
        const modal = modalInstanceRef.current;
        if (!modal) return;
        if (show) {
            modal.show();
        } else {
            modal.hide();
        }
    }, [show]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            const modal = modalInstanceRef.current;
            if (modal) {
                try {
                    modal.hide();
                    if (typeof modal.dispose === 'function') modal.dispose();
                } catch (_) { }
            }
            modalInstanceRef.current = null;
        };
    }, []);

    const handleConfirm = () => {
        if (onConfirm) onConfirm();
    };

    const handleClose = () => {
        if (!loading && onHide) onHide();
    };

    const confirmBtnClass = `btn-${variant}`;
    
    return (
        <div className="modal fade flip" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-body p-5 text-center">
                        <lord-icon
                            src={variant === 'danger' ? "https://cdn.lordicon.com/gsqxdxog.json" : "https://cdn.lordicon.com/tdrtiskw.json"}
                            trigger="loop"
                            colors={`primary:${variant === 'danger' ? '#405189' : '#f7b84b'},secondary:${variant === 'danger' ? '#f06548' : '#405189'}`}
                            style={{ width: '90px', height: '90px' }}
                        ></lord-icon>
                        <div className="mt-4 text-center">
                            <h4>{title || 'Confirm Action'}</h4>
                            <p className="text-muted fs-15 mb-4">
                                {message || 'Are you sure you want to proceed?'}
                            </p>

                            <div className="hstack gap-2 justify-content-center remove">
                                <button
                                    type="button"
                                    className="btn btn-link link-success fw-medium"
                                    onClick={handleClose}
                                    disabled={loading}
                                >
                                    <i className="ri-close-line me-1 align-middle"></i> {cancelText}
                                </button>
                                <button
                                    type="button"
                                    className={`btn ${confirmBtnClass}`}
                                    onClick={handleConfirm}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                            Processing...
                                        </>
                                    ) : confirmText}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
