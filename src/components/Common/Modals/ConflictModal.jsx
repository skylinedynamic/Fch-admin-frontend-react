import React, { useEffect, useRef } from 'react';
import Modal from 'bootstrap/js/dist/modal';

export default function ConflictModal({ show, onClose, conflicts }) {
    const modalRef = useRef(null);
    const modalInstanceRef = useRef(null);

    // Initialize Bootstrap Modal instance
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
                } catch (_) { }
            }
            modalInstanceRef.current = null;
        };
    }, []);

    return (
        <div
            className="modal fade flip"
            ref={modalRef}
            tabIndex="-1"
            aria-hidden="true"
        >
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-body p-5 text-center">
                        <lord-icon
                            src="https://cdn.lordicon.com/tdrtiskw.json"
                            trigger="loop"
                            colors="primary:#f7b84b,secondary:#405189"
                            style={{ width: '90px', height: '90px' }}
                        ></lord-icon>

                        <div className="mt-4 text-center">
                            <h4>Time Conflict Detected</h4>
                            <p className="text-muted fs-15 mb-4">
                                The selected time slot overlaps with an existing appointment.
                            </p>

                            {/* Conflict Details Area */}
                            {(conflicts?.assignee_conflicts?.length > 0 || conflicts?.scheduler_conflicts?.length > 0) && (
                                <div className="alert alert-warning text-start mb-4">
                                    <h6 className="alert-heading fw-bold mb-2"><i className="ri-error-warning-line me-1"></i> Busy Slots:</h6>
                                    <ul className="mb-0 small ps-3">
                                        {conflicts.assignee_conflicts?.map((c, i) => (
                                            <li key={`assignee-${i}`}>
                                                {c.start_time} - {c.end_time} ({c.duration_minutes}m)
                                            </li>
                                        ))}
                                        {conflicts.scheduler_conflicts?.map((c, i) => (
                                            <li key={`sched-${i}`}>
                                                {c.start_time} - {c.end_time}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="hstack gap-2 justify-content-center remove">
                                <button
                                    type="button"
                                    className="btn btn-link link-success fw-medium"
                                    onClick={onClose}
                                >
                                    Close
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={onClose}
                                >
                                    Select Another Time
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
