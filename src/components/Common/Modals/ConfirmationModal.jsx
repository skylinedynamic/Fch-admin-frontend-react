import React, { useEffect, useRef } from 'react';
import Modal from 'bootstrap/js/dist/modal';

export default function ConfirmationModal({ show, onHide, onConfirm, loading, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'primary' }) {
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
    }, [modalRef]);

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

    const handleConfirm = () => {
        if (onConfirm) onConfirm();
    };

    const handleClose = () => {
        if (!loading && onHide) onHide();
    };

    const confirmBtnClass = `btn-${variant}`;
    const icon = variant === 'danger' ? 'ri-error-warning-line text-danger' : 'ri-question-line text-primary';

    return (
        <div className="modal fade flip" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-body p-4 text-center">
                        <i className={`${icon} display-4 mb-3 d-block`}></i>
                        <h4 className="mb-2">{title || 'Confirm Action'}</h4>
                        <p className="text-muted mb-4">
                            {message || 'Are you sure you want to proceed?'}
                        </p>

                        <div className="hstack gap-2 justify-content-center">
                            <button
                                type="button"
                                className="btn btn-light"
                                onClick={handleClose}
                                disabled={loading}
                            >
                                {cancelText}
                            </button>
                            <button
                                type="button"
                                className={`btn ${confirmBtnClass}`}
                                onClick={handleConfirm}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                        Processing...
                                    </>
                                ) : confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
