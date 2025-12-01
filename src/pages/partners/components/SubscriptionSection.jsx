import React from 'react';
import Flatpickr from 'react-flatpickr';
import { Dropdown } from 'primereact/dropdown';
import { BILLING_OPTIONS } from '../../../config';

export default function SubscriptionSection({ formData, handleInputChange, errors = {} }) {
    // Handle blur event for validation
    const handleBlur = (e) => {
        const { name, value } = e.target;
        handleInputChange({ target: { name, value } });
    };

    return (
        <div className="row">
            {/* Row 1: Partner URL, Billing Term */}
            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">Partner URL <span className="text-danger">*</span></label>
                    <input
                        type="text"
                        className={`form-control ${errors.partner_url ? 'is-invalid' : ''}`}
                        name="partner_url"
                        placeholder="Enter partner URL"
                        value={formData.partner_url || ''}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                    />
                    {errors.partner_url && <div className="invalid-feedback">{errors.partner_url}</div>}
                </div>
            </div>

            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">Billing Term <span className="text-danger">*</span></label>
                    <Dropdown
                        value={formData.billing_term || ''}
                        options={BILLING_OPTIONS}
                        onChange={(e) => handleInputChange({ target: { name: 'billing_term', value: e.value } })}
                        onBlur={() => handleInputChange({ target: { name: 'billing_term', value: formData.billing_term } })}
                        placeholder="Select billing term..."
                        className={`w-100 ${errors.billing_term ? 'p-invalid' : ''}`}
                    />
                    {errors.billing_term && <div className="invalid-feedback d-block">{errors.billing_term}</div>}
                </div>
            </div>

            {/* Row 2: First Registration Date, First Registration Amount */}
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
                        />
                        {errors.first_reg_amount && <div className="invalid-feedback">{errors.first_reg_amount}</div>}
                    </div>
                </div>
            </div>

            {/* Row 3: First Payment Amount, First Registration Amount 2 */}
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

            {/* Row 4: Recurring Amount, Total Amount */}
            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">Recurring Amount <span className="text-danger">*</span></label>
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
                    />
                    {errors.subscription_end_date && <div className="invalid-feedback d-block">{errors.subscription_end_date}</div>}
                </div>
            </div>

            {/* Row 6: Expiry Date, Termination Date */}
            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">Expiry Date <span className="text-danger">*</span></label>
                    <Flatpickr
                        options={{ dateFormat: "d/m/Y" }}
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
                        options={{ dateFormat: "d/m/Y" }}
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
