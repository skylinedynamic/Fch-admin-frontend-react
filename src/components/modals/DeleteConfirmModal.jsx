import React from 'react';

const DeleteConfirmModal = ({ show, onHide, onConfirm, title, message, isBulk }) => {
    if (!show) return null;

    return (
        <>
            <div className="modal fade show d-block" tabIndex="-1" role="dialog">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-body p-5 text-center">
                            <lord-icon
                                src="https://cdn.lordicon.com/gsqxdxog.json"
                                trigger="loop"
                                colors="primary:#405189,secondary:#f06548"
                                style={{ width: '90px', height: '90px' }}
                            ></lord-icon>
                            <div className="mt-4">
                                <h4>{title}</h4>
                                <p className="text-muted fs-15 mb-4">
                                    {message}
                                </p>
                                <div className="hstack gap-2 justify-content-center">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={onHide}
                                    >
                                        <i className="ri-close-line me-1 align-middle"></i> Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-danger"
                                        onClick={onConfirm}
                                    >
                                        <i className="ri-delete-bin-6-line me-1 align-middle"></i> Yes, Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show"></div>
        </>
    );
};

export default DeleteConfirmModal;
