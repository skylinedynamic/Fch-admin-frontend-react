import React from 'react';
import { Dropdown } from 'primereact/dropdown';
import type { Client } from '../../../modules/client/types';

interface BusinessFinancialsSectionProps {
    formData: Client;
    errors: Record<string, string>;
    handleInputChange: (e: any) => void;
    isLoading?: boolean;
}

export default function BusinessFinancialsSection({ formData, errors, handleInputChange, isLoading = false }: BusinessFinancialsSectionProps) {
    if (isLoading) {
        return (
            <div className="row g-3">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div className="col-lg-4 mb-3" key={i}>
                        <div className="placeholder-glow">
                            <span className="placeholder col-5 mb-2"></span>
                            <span className="placeholder col-12 p-3"></span>
                        </div>
                    </div>
                ))}
            </div>
        );
    }
    const currencyOptions = [
        { label: 'USD', value: 'USD' },
        { label: 'EUR', value: 'EUR' },
        { label: 'GBP', value: 'GBP' }
    ];

    return (
        <form>
            <div className="row g-3">
                <div className="col-lg-4">
                    <div className="mb-3">
                        <label htmlFor="currency" className="form-label">Currency</label>
                        <Dropdown
                            value={formData.currency || 'USD'}
                            options={currencyOptions}
                            onChange={(e) => handleInputChange({ target: { name: 'currency', value: e.value } })}
                            optionLabel="label"
                            placeholder="Select Currency"
                            className={`w-100 ${errors.currency ? 'p-invalid' : ''}`}
                        />
                        {errors.currency && <small className="p-error d-block">{errors.currency}</small>}
                    </div>
                </div>

                <div className="col-lg-4">
                    <div className="mb-3">
                        <label htmlFor="monthly_revenue" className="form-label">Monthly Revenue</label>
                        <div className="input-group">
                            <span className="input-group-text">$</span>
                            <input
                                type="text"
                                className={`form-control ${errors.monthly_revenue ? 'is-invalid' : ''}`}
                                id="monthly_revenue"
                                name="monthly_revenue"
                                placeholder="0.00"
                                value={formData.monthly_revenue || ''}
                                onChange={handleInputChange}
                            />
                            {errors.monthly_revenue && <div className="invalid-feedback">{errors.monthly_revenue}</div>}
                        </div>
                    </div>
                </div>
                <div className="col-lg-4">
                    <div className="mb-3">
                        <label htmlFor="avg_bank_balance" className="form-label">Avg. Bank Balance</label>
                        <div className="input-group">
                            <span className="input-group-text">$</span>
                            <input
                                type="text"
                                className={`form-control ${errors.avg_bank_balance ? 'is-invalid' : ''}`}
                                id="avg_bank_balance"
                                name="avg_bank_balance"
                                placeholder="0.00"
                                value={formData.avg_bank_balance || ''}
                                onChange={handleInputChange}
                            />
                            {errors.avg_bank_balance && <div className="invalid-feedback">{errors.avg_bank_balance}</div>}
                        </div>
                    </div>
                </div>

                <div className="col-lg-4">
                    <div className="mb-3">
                        <label htmlFor="annual_revenue" className="form-label">Annual Revenue</label>
                        <div className="input-group">
                            <span className="input-group-text">$</span>
                            <input
                                type="text"
                                className={`form-control ${errors.annual_revenue ? 'is-invalid' : ''}`}
                                id="annual_revenue"
                                name="annual_revenue"
                                placeholder="0.00"
                                value={formData.annual_revenue || ''}
                                onChange={handleInputChange}
                            />
                            {errors.annual_revenue && <div className="invalid-feedback">{errors.annual_revenue}</div>}
                        </div>
                    </div>
                </div>
                <div className="col-lg-4">
                    <div className="mb-3">
                        <label htmlFor="profit_margin" className="form-label">Profit Margin (%)</label>
                        <div className="input-group">
                            <input
                                type="number"
                                step="0.01"
                                className={`form-control ${errors.profit_margin ? 'is-invalid' : ''}`}
                                id="profit_margin"
                                name="profit_margin"
                                placeholder="0.00"
                                value={formData.profit_margin || ''}
                                onChange={handleInputChange}
                            />
                            <span className="input-group-text">%</span>
                            {errors.profit_margin && <div className="invalid-feedback">{errors.profit_margin}</div>}
                        </div>
                    </div>
                </div>
                <div className="col-lg-4">
                    <div className="mb-3">
                        <label htmlFor="current_business_debt" className="form-label">Current Business Debt</label>
                        <div className="input-group">
                            <span className="input-group-text">$</span>
                            <input
                                type="text"
                                className={`form-control ${errors.current_business_debt ? 'is-invalid' : ''}`}
                                id="current_business_debt"
                                name="current_business_debt"
                                placeholder="0.00"
                                value={formData.current_business_debt || ''}
                                onChange={handleInputChange}
                            />
                            {errors.current_business_debt && <div className="invalid-feedback">{errors.current_business_debt}</div>}
                        </div>
                    </div>
                </div>

                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="fico_score" className="form-label">Personal Credit Scores (FICO)</label>
                        <input
                            type="number"
                            className={`form-control ${errors.fico_score ? 'is-invalid' : ''}`}
                            id="fico_score"
                            name="fico_score"
                            placeholder="0"
                            value={formData.fico_score || ''}
                            onChange={handleInputChange}
                        />
                        {errors.fico_score && <div className="invalid-feedback">{errors.fico_score}</div>}
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="paydex_score" className="form-label">Business Credit Scores (D&amp;B PAYDEX)</label>
                        <input
                            type="number"
                            className={`form-control ${errors.paydex_score ? 'is-invalid' : ''}`}
                            id="paydex_score"
                            name="paydex_score"
                            placeholder="0"
                            value={formData.paydex_score || ''}
                            onChange={handleInputChange}
                        />
                        {errors.paydex_score && <div className="invalid-feedback">{errors.paydex_score}</div>}
                    </div>
                </div>

                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="years_in_business" className="form-label">Years in Business</label>
                        <input
                            type="number"
                            className={`form-control ${errors.years_in_business ? 'is-invalid' : ''}`}
                            id="years_in_business"
                            name="years_in_business"
                            placeholder="1"
                            value={formData.years_in_business || ''}
                            onChange={handleInputChange}
                        />
                        {errors.years_in_business && <div className="invalid-feedback">{errors.years_in_business}</div>}
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="number_of_employees" className="form-label">Number of Employees</label>
                        <input
                            type="number"
                            className={`form-control ${errors.number_of_employees ? 'is-invalid' : ''}`}
                            id="number_of_employees"
                            name="number_of_employees"
                            placeholder="0"
                            value={formData.number_of_employees || ''}
                            onChange={handleInputChange}
                        />
                        {errors.number_of_employees && <div className="invalid-feedback">{errors.number_of_employees}</div>}
                    </div>
                </div>

                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="nsf_days" className="form-label">NSF/Negative Days (Last 90 Days)</label>
                        <input
                            type="number"
                            className={`form-control ${errors.nsf_days ? 'is-invalid' : ''}`}
                            id="nsf_days"
                            name="nsf_days"
                            placeholder="0"
                            value={formData.nsf_days || ''}
                            onChange={handleInputChange}
                        />
                        {errors.nsf_days && <div className="invalid-feedback">{errors.nsf_days}</div>}
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="time_in_business" className="form-label">Time in Business</label>
                        <input
                            type="text"
                            className={`form-control ${errors.time_in_business ? 'is-invalid' : ''}`}
                            id="time_in_business"
                            name="time_in_business"
                            placeholder="e.g., 1 year"
                            value={formData.time_in_business || ''}
                            onChange={handleInputChange}
                        />
                        {errors.time_in_business && <div className="invalid-feedback">{errors.time_in_business}</div>}
                    </div>
                </div>

                <div className="col-lg-12">
                    <div className="mb-3">
                        <label htmlFor="funding_urgency" className="form-label">Funding Urgency</label>
                        <input
                            type="text"
                            className={`form-control ${errors.funding_urgency ? 'is-invalid' : ''}`}
                            id="funding_urgency"
                            name="funding_urgency"
                            placeholder="e.g., Immediate / 1-2 weeks / 1 month+"
                            value={formData.funding_urgency || ''}
                            onChange={handleInputChange}
                        />
                        {errors.funding_urgency && <div className="invalid-feedback">{errors.funding_urgency}</div>}
                    </div>
                </div>
            </div>
        </form>
    );
}
