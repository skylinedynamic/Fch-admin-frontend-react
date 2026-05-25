import React, { useEffect, useRef } from 'react';
import Modal from 'bootstrap/js/dist/modal';

const NoteViewModal = ({ show, onHide, note, status, taskTitle = "Verification Task" }) => {
    const modalRef = useRef(null);
    const modalInstanceRef = useRef(null);

    useEffect(() => {
        if (modalRef.current && !modalInstanceRef.current) {
            modalInstanceRef.current = new Modal(modalRef.current, {
                backdrop: 'static',
                keyboard: false
            });
        }
    }, []);

    useEffect(() => {
        if (modalInstanceRef.current) {
            if (show) {
                modalInstanceRef.current.show();
            } else {
                modalInstanceRef.current.hide();
            }
        }
    }, [show]);

    // Contextual theme based on status
    const isRejected = status?.toLowerCase() === 'rejected';
    const isVerified = status?.toLowerCase() === 'verified' || status?.toLowerCase() === 'completed';

    const themeClass = isRejected ? 'danger' : (isVerified ? 'success' : 'primary');
    const headerTitle = isRejected ? 'Rejection Reason' : (isVerified ? 'Verification Note' : 'Review Note');

    return (
        <div className="modal fade flip" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '10px' }}>
                    <div className="modal-header border-bottom p-3">
                        <div className="d-flex align-items-center">
                            <div className="flex-shrink-0">
                                <div className="avatar-xs">
                                    <div className={`avatar-title bg-${themeClass}-subtle text-${themeClass} rounded-circle fs-16`}>
                                        <i className="ri-equalizer-fill"></i>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-grow-1 ms-2">
                                <h5 className="modal-title mb-0 fs-16 fw-bold">{headerTitle}</h5>
                            </div>
                        </div>
                        <button type="button" className="btn-close" onClick={onHide}></button>
                    </div>

                    <div className="modal-body p-4">
                        <div className="mb-3">
                            <p className="text-muted text-uppercase fw-semibold mb-1 fs-11">Regarding Task</p>
                            <h6 className="fw-bold mb-0">{taskTitle}</h6>
                        </div>

                        <div className="mt-4 p-3 bg-light rounded border border-light-subtle">
                            <p className="text-dark mb-0 fs-14" style={{
                                whiteSpace: 'pre-wrap',
                                lineHeight: '1.6',
                                color: '#333'
                            }}>
                                {note || "No specific notes provided."}
                            </p>
                        </div>
                    </div>

                    <div className="modal-footer bg-light p-2 border-top">
                        <button
                            type="button"
                            className="btn btn-light px-4"
                            onClick={onHide}
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NoteViewModal;
