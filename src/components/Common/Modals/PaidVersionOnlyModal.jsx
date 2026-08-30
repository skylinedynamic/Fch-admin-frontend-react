import React, { useEffect, useRef } from 'react';
import Modal from 'bootstrap/js/dist/modal';

export default function PaidVersionOnlyModal({ show, onHide, title = 'Paid Version Only', message }) {
    const modalRef = useRef(null);
    const modalInstanceRef = useRef(null);

    // Initialize Bootstrap Modal instance once
    useEffect(() => {
        if (!modalRef.current) return;
        if (!modalInstanceRef.current) {
            modalInstanceRef.current = new Modal(modalRef.current, {
                backdrop: 'static',
                keyboard: false,
            });
        }
    }, []);

    // Show/hide based on `show` prop
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
                } catch (_) {}
            }
            modalInstanceRef.current = null;
        };
    }, []);

    const handleClose = () => {
        if (onHide) onHide();
    };

    return (
        <div
            className="modal fade flip"
            ref={modalRef}
            tabIndex="-1"
            aria-hidden="true"
        >
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-body p-5 text-center position-relative">
                        <button
                            type="button"
                            className="btn-close position-absolute top-0 end-0 m-3"
                            onClick={handleClose}
                            aria-label="Close"
                        ></button>
                        <div className="avatar-lg bg-warning-subtle text-warning rounded-circle d-flex align-items-center justify-content-center mx-auto mb-4" style={{ width: '80px', height: '80px' }}>
                            <i className="ri-vip-crown-2-line display-5"></i>
                        </div>
                        
                        <div className="mt-3">
                            <span className="badge bg-warning-subtle text-warning text-uppercase mb-3 px-3 py-1 fs-11 fw-semibold">
                                Premium Feature
                            </span>
                            <h4 className="fw-bold mb-2">{title}</h4>
                            <p className="text-muted fs-14 mb-4 mx-auto" style={{ maxWidth: '360px', lineHeight: '1.6' }}>
                                {message || 'This feature is only available in the Paid Version. Please upgrade your subscription plan to unlock full access.'}
                            </p>
                            <div className="d-flex justify-content-center gap-2 mt-4">
                                <button
                                    type="button"
                                    className="btn btn-primary w-md"
                                    onClick={handleClose}
                                >
                                    OK, Got It
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
