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
    successFeeRate?: number;
    adminCommissionRate?: number;
    partnerCommissionRate?: number;
    showPartnerCommission?: boolean;
    isCommissionSet?: boolean;
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
    initialAmount = '',
    successFeeRate = 0,
    adminCommissionRate = 0,
    partnerCommissionRate = 0,
    showPartnerCommission = false,
    isCommissionSet = false
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

    const parsedAmount = parseFloat(amount || '0');
    const successFeeAmt = parsedAmount * (successFeeRate / 100);
    const adminShareAmt = successFeeAmt * (adminCommissionRate / 100);
    const partnerShareAmt = successFeeAmt * (partnerCommissionRate / 100);

    const formatCurrency = (val: number) => {
        return val.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
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
                        <p className="text-muted mb-3">{message}</p>
                        
                        {isCommissionSet ? (
                            <div className="card bg-light border-0 shadow-none mb-4 text-start">
                                <div className="card-body p-3">
                                    <h6 className="fs-14 fw-bold mb-2">Commission Summary</h6>
                                    <ul className="list-unstyled mb-0 fs-13 text-muted">
                                        <li className="mb-1">
                                            <span className="fw-medium text-dark">Success Fee:</span> {formatCurrency(successFeeAmt)} ({successFeeRate}%)
                                        </li>
                                        {showPartnerCommission && (
                                            <>
                                                <li className="mb-1"><span className="fw-medium text-dark">Admin Commission:</span> {formatCurrency(adminShareAmt)} ({adminCommissionRate}%)</li>
                                                <li><span className="fw-medium text-dark">Partner Commission:</span> {formatCurrency(partnerShareAmt)} ({partnerCommissionRate}%)</li>
                                            </>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <div className="alert alert-warning border-0 bg-warning-subtle text-warning text-start fs-13 mb-4">
                                <i className="ri-error-warning-fill align-middle me-2 fs-15"></i>
                                <strong>Note:</strong> Commission is not set.
                            </div>
                        )}
                        
                        <div className="alert alert-danger border-0 bg-danger-subtle text-danger text-start fs-13 mb-4">
                            <i className="ri-error-warning-fill align-middle me-2 fs-15"></i>
                            <strong>Important:</strong> Finalizing this status will permanently lock the application. Status updates and commission calculations cannot be modified afterward.
                        </div>

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
