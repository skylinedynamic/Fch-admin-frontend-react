import React, { useEffect, useRef, useState } from 'react';
import Modal from 'bootstrap/js/dist/modal';

const ResponseDetailModal = ({ show, onHide, data = [], message = '', raw = null }) => {
    const modalRef = useRef(null);
    const modalInstanceRef = useRef(null);
    const [activeTab, setActiveTab] = useState('summary'); // 'summary' or 'raw'

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
                setActiveTab('summary'); // Reset to summary when opened
            } else {
                modalInstanceRef.current.hide();
            }
        }
    }, [show]);

    return (
        <div className="modal fade flip" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content border-0 shadow">
                    <div className="modal-header bg-primary-subtle p-3">
                        <div className="d-flex align-items-center">
                            <div className="flex-shrink-0">
                                <div className="avatar-xs">
                                    <div className="avatar-title bg-primary text-white rounded-circle fs-16">
                                        <i className="ri-list-check-2"></i>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-grow-1 ms-2">
                                <h5 className="modal-title mb-0 fs-16 fw-bold text-primary">Verification Results Summary</h5>
                            </div>
                        </div>
                        <button type="button" className="btn-close" onClick={onHide}></button>
                    </div>

                    {/* Nav Tabs */}
                    <div className="bg-light-subtle border-bottom">
                        <ul className="nav nav-tabs-custom nav-success border-bottom-0 ps-3" role="tablist">
                            <li className="nav-item">
                                <button
                                    className={`nav-link fs-13 py-2 ${activeTab === 'summary' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('summary')}
                                    type="button"
                                >
                                    Summary View
                                </button>
                            </li>
                            {raw && (
                                <li className="nav-item">
                                    <button
                                        className={`nav-link fs-13 py-2 ${activeTab === 'raw' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('raw')}
                                        type="button"
                                    >
                                        Raw JSON Response
                                    </button>
                                </li>
                            )}
                        </ul>
                    </div>

                    <div className="modal-body p-0">
                        {activeTab === 'summary' ? (
                            <div className="table-responsive" style={{ maxHeight: '400px' }}>
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="bg-light text-muted">
                                        <tr>
                                            <th scope="col" className="ps-4" style={{ width: '40%' }}>Task Name</th>
                                            <th scope="col" className="text-end pe-4">Status & Message</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data && data.length > 0 ? (
                                            data.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="ps-4">
                                                        <div className="d-flex align-items-center">
                                                            <span className="fw-medium text-dark">{item.task_name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="pe-4 text-end">
                                                        <div className="d-flex align-items-center justify-content-end">
                                                            <div className={`avatar-xxs flex-shrink-0 me-2`}>
                                                                <div className={`avatar-title rounded-circle fs-14 ${item.is_verified ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                                                                    <i className={item.is_verified ? 'ri-checkbox-circle-fill' : 'ri-error-warning-fill'}></i>
                                                                </div>
                                                            </div>
                                                            <span className={`fs-13 ${item.is_verified ? 'text-success' : 'text-danger'} text-wrap`}>
                                                                {item.message || (item.is_verified ? 'Successfully processed' : 'Failed to process')}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="2" className="text-center py-5">
                                                    <div className="avatar-md mx-auto mb-3">
                                                        <div className="avatar-title bg-light text-primary rounded-circle fs-24">
                                                            <i className="ri-inbox-archive-line"></i>
                                                        </div>
                                                    </div>
                                                    <h5 className="fs-15 fw-semibold">No Results Found</h5>
                                                    <p className="text-muted mb-0">{message || 'There are no verification details to display.'}</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="bg-dark p-3 m-0" style={{ maxHeight: '450px', overflowY: 'auto' }}>
                                <pre className="text-success mb-0 fs-12 code-font" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                                    {JSON.stringify(raw, null, 4)}
                                </pre>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer bg-light p-3">
                        <button type="button" className="btn btn-primary px-4" onClick={onHide}>
                            <i className="ri-close-line align-bottom me-1"></i> Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResponseDetailModal;
