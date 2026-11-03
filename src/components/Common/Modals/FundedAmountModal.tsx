import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
import Modal from 'bootstrap/js/dist/modal';
import '../../../../assets/css/funded-amount-modal.css';

/** The rates as typed (percent strings), as the Commission Details card holds them. */
export type CommissionRates = {
    successFee: string;
    adminRate: string;
    partnerRate: string;
};

interface FundedAmountModalProps {
    show: boolean;
    onHide: () => void;
    /** `commission` is null when the user may not set one, or left it blank. */
    onConfirm: (amount: string, commission: CommissionRates | null) => void;
    loading: boolean;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    initialAmount?: string;
    successFeeRate?: number;
    adminCommissionRate?: number;
    partnerCommissionRate?: number;
    /** Total Requested Amount, shown beside the funded amount as on the page's card. */
    requestedAmount?: number;
    /** The application belongs to a partner: the success fee is split admin / partner. */
    showPartnerCommission?: boolean;
    /** Kept for callers; the calculation is always shown now. */
    isCommissionSet?: boolean;
    /** The commission can be set here (permission "update commission"); else it is only shown. */
    canEditCommission?: boolean;
    /** Errors from saving the commission (same API as the Commission Details card). */
    commissionErrors?: { total_commission?: string; admin_commission?: string; partner_commission?: string };
}

const toRate = (value?: number) => (value ? String(value) : '');

