import React from 'react';
import { MultiSelect } from 'primereact/multiselect';
import { Dropdown } from 'primereact/dropdown';

interface LenderVisibilityCardProps {
    visibility: any;
    index: number;
    errors: any;
    lenders: any[];
    stateOptions: any[];
    industryTypes: any[];
    allowedDocumentOptions: any[];
    onChange: (index: number, field: string, value: any) => void;
    onRemove: (index: number) => void;
}

export const LenderVisibilityCard: React.FC<LenderVisibilityCardProps> = ({
    visibility,
    index,
    errors,
    lenders,
    stateOptions,
    industryTypes,
    allowedDocumentOptions,
    onChange,
    onRemove
}) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        onChange(index, e.target.name, value);
    };

    const handleInputChange = (e: any) => {
        const { name, value, checked, type } = e.target;
        onChange(index, name, type === 'checkbox' ? checked : value);
    };

    return (
        <div className="card mb-4 border shadow-sm">
            <div className="card-header bg-light d-flex justify-content-between align-items-center py-3">
                <h6 className="mb-0 fw-bold text-dark">Visibility Logic Setup #{index + 1}</h6>
                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => onRemove(index)}>
                    <i className="ri-delete-bin-line me-1"></i> Remove Lender
                </button>
            </div>
            <div className="card-body">
                <div className="row mb-4">
                    <div className="col-lg-6">
                        <label className="form-label text-dark fw-medium mb-2">Lender <span className="text-danger">*</span></label>
                        <Dropdown
                            value={visibility.lender_id}
                            options={lenders}
                            onChange={(e) => onChange(index, 'lender_id', e.value)}
                            optionLabel="name"
                            optionValue="id"
                            placeholder="Select a Lender"
                            className={`w-100 ${(errors as any)[`lender_visibilities.${index}.lender_id`] ? 'p-invalid border-danger' : ''}`}
                            filter
                            showClear
                        />
                        {(errors as any)[`lender_visibilities.${index}.lender_id`] && <div className="text-danger mt-1 fs-13">{(errors as any)[`lender_visibilities.${index}.lender_id`]}</div>}
                    </div>
                </div>

                <div className="row g-5">
                    {/* Left Column: Financial Thresholds */}
                    <div className="col-lg-6">
                        <h6 className="fw-bold fs-14 mb-4 text-uppercase" style={{ letterSpacing: '0.05em', color: '#0f172a' }}>FINANCIAL THRESHOLDS</h6>

                        <div className="mb-4">
                            <label className="form-label text-dark fw-medium mb-2">Minimum FICO Score <span className="text-danger">*</span></label>
                            <div className="input-group">
                                <input type="number" name="min_fico" className={`form-control rounded-start-3 py-2 ${(errors as any)[`lender_visibilities.${index}.min_fico`] ? 'is-invalid border-danger' : ''}`} value={visibility.min_fico || ''} onChange={handleChange} placeholder="None" />
                                <span className={`input-group-text bg-light text-muted rounded-end-3 px-3 ${(errors as any)[`lender_visibilities.${index}.min_fico`] ? 'border-danger text-danger' : ''}`}>FICO</span>
                            </div>
                            {(errors as any)[`lender_visibilities.${index}.min_fico`] && <div className="text-danger mt-1 fs-13">{(errors as any)[`lender_visibilities.${index}.min_fico`]}</div>}
                        </div>

                        <div className="mb-4">
                            <label className="form-label text-dark fw-medium mb-2">Minimum Time in Business <span className="text-danger">*</span></label>
                            <div className="input-group">
                                <input type="number" name="min_tib_months" className={`form-control rounded-start-3 py-2 ${(errors as any)[`lender_visibilities.${index}.min_tib_months`] ? 'is-invalid border-danger' : ''}`} value={visibility.min_tib_months || ''} onChange={handleChange} placeholder="None" />
                                <span className={`input-group-text bg-light text-muted rounded-end-3 px-3 ${(errors as any)[`lender_visibilities.${index}.min_tib_months`] ? 'border-danger text-danger' : ''}`}>months</span>
                            </div>
                            {(errors as any)[`lender_visibilities.${index}.min_tib_months`] && <div className="text-danger mt-1 fs-13">{(errors as any)[`lender_visibilities.${index}.min_tib_months`]}</div>}
                        </div>

                        <div className="mb-4">
                            <label className="form-label text-dark fw-medium mb-2">Minimum Monthly Revenue <span className="text-danger">*</span></label>
                            <div className="input-group">
                                <span className={`input-group-text bg-white text-muted rounded-start-3 pe-2 border-end-0 ${(errors as any)[`lender_visibilities.${index}.min_monthly_revenue`] ? 'border-danger text-danger' : ''}`}>$</span>
                                <input type="number" name="min_monthly_revenue" className={`form-control py-2 ps-1 border-start-0 ${(errors as any)[`lender_visibilities.${index}.min_monthly_revenue`] ? 'is-invalid border-danger' : ''}`} value={visibility.min_monthly_revenue || ''} onChange={handleChange} placeholder="None" />
                                <span className={`input-group-text bg-light text-muted rounded-end-3 px-3 ${(errors as any)[`lender_visibilities.${index}.min_monthly_revenue`] ? 'border-danger text-danger' : ''}`}>/ mo</span>
                            </div>
                            {(errors as any)[`lender_visibilities.${index}.min_monthly_revenue`] && <div className="text-danger mt-1 fs-13">{(errors as any)[`lender_visibilities.${index}.min_monthly_revenue`]}</div>}
                        </div>

                        <div className="mb-4">
                            <label className="form-label text-dark fw-medium mb-2">Minimum Monthly Deposits <span className="text-danger">*</span></label>
                            <div className="input-group">
                                <span className={`input-group-text bg-white text-muted rounded-start-3 pe-2 border-end-0 ${(errors as any)[`lender_visibilities.${index}.min_monthly_deposits`] ? 'border-danger text-danger' : ''}`}>$</span>
                                <input type="number" name="min_monthly_deposits" className={`form-control py-2 ps-1 border-start-0 ${(errors as any)[`lender_visibilities.${index}.min_monthly_deposits`] ? 'is-invalid border-danger' : ''}`} value={visibility.min_monthly_deposits || ''} onChange={handleChange} placeholder="None" />
                                <span className={`input-group-text bg-light text-muted rounded-end-3 px-3 ${(errors as any)[`lender_visibilities.${index}.min_monthly_deposits`] ? 'border-danger text-danger' : ''}`}>/ mo</span>
                            </div>
                            {(errors as any)[`lender_visibilities.${index}.min_monthly_deposits`] && <div className="text-danger mt-1 fs-13">{(errors as any)[`lender_visibilities.${index}.min_monthly_deposits`]}</div>}
                        </div>

                        <div className="mb-4">
                            <label className="form-label text-dark fw-medium mb-2">Minimum Average Daily Balance <span className="text-danger">*</span></label>
                            <div className="input-group">
                                <span className={`input-group-text bg-white text-muted rounded-start-3 pe-2 border-end-0 ${(errors as any)[`lender_visibilities.${index}.min_average_daily_balance`] ? 'border-danger text-danger' : ''}`}>$</span>
                                <input type="number" name="min_average_daily_balance" className={`form-control rounded-end-3 py-2 ps-1 border-start-0 ${(errors as any)[`lender_visibilities.${index}.min_average_daily_balance`] ? 'is-invalid border-danger' : ''}`} value={visibility.min_average_daily_balance || ''} onChange={handleChange} placeholder="None" />
                            </div>
                            {(errors as any)[`lender_visibilities.${index}.min_average_daily_balance`] && <div className="text-danger mt-1 fs-13">{(errors as any)[`lender_visibilities.${index}.min_average_daily_balance`]}</div>}
                        </div>

                        <div className="mb-4">
                            <label className="form-label text-dark fw-medium mb-2">Maximum NSF Count</label>
                            <div className="input-group">
                                <input type="number" name="max_nsf_count" className={`form-control rounded-start-3 py-2 ${(errors as any)[`lender_visibilities.${index}.max_nsf_count`] ? 'is-invalid border-danger' : ''}`} value={visibility.max_nsf_count || ''} onChange={handleChange} placeholder="None" />
                                <span className={`input-group-text bg-light text-muted rounded-end-3 px-3 ${(errors as any)[`lender_visibilities.${index}.max_nsf_count`] ? 'border-danger text-danger' : ''}`}>per period</span>
                            </div>
                            {(errors as any)[`lender_visibilities.${index}.max_nsf_count`] && <div className="text-danger mt-1 fs-13">{(errors as any)[`lender_visibilities.${index}.max_nsf_count`]}</div>}
                        </div>

                        <div className="mb-4">
                            <label className="form-label text-dark fw-medium mb-2">Maximum Negative Days</label>
                            <div className="input-group">
                                <input type="number" name="max_negative_days" className={`form-control rounded-start-3 py-2 ${(errors as any)[`lender_visibilities.${index}.max_negative_days`] ? 'is-invalid border-danger' : ''}`} value={visibility.max_negative_days || ''} onChange={handleChange} placeholder="None" />
                                <span className={`input-group-text bg-light text-muted rounded-end-3 px-3 ${(errors as any)[`lender_visibilities.${index}.max_negative_days`] ? 'border-danger text-danger' : ''}`}>days</span>
                            </div>
                            {(errors as any)[`lender_visibilities.${index}.max_negative_days`] && <div className="text-danger mt-1 fs-13">{(errors as any)[`lender_visibilities.${index}.max_negative_days`]}</div>}
                        </div>

                        <div className="mb-4">
                            <label className="form-label text-dark fw-medium mb-1">Minimum DSCR</label>
                            <input type="number" name="min_dscr" className={`form-control rounded-3 py-2 ${(errors as any)[`lender_visibilities.${index}.min_dscr`] ? 'is-invalid border-danger' : ''}`} value={visibility.min_dscr || ''} onChange={handleChange} placeholder="For amortized / SBA products (e.g. 1.25)" />
                            {(errors as any)[`lender_visibilities.${index}.min_dscr`] && <div className="text-danger mt-1 fs-13">{(errors as any)[`lender_visibilities.${index}.min_dscr`]}</div>}
                        </div>
                    </div>

                    {/* Right Column: Geography & Industry + Review Settings */}
                    <div className="col-lg-6">
                        <h6 className="fw-bold fs-14 mb-4 text-uppercase" style={{ letterSpacing: '0.05em', color: '#0f172a' }}>GEOGRAPHY & INDUSTRY</h6>

                        <div className="mb-4">
                            <label className="form-label text-dark fw-medium mb-1">Allowed States</label>
                            <MultiSelect
                                value={visibility.allowed_states || []}
                                options={stateOptions}
                                onChange={(e) => onChange(index, 'allowed_states', e.value)}
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Leave empty = all states allowed"
                                className="w-100 rounded-3 slim-multiselect"
                                display="chip"
                                maxSelectedLabels={100}
                                filter
                            />
                        </div>

                        <div className="mb-4">
                            <label className="form-label text-dark fw-medium mb-1">Restricted States</label>
                            <MultiSelect
                                value={visibility.restricted_states || []}
                                options={stateOptions}
                                onChange={(e) => onChange(index, 'restricted_states', e.value)}
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Hard stop - blocked (e.g. ND)"
                                className="w-100 rounded-3 slim-multiselect"
                                display="chip"
                                maxSelectedLabels={100}
                                filter
                            />
                        </div>

                        <div className="mb-4">
                            <label className="form-label text-dark fw-medium mb-1">Allowed Industries</label>
                            <MultiSelect
                                value={visibility.allowed_industries || []}
                                options={industryTypes}
                                onChange={(e) => onChange(index, 'allowed_industries', e.value)}
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Leave empty = all industries allowed"
                                className="w-100 rounded-3 slim-multiselect"
                                display="chip"
                                maxSelectedLabels={100}
                                filter
                            />
                        </div>

                        <div className="mb-5">
                            <label className="form-label text-dark fw-medium mb-1">Restricted Industries</label>
                            <MultiSelect
                                value={visibility.restricted_industries || []}
                                options={industryTypes}
                                onChange={(e) => onChange(index, 'restricted_industries', e.value)}
                                optionLabel="label"
                                optionValue="value"
                                placeholder="Hard stop - blocked (e.g. Real Estate)"
                                className="w-100 rounded-3 slim-multiselect"
                                display="chip"
                                maxSelectedLabels={100}
                                filter
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LenderVisibilityCard;