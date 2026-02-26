import React, { useEffect, useRef, useState } from 'react';
import Modal from 'bootstrap/js/dist/modal';

export default function VerificationActionModal({ show, onHide, onConfirm, actionType, loading, validationErrors, isBulk = false, count = 1 }) {
    const modalRef = useRef(null);
    const modalInstanceRef = useRef(null);
    const [reason, setReason] = useState('');
    const [error, setError] = useState(null);

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
            setReason('');
            setError(null);
        } else {
            modal.hide();
        }
    }, [show]);

    const handleConfirm = () => {
        onConfirm(reason);
    };

    const handleClose = () => {
        if (!loading && onHide) onHide();
    };

    const isReject = actionType === 'reject';
    const isApiVerify = actionType === 'api_verify';
    const isManualVerify = actionType === 'manual_verify';

    const title = isReject ? 'Reject Request' : (isApiVerify ? 'API Verification' : 'Manual Verification');
    const confirmBtnClass = isReject ? 'btn-danger' : (isApiVerify ? 'btn-primary' : 'btn-success');
    const confirmBtnText = isReject ? 'Reject' : 'Verify';
    const icon = isReject
        ? 'ri-close-circle-line text-danger'
        : (isApiVerify ? 'ri-shield-user-line text-primary' : 'ri-checkbox-circle-line text-success');

    const getMessage = () => {
        const itemLabel = isBulk ? `${count} selected requests` : "this request";
        if (isReject) return `Are you sure you want to reject ${itemLabel}? This action cannot be undone.`;
        if (isApiVerify) return `Are you sure you want to perform API verification for ${itemLabel}?`;
        return `Are you sure you want to manually verify ${itemLabel}?`;
    };

    return (
        <div className="modal fade flip" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-body p-4 text-center">
                        <i className={`${icon} display-4 mb-3 d-block`}></i>
                        <h4 className="mb-2">{title}</h4>
                        <p className="text-muted mb-4">
                            {getMessage()}
                        </p>

                        <div className="text-start mb-4">
                            <label className="form-label text-muted fw-medium">
                                {isReject ? (
                                    <>Rejection Reason <span className="text-danger">*</span></>
                                ) : (
                                    <>Verification Note</>
                                )}
                            </label>
                            <textarea
                                className={`form-control ${error || validationErrors?.note ? 'is-invalid' : ''}`}
                                rows="3"
                                value={reason}
                                onChange={(e) => {
                                    setReason(e.target.value);
                                    if (error) setError(null);
                                }}
                                placeholder={isReject ? "Enter reason for rejection..." : "Enter verification note..."}
                            ></textarea>
                            {validationErrors?.note && (
                                <div className="invalid-feedback d-block text-start">
                                    {validationErrors.note[0]}
                                </div>
                            )}
                            {error && <div className="invalid-feedback d-block">{error}</div>}
                        </div>

                        <div className="hstack gap-2 justify-content-center">
                            <button
                                type="button"
                                className="btn btn-light"
                                onClick={handleClose}
                                disabled={loading}
                            >
                                Cancel
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
                                ) : confirmBtnText}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
