import React from 'react';
import { Dropdown } from 'primereact/dropdown';
import {
    PAID_BY_OPTIONS, PAID_BY_HOURLY, PAID_BY_SALARY, PAID_BY_PER_DEAL,
    APPLICABLE_SERVICE_OPTIONS, APPLICABLE_SERVICE_ALL,
    PAYOUT_TYPE_OPTIONS, PAYOUT_TYPE_COMMISSION, PAYOUT_TYPE_FLAT_AMOUNT,
    toServiceFieldKey,
} from '../../config';

function PayoutFields({ values, errors, onChange, payoutTypeField, percentageField, flatAmountField }) {
    const payoutType = values[payoutTypeField] || '';

    return (
        <>
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Commission or Flat Amount</label>
                    <Dropdown
                        inputId={payoutTypeField}
                        value={payoutType}
                        options={PAYOUT_TYPE_OPTIONS}
                        onChange={(e) => onChange({ target: { name: payoutTypeField, value: e.value } })}
                        placeholder="Select Payout Type"
                        className={`w-100 ${errors?.[payoutTypeField] ? 'p-invalid' : ''}`}
                    />
                    {errors?.[payoutTypeField] && <div className="invalid-feedback d-block">{errors[payoutTypeField]}</div>}
                </div>
            </div>

            {payoutType === PAYOUT_TYPE_COMMISSION && (
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label className="form-label">Commission Percentage</label>
                        <div className="input-group">
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                name={percentageField}
                                className={`form-control ${errors?.[percentageField] ? 'is-invalid' : ''}`}
                                placeholder="e.g. 10"
                                value={values[percentageField] ?? ''}
                                onChange={onChange}
                            />
                            <span className="input-group-text">%</span>
                            {errors?.[percentageField] && <div className="invalid-feedback">{errors[percentageField]}</div>}
                        </div>
                    </div>
                </div>
            )}

            {payoutType === PAYOUT_TYPE_FLAT_AMOUNT && (
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label className="form-label">Flat Amount ($)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            name={flatAmountField}
                            className={`form-control ${errors?.[flatAmountField] ? 'is-invalid' : ''}`}
                            placeholder="e.g. 500"
                            value={values[flatAmountField] ?? ''}
                            onChange={onChange}
                        />
                        {errors?.[flatAmountField] && <div className="invalid-feedback">{errors[flatAmountField]}</div>}
                    </div>
                </div>
            )}
        </>
    );
}

export default function CommissionsSection({ values, onChange, errors = {} }) {
    const paidBy = values.paid_by || '';
    const selectedServices = values.per_deal_applicable_services || [];
    const isAllSelected = selectedServices.includes(APPLICABLE_SERVICE_ALL);

    const handleServicesChange = (newValue) => {
        const previouslyHadAll = selectedServices.includes(APPLICABLE_SERVICE_ALL);

        // "All" is exclusive: picking it clears any individual services, and
        // picking an individual service while "All" is active drops "All".
        const finalValue = newValue.includes(APPLICABLE_SERVICE_ALL)
            ? (previouslyHadAll ? newValue.filter((v) => v !== APPLICABLE_SERVICE_ALL) : [APPLICABLE_SERVICE_ALL])
            : newValue;

        onChange({ target: { name: 'per_deal_applicable_services', value: finalValue } });
    };

    const handleServiceCheck = (service, checked) => {
        const newValue = checked
            ? [...selectedServices, service]
            : selectedServices.filter((v) => v !== service);
        handleServicesChange(newValue);
    };

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
                            value={values.hourly_rate ?? ''}
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
                            value={values.annual_salary ?? ''}
                            onChange={onChange}
                        />
                        {errors?.annual_salary && <div className="invalid-feedback">{errors.annual_salary}</div>}
                    </div>
                </div>
            )}

            {paidBy === PAID_BY_PER_DEAL && (
                <>
                    <div className="col-12">
                        <div className="mb-3">
                            <label className="form-label d-block">Applicable Services</label>
                            <div className="d-flex flex-wrap gap-4">
                                {APPLICABLE_SERVICE_OPTIONS.map(({ label, value }) => {
                                    const checkboxId = `applicable_service_${toServiceFieldKey(value)}`;
                                    return (
                                        <div className="form-check" key={value}>
                                            <input
                                                id={checkboxId}
                                                type="checkbox"
                                                className="form-check-input"
                                                checked={selectedServices.includes(value)}
                                                onChange={(e) => handleServiceCheck(value, e.target.checked)}
                                            />
                                            <label className="form-check-label" htmlFor={checkboxId}>
                                                {label}
                                            </label>
                                        </div>
                                    );
                                })}
                            </div>
                            {errors?.per_deal_applicable_services && (
                                <div className="invalid-feedback d-block">{errors.per_deal_applicable_services}</div>
                            )}
                        </div>
                    </div>

                    <div className="w-100"></div>

                    {isAllSelected && (
                        <PayoutFields
                            values={values}
                            errors={errors}
                            onChange={onChange}
                            payoutTypeField="per_deal_payout_type"
                            percentageField="per_deal_percentage"
                            flatAmountField="per_deal_flat_amount"
                        />
                    )}

                    {!isAllSelected && selectedServices.map((service) => {
                        const key = toServiceFieldKey(service);
                        return (
                            <React.Fragment key={service}>
                                <div className="col-12">
                                    <h6 className="text-muted mb-0 mt-2">{service}</h6>
                                </div>
                                <PayoutFields
                                    values={values}
                                    errors={errors}
                                    onChange={onChange}
                                    payoutTypeField={`per_deal_payout_type_${key}`}
                                    percentageField={`per_deal_percentage_${key}`}
                                    flatAmountField={`per_deal_flat_amount_${key}`}
                                />
                            </React.Fragment>
                        );
                    })}
                </>
            )}
        </div>
    );
}
