import React from 'react';
import { Dropdown } from 'primereact/dropdown';
import {
    PAID_BY_OPTIONS, PAID_BY_HOURLY, PAID_BY_SALARY, PAID_BY_PER_DEAL,
    APPLICABLE_SERVICE_OPTIONS, APPLICABLE_SERVICE_ALL,
    PAYOUT_TYPE_OPTIONS, PAYOUT_TYPE_COMMISSION, PAYOUT_TYPE_FLAT_AMOUNT,
} from '../../../../config';

export default function CommissionsSection({ employee, onChange, errors = {} }) {
    const paidBy = employee.paid_by || '';
    const applicableService = employee.per_deal_applicable_service || '';
    const payoutType = employee.per_deal_payout_type || '';

    return (
        <div className="row">
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Paid By</label>
                    <Dropdown
                        inputId="paid_by"
                        value={paidBy}
                        options={PAID_BY_OPTIONS}
                        onChange={(e) => onChange({ target: { name: 'paid_by', value: e.value } })}
                        placeholder="Select Paid By"
                        className={`w-100 ${errors?.paid_by ? 'p-invalid' : ''}`}
                    />
                    {errors?.paid_by && <div className="invalid-feedback d-block">{errors.paid_by}</div>}
                </div>
            </div>

            <div className="w-100"></div>

            {paidBy === PAID_BY_HOURLY && (
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label className="form-label">Hourly Rate ($)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            name="hourly_rate"
                            className={`form-control ${errors?.hourly_rate ? 'is-invalid' : ''}`}
                            placeholder="e.g. 20.25"
                            value={employee.hourly_rate ?? ''}
                            onChange={onChange}
                        />
                        {errors?.hourly_rate && <div className="invalid-feedback">{errors.hourly_rate}</div>}
                    </div>
                </div>
            )}

            {paidBy === PAID_BY_SALARY && (
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label className="form-label">Annual Salary ($)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            name="annual_salary"
                            className={`form-control ${errors?.annual_salary ? 'is-invalid' : ''}`}
                            placeholder="e.g. 125000"
                            value={employee.annual_salary ?? ''}
                            onChange={onChange}
                        />
                        {errors?.annual_salary && <div className="invalid-feedback">{errors.annual_salary}</div>}
                    </div>
                </div>
            )}

            {paidBy === PAID_BY_PER_DEAL && (
                <>
                    <div className="col-lg-6">
                        <div className="mb-3">
                            <label className="form-label">Applicable Services</label>
                            <Dropdown
                                inputId="per_deal_applicable_service"
                                value={applicableService}
                                options={APPLICABLE_SERVICE_OPTIONS}
                                onChange={(e) => onChange({ target: { name: 'per_deal_applicable_service', value: e.value } })}
                                placeholder="Select Applicable Services"
                                className={`w-100 ${errors?.per_deal_applicable_service ? 'p-invalid' : ''}`}
                            />
                            {errors?.per_deal_applicable_service && (
                                <div className="invalid-feedback d-block">{errors.per_deal_applicable_service}</div>
                            )}
                        </div>
                    </div>

                    <div className="w-100"></div>

                    {applicableService && (
                        <div className="col-lg-6">
                            <div className="mb-3">
                                <label className="form-label">Commission or Flat Amount</label>
                                <Dropdown
                                    inputId="per_deal_payout_type"
                                    value={payoutType}
                                    options={PAYOUT_TYPE_OPTIONS}
                                    onChange={(e) => onChange({ target: { name: 'per_deal_payout_type', value: e.value } })}
                                    placeholder="Select Payout Type"
                                    className={`w-100 ${errors?.per_deal_payout_type ? 'p-invalid' : ''}`}
                                />
                                {errors?.per_deal_payout_type && (
                                    <div className="invalid-feedback d-block">{errors.per_deal_payout_type}</div>
                                )}
                            </div>
                        </div>
                    )}

                    {applicableService && payoutType === PAYOUT_TYPE_COMMISSION && (
                        <div className="col-lg-6">
                            <div className="mb-3">
                                <label className="form-label">
                                    Commission Percentage {applicableService !== APPLICABLE_SERVICE_ALL ? `(${applicableService})` : '(applies to all services)'}
                                </label>
                                <div className="input-group">
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        name="per_deal_percentage"
                                        className={`form-control ${errors?.per_deal_percentage ? 'is-invalid' : ''}`}
                                        placeholder="e.g. 10"
                                        value={employee.per_deal_percentage ?? ''}
                                        onChange={onChange}
                                    />
                                    <span className="input-group-text">%</span>
                                    {errors?.per_deal_percentage && (
                                        <div className="invalid-feedback">{errors.per_deal_percentage}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {applicableService && payoutType === PAYOUT_TYPE_FLAT_AMOUNT && (
                        <div className="col-lg-6">
                            <div className="mb-3">
                                <label className="form-label">
                                    Flat Amount ($) {applicableService !== APPLICABLE_SERVICE_ALL ? `(${applicableService})` : '(applies to all services)'}
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    name="per_deal_flat_amount"
                                    className={`form-control ${errors?.per_deal_flat_amount ? 'is-invalid' : ''}`}
                                    placeholder="e.g. 500"
                                    value={employee.per_deal_flat_amount ?? ''}
                                    onChange={onChange}
                                />
                                {errors?.per_deal_flat_amount && (
                                    <div className="invalid-feedback">{errors.per_deal_flat_amount}</div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
