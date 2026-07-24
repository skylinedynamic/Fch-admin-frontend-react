import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Modal from 'bootstrap/js/dist/modal';
import { Dropdown } from 'primereact/dropdown';

const MIN_MONTHS = 2;
const MAX_MONTHS = 24;

const formatCurrency = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return '0.00';
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const clampMonths = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num < MIN_MONTHS) return MIN_MONTHS;
    if (num > MAX_MONTHS) return MAX_MONTHS;
    return Math.round(num);
};

// Simple calculator: splits Total Amount evenly across the chosen number of months (no down payment).
export default function InstallmentDetailsModal({
    show,
    onHide,
    totalAmount = 0,
    defaultMonths = 12,
    planLabel,
    partnerType,
    onApply,
    appliedTotalAmount,
    appliedDownPayment,
    appliedMonths,
    appliedApplied,
}) {
    const modalRef = useRef(null);
    const modalInstanceRef = useRef(null);

    const [totalAmountInput, setTotalAmountInput] = useState(totalAmount || 0);
    const [includeDownPayment, setIncludeDownPayment] = useState(false);
    const [downPayment, setDownPayment] = useState(0);
    const [months, setMonths] = useState(clampMonths(12));

    useEffect(() => {
        if (!modalRef.current) return;
        if (!modalInstanceRef.current) {
            modalInstanceRef.current = new Modal(modalRef.current, {
                backdrop: 'static',
                keyboard: false,
            });
        }

        const el = modalRef.current;

        // Force-restore body scroll whenever the modal fully finishes hiding.
        // Bootstrap sometimes leaves overflow:hidden / padding-right on <body>
        // after programmatic hide(), causing the page to be unscrollable.
        const handleHidden = () => {
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            // Remove any leftover backdrop
            document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        };

        el.addEventListener('hidden.bs.modal', handleHidden);

        return () => {
            el.removeEventListener('hidden.bs.modal', handleHidden);
            if (modalInstanceRef.current) {
                modalInstanceRef.current.hide();
                modalInstanceRef.current.dispose();
                modalInstanceRef.current = null;
            }
            // Also clean up on unmount
            handleHidden();
        };
    }, []);

    useEffect(() => {
        const modal = modalInstanceRef.current;
        if (!modal) return;

        if (show) {
            // Restore previously set values if applied, otherwise default to plan defaults
            if (appliedApplied === true || appliedApplied === 'true') {
                setTotalAmountInput(appliedTotalAmount ?? (totalAmount || 0));
                setIncludeDownPayment(Number(appliedDownPayment) > 0);
                setDownPayment(appliedDownPayment ?? 0);
                setMonths(clampMonths(appliedMonths ?? 12));
            } else {
                setTotalAmountInput(totalAmount || 0);
                setIncludeDownPayment(false);
                setDownPayment(0);
                setMonths(clampMonths(12));
            }
            modal.show();
        } else {
            modal.hide();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show]);

    const monthOptions = useMemo(() => (
        Array.from({ length: MAX_MONTHS - MIN_MONTHS + 1 }, (_, i) => {
            const value = MIN_MONTHS + i;
            return { label: `${value} Months`, value };
        })
    ), []);

    const numericTotal = Number(totalAmountInput) || 0;
    const numericDown = includeDownPayment ? (Number(downPayment) || 0) : 0;
    const downExceedsTotal = numericDown > numericTotal;
    const remainingBalance = Math.max(numericTotal - numericDown, 0);
    const perMonthAmount = months > 0 ? remainingBalance / months : 0;
    const totalPayable = numericDown + perMonthAmount * months;

    return createPortal(
        <div className="modal fade flip installment-details-modal" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content idm-content">

                    {/* Header */}
                    <div className="idm-header">
                        <div className="d-flex align-items-center gap-2">
                            <div className="idm-icon-box">
                                <i className="ri-calculator-line"></i>
                            </div>
                            <div>
                                <h5 className="idm-title">Installment Calculator</h5>
                                {(partnerType || planLabel) && (
                                    <p className="idm-subtitle">{[partnerType, planLabel].filter(Boolean).join(' · ')}</p>
                                )}
                            </div>
                        </div>
                        <button type="button" className="btn-close" onClick={onHide} aria-label="Close"></button>
                    </div>

                    {/* Body */}
                    <div className="modal-body p-0">
                        <div className="row g-0">

                            {/* Left — Inputs */}
                            <div className="col-lg-7 idm-inputs-panel">

                                <div className="idm-form-group">
                                    <label className="idm-label">Total Loan Amount</label>
                                    <div className="idm-input-wrap">
                                        <span className="idm-prefix">$</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="idm-input"
                                            value={totalAmountInput}
                                            onChange={(e) => setTotalAmountInput(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="idm-form-group">
                                    <label className="idm-label">Installment Duration</label>
                                    <Dropdown
                                        value={months}
                                        options={monthOptions}
                                        onChange={(e) => setMonths(e.value)}
                                        optionLabel="label"
                                        optionValue="value"
                                        className="idm-dropdown"
                                        appendTo="self"
                                    />
                                </div>

                                <div className="idm-form-group mb-0">
                                    <div className="idm-toggle-row">
                                        <div>
                                            <p className="idm-toggle-title mb-0">Down Payment</p>
                                            <p className="idm-toggle-desc mb-0">Deduct an upfront amount before splitting</p>
                                        </div>
                                        <div className="form-check form-switch m-0">
                                            <input
                                                id="includeDownPayment"
                                                type="checkbox"
                                                className="form-check-input idm-switch"
                                                checked={includeDownPayment}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setIncludeDownPayment(checked);
                                                    if (checked) {
                                                        setDownPayment('');
                                                    } else {
                                                        setDownPayment(0);
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {includeDownPayment && (
                                        <div className="idm-down-payment-field">
                                            <label className="idm-label">Down Payment Amount</label>
                                            <div className={`idm-input-wrap${downExceedsTotal ? ' idm-input-wrap--error' : ''}`}>
                                                <span className="idm-prefix">$</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className="idm-input"
                                                    value={downPayment}
                                                    onChange={(e) => setDownPayment(e.target.value)}
                                                    autoFocus
                                                />
                                            </div>
                                            {downExceedsTotal && (
                                                <p className="idm-error-text">
                                                    <i className="ri-error-warning-line"></i>
                                                    Down payment cannot exceed the total amount.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>

                            </div>

                            {/* Right — Summary */}
                            <div className="col-lg-5 idm-summary-panel">
                                <div className="idm-monthly-card">
                                    <span className="idm-monthly-label">Monthly Payment</span>
                                    <span className="idm-monthly-amount">${formatCurrency(perMonthAmount)}</span>
                                    <span className="idm-monthly-caption">over {months} {months === 1 ? 'month' : 'months'}</span>
                                </div>

                                <div className="idm-breakdown-card">
                                    <div className="idm-breakdown-row">
                                        <span className="idm-breakdown-key">Down Payment</span>
                                        <span className="idm-breakdown-val">${formatCurrency(numericDown)}</span>
                                    </div>
                                    <div className="idm-breakdown-row">
                                        <span className="idm-breakdown-key">Remaining Balance</span>
                                        <span className="idm-breakdown-val">${formatCurrency(remainingBalance)}</span>
                                    </div>
                                    <div className="idm-breakdown-row idm-breakdown-row--total">
                                        <span className="idm-breakdown-key">Total Payable</span>
                                        <span className="idm-breakdown-val idm-breakdown-val--total">${formatCurrency(totalPayable)}</span>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Footer */}
                    <div className="idm-footer">
                        <span className="idm-footer-note">
                            <i className="ri-information-line"></i>
                            Figures are estimates only and are not saved automatically.
                        </span>
                        <div className="d-flex gap-2">
                            <button type="button" className="btn btn-sm btn-light idm-close-btn" onClick={onHide}>
                                Close
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm idm-apply-btn"
                                onClick={() => {
                                    if (onApply) {
                                        onApply({
                                            totalAmount: numericTotal,
                                            downPayment: numericDown,
                                            months,
                                            monthlyPayment: perMonthAmount,
                                            remainingBalance
                                        });
                                    }
                                    onHide();
                                }}
                            >
                                <i className="ri-check-line me-1"></i>
                                Apply
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>,
        document.body
    );
}
