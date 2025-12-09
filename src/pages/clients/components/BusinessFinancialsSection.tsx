import React from 'react';
import { Dropdown } from 'primereact/dropdown';
import type { Client } from '../../../modules/client/types';

interface BusinessFinancialsSectionProps {
    formData: Client;
    handleInputChange: (e: any) => void;
}

export default function BusinessFinancialsSection({ formData, handleInputChange }: BusinessFinancialsSectionProps) {
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
                            className="w-100"
                        />
                    </div>
                </div>

                <div className="col-lg-4">
                    <div className="mb-3">
                        <label htmlFor="monthly_revenue" className="form-label">Monthly Revenue</label>
                        <div className="input-group">
                            <span className="input-group-text">$</span>
                            <input
                                type="text"
                                className="form-control"
                                id="monthly_revenue"
                                name="monthly_revenue"
                                placeholder="0.00"
                                value={formData.monthly_revenue || ''}
                                onChange={handleInputChange}
                            />
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
                                className="form-control"
                                id="avg_bank_balance"
                                name="avg_bank_balance"
                                placeholder="0.00"
                                value={formData.avg_bank_balance || ''}
                                onChange={handleInputChange}
                            />
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
                                className="form-control"
                                id="annual_revenue"
                                name="annual_revenue"
                                placeholder="0.00"
                                value={formData.annual_revenue || ''}
                                onChange={handleInputChange}
                            />
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
                                className="form-control"
                                id="profit_margin"
                                name="profit_margin"
                                placeholder="0.00"
                                value={formData.profit_margin || ''}
                                onChange={handleInputChange}
                            />
                            <span className="input-group-text">%</span>
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
                                className="form-control"
                                id="current_business_debt"
                                name="current_business_debt"
                                placeholder="0.00"
                                value={formData.current_business_debt || ''}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>
                </div>

                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="fico_score" className="form-label">Personal Credit Scores (FICO)</label>
                        <input
                            type="number"
                            className="form-control"
                            id="fico_score"
                            name="fico_score"
                            placeholder="0"
                            value={formData.fico_score || ''}
                            onChange={handleInputChange}
                        />
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="paydex_score" className="form-label">Business Credit Scores (D&amp;B PAYDEX)</label>
                        <input
                            type="number"
                            className="form-control"
                            id="paydex_score"
                            name="paydex_score"
                            placeholder="0"
                            value={formData.paydex_score || ''}
                            onChange={handleInputChange}
                        />
                    </div>
                </div>

                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="years_in_business" className="form-label">Years in Business</label>
                        <input
                            type="number"
                            className="form-control"
                            id="years_in_business"
                            name="years_in_business"
                            placeholder="1"
                            value={formData.years_in_business || ''}
                            onChange={handleInputChange}
                        />
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="number_of_employees" className="form-label">Number of Employees</label>
                        <input
                            type="number"
                            className="form-control"
                            id="number_of_employees"
                            name="number_of_employees"
                            placeholder="0"
                            value={formData.number_of_employees || ''}
                            onChange={handleInputChange}
                        />
                    </div>
                </div>

                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="nsf_days" className="form-label">NSF/Negative Days (Last 90 Days)</label>
                        <input
                            type="number"
                            className="form-control"
                            id="nsf_days"
                            name="nsf_days"
                            placeholder="0"
                            value={formData.nsf_days || ''}
                            onChange={handleInputChange}
                        />
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="time_in_business" className="form-label">Time in Business</label>
                        <input
                            type="text"
                            className="form-control"
                            id="time_in_business"
                            name="time_in_business"
                            placeholder="e.g., 1 year"
                            value={formData.time_in_business || ''}
                            onChange={handleInputChange}
                        />
                    </div>
                </div>

                <div className="col-lg-12">
                    <div className="mb-3">
                        <label htmlFor="funding_urgency" className="form-label">Funding Urgency</label>
                        <input
                            type="text"
                            className="form-control"
                            id="funding_urgency"
                            name="funding_urgency"
                            placeholder="e.g., Immediate / 1-2 weeks / 1 month+"
                            value={formData.funding_urgency || ''}
                            onChange={handleInputChange}
                        />
                    </div>
                </div>
            </div>
        </form>
    );
}
