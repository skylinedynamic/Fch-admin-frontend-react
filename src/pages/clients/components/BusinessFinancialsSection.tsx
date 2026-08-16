import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { toast } from 'react-toastify';
import {
    useBusinessFinancials,
    useUpdateBusinessFinancials,
    DEFAULT_CLIENT_STATE,
    CURRENCY_OPTIONS,
} from '../../../modules/client';
import { scrollToFirstError } from '../../../utils/formUtils';
import type { Client } from '../../../modules/client/types';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/flatpickr.css';

const defaultFinancialsState = DEFAULT_CLIENT_STATE;

const formatNumber = (val: any) => {
    if (val === null || val === undefined || val === '') return '';
    // Remove all non-numeric characters except decimal point
    const strVal = String(val).replace(/[^0-9.]/g, '');
    if (strVal === '') return '';

    const parts = strVal.split('.');
    // Limit to one decimal point
    if (parts.length > 2) return val;

    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
};

const unformatNumber = (val: any) => {
    if (!val) return '';
    return String(val).replace(/,/g, '');
};

const CURRENCY_FIELDS = ['monthly_revenue', 'avg_bank_balance', 'average_monthly_deposits', 'annual_revenue', 'annual_personal_income', 'current_business_debt'];

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

    // 1. Data Fetching — uses dedicated business-financials endpoint
    const { data: fetchedData, isLoading: isFetching } = useBusinessFinancials(clientId as string, !!clientId);
    const updateMutation = useUpdateBusinessFinancials();

    // 2. Local State
    const [formData, setFormData] = useState<Client>(initialData || defaultFinancialsState);

    // 3. Sync Fetch to Local State
    useEffect(() => {
        if (fetchedData) {
            // @ts-ignore
            const dataToSet = { ...(fetchedData.data || fetchedData) };

            // Format existing values
            CURRENCY_FIELDS.forEach(field => {
                if (dataToSet[field]) {
                    dataToSet[field] = formatNumber(dataToSet[field]);
                }
            });

            setFormData(prev => ({ ...prev, ...dataToSet }));
        }
    }, [fetchedData]);

    const handleInputChange = (e: any) => {
        const name = e.target ? e.target.name : e.name;
        let value = e.target ? e.target.value : e.value;

        if (CURRENCY_FIELDS.includes(name)) {
            value = formatNumber(value);
        }

        setFormData(prev => ({ ...prev, [name]: value }));

        if (setErrors && errors[name]) {
            const newErrors = { ...errors };
            delete newErrors[name];
            setErrors(newErrors);
        }
    };

    const handleAddBankAccount = () => {
        if (setErrors) {
            // Clear any lingering errors for new row index
            const newIndex = formData.bank_accounts ? formData.bank_accounts.length : 0;
            const newErrors = { ...errors };
            delete newErrors[`bank_accounts.${newIndex}.bank_name`];
            delete newErrors[`bank_accounts.${newIndex}.account_open_date`];
            setErrors(newErrors);
        }

        setFormData(prev => ({
            ...prev,
            bank_accounts: [
                ...(prev.bank_accounts || []),
                { bank_name: '', account_open_date: null }
            ]
        }));
    };

    const handleRemoveBankAccount = (index: number) => {
        if (setErrors) {
            // Clear all bank account errors when removing to prevent index shifting bugs
            const newErrors = { ...errors };
            Object.keys(newErrors).forEach(key => {
                if (key.startsWith('bank_accounts.')) {
                    delete newErrors[key];
                }
            });
            setErrors(newErrors);
        }

        setFormData(prev => {
            const newAccounts = [...(prev.bank_accounts || [])];
            newAccounts.splice(index, 1);
            return { ...prev, bank_accounts: newAccounts };
        });
    };

    const handleBankAccountChange = (index: number, field: string, value: any) => {
        setFormData(prev => {
            const newAccounts = [...(prev.bank_accounts || [])];
            newAccounts[index] = {
                ...newAccounts[index],
                [field]: value
            };
            return { ...prev, bank_accounts: newAccounts };
        });
    };

    // 4. Expose Save via Ref
    useImperativeHandle(ref, () => ({
        save: async () => {
            console.log('[BusinessFinancialsSection] Starting save...', { clientId, formData });

            // Unformat values before sending to API
            const apiData = { ...formData };
            delete apiData.years_in_business; // Do not send computed read-only field to API

            CURRENCY_FIELDS.forEach(field => {
                if (apiData[field]) {
                    apiData[field] = unformatNumber(apiData[field]);
                }
            });

            // Send only the business financials fields to the dedicated endpoint
            const payload = {
                currency: apiData.currency,
                monthly_revenue: apiData.monthly_revenue,
                avg_bank_balance: apiData.avg_bank_balance,
                average_monthly_deposits: apiData.average_monthly_deposits,
                monthly_deposit_count: apiData.monthly_deposit_count,
                annual_revenue: apiData.annual_revenue,
                profit_margin: apiData.profit_margin,
                current_business_debt: apiData.current_business_debt,
                fico_score: apiData.fico_score,
                paydex_score: apiData.paydex_score,
                years_in_business: apiData.years_in_business,
                number_of_employees: apiData.number_of_employees,
                nsf_count: apiData.nsf_count,
                negative_days: apiData.negative_days,
                funding_urgency: apiData.funding_urgency,
            };
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
                            scrollToFirstError(mappedErrors);
                        }
                        reject(error);
                    }
                });
            });
        }
    }));

    if (isFetching && clientId) {
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
                            inputId="currency"
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

                <div className="col-md-6">
                    <div className="">
                        <label htmlFor="average_monthly_deposits" className="form-label">Average Monthly Deposits</label>
                        <div className="input-group">
                            <span className="input-group-text">$</span>
                            <input
                                type="text"
                                className={`form-control ${errors.average_monthly_deposits ? 'is-invalid' : ''}`}
                                id="average_monthly_deposits"
                                name="average_monthly_deposits"
                                placeholder="0.00"
                                value={formData.average_monthly_deposits || ''}
                                onChange={handleInputChange}
                            />
                            {errors.average_monthly_deposits && <div className="invalid-feedback">{errors.average_monthly_deposits}</div>}
                        </div>
                    </div>
                </div>

                <div className="col-md-6">
                    <div className="">
                        <label htmlFor="monthly_deposit_count" className="form-label">Monthly Deposit Count</label>
                        <input
                            type="number"
                            className={`form-control ${errors.monthly_deposit_count ? 'is-invalid' : ''}`}
                            id="monthly_deposit_count"
                            name="monthly_deposit_count"
                            placeholder="0"
                            value={formData.monthly_deposit_count ?? ''}
                            onChange={handleInputChange}
                        />
                        {errors.monthly_deposit_count && <div className="invalid-feedback">{errors.monthly_deposit_count}</div>}
                    </div>
                </div>

                <div className="col-md-6">
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
                <div className="col-md-6">
                    <div className="">
                        <label htmlFor="annual_personal_income" className="form-label">Annual Personal Income</label>
                        <div className="input-group">
                            <span className="input-group-text">$</span>
                            <input
                                type="text"
                                className={`form-control ${errors.annual_personal_income ? 'is-invalid' : ''}`}
                                id="annual_personal_income"
                                name="annual_personal_income"
                                placeholder="0.00"
                                value={formData.annual_personal_income || ''}
                                onChange={handleInputChange}
                            />
                            {errors.annual_personal_income && <div className="invalid-feedback">{errors.annual_personal_income}</div>}
                        </div>
                    </div>
                </div>
                <div className="col-lg-6">
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
                <div className="col-lg-6">
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
                        <label className="form-label">Years in Business</label>
                        <div className="form-control bg-light" style={{ minHeight: '38.39px', display: 'flex', alignItems: 'center' }}>
                            {formData?.years_in_business || 'Please set business start date'}
                        </div>
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
                        <label htmlFor="nsf_count" className="form-label">NSF Count (Last 90 Days)</label>
                        <input
                            type="number"
                            className={`form-control ${errors.nsf_count ? 'is-invalid' : ''}`}
                            id="nsf_count"
                            name="nsf_count"
                            placeholder="0"
                            value={formData.nsf_count ?? ''}
                            onChange={handleInputChange}
                            min={0}
                        />
                        {errors.nsf_count && <div className="invalid-feedback">{errors.nsf_count}</div>}
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="">
                        <label htmlFor="negative_days" className="form-label">Negative Days (Last 90 Days)</label>
                        <input
                            type="number"
                            className={`form-control ${errors.negative_days ? 'is-invalid' : ''}`}
                            id="negative_days"
                            name="negative_days"
                            placeholder="0"
                            value={formData.negative_days ?? ''}
                            onChange={handleInputChange}
                            min={0}
                        />
                        {errors.negative_days && <div className="invalid-feedback">{errors.negative_days}</div>}
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

                {/* Bank Accounts Repeater Section */}
                <div className="col-12 mt-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="mb-0 ">
                            <i className="ri-bank-line me-1 align-bottom "></i> Business Bank Accounts
                        </h5>
                        <button
                            type="button"
                            className="btn btn-sm btn-soft-primary d-flex align-items-center"
                            onClick={handleAddBankAccount}
                        >
                            <i className="ri-add-line me-1"></i> Add Bank Account
                        </button>
                    </div>

                    {!(formData.bank_accounts && formData.bank_accounts.length > 0) ? (
                        <div className="text-center py-4 border border-dashed rounded bg-light">
                            <p className="text-muted mb-0">No bank accounts added yet. Click "Add Bank Account" to add one.</p>
                        </div>
                    ) : (
                        <div className="row g-3">
                            {formData.bank_accounts.map((account: any, index: number) => (
                                <div key={account.id || `new-${index}`} className="col-12">
                                    <div className="card border shadow-none mb-0 bg-light-subtle position-relative overflow-hidden">
                                        <div className="card-body p-3">
                                            <div className="row g-3 align-items-end">
                                                {/* Bank Name */}
                                                <div className="col-md-6">
                                                    <label className="form-label">Bank Name <span className="text-danger">*</span></label>
                                                    <div className="position-relative">
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. Chase, Bank of America"
                                                            value={account.bank_name || ''}
                                                            onChange={(e) => {
                                                                handleBankAccountChange(index, 'bank_name', e.target.value);
                                                                if (setErrors && errors[`bank_accounts.${index}.bank_name`]) {
                                                                    const newErrors = { ...errors };
                                                                    delete newErrors[`bank_accounts.${index}.bank_name`];
                                                                    setErrors(newErrors);
                                                                }
                                                            }}
                                                            className={`form-control ${errors[`bank_accounts.${index}.bank_name`] ? 'is-invalid' : ''}`}
                                                        />
                                                        {errors[`bank_accounts.${index}.bank_name`] && (
                                                            <div className="invalid-feedback d-block">{errors[`bank_accounts.${index}.bank_name`]}</div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Account Open Date */}
                                                <div className="col-md-5">
                                                    <label className="form-label">Business Account Open Date</label>
                                                    <div className="position-relative">
                                                        <Flatpickr
                                                            className={`form-control ${errors[`bank_accounts.${index}.account_open_date`] ? 'is-invalid' : ''}`}
                                                            value={account.account_open_date || ''}
                                                            onChange={(dates, dateStr) => {
                                                                handleBankAccountChange(index, 'account_open_date', dateStr || null);
                                                                if (setErrors && errors[`bank_accounts.${index}.account_open_date`]) {
                                                                    const newErrors = { ...errors };
                                                                    delete newErrors[`bank_accounts.${index}.account_open_date`];
                                                                    setErrors(newErrors);
                                                                }
                                                            }}
                                                            options={{
                                                                dateFormat: "Y-m-d",
                                                                altInput: true,
                                                                altFormat: "j M, Y",
                                                                maxDate: "today",
                                                                monthSelectorType: "dropdown"
                                                            }}
                                                            placeholder="Select account open date"
                                                        />
                                                        {errors[`bank_accounts.${index}.account_open_date`] && (
                                                            <div className="invalid-feedback d-block">{errors[`bank_accounts.${index}.account_open_date`]}</div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Remove button */}
                                                <div className="col-md-1 text-end">
                                                    <button
                                                        type="button"
                                                        className="btn btn-icon btn-soft-danger w-100"
                                                        onClick={() => handleRemoveBankAccount(index)}
                                                        title="Remove bank account"
                                                    >
                                                        <i className="ri-delete-bin-line fs-16"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </form>
    );
});

export default BusinessFinancialsSection;
