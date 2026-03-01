import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
import Modal from 'bootstrap/js/dist/modal';

interface FundedAmountModalProps {
    show: boolean;
    onHide: () => void;
    onConfirm: (amount: string) => void;
    loading: boolean;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    initialAmount?: string;
}

export default function FundedAmountModal({
    show,
    onHide,
    onConfirm,
    loading,
    title = 'Confirm Funding',
    message = 'Please enter the final funded amount.',
    confirmText = 'Confirm & Update',
    cancelText = 'Cancel',
    initialAmount = ''
}: FundedAmountModalProps) {
    const [amount, setAmount] = useState(initialAmount);
    const [error, setError] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);
    const modalInstanceRef = useRef<Modal | null>(null);

    useEffect(() => {
        if (show) {
            setAmount(initialAmount);
            setError('');
        }
    }, [show, initialAmount]);

    // Initialize Modal
    useEffect(() => {
        if (!modalRef.current) return;
        if (!modalInstanceRef.current) {
            modalInstanceRef.current = new Modal(modalRef.current, {
                backdrop: 'static',
                keyboard: false,
            });
        }
    }, []);

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
        if (!amount || parseFloat(amount) <= 0) {
            setError('Please enter a valid funded amount');
            return;
        }
        onConfirm(amount);
    };

    const handleClose = () => {
        if (!loading && onHide) onHide();
    };

    return (
        <div className="modal fade flip" ref={modalRef} tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-body p-4 text-center">
                        <div className="avatar-lg mx-auto mb-3">
                            <div className="avatar-title bg-success text-success rounded-circle display-4">
                                <i className="ri-money-dollar-circle-line text-white"></i>
                            </div>
                        </div>
                        <h4 className="mb-2">{title}</h4>
                        <p className="text-muted mb-4">{message}</p>

                        <div className="mb-4 text-start">
                            <label htmlFor="funded-amount" className="form-label fw-semibold">Funded Amount ($)</label>
                            <div className="input-group">
                                <span className="input-group-text bg-light text-muted">$</span>
                                <input
                                    type="number"
                                    className={`form-control ${error ? 'is-invalid' : ''}`}
                                    id="funded-amount"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => {
                                        setAmount(e.target.value);
                                        if (error) setError('');
                                    }}
                                    step="0.01"
                                    min="0"
                                    disabled={loading}
                                />
                                {error && <div className="invalid-feedback">{error}</div>}
                            </div>
                        </div>

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
                                className="btn btn-success"
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
