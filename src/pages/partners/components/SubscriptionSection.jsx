import React, { useEffect } from 'react';
import Flatpickr from 'react-flatpickr';
import { Dropdown } from 'primereact/dropdown';
import { PARTNER_TYPE_OPTIONS, PAYMENT_TYPE_OPTIONS } from '../../../config/partnerTypeOptions';

export default function SubscriptionSection({ formData, handleInputChange, errors = {} }) {
    // Helper to get selected partner type config
    const selectedPartnerType = PARTNER_TYPE_OPTIONS.find(pt => pt.value === formData.partner_type);

    const isReferral = formData.partner_type === 'Referral';
    const isFounding = formData.partner_type === 'Founding Partner';
    const isExecutive = formData.partner_type === 'Executive Partner (White-Label)';
    const isFoundingOrExecutive = isFounding || isExecutive;

    const isOneTime = formData.payment_type === 'One-Time Payment';
    const isPaymentPlan = formData.payment_type === 'Payment Plan (10-month plan)';

    // Effect 1: Set Defaults when Partner Type or Payment Type changes
    useEffect(() => {
        if (isReferral) {
            if (formData.first_reg_amount !== 0) {
                handleInputChange({ target: { name: 'first_reg_amount', value: 0 } });
            }
        } else if (isFoundingOrExecutive && selectedPartnerType) {
            if (isOneTime) {
                // One-Time Payment: Set First Reg Amount to fixed fee
                const fee = selectedPartnerType.oneTimeFee || 0;
                if (formData.first_reg_amount !== fee) {
                    handleInputChange({ target: { name: 'first_reg_amount', value: fee } });
                }
            } else if (isPaymentPlan) {
                // Payment Plan: Set Recurring Amount to default plan fee
                const planFee = selectedPartnerType.planFee || 0;
                handleInputChange({ target: { name: 'recurring_amount', value: planFee } });
            }
        }
    }, [formData.partner_type, formData.payment_type]);

    // Effect 2: Dynamic Calculation of First Reg Amount based on Recurring Amount (for Payment Plan)
    useEffect(() => {
        if (isFoundingOrExecutive && isPaymentPlan) {
            const currentRecurring = parseFloat(formData.recurring_amount) || 0;
            const calculatedTotal = currentRecurring * 10;

            if (formData.first_reg_amount !== calculatedTotal) {
                handleInputChange({ target: { name: 'first_reg_amount', value: calculatedTotal } });
            }
        }
    }, [formData.recurring_amount, isFoundingOrExecutive, isPaymentPlan]);

    // Effect 3: Handle Date Logic - Auto-calculate Subscription End Date
    useEffect(() => {
        // Only calculate if we have a start date
        if (formData.subscription_start_date) {
            // Parse the date string manually to avoid timezone issues (YYYY-MM-DD -> Local Date)
            const [year, month, day] = formData.subscription_start_date.split('-').map(Number);
            const startDate = new Date(year, month - 1, day);

            let endDate = new Date(startDate);

            // Calculate End Date based on Payment Type
            if (isPaymentPlan) {
                // 10-month plan: Add 10 months
                endDate.setMonth(endDate.getMonth() + 10);
            } else {
                // Default / One-Time / Referral -> 1 Month
                endDate.setMonth(endDate.getMonth() + 1);
            }

            const dateString = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;

            // Update only if the date has changed to avoid infinite loops
            if (formData.subscription_end_date !== dateString) {
                handleInputChange({ target: { name: "subscription_end_date", value: dateString } });
            }
        }
    }, [formData.subscription_start_date, formData.payment_type]);

    // Handle blur event for validation
    const handleBlur = (e) => {
        const { name, value } = e.target;
        handleInputChange({ target: { name, value } });
    };

    // Determine visibility of Monthly Platform Fee (Recurring Amount)
    // Hide if Founding/Executive AND One-Time Payment
    const showRecurringAmount = !((isFoundingOrExecutive) && isOneTime);

    // Determine if First Registration Amount is ReadOnly
    const isFirstRegReadOnly = isFoundingOrExecutive || isReferral;

    return (
        <div className="row">
            {/* Row 1: Partner Type, Payment Type */}
            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">Partner Type <span className="text-danger">*</span></label>
                    <Dropdown
                        value={formData.partner_type || ''}
                        options={PARTNER_TYPE_OPTIONS}
                        onChange={(e) => handleInputChange({ target: { name: 'partner_type', value: e.value } })}
                        onBlur={() => handleInputChange({ target: { name: 'partner_type', value: formData.partner_type } })}
                        placeholder="Select partner type..."
                        className={`w-100 ${errors.partner_type ? 'p-invalid' : ''}`}
                    />
                    {errors.partner_type && <div className="invalid-feedback d-block">{errors.partner_type}</div>}
                </div>
            </div>

            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">Payment Type <span className="text-danger">*</span></label>
                    <Dropdown
                        value={formData.payment_type || ''}
                        options={PAYMENT_TYPE_OPTIONS}
                        onChange={(e) => handleInputChange({ target: { name: 'payment_type', value: e.value } })}
                        onBlur={() => handleInputChange({ target: { name: 'payment_type', value: formData.payment_type } })}
                        placeholder="Select payment type..."
                        className={`w-100 ${errors.payment_type ? 'p-invalid' : ''}`}
                        disabled={!formData.partner_type}
                    />
                    {errors.payment_type && <div className="invalid-feedback d-block">{errors.payment_type}</div>}
                </div>
            </div>

            {/* Row 2: Monthly Platform Fee (Recurring Amount), First Registration Amount */}
            {showRecurringAmount && (
                <div className="col-lg-6 col-12">
                    <div className="mb-3">
                        <label className="form-label">Monthly Platform Fee <span className="text-danger">*</span></label>
                        <div className="input-group">
                            <span className="input-group-text">$</span>
                            <input
                                type="number"
                                className={`form-control ${errors.recurring_amount ? 'is-invalid' : ''}`}
                                name="recurring_amount"
                                placeholder="0.00"
                                value={formData.recurring_amount || ''}
                                onChange={handleInputChange}
                                onBlur={handleBlur}
                                min="0"
                                step="0.01"
                            />
                            {errors.recurring_amount && <div className="invalid-feedback">{errors.recurring_amount}</div>}
                        </div>
                    </div>
                </div>
            )}

            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">First Registration Amount <span className="text-danger">*</span></label>
                    <div className="input-group">
                        <span className="input-group-text">$</span>
                        <input
                            type="number"
                            className={`form-control ${errors.first_reg_amount ? 'is-invalid' : ''}`}
                            name="first_reg_amount"
                            placeholder="0.00"
                            value={formData.first_reg_amount || ''}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            min="0"
                            step="0.01"
                            readOnly={isFirstRegReadOnly}
                        />
                        {errors.first_reg_amount && <div className="invalid-feedback">{errors.first_reg_amount}</div>}
                    </div>
                    {isPaymentPlan && isFoundingOrExecutive && (
                        <small className="text-muted">
                            Total: 10 × ${formData.recurring_amount || 0}
                        </small>
                    )}
                </div>
            </div>

            {/* Row 3: First Registration Date, First Payment Amount */}
            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">First Registration Date <span className="text-danger">*</span></label>
                    <Flatpickr
                        options={{ dateFormat: "d/m/Y" }}
                        value={formData.first_reg_date ? new Date(formData.first_reg_date) : null}
                        onChange={(dates) => {
                            const date = dates[0];
                            const dateString = date
                                ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                : "";
                            handleInputChange({ target: { name: "first_reg_date", value: dateString } });
                        }}
                        className={`form-control ${errors.first_reg_date ? 'is-invalid' : ''}`}
                        placeholder="d/m/y"
                    />
                    {errors.first_reg_date && <div className="invalid-feedback d-block">{errors.first_reg_date}</div>}
                </div>
            </div>

            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">First Payment Amount <span className="text-danger">*</span></label>
                    <div className="input-group">
                        <span className="input-group-text">$</span>
                        <input
                            type="number"
                            className={`form-control ${errors.first_payment_amount ? 'is-invalid' : ''}`}
                            name="first_payment_amount"
                            placeholder="0.00"
                            value={formData.first_payment_amount || ''}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            min="0"
                            step="0.01"
                        />
                        {errors.first_payment_amount && <div className="invalid-feedback">{errors.first_payment_amount}</div>}
                    </div>
                </div>
            </div>

            {/* Row 4: First Registration Amount 2, Total Amount */}
            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">First Registration Amount 2 <span className="text-danger">*</span></label>
                    <div className="input-group">
                        <span className="input-group-text">$</span>
                        <input
                            type="number"
                            className={`form-control ${errors.first_reg_amount_2 ? 'is-invalid' : ''}`}
                            name="first_reg_amount_2"
                            placeholder="0.00"
                            value={formData.first_reg_amount_2 || ''}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            min="0"
                            step="0.01"
                        />
                        {errors.first_reg_amount_2 && <div className="invalid-feedback">{errors.first_reg_amount_2}</div>}
                    </div>
                </div>
            </div>

            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">Total Amount <span className="text-danger">*</span></label>
                    <div className="input-group">
                        <span className="input-group-text">$</span>
                        <input
                            type="number"
                            className={`form-control ${errors.total_amount ? 'is-invalid' : ''}`}
                            name="total_amount"
                            placeholder="0.00"
                            value={formData.total_amount || ''}
                            onChange={handleInputChange}
                            onBlur={handleBlur}
                            min="0"
                            step="0.01"
                        />
                        {errors.total_amount && <div className="invalid-feedback">{errors.total_amount}</div>}
                    </div>
                </div>
            </div>

            {/* Row 5: Subscription Start Date, Subscription End Date */}
            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">Subscription Start Date <span className="text-danger">*</span></label>
                    <Flatpickr
                        options={{ dateFormat: "d/m/Y" }}
                        value={formData.subscription_start_date ? new Date(formData.subscription_start_date) : null}
                        onChange={(dates) => {
                            const date = dates[0];
                            const dateString = date
                                ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                : "";
                            handleInputChange({ target: { name: "subscription_start_date", value: dateString } });
                        }}
                        className={`form-control ${errors.subscription_start_date ? 'is-invalid' : ''}`}
                        placeholder="d/m/y"
                    />
                    {errors.subscription_start_date && <div className="invalid-feedback d-block">{errors.subscription_start_date}</div>}
                </div>
            </div>

            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">Subscription End Date <span className="text-danger">*</span></label>
                    <Flatpickr
                        options={{ dateFormat: "d/m/Y" }}
                        value={formData.subscription_end_date ? new Date(formData.subscription_end_date) : null}
                        onChange={(dates) => {
                            const date = dates[0];
                            const dateString = date
                                ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                : "";
                            handleInputChange({ target: { name: "subscription_end_date", value: dateString } });
                        }}
                        className={`form-control ${errors.subscription_end_date ? 'is-invalid' : ''}`}
                        placeholder="d/m/y"
                        disabled
                    />
                    {errors.subscription_end_date && <div className="invalid-feedback d-block">{errors.subscription_end_date}</div>}
                    <small className="text-muted">
                        {isPaymentPlan ? 'Automatically calculated (10 months)' : 'Automatically calculated (1 month)'}
                    </small>
                </div>
            </div>

            {/* Row 6: Expiry Date, Termination Date */}
            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">Expiry Date <span className="text-danger">*</span></label>
                    <Flatpickr
                        options={{
                            dateFormat: "d/m/Y",
                            allowInput: true
                        }}
                        value={formData.expiry_date ? new Date(formData.expiry_date) : null}
                        onChange={(dates) => {
                            const date = dates[0];
                            const dateString = date
                                ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                : "";
                            handleInputChange({ target: { name: "expiry_date", value: dateString } });
                        }}
                        className={`form-control ${errors.expiry_date ? 'is-invalid' : ''}`}
                        placeholder="d/m/y"
                    />
                    {errors.expiry_date && <div className="invalid-feedback d-block">{errors.expiry_date}</div>}
                </div>
            </div>

            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">Termination Date <span className="text-danger">*</span></label>
                    <Flatpickr
                        options={{
                            dateFormat: "d/m/Y",
                            allowInput: true
                        }}
                        value={formData.termination_date ? new Date(formData.termination_date) : null}
                        onChange={(dates) => {
                            const date = dates[0];
                            const dateString = date
                                ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                : "";
                            handleInputChange({ target: { name: "termination_date", value: dateString } });
                        }}
                        className={`form-control ${errors.termination_date ? 'is-invalid' : ''}`}
                        placeholder="d/m/y"
                    />
                    {errors.termination_date && <div className="invalid-feedback d-block">{errors.termination_date}</div>}
                </div>
            </div>
        </div>
    );
}
