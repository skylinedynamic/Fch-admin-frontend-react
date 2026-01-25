import React, { useEffect } from 'react';
import Flatpickr from 'react-flatpickr';
import { Dropdown } from 'primereact/dropdown';
import { PARTNER_TYPE_OPTIONS, PAYMENT_TYPE_OPTIONS, SUBSCRIPTION_PARTNER_TYPES, ENROLLMENT_TYPES, SUBSCRIPTION_STATUS_OPTIONS } from '../../../config/partnerTypeOptions';

export default function SubscriptionSection({ formData, handleInputChange, errors = {} }) {
    // Helper to get selected partner type config
    const selectedPartnerType = PARTNER_TYPE_OPTIONS.find(pt => pt.value === formData.partner_type);

    const isReferral = formData.partner_type === SUBSCRIPTION_PARTNER_TYPES.REFERRAL;
    const isFounding = formData.partner_type === SUBSCRIPTION_PARTNER_TYPES.FOUNDING;
    const isExecutive = formData.partner_type === SUBSCRIPTION_PARTNER_TYPES.EXECUTIVE;
    const isFoundingOrExecutive = isFounding || isExecutive;

    // Fix: Use enrollment_type instead of payment_type
    const isOneTime = formData.enrollment_type === ENROLLMENT_TYPES.ONE_TIME_STR;
    const isPaymentPlan = formData.enrollment_type === ENROLLMENT_TYPES.PAYMENT_PLAN_STR;

    // Effect 1: Set Defaults when Partner Type or Enrollment Type changes
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
    }, [formData.partner_type, formData.enrollment_type]);

    // Effect 2: Dynamic Calculation of First Reg Amount based on Recurring Amount (for Payment Plan)
    useEffect(() => {
        if (isFoundingOrExecutive && isPaymentPlan) {
            const currentRecurring = parseFloat(formData.recurring_amount) || 0;
            // For 11-month plan, total might be currentRecurring * 11 or fixed
            // But per request we keep logic simple or driven by pre-fill
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
            let shouldUpdate = false;

            // Calculate End Date based on Enrollment Type
            if (isPaymentPlan) {
                // 11-month plan: Add 11 months
                endDate.setMonth(endDate.getMonth() + 11);
                shouldUpdate = true;
            } else if (isOneTime) {
                // One-Time Payment: Ensure dates are empty (nullable)
                if (formData.subscription_end_date) {
                    handleInputChange({ target: { name: "subscription_end_date", value: "" } });
                }
                if (formData.expiry_date) {
                    handleInputChange({ target: { name: "expiry_date", value: "" } });
                }
                shouldUpdate = false;
            } else {
                // Default behavior for others
                shouldUpdate = false;
            }

            if (shouldUpdate) {
                const dateString = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
                // Update only if the date has changed to avoid infinite loops
                if (formData.subscription_end_date !== dateString) {
                    handleInputChange({ target: { name: "subscription_end_date", value: dateString } });
                }
            }
        }
    }, [formData.subscription_start_date, formData.enrollment_type]);

    // Handle blur event for validation
    const handleBlur = (e) => {
        const { name, value } = e.target;
        handleInputChange({ target: { name, value } });
    };

    // Determine visibility of Monthly Platform Fee (Recurring Amount)
    // Show ONLY if Founding/Executive AND Payment Plan
    const showRecurringAmount = isFoundingOrExecutive && isPaymentPlan;

    // Determine if First Registration Amount is ReadOnly
    const isFirstRegReadOnly = isFoundingOrExecutive || isReferral;

    return (
        <div className="row">
            {/* Row 1: Partner Type, Enrollment Type */}
            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">Partner Type <span className="text-danger">*</span></label>
                    <Dropdown
                        value={formData.partner_type || ''}
                        options={PARTNER_TYPE_OPTIONS}
                        onChange={(e) => handleInputChange({ target: { name: 'partner_type', value: e.value } })}
                        placeholder="Select partner type..."
                        className={`w-100 ${errors.partner_type ? 'p-invalid' : ''}`}
                    />
                    {errors.partner_type && (
                        <div className="invalid-feedback" style={{ display: 'block' }}>
                            {errors.partner_type}
                        </div>
                    )}
                </div>
            </div>

            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">Enrollment Type <span className="text-danger">*</span></label>
                    <Dropdown
                        value={formData.enrollment_type || ''}
                        options={PAYMENT_TYPE_OPTIONS}
                        onChange={(e) => handleInputChange({ target: { name: 'enrollment_type', value: e.value } })}
                        placeholder="Select enrollment type..."
                        className={`w-100 ${errors.enrollment_type ? 'p-invalid' : ''}`}
                        disabled={!formData.partner_type}
                    />
                    {errors.enrollment_type && <div className="invalid-feedback d-block">{errors.enrollment_type}</div>}
                </div>
            </div>

            {/* Row 2: Monthly Platform Fee (Conditional), First Registration Amount */}
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
                </div>
            </div>

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

                            // Update First Registration Date
                            handleInputChange({ target: { name: "first_reg_date", value: dateString } });

                            // Auto-fill Subscription Start Date with the same date
                            handleInputChange({ target: { name: "subscription_start_date", value: dateString } });
                        }}
                        className={`form-control ${errors.first_reg_date ? 'is-invalid' : ''}`}
                        placeholder="d/m/y"
                    />
                    {errors.first_reg_date && <div className="invalid-feedback d-block">{errors.first_reg_date}</div>}
                </div>
            </div>

            {/* Removed Installment Checkbox as per request */}

            {/* Row 5: Total Amount - REMOVED */}

            {/* Row 6: Subscription Start Date */}
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

            {/* Row 6: Subscription End Date, Expiry Date */}
            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">Subscription End Date {!isOneTime && <span className="text-danger">*</span>}</label>
                    <Flatpickr
                        options={{
                            dateFormat: "d/m/Y",
                            clickOpens: isOneTime // Only open calendar if One-Time (enabled)
                        }}
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
                        disabled={!isOneTime} // Disabled if auto-calculated (Payment Plan), Enabled if One-Time
                    />
                    {errors.subscription_end_date && <div className="invalid-feedback d-block">{errors.subscription_end_date}</div>}
                    {!isOneTime && (
                        <small className="text-muted">
                            {isPaymentPlan ? 'Automatically calculated (11 months)' : 'Automatically calculated (1 month)'}
                        </small>
                    )}
                </div>
            </div>
            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">Status <span className="text-danger">*</span></label>
                    <Dropdown
                        value={formData.subscription_status || ''}
                        options={SUBSCRIPTION_STATUS_OPTIONS}
                        onChange={(e) => handleInputChange({ target: { name: 'subscription_status', value: e.value } })}
                        placeholder="Select status..."
                        className={`w-100 ${errors.subscription_status ? 'p-invalid' : ''}`}
                    />
                    {errors.subscription_status && <div className="invalid-feedback d-block">{errors.subscription_status}</div>}
                </div>
            </div>

            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">Expiry Date</label>
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

            {/* Row 7: Termination Date, Status */}
            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">Termination Date</label>
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
