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

// Simple calculator: splits (Total Amount - Down Payment) evenly across the chosen number of months.
export default function InstallmentDetailsModal({
    show,
    onHide,
    totalAmount = 0,
    defaultMonths = 12,
    planLabel,
    partnerType,
}) {
    const modalRef = useRef(null);
    const modalInstanceRef = useRef(null);

    const [totalAmountInput, setTotalAmountInput] = useState(totalAmount || 0);
    const [includeDownPayment, setIncludeDownPayment] = useState(false);
    const [downPayment, setDownPayment] = useState(0);
    const [months, setMonths] = useState(clampMonths(defaultMonths));

    useEffect(() => {
        if (!modalRef.current) return;
        if (!modalInstanceRef.current) {
            modalInstanceRef.current = new Modal(modalRef.current, {
                backdrop: 'static',
                keyboard: false,
            });
        }

        return () => {
            if (modalInstanceRef.current) {
                modalInstanceRef.current.hide();
                modalInstanceRef.current.dispose();
                modalInstanceRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const modal = modalInstanceRef.current;
        if (!modal) return;

        if (show) {
            // Reset the calculator to the plan defaults every time it opens
            setTotalAmountInput(totalAmount || 0);
            setIncludeDownPayment(false);
            setDownPayment(0);
            setMonths(clampMonths(defaultMonths));
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
                <div className="modal-content border-0 shadow-lg">
                    <div className="modal-header installment-modal-header">
                        <div className="d-flex align-items-center gap-3">
                            <div className="installment-icon-avatar">
                                <i className="ri-calculator-line"></i>
                            </div>
                            <div>
                                <h5 className="modal-title mb-0">Installment Details</h5>
                                {(partnerType || planLabel) && (
                                    <p className="installment-modal-subtitle mb-0">
                                        {[partnerType, planLabel].filter(Boolean).join(' • ')}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button type="button" className="btn-close" onClick={onHide} aria-label="Close"></button>
                    </div>

                    <div className="modal-body p-0">
                        <div className="row g-0">
                            <div className="col-lg-7 installment-inputs-col">
                                <div className="mb-3">
                                    <label className="form-label installment-field-label">Total Amount</label>
                                    <div className="input-group installment-input-group">
                                        <span className="input-group-text">$</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="form-control"
                                            value={totalAmountInput}
                                            onChange={(e) => setTotalAmountInput(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <div className="form-check form-switch installment-down-payment-toggle mb-2">
                                        <input
                                            id="includeDownPayment"
                                            type="checkbox"
                                            className="form-check-input"
                                            checked={includeDownPayment}
                                            onChange={(e) => {
                                                const checked = e.target.checked;
                                                setIncludeDownPayment(checked);
                                                if (!checked) setDownPayment(0);
                                            }}
                                        />
                                        <label className="form-check-label installment-field-label mb-0" htmlFor="includeDownPayment">
                                            Add Down Payment
                                        </label>
                                    </div>
                                    {includeDownPayment && (
                                        <>
                                            <div className={`input-group installment-input-group ${downExceedsTotal ? 'is-invalid-group' : ''}`}>
                                                <span className="input-group-text">$</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className="form-control"
                                                    value={downPayment}
                                                    onChange={(e) => setDownPayment(e.target.value)}
                                                    autoFocus
                                                />
                                            </div>
                                            {downExceedsTotal && (
                                                <small className="installment-warning-text">Down payment cannot exceed the total amount.</small>
                                            )}
                                        </>
                                    )}
                                </div>

                                <div>
                                    <label className="form-label installment-field-label">Installment Duration</label>
                                    <Dropdown
                                        value={months}
                                        options={monthOptions}
                                        onChange={(e) => setMonths(e.value)}
                                        optionLabel="label"
                                        optionValue="value"
                                        className="w-100"
                                        appendTo="self"
                                    />
                                </div>
                            </div>

                            <div className="col-lg-5">
                                <div className="installment-result-card">
                                    <div className="installment-result-main">
                                        <span className="installment-result-label">Per Month Installment</span>
                                        <span className="installment-result-amount">${formatCurrency(perMonthAmount)}</span>
                                        <span className="installment-result-caption">for {months} {months === 1 ? 'month' : 'months'}</span>
                                    </div>

                                    <div className="installment-breakdown">
                                        <div className="installment-breakdown-item">
                                            <span>Down Payment</span>
                                            <strong>${formatCurrency(numericDown)}</strong>
                                        </div>
                                        <div className="installment-breakdown-item">
                                            <span>Remaining Balance</span>
                                            <strong>${formatCurrency(remainingBalance)}</strong>
                                        </div>
                                        <div className="installment-breakdown-item installment-breakdown-total">
                                            <span>Total Payable</span>
                                            <strong>${formatCurrency(totalPayable)}</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer installment-modal-footer">
                        <small className="installment-footer-hint">Figures are estimates and are not saved automatically.</small>
                        <button type="button" className="btn btn-light" onClick={onHide}>Close</button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
