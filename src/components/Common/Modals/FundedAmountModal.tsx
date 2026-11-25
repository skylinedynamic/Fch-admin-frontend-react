import React, { useEffect, useRef, useState } from 'react';
// @ts-ignore
import Modal from 'bootstrap/js/dist/modal';
import '../../../../assets/css/funded-amount-modal.css';
import type { PartnerCommissionSetup } from '../../../modules/application/types';
import PartnerCommissionPanel from './PartnerCommissionPanel';
import { flatCommissionRate, tierForPosition } from '../../../modules/partner/tiers';
import { PARTNER_COMMISSION_MAX, PARTNER_COMMISSION_TYPE } from '../../../config/partnerCommission';
import { SUCCESS_FEE_MIN, successFeeError } from '../../../utils/successFee';

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
    /**
     * The partner's own commission (Partner profile › Commissions): with no
     * split saved yet, the split opens at it instead of Admin 100% / Partner 0%.
     */
    defaultPartnerCommissionRate?: number | null;
    /** The partner's tiers and this deal's number, for the Partner Commission section (partner clients only). */
    partnerCommissionSetup?: PartnerCommissionSetup | null;
    /** Partner profile › Commissions, linked from the section when no tier is set (users who may set one). */
    setPartnerCommissionHref?: string | null;
    /** Total Requested Amount, shown beside the funded amount as on the page's card. */
    requestedAmount?: number;
    /** The application belongs to a partner: the success fee is split admin / partner. */
    showPartnerCommission?: boolean;
    /** Kept for callers; the calculation is always shown now. */
    isCommissionSet?: boolean;
    /** The commission can be set here (permission "update commission"); else it is only shown. */
    canEditCommission?: boolean;
    /**
     * The viewer is sent the whole commission (see sendsWholeCommission). False
     * for a partner or host staff who do not manage commissions: the API sends
     * them none, so the modal asks the funded amount only (R3-BUG-076).
     */
    showsCommission?: boolean;
    /** Errors from saving the commission (same API as the Commission Details card). */
    commissionErrors?: { total_commission?: string; admin_commission?: string; partner_commission?: string };
}

const toRate = (value?: number) => (value ? String(value) : '');

