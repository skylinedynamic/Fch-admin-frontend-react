import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
import Modal from 'bootstrap/js/dist/modal';
import { Dropdown } from 'primereact/dropdown';
import { COMMISSION_PAYMENT } from '../../config/statusOptions';
import { formatCurrency } from '../../utils/helper';
import { CommissionPayout } from '../../modules/commission/types';
import { PAYOUT_TYPE_COMMISSION } from '../../config/compensationOptions';

interface PayoutModalProps {
    show: boolean;
    onHide: () => void;
    onConfirm: (paymentMethod: string, note: string) => void;
    loading?: boolean;
    /** The payout being paid — to a partner, or to the user assigned to a host-partner client. */
    payout: CommissionPayout;
    currencySymbol: string;
    conversionRate: string;
}

export default function PayoutModal({ show, onHide, onConfirm, loading = false, payout, currencySymbol, conversionRate }: PayoutModalProps) {
    const isPartner = payout.payee?.type === 'partner';
    const modalRef = useRef<HTMLDivElement>(null);
    const modalInstanceRef = useRef<Modal | null>(null);
    
    const defaultMethod = COMMISSION_PAYMENT.find(opt => opt.value === 'Cash')?.value || '';
    const [partnerMethod, setPartnerMethod] = useState<string>(defaultMethod);
    const [error, setError] = useState<string>('');
    const [note, setNote] = useState<string>('');

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
            setPartnerMethod(defaultMethod);
            setError('');
            setNote('');
            modal.show();
        } else {
            modal.hide();
        }
    }, [show]);

    const handleConfirm = () => {
        if (!partnerMethod) {
            setError('Please select a payment method');
            return;
        }
        
        setError('');
        onConfirm(partnerMethod, note);
    };

    const handleClose = () => {
        if (!loading && onHide) onHide();
    };

    return (
        <div className="modal fade flip" ref={modalRef} tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-header bg-light">
                        <h5 className="modal-title d-flex align-items-center">
                            <i className="ri-wallet-3-line text-primary me-2 fs-20"></i> Process Payout
                        </h5>
                        <button type="button" className="btn-close" onClick={handleClose} disabled={loading} aria-label="Close"></button>
                    </div>
                    <div className="modal-body p-4">
                        <div className="card bg-info-subtle border-0 mb-4 shadow-none">
                            <div className="card-body">
                                <div className="d-flex align-items-center">
                                    <div className="avatar-sm me-3">
                                        <div className="avatar-title bg-info text-white rounded-circle fs-20">
                                            <i className="ri-money-dollar-circle-line"></i>
                                        </div>
                                    </div>
                                    <div className="flex-grow-1">
                                        <h6 className="text-info text-uppercase fw-semibold mb-1">Payout to {payout.payee?.name}</h6>
                                        <h3 className="mb-0 text-info fw-bold">
                                            {formatCurrency(payout.amount, currencySymbol, conversionRate, 2)}
                                        </h3>
                                    </div>
                                    <div className="text-end">
                                        <span className="badge bg-info">
                                            {payout.payout_type === PAYOUT_TYPE_COMMISSION ? `${payout.rate}% Rate` : 'Flat Amount'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <p className="text-muted mb-4">Please select the payment method used for this payout and add an optional note.</p>
                        
                        {error && (
                            <div className="alert alert-danger fs-13 mb-3">
                                {error}
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="form-label fw-semibold">Payment Method <span className="text-danger">*</span></label>
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

                        <div className="mb-4">
                            <label className="form-label fw-semibold">Note (Optional)</label>
                            <textarea
                                className="form-control"
                                rows={3}
                                placeholder={isPartner ? 'Add a note to be saved with the invoice and sent to the partner' : 'Add a note to be saved with the invoice'}
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                disabled={loading}
                            ></textarea>
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
                                {loading ? (
                                    <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Processing...</>
                                ) : (
                                    <><i className="ri-check-line align-middle me-1"></i> Confirm Payout</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
