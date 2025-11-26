import React from 'react';
import Flatpickr from 'react-flatpickr';

export default function SubscriptionSection({ formData, handleInputChange }) {
    return (
        <>
            {/* Row 1: Partner URL, Billing Term */}
            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">Partner URL</label>
                    <input
                        type="text"
                        className="form-control"
                        name="partnerUrl"
                        placeholder="Enter partner name"
                        value={formData.partnerUrl}
                        onChange={handleInputChange}
                    />
                </div>
            </div>
            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">Billing Term</label>
                    <select
                        className="form-select"
                        name="billingTerm"
                        value={formData.billingTerm}
                        onChange={handleInputChange}
                    >
                        <option value="">Select billing term...</option>
                        <option value="monthly">Monthly</option>
                        <option value="annual">Annual</option>
                    </select>
                </div>
            </div>

            {/* Row 2: First Registration Date, First Registration Amount */}
            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">First Registration Date</label>
                    <Flatpickr
                        options={{ dateFormat: "d/m/Y" }}
                        value={formData.firstRegDate ? new Date(formData.firstRegDate) : null}
                        onChange={(dates) => {
                            const date = dates[0];
                            const dateString = date
                                ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                : "";
                            handleInputChange({ target: { name: "firstRegDate", value: dateString } });
                        }}
                        className="form-control"
                        placeholder="d/m/y"
                    />
                </div>
            </div>
            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">First Registration Amount</label>
                    <div className="input-group">
                        <span className="input-group-text">$</span>
                        <input
                            type="number"
                            className="form-control"
                            name="firstRegAmount"
                            placeholder="0.00"
                            value={formData.firstRegAmount}
                            onChange={handleInputChange}
                            min="0"
                            step="0.01"
                        />
                    </div>
                </div>
            </div>

            {/* Row 3: First Payment Amount, First Registration Amount 2 */}
            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">First Payment Amount</label>
                    <div className="input-group">
                        <span className="input-group-text">$</span>
                        <input
                            type="number"
                            className="form-control"
                            name="firstPaymentAmount"
                            placeholder="0.00"
                            value={formData.firstPaymentAmount}
                            onChange={handleInputChange}
                            min="0"
                            step="0.01"
                        />
                    </div>
                </div>
            </div>
            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">First Registration Amount</label>
                    <div className="input-group">
                        <span className="input-group-text">$</span>
                        <input
                            type="number"
                            className="form-control"
                            name="firstRegAmount2"
                            placeholder="0.00"
                            value={formData.firstRegAmount2}
                            onChange={handleInputChange}
                            min="0"
                            step="0.01"
                        />
                    </div>
                </div>
            </div>

            {/* Row 4: Recurring Amount, Total Amount */}
            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">Recurring Amount</label>
                    <div className="input-group">
                        <span className="input-group-text">$</span>
                        <input
                            type="number"
                            className="form-control"
                            name="recurringAmount"
                            placeholder="0.00"
                            value={formData.recurringAmount}
                            onChange={handleInputChange}
                            min="0"
                            step="0.01"
                        />
                    </div>
                </div>
            </div>
            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">Total Amount</label>
                    <div className="input-group">
                        <span className="input-group-text">$</span>
                        <input
                            type="number"
                            className="form-control"
                            name="totalAmount"
                            placeholder="0.00"
                            value={formData.totalAmount}
                            onChange={handleInputChange}
                            min="0"
                            step="0.01"
                        />
                    </div>
                </div>
            </div>

            {/* Row 5: Subscription Start Date, Subscription End Date */}
            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">Subscription Start Date</label>
                    <Flatpickr
                        options={{ dateFormat: "d/m/Y" }}
                        value={formData.subscriptionStartDate ? new Date(formData.subscriptionStartDate) : null}
                        onChange={(dates) => {
                            const date = dates[0];
                            const dateString = date
                                ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                : "";
                            handleInputChange({ target: { name: "subscriptionStartDate", value: dateString } });
                        }}
                        className="form-control"
                        placeholder="d/m/y"
                    />
                </div>
            </div>
            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">Subscription End Date</label>
                    <Flatpickr
                        options={{ dateFormat: "d/m/Y" }}
                        value={formData.subscriptionEndDate ? new Date(formData.subscriptionEndDate) : null}
                        onChange={(dates) => {
                            const date = dates[0];
                            const dateString = date
                                ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                : "";
                            handleInputChange({ target: { name: "subscriptionEndDate", value: dateString } });
                        }}
                        className="form-control"
                        placeholder="d/m/y"
                    />
                </div>
            </div>

            {/* Row 6: Expiry Date, Termination Date */}
            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">Expiry Date</label>
                    <Flatpickr
                        options={{ dateFormat: "d/m/Y" }}
                        value={formData.expiryDate ? new Date(formData.expiryDate) : null}
                        onChange={(dates) => {
                            const date = dates[0];
                            const dateString = date
                                ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                : "";
                            handleInputChange({ target: { name: "expiryDate", value: dateString } });
                        }}
                        className="form-control"
                        placeholder="d/m/y"
                    />
                </div>
            </div>
            <div className="col-lg-6 col-12">
                <div className="mb-3">
                    <label className="form-label">Termination Date</label>
                    <Flatpickr
                        options={{ dateFormat: "d/m/Y" }}
                        value={formData.terminationDate ? new Date(formData.terminationDate) : null}
                        onChange={(dates) => {
                            const date = dates[0];
                            const dateString = date
                                ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                : "";
                            handleInputChange({ target: { name: "terminationDate", value: dateString } });
                        }}
                        className="form-control"
                        placeholder="d/m/y"
                    />
                </div>
            </div>
        </>
    );
}
