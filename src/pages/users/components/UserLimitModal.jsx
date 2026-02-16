import React, { useState, useEffect, useRef } from 'react';
import Modal from 'bootstrap/js/dist/modal';

const UserLimitModal = ({ show, onHide, onProceed, userCount, freeLimit, perUserPrice }) => {
    const [quantity, setQuantity] = useState(1);
    const [totalPrice, setTotalPrice] = useState(0);
    const modalRef = useRef(null);
    const modalInstanceRef = useRef(null);

    useEffect(() => {
        if (!modalRef.current) return;
        if (!modalInstanceRef.current) {
            modalInstanceRef.current = new Modal(modalRef.current, {
                backdrop: 'static',
                keyboard: false,
            });
        }
    }, []);

    useEffect(() => {
        const modal = modalInstanceRef.current;
        if (!modal) return;
        if (show) {
            modal.show();
            setQuantity(1);
        } else {
            modal.hide();
        }
    }, [show]);

    useEffect(() => {
        const price = parseFloat(perUserPrice || 0);
        setTotalPrice(quantity * price);
    }, [quantity, perUserPrice]);

    const handleProceed = () => {
        onProceed(quantity, totalPrice);
    };

    return (
        <div className="modal fade" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0">
                    <div className="modal-body p-5 text-center px-4">
                        <button
                            type="button"
                            className="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle position-absolute end-0 top-0 m-2"
                            onClick={onHide}
                        >
                            <i className="ri-close-line fs-22"></i>
                        </button>
                        
                        <lord-icon
                            src="https://cdn.lordicon.com/qhviklyi.json" // Wallet/Payment icon
                            trigger="loop"
                            colors="primary:#405189,secondary:#f06548"
                            style={{ width: '90px', height: '90px' }}
                        ></lord-icon>
                        <div className="mt-4 text-center">
                            <h4 className="fw-bold">User Limit Reached</h4>
                            <p className="text-muted fs-15 mb-4">
                                You have reached your limit of <b>{freeLimit}</b>. 
                                <br />Purchase additional users to add more accounts. Payment is required.
                            </p>
                            
                            <div className="mb-4 text-start mx-auto" style={{ maxWidth: '250px' }}>
                                <label className="form-label text-muted small uppercase fw-bold">Number of users to add</label>
                                <div className="input-group">
                                    <button 
                                        className="btn btn-outline-light border text-dark" 
                                        type="button"
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    >
                                        <i className="ri-subtract-line"></i>
                                    </button>
                                    <input 
                                        type="number" 
                                        className="form-control text-center bg-light border-0 fw-bold" 
                                        value={quantity} 
                                        readOnly 
                                    />
                                    <button 
                                        className="btn btn-outline-light border text-dark" 
                                        type="button"
                                        onClick={() => setQuantity(quantity + 1)}
                                    >
                                        <i className="ri-add-line"></i>
                                    </button>
                                </div>
                            </div>

                            <div className="p-3 bg-light rounded-3 mb-4">
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted">Price per user:</span>
                                    <span className="fw-medium">${parseFloat(perUserPrice).toFixed(2)}</span>
                                </div>
                                <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                                    <span className="fw-bold">Total Amount:</span>
                                    <span className="fs-18 fw-bold text-primary">${totalPrice.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="hstack gap-2 justify-content-center remove">
                                <button
                                    className="btn btn-danger text-white fw-medium text-decoration-none"
                                    onClick={onHide}
                                    style={{ color: '#f06548' }} // Hardcoded to match Velzon danger primary
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary px-4"
                                    onClick={handleProceed}
                                >
                                    Proceed
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserLimitModal;
