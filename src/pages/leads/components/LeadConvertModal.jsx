import React, { useEffect, useRef, useState } from 'react';
import Modal from 'bootstrap/js/dist/modal';
import { Dropdown } from 'primereact/dropdown';
import { ENROLLMENT_TYPE_OPTIONS, NON_HOST_ENROLLMENT_PRICE, NON_HOST_ENROLLMENT_VALUE } from '../../../config/enrollmentOptions';

export default function LeadConvertModal({ show, onHide, onConfirm, lead, targetType = 'Borrower', loading, isHost }) {
    const [enrollmentType, setEnrollmentType] = useState('One Time Payment');
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
        
        return () => {
            if (modalInstanceRef.current) {
                modalInstanceRef.current.hide();
                modalInstanceRef.current.dispose();
                modalInstanceRef.current = null;
            }
        };
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
        const payload = {};
        if (targetType === 'Borrower') {
            payload.enrollment_type = isHost ? enrollmentType : NON_HOST_ENROLLMENT_VALUE;
        }
        onConfirm(payload);
    };

    const handleClose = () => {
        if (!loading && onHide) onHide();
    };

    const title = `Convert Lead to ${targetType}`;
    const confirmBtnClass = targetType === 'Partner' ? 'btn-success' : 'btn-primary';
    const confirmBtnText = `Convert to ${targetType}`;
    const icon = targetType === 'Partner' ? 'ri-shake-hands-line text-success' : 'ri-user-received-2-line text-primary';

    return (
        <div className="modal fade flip" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-body p-4 text-center">
                        <i className={`${icon} display-4 mb-3 d-block`}></i>
                        <h4 className="mb-2">{title}</h4>
                        <p className="text-muted mb-4">
                            Are you sure you want to convert <strong>{lead?.contact_person || lead?.contact_name || lead?.company_name || 'this lead'}</strong> to a <strong>{targetType}</strong>? 
                            This action will create a new {targetType.toLowerCase()} profile and cannot be undone.
                        </p>

                        {targetType === 'Borrower' && isHost && (
                            <div className="mb-4 text-start">
                                <label className="form-label fw-semibold">Select Enrollment Type <span className="text-danger">*</span></label>
                                <Dropdown
                                    value={enrollmentType}
                                    options={ENROLLMENT_TYPE_OPTIONS}
                                    onChange={(e) => setEnrollmentType(e.value)}
                                    placeholder="Select Enrollment Type"
                                    className="w-100"
                                    appendTo="self"
                                />
                                <div className="form-text text-info mt-2">
                                    {enrollmentType === 'One Time Payment' ? (
                                        <span><i className="ri-information-line me-1"></i> Total Payment: <strong>$2,900</strong></span>
                                    ) : (
                                        <span><i className="ri-information-line me-1"></i> Monthly Payment: <strong>$500</strong></span>
                                    )}
                                </div>
                            </div>
                        )}

                        {!isHost && targetType === 'Borrower' && (
                            <div className="mb-4 text-start bg-light p-3 rounded border border-info">
                                <h6 className="text-info mb-1"><i className="ri-information-line me-1"></i> Special Note:</h6>
                                <p className="mb-0 text-muted">A fixed Enrollment Fee of <strong>${NON_HOST_ENROLLMENT_PRICE}</strong> will be applied upon conversion.</p>
                            </div>
                        )}

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
                                        Converting...
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
