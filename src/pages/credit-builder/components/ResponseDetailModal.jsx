import React, { useEffect, useRef } from 'react';
import Modal from 'bootstrap/js/dist/modal';

const ResponseDetailModal = ({ show, onHide, data = [], message = '' }) => {
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

    return (
        <div className="modal fade zoomIn" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content border-0">
                    <div className="modal-header bg-light p-3">
                        <h5 className="modal-title">Verification Results</h5>
                        <button type="button" className="btn-close" onClick={onHide}></button>
                    </div>
                    <div className="modal-body">
                        <div className="table-responsive">
                            <table className="table table-nowrap align-middle mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th scope="col">Task Name</th>
                                        <th scope="col">Message</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data && data.length > 0 ? (
                                        data.map((item, index) => (
                                            <tr key={index}>
                                                <td className="fw-medium">{item.task_name}</td>
                                                <td className="text-wrap">
                                                    <span className={item.is_verified ? 'text-success' : 'text-danger'}>
                                                        {item.message || (item.is_verified ? 'Successfully processed' : 'Failed to process')}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="text-center p-4">
                                                <div className="text-muted">No details available</div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-primary" onClick={onHide}>Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResponseDetailModal;
