import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
import Modal from 'bootstrap/js/dist/modal';
import { Dropdown } from 'primereact/dropdown';

interface PayoutModalProps {
    show: boolean;
    onHide: () => void;
    onConfirm: (partnerMethod: string) => void;
    loading?: boolean;
}

import { COMMISSION_PAYMENT } from '../../config/statusOptions';

export default function PayoutModal({ show, onHide, onConfirm, loading = false }: PayoutModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const modalInstanceRef = useRef<Modal | null>(null);
    const [partnerMethod, setPartnerMethod] = useState<string>('');
    const [error, setError] = useState<string>('');

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
            setPartnerMethod('');
            setError('');
            modal.show();
        } else {
            modal.hide();
        }
    }, [show]);

    const handleConfirm = () => {
        if (!partnerMethod) {
            setError('Please select a payment method for Partner');
            return;
        }
        
        setError('');
        onConfirm(partnerMethod);
    };

    const handleClose = () => {
        if (!loading && onHide) onHide();
    };

    return (
        <div className="modal fade flip" ref={modalRef} tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-header">
                        <h5 className="modal-title">Process Payout</h5>
                        <button type="button" className="btn-close" onClick={handleClose} disabled={loading} aria-label="Close"></button>
                    </div>
                    <div className="modal-body p-4">
                        <p className="text-muted mb-4">Please select the payment methods used for this payout.</p>
                        
                        {error && (
                            <div className="alert alert-danger fs-13 mb-3">
                                {error}
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="form-label fw-semibold">Partner Payment Method <span className="text-danger">*</span></label>
                            <Dropdown
                                value={partnerMethod}
                                options={COMMISSION_PAYMENT}
                                onChange={(e) => setPartnerMethod(e.value)}
                                optionLabel="label"
                                placeholder="Select a payment method"
                                className="w-100"
                                disabled={loading}
                            />
                        </div>

                        <div className="hstack gap-2 justify-content-end mt-4">
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
                                className="btn waves-effect waves-light"
                                style={{ backgroundColor: 'var(--primary-color)', color: '#fff', borderColor: 'var(--primary-color)' }}
                                onClick={handleConfirm}
                                disabled={loading}
                            >
                                {loading ? 'Processing...' : 'Confirm Payout'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
