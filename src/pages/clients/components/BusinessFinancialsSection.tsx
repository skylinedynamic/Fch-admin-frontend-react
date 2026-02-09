import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { toast } from 'react-toastify';
import {
    useClient,
    useUpdateClient,
    DEFAULT_CLIENT_STATE,
    CURRENCY_OPTIONS,
    mapClientUpdatePayload
} from '../../../modules/client';
import type { Client } from '../../../modules/client/types';

const defaultFinancialsState = DEFAULT_CLIENT_STATE;

interface BusinessFinancialsSectionProps {
    clientId?: string | null;
    initialData?: Client;
    errors?: Record<string, string>;
    setErrors?: (errors: Record<string, string>) => void;
    isLoading?: boolean; // Parent might still control loading UI initially
    onSaveSuccess?: () => void;
}

export interface BusinessFinancialsSectionRef {
    save: () => Promise<void>;
}

const BusinessFinancialsSection = forwardRef<BusinessFinancialsSectionRef, BusinessFinancialsSectionProps>(({
    clientId,
    initialData,
    errors = {},
    setErrors,
    isLoading: parentLoading = false,
    onSaveSuccess
}, ref) => {

    // 1. Data Fetching
    const { data: fetchedData, isLoading: isFetching } = useClient(clientId as string, !!clientId);
    const updateMutation = useUpdateClient();

    // 2. Local State
    const [formData, setFormData] = useState<Client>(initialData || defaultFinancialsState);

    // 3. Sync Fetch to Local State
    useEffect(() => {
        if (fetchedData) {
            // @ts-ignore
            const dataToSet = fetchedData.data || fetchedData;
            setFormData(prev => ({ ...prev, ...dataToSet }));
        }
    }, [fetchedData]);

    const handleInputChange = (e: any) => {
        const name = e.target ? e.target.name : e.name;
        const value = e.target ? e.target.value : e.value;

        setFormData(prev => ({ ...prev, [name]: value }));

        if (setErrors && errors[name]) {
            const newErrors = { ...errors };
            delete newErrors[name];
            setErrors(newErrors);
        }
    };

    // 4. Expose Save via Ref
    useImperativeHandle(ref, () => ({
        save: async () => {
            console.log('[BusinessFinancialsSection] Starting save...', { clientId, formData });
            const payload = mapClientUpdatePayload(formData, true); // Financials usually host-agnostic for fields kept
            console.log('[BusinessFinancialsSection] Mapped payload:', payload);

            return new Promise((resolve, reject) => {
                // @ts-ignore
                updateMutation.mutate({ id: clientId, data: payload }, {
                    onSuccess: (data) => {
                        console.log('[BusinessFinancialsSection] Save SUCCESS!', data);
                        toast.success("Business financials updated successfully");
                        if (onSaveSuccess) onSaveSuccess();
                        resolve();
                    },
                    onError: (error: any) => {
                        console.error("[BusinessFinancialsSection] Save ERROR:", error);
                        toast.error("Failed to update business financials");
                        if (error.response && error.response.data && error.response.data.errors && setErrors) {
                            const backendErrors = error.response.data.errors;
                            const mappedErrors: Record<string, string> = {};
                            Object.keys(backendErrors).forEach(key => {
                                mappedErrors[key] = Array.isArray(backendErrors[key]) ? backendErrors[key][0] : backendErrors[key];
                            });
                            setErrors(mappedErrors);
                        }
                        reject(error);
                    }
                });
            });
        }
    }));

    if ((isFetching && clientId) || parentLoading) {
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

    return (
        <form onSubmit={(e) => e.preventDefault()}>
            <div className="row g-3">
                <div className="col-lg-4">
                    <div className="">
                        <label htmlFor="currency" className="form-label">Currency</label>
                        <Dropdown
                            value={formData.currency || 'USD'}
                            options={CURRENCY_OPTIONS}
                            onChange={(e) => handleInputChange({ target: { name: 'currency', value: e.value } })}
                            optionLabel="label"
                            placeholder="Select Currency"
                            className={`w-100 ${errors.currency ? 'p-invalid' : ''}`}
                        />
                        {errors.currency && <small className="p-error d-block">{errors.currency}</small>}
                    </div>
                </div>

                <div className="col-lg-4">
                    <div className="">
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
                    <div className="">
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
                    <div className="">
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
                    <div className="">
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
                    <div className="">
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
                    <div className="">
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
                    <div className="">
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
                    <div className="">
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
                    <div className="">
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
                    <div className="">
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

                <div className="col-lg-12">
                    <div className="">
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
});

export default BusinessFinancialsSection;
