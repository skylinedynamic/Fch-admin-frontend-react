import React from 'react';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { TIB_OPTIONS } from '../../../config/funding';

interface LenderVisibilityGridProps {
    visibilities: any[];
    lenders: any[];
    errors: any;
    stateOptions: any[];
    industryTypes: any[];
    onChange: (index: number, field: string, value: any) => void;
    onRemove: (index: number) => void;
    onAdd?: () => void;
}

export const LenderVisibilityGrid: React.FC<LenderVisibilityGridProps> = ({
    visibilities,
    lenders,
    errors,
    stateOptions,
    industryTypes,
    onChange,
    onRemove,
    onAdd
}) => {



    const renderError = (field: string, i: number) => {
        const errorMsg = errors?.[`lender_visibilities.${i}.${field}`];
        if (errorMsg) {
            return <div className="text-danger mt-1" style={{ fontSize: '11px' }}>{errorMsg}</div>;
        }
        return null;
    };

    if (!visibilities || visibilities.length === 0) {
        return (
            <div className="text-center py-5 bg-light rounded border border-dashed">
                <div className="avatar-sm mx-auto mb-3">
                    <div className="avatar-title bg-primary-subtle text-primary rounded-circle fs-24">
                        <i className="ri-building-4-line"></i>
                    </div>
                </div>
                <h5>No Lenders Added</h5>
                <p className="text-muted">Click the button above to add the first lender to this sequence.</p>
            </div>
        );
    }

    return (
        <div className="card shadow-sm border-0 rounded-3 mb-4 overflow-hidden" style={{ maxWidth: '100%' }}>
            <div className="card-header bg-white border-bottom py-4 d-flex justify-content-between align-items-center">
                <h6 className="card-title mb-0 fw-bold">Visibility Rules Setup</h6>
                {onAdd && (
                    <button type="button" className="btn btn-primary" onClick={onAdd}>
                        <i className="ri-add-line me-1"></i> Add New Visibility Logic
                    </button>
                )}
            </div>
            <style>{`
                .custom-scrollbar-wrapper::-webkit-scrollbar {
                    height: 8px;
                }
                .custom-scrollbar-wrapper::-webkit-scrollbar-track {
                    background: #f8f9fa;
                    border-radius: 4px;
                }
                .custom-scrollbar-wrapper::-webkit-scrollbar-thumb {
                    background: #d3d3d3;
                    border-radius: 4px;
                }
                .custom-scrollbar-wrapper::-webkit-scrollbar-thumb:hover {
                    background: #b0b0b0;
                }
            `}</style>
            <div className="card-body p-0 table-responsive custom-scrollbar-wrapper">
                <table className="table table-hover table-nowrap align-middle mb-0" style={{ minWidth: '2400px' }}>
                    <thead className="table-light text-muted fs-12">
                        <tr>
                            <th style={{ width: '250px' }}>Lender <span className="text-danger">*</span></th>
                            <th style={{ width: '120px' }}>Minimum FICO<span className="text-danger">*</span></th>
                            <th style={{ width: '150px' }}>Minimum Time In Business<span className="text-danger">*</span></th>
                            <th style={{ width: '220px' }}>Minimum Monthly Revenue<span className="text-danger">*</span></th>
                            <th style={{ width: '220px' }}>Minimum Monthly Deposits<span className="text-danger">*</span></th>
                            <th style={{ width: '220px' }}>Minimum Average Daily Balance<span className="text-danger">*</span></th>
                            <th style={{ width: '150px' }}>Max NSF Count<span className="text-danger">*</span></th>
                            <th style={{ width: '150px' }}>Max Negative Days<span className="text-danger">*</span></th>
                            <th style={{ width: '120px' }}>Min DSCR</th>
                            <th style={{ width: '220px' }}>Allowed States</th>
                            <th style={{ width: '220px' }}>Restricted States</th>
                            <th style={{ width: '220px' }}>Allowed Industries</th>
                            <th style={{ width: '220px' }}>Restricted Industries</th>
                            <th style={{ width: '120px', textAlign: 'center' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibilities.map((row, i) => (
                            <tr key={i} className="bg-white">
                                <td>
                                    <div className="position-relative">
                                        <Dropdown
                                            value={row.lender_id}
                                            options={lenders}
                                            onChange={(e) => onChange(i, 'lender_id', e.value)}
                                            optionLabel="name"
                                            optionValue="id"
                                            filter
                                            placeholder="Select Lender"
                                            className={`w-100 slim-dropdown shadow-none ${(errors as any)[`lender_visibilities.${i}.lender_id`] ? 'p-invalid border-danger' : ''}`}
                                        />
                                        {errors?.[`lender_visibilities.${i}.lender_id`] && <div className="text-danger mt-1" style={{ fontSize: '11px' }}>{errors[`lender_visibilities.${i}.lender_id`]}</div>}
                                    </div>
                                </td>
                                <td>
                                    <div className="position-relative">
                                        <input
                                            type="number"
                                            className={`form-control shadow-none ${(errors as any)[`lender_visibilities.${i}.min_fico`] ? 'is-invalid' : ''}`}
                                            placeholder="650"
                                            value={row.min_fico || ''}
                                            onChange={(e) => onChange(i, 'min_fico', e.target.value)}
                                        />
                                        {renderError('min_fico', i)}
                                    </div>
                                </td>
                                <td>
                                    <div className="position-relative">
                                        <Dropdown
                                            value={row.min_tib_months}
                                            options={TIB_OPTIONS}
                                            onChange={(e) => onChange(i, 'min_tib_months', e.value)}
                                            optionLabel="label"
                                            optionValue="value"
                                            placeholder="Select One"
                                            className={`w-100 slim-dropdown shadow-none ${(errors as any)[`lender_visibilities.${i}.min_tib_months`] ? 'p-invalid border-danger' : ''}`}
                                        />
                                        {renderError('min_tib_months', i)}
                                    </div>
                                </td>
                                <td>
                                    <div className="position-relative">
                                        <div className="input-group flex-nowrap">
                                            <span className={`input-group-text bg-light border-end-0 ${(errors as any)[`lender_visibilities.${i}.min_monthly_revenue`] ? 'border-danger text-danger' : 'text-muted'}`}>$</span>
                                            <input
                                                type="number"
                                                className={`form-control border-start-0 shadow-none ${(errors as any)[`lender_visibilities.${i}.min_monthly_revenue`] ? 'is-invalid' : ''}`}
                                                placeholder="10000"
                                                value={row.min_monthly_revenue || ''}
                                                onChange={(e) => onChange(i, 'min_monthly_revenue', e.target.value)}
                                            />
                                        </div>
                                        {errors?.[`lender_visibilities.${i}.min_monthly_revenue`] && <div className="text-danger mt-1" style={{ fontSize: '11px' }}>{errors[`lender_visibilities.${i}.min_monthly_revenue`]}</div>}
                                    </div>
                                </td>
                                <td>
                                    <div className="position-relative">
                                        <div className="input-group flex-nowrap">
                                            <span className={`input-group-text bg-light border-end-0 ${(errors as any)[`lender_visibilities.${i}.min_monthly_deposits`] ? 'border-danger text-danger' : 'text-muted'}`}>$</span>
                                            <input
                                                type="number"
                                                className={`form-control border-start-0 shadow-none ${(errors as any)[`lender_visibilities.${i}.min_monthly_deposits`] ? 'is-invalid' : ''}`}
                                                placeholder="5000"
                                                value={row.min_monthly_deposits || ''}
                                                onChange={(e) => onChange(i, 'min_monthly_deposits', e.target.value)}
                                            />
                                        </div>
                                        {errors?.[`lender_visibilities.${i}.min_monthly_deposits`] && <div className="text-danger mt-1" style={{ fontSize: '11px' }}>{errors[`lender_visibilities.${i}.min_monthly_deposits`]}</div>}
                                    </div>
                                </td>
                                <td>
                                    <div className="position-relative">
                                        <div className="input-group flex-nowrap">
                                            <span className={`input-group-text bg-light border-end-0 ${(errors as any)[`lender_visibilities.${i}.min_average_daily_balance`] ? 'border-danger text-danger' : 'text-muted'}`}>$</span>
                                            <input
                                                type="number"
                                                className={`form-control border-start-0 shadow-none ${(errors as any)[`lender_visibilities.${i}.min_average_daily_balance`] ? 'is-invalid' : ''}`}
                                                placeholder="2000"
                                                value={row.min_average_daily_balance || ''}
                                                onChange={(e) => onChange(i, 'min_average_daily_balance', e.target.value)}
                                            />
                                        </div>
                                        {errors?.[`lender_visibilities.${i}.min_average_daily_balance`] && <div className="text-danger mt-1" style={{ fontSize: '11px' }}>{errors[`lender_visibilities.${i}.min_average_daily_balance`]}</div>}
                                    </div>
                                </td>

                                <td>
                                    <div className="position-relative">
                                        <input
                                            type="number"
                                            className={`form-control shadow-none ${(errors as any)[`lender_visibilities.${i}.max_nsf_count`] ? 'is-invalid' : ''}`}
                                            placeholder="10"
                                            value={row.max_nsf_count || ''}
                                            onChange={(e) => onChange(i, 'max_nsf_count', e.target.value)}
                                        />
                                        {renderError('max_nsf_count', i)}
                                    </div>
                                </td>
                                <td>
                                    <div className="position-relative">
                                        <input
                                            type="number"
                                            className={`form-control shadow-none ${(errors as any)[`lender_visibilities.${i}.max_negative_days`] ? 'is-invalid' : ''}`}
                                            placeholder="10"
                                            value={row.max_negative_days || ''}
                                            onChange={(e) => onChange(i, 'max_negative_days', e.target.value)}
                                        />
                                        {renderError('max_negative_days', i)}
                                    </div>
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className={`form-control shadow-none ${(errors as any)[`lender_visibilities.${i}.min_dscr`] ? 'is-invalid' : ''}`}
                                        placeholder="1.25"
                                        value={row.min_dscr || ''}
                                        onChange={(e) => onChange(i, 'min_dscr', e.target.value)}
                                    />
                                </td>
                                <td>
                                    <MultiSelect
                                        value={row.allowed_states || []}
                                        options={stateOptions}
                                        onChange={(e) => onChange(i, 'allowed_states', e.value)}
                                        optionLabel="label"
                                        optionValue="value"
                                        placeholder="Select states"
                                        className="w-100 slim-multiselect shadow-none"
                                        display="chip"
                                        filter
                                    />
                                </td>
                                <td>
                                    <MultiSelect
                                        value={row.restricted_states || []}
                                        options={stateOptions}
                                        onChange={(e) => onChange(i, 'restricted_states', e.value)}
                                        optionLabel="label"
                                        optionValue="value"
                                        placeholder="Blocked states"
                                        className="w-100 slim-multiselect shadow-none"
                                        display="chip"
                                        filter
                                    />
                                </td>
                                <td>
                                    <MultiSelect
                                        value={row.allowed_industries || []}
                                        options={industryTypes}
                                        onChange={(e) => onChange(i, 'allowed_industries', e.value)}
                                        optionLabel="label"
                                        optionValue="value"
                                        placeholder="Select industries"
                                        className="w-100 slim-multiselect shadow-none"
                                        display="chip"
                                        filter
                                    />
                                </td>
                                <td>
                                    <MultiSelect
                                        value={row.restricted_industries || []}
                                        options={industryTypes}
                                        onChange={(e) => onChange(i, 'restricted_industries', e.value)}
                                        optionLabel="label"
                                        optionValue="value"
                                        placeholder="Blocked industries"
                                        className="w-100 slim-multiselect shadow-none"
                                        display="chip"
                                        filter
                                    />
                                </td>
                                <td className="text-center align-middle">
                                    <button
                                        type="button"
                                        className="btn btn-soft-danger px-2 py-1"
                                        title="Remove Lender"
                                        onClick={() => onRemove(i)}
                                    >
                                        <i className="ri-delete-bin-line fs-5"></i>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="card-footer bg-light border-top border-warning-subtle py-2 d-flex align-items-center gap-2" style={{ backgroundColor: '#fff9e6' }}>
                <i className="ri-information-line text-warning fs-15"></i>
                <span className="fs-13 text-muted">The order of these visibility rules determines borrower qualification for each lender.</span>
            </div>
        </div>
    );
};

export default LenderVisibilityGrid;