// The Success Fee the API accepts: 1-100%, to the hundredth (R2 BUG-036, R2 BUG-079).
const SUCCESS_FEE_STEP = 0.01;

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
    defaultPartnerCommissionRate = null,
    partnerCommissionSetup = null,
    setPartnerCommissionHref = null,
    requestedAmount = 0,
    showPartnerCommission = false,
    canEditCommission = false,
    showsCommission = true,
    commissionErrors = {},
}: FundedAmountModalProps) {
    const [amount, setAmount] = useState(initialAmount);
    const [error, setError] = useState('');
    const [successFee, setSuccessFee] = useState(toRate(successFeeRate));
    const [adminRate, setAdminRate] = useState(toRate(adminCommissionRate));
    const [partnerRate, setPartnerRate] = useState(toRate(partnerCommissionRate));
    const [rateError, setRateError] = useState('');
    // Closing locks the application for good, so a funded amount above what
    // was requested (a typo of a zero, say) needs a second look (R2 BUG-038).
    const [aboveRequestedConfirmed, setAboveRequestedConfirmed] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const modalInstanceRef = useRef<Modal | null>(null);

    // The admin / partner split is never typed: it is read-only, and fch-api
    // sets it on save. It is the partner's commission tier for this deal
    // (Partner profile › Commissions) - a Percentage tier's %, or a Flat Amount
    // tier's $ as its share of the success fee (shown only in $) - else none:
    // Admin 100% / Partner 0%. With no success fee there is nothing to split:
    // both rates blank (never a 0% / 0% split - SCRUM-434 S434-BUG-06).
    const noSplitRate = '';
    const dealTier = showPartnerCommission && partnerCommissionSetup
        ? partnerCommissionSetup.tiers[tierForPosition(partnerCommissionSetup.tiers, partnerCommissionSetup.deal_position)]
        : undefined;
    const flatAmount = dealTier?.commission_type === PARTNER_COMMISSION_TYPE.FLAT && dealTier.amount != null ? Number(dealTier.amount) : null;
    const tierPercent = dealTier && flatAmount === null && dealTier.percentage != null ? Number(dealTier.percentage) : null;
    const splitFromTier = flatAmount !== null || tierPercent !== null;
    const flatRateFor = (fundedAmount: number, feePercent: number) =>
        flatCommissionRate(flatAmount ?? 0, fundedAmount * (feePercent / 100), PARTNER_COMMISSION_MAX);
    const partnerDefault = flatAmount !== null
        ? flatRateFor(parseFloat(initialAmount || '0') || 0, successFeeRate || 0)
        : tierPercent ?? defaultPartnerCommissionRate ?? 0;
    // A host client has no split (the admin takes it all): its rates stay blank.
    const splitAdminRate = showPartnerCommission ? String(+(100 - partnerDefault).toFixed(2)) : noSplitRate;
    const splitPartnerRate = showPartnerCommission ? String(partnerDefault) : noSplitRate;
    const hasFee = (value: string) => parseFloat(value) > 0;

    useEffect(() => {
        if (show) {
            const fee = toRate(successFeeRate);
            setAmount(initialAmount);
            setError('');
            setRateError('');
            setSuccessFee(fee);
            setAdminRate(hasFee(fee) ? splitAdminRate : noSplitRate);
            setPartnerRate(hasFee(fee) ? splitPartnerRate : noSplitRate);
            setAboveRequestedConfirmed(false);
        }
    }, [show, initialAmount, successFeeRate, splitAdminRate, splitPartnerRate, noSplitRate]);

    // The success fee comes first. Set: the rates show the split. Cleared:
    // both blank again.
    const changeSuccessFee = (value: string) => {
        const had = hasFee(successFee);
        setSuccessFee(value);
        if (!hasFee(value)) {
            setAdminRate(noSplitRate);
            setPartnerRate(noSplitRate);
        } else if (!had) {
            setAdminRate(splitAdminRate);
            setPartnerRate(splitPartnerRate);
        }
    };

    // A Flat Amount tier: the rates follow the funded amount and success fee -
    // the flat $'s share of the fee.
    useEffect(() => {
        if (flatAmount === null || !hasFee(successFee)) return;
        const rate = flatRateFor(parseFloat(amount || '0') || 0, parseFloat(successFee) || 0);
        setPartnerRate(String(rate));
        setAdminRate(String(+(100 - rate).toFixed(2)));
    }, [amount, successFee, flatAmount]); // eslint-disable-line react-hooks/exhaustive-deps

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
    // Why the typed Success Fee can't be saved ('' when it can, or when empty).
    // A refused fee counts as none in the summary: it never shows an amount
    // that would not be saved (R2 BUG-079).
    const feeError = successFeeError(successFee);
    const feeRate = feeError ? 0 : parseFloat(successFee || '0') || 0;
    const adminShare = showPartnerCommission ? parseFloat(adminRate || '0') || 0 : 100;
    const partnerShare = showPartnerCommission ? parseFloat(partnerRate || '0') || 0 : 0;
    const successFeeAmt = parsedAmount * (feeRate / 100);
    // A flat tier pays exactly its $ (at most PARTNER_COMMISSION_MAX % of the
    // fee), not a rounded % of the fee - as the API saves it.
    const partnerShareAmt = flatAmount !== null
        ? Math.min(flatAmount, (successFeeAmt * PARTNER_COMMISSION_MAX) / 100)
        : successFeeAmt * (partnerShare / 100);
    const adminShareAmt = flatAmount !== null ? successFeeAmt - partnerShareAmt : successFeeAmt * (adminShare / 100);
    const hasCommission = feeRate > 0;
    // No split typed yet: the admin / partner lines stay out of the summary.
    const hasSplit = adminRate !== '' || partnerRate !== '';

    const handleConfirm = () => {
        if (!amount || parsedAmount <= 0) {
            setError('Please enter a valid funded amount');
            return;
        }
        // The reason is already under the field; nothing is saved until it is fixed.
        // Only when the commission is shown: a hidden one is neither checked nor sent.
        if (showsCommission && canEditCommission && feeError) return;
        onConfirm(amount, showsCommission && canEditCommission && hasCommission ? { successFee, adminRate, partnerRate } : null);
    };

    const handleClose = () => {
        if (!loading && onHide) onHide();
    };

    const formatCurrency = (val: number) => val.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    const isAboveRequested = requestedAmount > 0 && parsedAmount > requestedAmount;

    // Up to 100%. The admin / partner split may be 0; the Success Fee is 1-100%,
    // the API's range (R2 BUG-036). A locked rate waits for the success fee.
    // No placeholder: a grey "0" in an empty rate reads as 0%.
    // readOnly: a value set elsewhere (the admin / partner split) - shown, never
    // typed: grey, muted, a not-allowed cursor, out of the tab order.
    const percentInput = (value: string, onChange: (v: string) => void, id: string, invalid?: boolean, locked = false, min = 0, step = 0.1, readOnly = false) => (
        <div className="input-group">
            <input
                id={id}
                type="number"
                className={`form-control ${invalid ? 'is-invalid' : ''} ${readOnly ? 'fam-rate--readonly' : ''}`}
                readOnly={readOnly}
                tabIndex={readOnly ? -1 : undefined}
                value={value}
                min={min}
                max="100"
                step={step}
                disabled={loading || locked}
                title={locked ? (hasCommission ? "Set by the partner's commission - it can't be changed here." : 'Set the success fee first.') : undefined}
                // Kept as typed: a value out of range used to be dropped without a
                // word (101 became 10, -1 left it empty). The Success Fee says why
                // it can't be used instead (R2 BUG-079); the split rates are read-only.
                onChange={(e) => {
                    onChange(e.target.value);
                    setRateError('');
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

    const hasError = feeError || rateError || commissionErrors.total_commission || commissionErrors.admin_commission || commissionErrors.partner_commission;

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
                                            setAboveRequestedConfirmed(false);
                                            if (error) setError('');
                                        }}
                                        step="0.01"
                                        min="0"
                                        disabled={loading}
                                    />
                                    {error && <div className="invalid-feedback">{error}</div>}
                                </div>
                            </div>
                            {isAboveRequested && (
                                <div className="alert alert-warning border-0 bg-warning-subtle text-warning text-start fs-13 mt-3 mb-0">
                                    <i className="ri-error-warning-fill align-middle me-2 fs-15"></i>
                                    The funded amount {formatCurrency(parsedAmount)} is above the requested {formatCurrency(requestedAmount)}.
                                    <div className="form-check mt-2">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="funded-amount-confirmed"
                                            checked={aboveRequestedConfirmed}
                                            onChange={(e) => setAboveRequestedConfirmed(e.target.checked)}
                                            disabled={loading}
                                        />
                                        <label className="form-check-label text-dark" htmlFor="funded-amount-confirmed">
                                            I have checked this amount and it is correct.
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>

                        {showsCommission && (<>
                        <hr className="fam-divider" />

                        {/* The partner's own commission tiers, set or not */}
                        {showPartnerCommission && partnerCommissionSetup && <PartnerCommissionPanel setup={partnerCommissionSetup} setCommissionHref={setPartnerCommissionHref} />}

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
                                        <div className="fam-input">{percentInput(successFee, changeSuccessFee, 'closing-success-fee', !!feeError || !!commissionErrors.total_commission, false, SUCCESS_FEE_MIN, SUCCESS_FEE_STEP)}</div>
                                    </div>
                                    {/* A flat tier has no % split to show: the summary gives it in $. */}
                                    {showPartnerCommission && flatAmount === null && (
                                        <div className="row g-2 mt-1">
                                            <div className="col-sm-6">
                                                <label htmlFor="closing-admin-rate" className="fam-label">Admin Commission Rate</label>
                                                <div className="fam-input">
                                                    {percentInput(adminRate, () => {}, 'closing-admin-rate', !!commissionErrors.admin_commission, true, 0, 0.1, true)}
                                                </div>
                                            </div>
                                            <div className="col-sm-6">
                                                <label htmlFor="closing-partner-rate" className="fam-label">Partner Commission Rate</label>
                                                <div className="fam-input">
                                                    {percentInput(partnerRate, () => {}, 'closing-partner-rate', !!commissionErrors.partner_commission, true, 0, 0.1, true)}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {showPartnerCommission && hasCommission && splitFromTier && (
                                        <p className="fam-hint mt-2 mb-0">Set by the partner&apos;s commission tier for this deal.</p>
                                    )}
                                    {showPartnerCommission && !hasCommission && (
                                        <p className="fam-hint mt-2 mb-0">Set the success fee to split it between admin and partner.</p>
                                    )}
                                    {hasError && <div className="fam-error">{hasError}</div>}
                                </>
                            ) : !hasCommission && (
                                <p className="fam-hint mt-0">No commission is set for this application.</p>
                            )}
                        </div>
                        </>)}

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
                            {/* No success fee, no commission lines. */}
                            {showsCommission && hasCommission && summaryRow(<>Success Fee<span className="fam-chip">{feeRate}%</span></>, formatCurrency(successFeeAmt))}
                            {!showsCommission || !hasCommission ? null : showPartnerCommission ? (
                                <>
                                    {flatAmount !== null ? (
                                        <>
                                            {summaryRow('Admin Commission', formatCurrency(adminShareAmt))}
                                            {summaryRow(<>Partner Commission<span className="fam-chip">Flat amount</span></>, formatCurrency(partnerShareAmt))}
                                        </>
                                    ) : (
                                        <>
                                            {hasSplit && summaryRow(<>Admin Commission<span className="fam-chip">{adminShare}% of success fee</span></>, formatCurrency(adminShareAmt))}
                                            {hasSplit && summaryRow(<>Partner Commission<span className="fam-chip">{partnerShare}% of success fee</span></>, formatCurrency(partnerShareAmt))}
                                        </>
                                    )}
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
                        <button type="button" className="btn fam-btn-confirm" onClick={handleConfirm} disabled={loading || (isAboveRequested && !aboveRequestedConfirmed)}>
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