/**
 * Closed (Completed): the final funded amount, and - optional but recommended -
 * the commission, saved through the same API as the Commission Details card
 * before the status is set. Closing locks both.
 */
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
    requestedAmount = 0,
    showPartnerCommission = false,
    canEditCommission = false,
    commissionErrors = {},
}: FundedAmountModalProps) {
    const [amount, setAmount] = useState(initialAmount);
    const [error, setError] = useState('');
    const [successFee, setSuccessFee] = useState(toRate(successFeeRate));
    const [adminRate, setAdminRate] = useState(toRate(adminCommissionRate));
    const [partnerRate, setPartnerRate] = useState(toRate(partnerCommissionRate));
    const [rateError, setRateError] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);
    const modalInstanceRef = useRef<Modal | null>(null);

    useEffect(() => {
        if (show) {
            setAmount(initialAmount);
            setError('');
            setRateError('');
            setSuccessFee(toRate(successFeeRate));
            // A partner's application with no split yet starts at 100% admin, as the card does.
            setAdminRate(toRate(adminCommissionRate) || (showPartnerCommission ? '100' : ''));
            setPartnerRate(toRate(partnerCommissionRate) || (showPartnerCommission ? '0' : ''));
        }
    }, [show, initialAmount, successFeeRate, adminCommissionRate, partnerCommissionRate, showPartnerCommission]);

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

    const parsedAmount = parseFloat(amount || '0') || 0;
    const feeRate = parseFloat(successFee || '0') || 0;
    const adminShare = showPartnerCommission ? parseFloat(adminRate || '0') || 0 : 100;
    const partnerShare = showPartnerCommission ? parseFloat(partnerRate || '0') || 0 : 0;
    const successFeeAmt = parsedAmount * (feeRate / 100);
    const adminShareAmt = successFeeAmt * (adminShare / 100);
    const partnerShareAmt = successFeeAmt * (partnerShare / 100);
    const hasCommission = feeRate > 0;

    const handleConfirm = () => {
        if (!amount || parsedAmount <= 0) {
            setError('Please enter a valid funded amount');
            return;
        }
        if (canEditCommission && hasCommission && showPartnerCommission && Math.abs(adminShare + partnerShare - 100) > 0.001) {
            setRateError('Admin and partner commission rates must add up to 100%.');
            return;
        }
        onConfirm(amount, canEditCommission && hasCommission ? { successFee, adminRate, partnerRate } : null);
    };

    const handleClose = () => {
        if (!loading && onHide) onHide();
    };

    const formatCurrency = (val: number) => val.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

    // 0-100, as the Commission Details card accepts.
    const percentInput = (value: string, onChange: (v: string) => void, id: string, invalid?: boolean) => (
        <div className="input-group">
            <input
                id={id}
                type="number"
                className={`form-control ${invalid ? 'is-invalid' : ''}`}
                placeholder="0"
                value={value}
                min="0"
                max="100"
                step="0.1"
                disabled={loading}
                onChange={(e) => {
                    const val = e.target.value;
                    const num = parseFloat(val);
                    if (val === '' || (!isNaN(num) && num >= 0 && num <= 100)) {
                        onChange(val);
                        setRateError('');
                    }
                }}
            />
            <span className="input-group-text bg-light text-muted">%</span>
        </div>
    );

    // One line of the summary.
    const summaryRow = (label: React.ReactNode, value: string, modifier = '') => (
        <div className={`fam-row ${modifier}`} data-row>
            <span>{label}</span>
            <span>{value}</span>
        </div>
    );

    const hasError = rateError || commissionErrors.total_commission || commissionErrors.admin_commission || commissionErrors.partner_commission;

    return (
        <div className="modal fade flip fam-modal" ref={modalRef} tabIndex={-1} aria-hidden="true" aria-labelledby="funded-amount-title">
            <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: 640 }}>
                <div className="modal-content">
                    {/* Header */}
                    <div className="fam-header">
                        <span className="fam-header__badge" aria-hidden="true">
                            <span><i className="ri-check-line"></i></span>
                        </span>
                        <div className="fam-header__text">
                            <h5 className="fam-header__title" id="funded-amount-title">{title}</h5>
                            <p className="fam-header__subtitle">{message}</p>
                        </div>
                        <button type="button" className="fam-header__close" aria-label="Close" onClick={handleClose} disabled={loading}>
                            <i className="ri-close-line"></i>
                        </button>
                    </div>

                    <div className="fam-body">
                        {/* Funded amount */}
                        <label htmlFor="funded-amount" className="fam-label">Funded Amount <span className="text-danger">*</span></label>
                        <div>
                            <div>
                                <div className="input-group fam-input has-validation">
                                    <span className="input-group-text">$</span>
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
                        </div>

                        <hr className="fam-divider" />

                        {/* Commission details */}
                        <div className={showPartnerCommission ? 'fam-panel' : ''}>
                            <div className="d-flex align-items-center gap-2 mb-2">
                                <span className={`fam-icon ${showPartnerCommission ? 'fam-icon--solid' : ''}`} aria-hidden="true"><i className="ri-percent-line"></i></span>
                                <h6 className="fam-panel__title">Commission Details</h6>
                            </div>

                            {canEditCommission ? (
                                <>
                                    <div className="fam-inline">
                                        <label htmlFor="closing-success-fee" className="fam-label">Success Fee (%)</label>
                                        <div className="fam-input">{percentInput(successFee, setSuccessFee, 'closing-success-fee', !!commissionErrors.total_commission)}</div>
                                    </div>
                                    {showPartnerCommission && (
                                        <div className="row g-2 mt-1">
                                            <div className="col-sm-6">
                                                <label htmlFor="closing-admin-rate" className="fam-label">Admin Commission Rate</label>
                                                <div className="fam-input">
                                                    {percentInput(adminRate, (v) => {
                                                        setAdminRate(v);
                                                        if (v !== '') setPartnerRate(String(+(100 - parseFloat(v)).toFixed(2)));
                                                    }, 'closing-admin-rate', !!commissionErrors.admin_commission)}
                                                </div>
                                            </div>
                                            <div className="col-sm-6">
                                                <label htmlFor="closing-partner-rate" className="fam-label">Partner Commission Rate</label>
                                                <div className="fam-input">
                                                    {percentInput(partnerRate, (v) => {
                                                        setPartnerRate(v);
                                                        if (v !== '') setAdminRate(String(+(100 - parseFloat(v)).toFixed(2)));
                                                    }, 'closing-partner-rate', !!commissionErrors.partner_commission)}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {hasError && <div className="fam-error">{hasError}</div>}
                                </>
                            ) : !hasCommission && (
                                <p className="fam-hint mt-0">No commission is set for this application.</p>
                            )}
                        </div>

                        {/* Summary - the same calculation as the Commission Details card */}
                        <div className="fam-summary">
                            {showPartnerCommission && (
                                <div className="fam-summary__head">
                                    <span className="fam-icon fam-icon--solid" aria-hidden="true"><i className="ri-file-list-3-line"></i></span>
                                    <h6 className="fam-panel__title">Summary</h6>
                                </div>
                            )}
                            {summaryRow('Total Requested Amount', formatCurrency(requestedAmount))}
                            {summaryRow('Total Funded Amount', formatCurrency(parsedAmount), 'fam-row--funded')}
                            {summaryRow(<>Success Fee<span className="fam-chip">{feeRate}%</span></>, formatCurrency(successFeeAmt))}
                            {showPartnerCommission ? (
                                <>
                                    {summaryRow(<>Admin Commission<span className="fam-chip">{adminShare}% of success fee</span></>, formatCurrency(adminShareAmt))}
                                    {summaryRow(<>Partner Commission<span className="fam-chip">{partnerShare}% of success fee</span></>, formatCurrency(partnerShareAmt))}
                                    {summaryRow('Total Commission', formatCurrency(successFeeAmt), 'fam-row--total')}
                                </>
                            ) : (
                                summaryRow('Admin Commission', formatCurrency(successFeeAmt), 'fam-row--total')
                            )}
                        </div>

                        {/* What closing does */}
                        <div className="fam-warning">
                            <i className="ri-error-warning-line"></i>
                            <span><strong>Important:</strong> Closing this application locks it. The status, funded amount and commission cannot be changed afterward.</span>
                        </div>
                    </div>

                    <div className="fam-footer">
                        <button type="button" className="btn fam-btn-cancel" onClick={handleClose} disabled={loading}>
                            {cancelText}
                        </button>
                        <button type="button" className="btn fam-btn-confirm" onClick={handleConfirm} disabled={loading}>
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                    Processing...
                                </>
                            ) : (
                                <><i className="ri-check-line me-1" aria-hidden="true"></i>{confirmText}</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
