import React from 'react';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { TIB_OPTIONS } from '../../../config/funding';

interface LenderVisibilityGridProps {
    visibilities: any[];
    setVisibilities: (visibilities: any[]) => void;
    lenders: any[];
    errors: any;
    setErrors: (callback: (prev: any) => any) => void;
    stateOptions: any[];
    industryTypes: any[];
}

const getCategoryBadgeClass = (category: string) => {
    if (!category) return 'bg-light text-muted border-light';

    const colors = ['primary', 'success', 'info', 'warning', 'danger', 'secondary'];
    
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
        hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colorIndex = Math.abs(hash) % colors.length;
    const color = colors[colorIndex];

    return `bg-${color}-subtle text-${color} border-${color}`;
};

export const LenderVisibilityGrid: React.FC<LenderVisibilityGridProps> = ({
    visibilities,
    setVisibilities,
    lenders,
    errors,
    setErrors,
    stateOptions = [],
    industryTypes = [],
    productCategories = [],
}) => {

    const blocks: { lenderId: number | null, nullId: number, rows: { item: any, index: number }[] }[] = [];
    let nullCounter = 0;

    visibilities.forEach((v, index) => {
        if (v.lender_id) {
            let block = blocks.find(b => b.lenderId === v.lender_id);
            if (!block) {
                block = { lenderId: v.lender_id, nullId: -1, rows: [] };
                blocks.push(block);
            }
            block.rows.push({ item: v, index });
        } else {
            blocks.push({ lenderId: null, nullId: nullCounter++, rows: [{ item: v, index }] });
        }
    });

    const selectedLenderIds = blocks.map(b => b.lenderId).filter(Boolean) as number[];

    const onAddBlock = () => {
        setVisibilities([
            ...visibilities,
            {
                lender_id: null,
                lender_product_category_id: '',
                min_fico: '',
                min_tib_months: '',
                min_monthly_revenue: '',
                min_monthly_deposits: '',
                min_deposit_count: '',
                min_average_daily_balance: '',
                max_nsf_count: '',
                max_negative_days: '',
                min_dscr: '',
                allowed_states: [],
                restricted_states: [],
                allowed_industries: [],
                restricted_industries: []
            }
        ]);
    };

    const onRemoveBlock = (block: any) => {
        const newVisibilities = visibilities.filter((v, idx) => {
            if (block.lenderId) return String(v.lender_id) !== String(block.lenderId);
            return idx !== block.rows[0].index;
        });

        setVisibilities(newVisibilities);
        
        if (setErrors) {
            setErrors((prev: any) => {
                if (!prev) return prev;
                const newErrors = { ...prev };
                block.rows.forEach((r: any) => {
                    Object.keys(newErrors).forEach(key => {
                        if (key.startsWith(`lender_visibilities.${r.index}.`)) {
                            delete newErrors[key];
                        }
                    });
                });
                return newErrors;
            });
        }
    };

    const onRemoveRow = (index: number) => {
        const newVisibilities = [...visibilities];
        newVisibilities.splice(index, 1);
        setVisibilities(newVisibilities);

        if (setErrors) {
            setErrors((prev: any) => {
                if (!prev) return prev;
                const newErrors = { ...prev };
                Object.keys(newErrors).forEach(key => {
                    if (key.startsWith(`lender_visibilities.${index}.`)) {
                        delete newErrors[key];
                    }
                });
                return newErrors;
            });
        }
    };

    const onBlockLenderChange = (block: any, newLenderId: number) => {
        const lender = lenders.find(l => l.id === newLenderId);
        const categories = lender?.product_categories || [];

        let newRows: any[] = [];
        if (categories.length > 0) {
            categories.forEach((catName: string) => {
                const catObj = productCategories.find((c: any) => c.name === catName);
                newRows.push({
                    lender_id: newLenderId,
                    lender_product_category_id: catObj ? catObj.id : catName,
                    product_category: catName,
                    min_fico: '',
                    min_tib_months: '',
                    min_monthly_revenue: '',
                    min_monthly_deposits: '',
                    min_deposit_count: '',
                    min_average_daily_balance: '',
                    max_nsf_negative_days: '',
                    min_dscr: '',
                    allowed_states: [],
                    restricted_states: [],
                    allowed_industries: [],
                    restricted_industries: []
                });
            });
        } else {
            newRows.push({
                lender_id: newLenderId,
                lender_product_category_id: '',
                min_fico: '',
                min_tib_months: '',
                min_monthly_revenue: '',
                min_monthly_deposits: '',
                min_deposit_count: '',
                min_average_daily_balance: '',
                max_nsf_count: '',
                max_negative_days: '',
                min_dscr: '',
                allowed_states: [],
                restricted_states: [],
                allowed_industries: [],
                restricted_industries: []
            });
        }

        let newVisibilities = [...visibilities];

        if (block.lenderId) {
            newVisibilities = newVisibilities.filter(v => String(v.lender_id) !== String(block.lenderId));
        } else {
            newVisibilities.splice(block.rows[0].index, 1);
        }

        newVisibilities = [...newVisibilities, ...newRows];
        setVisibilities(newVisibilities);
    };

    const onChange = (index: number, field: string, value: any) => {
        const newVisibilities = [...visibilities];
        newVisibilities[index] = { ...newVisibilities[index], [field]: value };
        setVisibilities(newVisibilities);

        if (setErrors && errors[`lender_visibilities.${index}.${field}`]) {
            setErrors((prev: any) => {
                const newErrors = { ...prev };
                delete newErrors[`lender_visibilities.${index}.${field}`];
                return newErrors;
            });
        }
    };

    const renderError = (field: string, i: number) => {
        const errorMsg = errors?.[`lender_visibilities.${i}.${field}`];
        if (errorMsg) {
            return <div className="text-danger mt-1 text-wrap" style={{ fontSize: '11px', lineHeight: '1.3' }}>{errorMsg}</div>;
        }
        return null;
    };

    return (
        <div className="card shadow-sm border-0 rounded-3 mb-4 overflow-hidden" style={{ maxWidth: '100%' }}>
            <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                <h6 className="card-title mb-0 fw-bold fs-16 text-dark">Visibility Rules Setup</h6>
                <button type="button" className="btn btn-dark btn-sm rounded-3 px-3 py-2 fw-medium" onClick={onAddBlock} style={{ backgroundColor: '#1e293b' }}>
                    <i className="ri-add-line me-1"></i> Add New Visibility Logic
                </button>
            </div>

            <div className="card-body p-4 bg-light">
                {blocks.length === 0 && (
                    <div className="d-flex flex-column" style={{ minHeight: '300px' }}>
                        <div className="text-center m-auto flex-grow-1 d-flex flex-column justify-content-center">
                            <div className="avatar-sm mx-auto mb-3">
                                <div className="avatar-title bg-light text-dark rounded-3 fs-20 border border-light-subtle shadow-sm" style={{ width: '48px', height: '48px' }}>
                                    <i className="ri-settings-4-line"></i>
                                </div>
                            </div>
                            <h5 className="fs-15 fw-bold text-dark mb-2">No visibility rules added</h5>
                            <p className="text-muted mb-0 fs-13">Please select a lender to generate qualification rows.</p>
                        </div>
                    </div>
                )}

                {blocks.map((block) => {
                    const lenderDropdownOptions = lenders.filter(l => !selectedLenderIds.includes(l.id) || l.id === block.lenderId);

                    return (
                        <div key={block.lenderId ? `lender-${block.lenderId}` : `null-${block.nullId}`} className="card border border-light-subtle rounded-3 mb-4 bg-white shadow-sm">
                            <div className="card-body p-4">
                                <div className="d-flex align-items-center justify-content-between mb-4 pb-2 border-bottom border-light-subtle">
                                    <div className="d-flex align-items-center gap-3">
                                        <label className="form-label mb-0 fw-bold text-dark fs-14 text-nowrap">Lender <span className="text-danger">*</span></label>
                                        <div style={{ width: '300px' }}>
                                            <Dropdown
                                                value={block.lenderId}
                                                options={lenderDropdownOptions}
                                                onChange={(e) => onBlockLenderChange(block, e.value)}
                                                optionLabel="name"
                                                optionValue="id"
                                                placeholder="&mdash; Select Lender &mdash;"
                                                filter
                                                className="w-100 slim-dropdown shadow-none"
                                            />
                                        </div>
                                    </div>
                                    <button type="button" className="btn btn-outline-danger btn-sm px-3 py-2 fw-medium rounded-3" onClick={() => onRemoveBlock(block)}>
                                        <i className="ri-delete-bin-line me-1"></i> {block.lenderId ? 'Remove Lender' : 'Remove'}
                                    </button>
                                </div>

                                {block.lenderId ? (
                                    <div className="table-responsive custom-scrollbar-wrapper pb-3">
                                        <table className="table table-borderless table-nowrap align-middle mb-0" style={{ minWidth: 'max-content' }}>
                                            <thead className="text-muted fs-12 fw-semibold" style={{ borderBottom: '2px solid #f3f6f9' }}>
                                                <tr>
                                                    <th style={{ width: '220px', paddingLeft: 0 }}>Product Category <span className="text-danger">*</span></th>
                                                    <th style={{ width: '150px' }}>Min FICO <span className="text-danger">*</span></th>
                                                    <th style={{ width: '180px' }}>Min Time In Business <span className="text-danger">*</span></th>
                                                    <th style={{ width: '200px' }}>Min Monthly Revenue <span className="text-danger">*</span></th>
                                                    <th style={{ width: '200px' }}>Min Monthly Deposits <span className="text-danger">*</span></th>
                                                    <th style={{ width: '160px' }}>Min Deposit Count <span className="text-danger">*</span></th>
                                                    <th style={{ width: '200px' }}>Min Avg Daily Bal <span className="text-danger">*</span></th>
                                                    <th style={{ width: '150px' }}>Max NSF Count <span className="text-danger">*</span></th>
                                                    <th style={{ width: '160px' }}>Max Negative Days <span className="text-danger">*</span></th>
                                                    <th style={{ width: '120px' }}>Min DSCR</th>
                                                    <th style={{ width: '250px' }}>Allowed States</th>
                                                    <th style={{ width: '250px' }}>Restricted States</th>
                                                    <th style={{ width: '250px' }}>Allowed Industries</th>
                                                    <th style={{ width: '250px' }}>Restricted Industries</th>
                                                    <th style={{ width: '80px', textAlign: 'center' }}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {block.rows.map((rowItem, rIdx) => {
                                                    const i = rowItem.index;
                                                    const row = rowItem.item;

                                                    const categoryName = row.product_category || productCategories.find((c: any) => String(c.id) === String(row.lender_product_category_id))?.name;
                                                    const badgeClass = getCategoryBadgeClass(categoryName || '');

                                                    return (
                                                        <tr key={`row-${i}`} style={{ borderBottom: rIdx === block.rows.length - 1 ? 'none' : '1px dashed #e9ebec' }}>
                                                            <td className="py-3" style={{ paddingLeft: 0 }}>
                                                                {categoryName ? (
                                                                    <div className={`badge ${badgeClass} px-3 py-2 fs-13 rounded-1 fw-semibold d-inline-flex align-items-center text-nowrap`}>
                                                                        <i className="ri-bank-card-line me-2 fs-14"></i> {categoryName}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-muted fw-medium fs-13">None</span>
                                                                )}
                                                            </td>
                                                            <td className="py-3">
                                                                <input
                                                                    type="number"
                                                                    className={`form-control shadow-none rounded-2 ${(errors as any)[`lender_visibilities.${i}.min_fico`] ? 'is-invalid' : ''}`}
                                                                    placeholder="640"
                                                                    value={row.min_fico || ''}
                                                                    onChange={(e) => onChange(i, 'min_fico', e.target.value)}
                                                                />
                                                                {renderError('min_fico', i)}
                                                            </td>
                                                            <td className="py-3">
                                                                <Dropdown
                                                                    value={row.min_tib_months}
                                                                    options={TIB_OPTIONS}
                                                                    onChange={(e) => onChange(i, 'min_tib_months', e.value)}
                                                                    optionLabel="label"
                                                                    optionValue="value"
                                                                    placeholder="12 months"
                                                                    className={`w-100 slim-dropdown rounded-2 shadow-none ${(errors as any)[`lender_visibilities.${i}.min_tib_months`] ? 'p-invalid border-danger' : ''}`}
                                                                />
                                                                {renderError('min_tib_months', i)}
                                                            </td>
                                                            <td className="py-3">
                                                                <div className="input-group">
                                                                    <span className={`input-group-text bg-white border-end-0 ${(errors as any)[`lender_visibilities.${i}.min_monthly_revenue`] ? 'border-danger text-danger' : 'text-muted'}`}>$</span>
                                                                    <input
                                                                        type="number"
                                                                        className={`form-control border-start-0 shadow-none rounded-end-2 ${(errors as any)[`lender_visibilities.${i}.min_monthly_revenue`] ? 'is-invalid border-danger' : ''}`}
                                                                        placeholder="12000.00"
                                                                        value={row.min_monthly_revenue || ''}
                                                                        onChange={(e) => onChange(i, 'min_monthly_revenue', e.target.value)}
                                                                    />
                                                                </div>
                                                                {renderError('min_monthly_revenue', i)}
                                                            </td>
                                                            <td className="py-3">
                                                                <div className="input-group">
                                                                    <span className={`input-group-text bg-white border-end-0 ${(errors as any)[`lender_visibilities.${i}.min_monthly_deposits`] ? 'border-danger text-danger' : 'text-muted'}`}>$</span>
                                                                    <input
                                                                        type="number"
                                                                        className={`form-control border-start-0 shadow-none rounded-end-2 ${(errors as any)[`lender_visibilities.${i}.min_monthly_deposits`] ? 'is-invalid border-danger' : ''}`}
                                                                        placeholder="12000.00"
                                                                        value={row.min_monthly_deposits || ''}
                                                                        onChange={(e) => onChange(i, 'min_monthly_deposits', e.target.value)}
                                                                    />
                                                                </div>
                                                                {renderError('min_monthly_deposits', i)}
                                                            </td>
                                                            <td className="py-3">
                                                                <input
                                                                    type="number"
                                                                    className={`form-control shadow-none rounded-2 ${(errors as any)[`lender_visibilities.${i}.min_deposit_count`] ? 'is-invalid' : ''}`}
                                                                    placeholder="100"
                                                                    value={row.min_deposit_count || ''}
                                                                    onChange={(e) => onChange(i, 'min_deposit_count', e.target.value)}
                                                                />
                                                                {renderError('min_deposit_count', i)}
                                                            </td>
                                                            <td className="py-3">
                                                                <div className="input-group">
                                                                    <span className={`input-group-text bg-white border-end-0 ${(errors as any)[`lender_visibilities.${i}.min_average_daily_balance`] ? 'border-danger text-danger' : 'text-muted'}`}>$</span>
                                                                    <input
                                                                        type="number"
                                                                        className={`form-control border-start-0 shadow-none rounded-end-2 ${(errors as any)[`lender_visibilities.${i}.min_average_daily_balance`] ? 'is-invalid border-danger' : ''}`}
                                                                        placeholder="4000.00"
                                                                        value={row.min_average_daily_balance || ''}
                                                                        onChange={(e) => onChange(i, 'min_average_daily_balance', e.target.value)}
                                                                    />
                                                                </div>
                                                                {renderError('min_average_daily_balance', i)}
                                                            </td>
                                                            <td className="py-3">
                                                                <input
                                                                    type="number"
                                                                    className={`form-control shadow-none rounded-2 ${(errors as any)[`lender_visibilities.${i}.max_nsf_count`] ? 'is-invalid' : ''}`}
                                                                    placeholder="4"
                                                                    value={row.max_nsf_count || ''}
                                                                    onChange={(e) => onChange(i, 'max_nsf_count', e.target.value)}
                                                                />
                                                                {renderError('max_nsf_count', i)}
                                                            </td>
                                                            <td className="py-3">
                                                                <input
                                                                    type="number"
                                                                    className={`form-control shadow-none rounded-2 ${(errors as any)[`lender_visibilities.${i}.max_negative_days`] ? 'is-invalid' : ''}`}
                                                                    placeholder="4"
                                                                    value={row.max_negative_days || ''}
                                                                    onChange={(e) => onChange(i, 'max_negative_days', e.target.value)}
                                                                />
                                                                {renderError('max_negative_days', i)}
                                                            </td>
                                                            <td className="py-3">
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    className={`form-control shadow-none rounded-2 ${(errors as any)[`lender_visibilities.${i}.min_dscr`] ? 'is-invalid' : ''}`}
                                                                    placeholder="1.25"
                                                                    value={row.min_dscr || ''}
                                                                    onChange={(e) => onChange(i, 'min_dscr', e.target.value)}
                                                                />
                                                                {renderError('min_dscr', i)}
                                                            </td>
                                                            <td className="py-3">
                                                                <MultiSelect
                                                                    value={row.allowed_states}
                                                                    options={stateOptions}
                                                                    onChange={(e) => onChange(i, 'allowed_states', e.value)}
                                                                    optionLabel="label"
                                                                    optionValue="value"
                                                                    placeholder="Select states"
                                                                    filter
                                                                    display="chip"
                                                                    panelStyle={{ maxWidth: '350px' }}
                                                                    className={`w-100 slim-multiselect rounded-3 shadow-none ${(errors as any)[`lender_visibilities.${i}.allowed_states`] ? 'p-invalid border-danger' : ''}`}
                                                                />
                                                                {renderError('allowed_states', i)}
                                                            </td>
                                                            <td className="py-3">
                                                                <MultiSelect
                                                                    value={row.restricted_states}
                                                                    options={stateOptions}
                                                                    onChange={(e) => onChange(i, 'restricted_states', e.value)}
                                                                    optionLabel="label"
                                                                    optionValue="value"
                                                                    placeholder="Blocked states"
                                                                    filter
                                                                    display="chip"
                                                                    panelStyle={{ maxWidth: '350px' }}
                                                                    className={`w-100 slim-multiselect rounded-3 shadow-none ${(errors as any)[`lender_visibilities.${i}.restricted_states`] ? 'p-invalid border-danger' : ''}`}
                                                                />
                                                                {renderError('restricted_states', i)}
                                                            </td>
                                                            <td className="py-3">
                                                                <MultiSelect
                                                                    value={row.allowed_industries}
                                                                    options={industryTypes}
                                                                    onChange={(e) => onChange(i, 'allowed_industries', e.value)}
                                                                    optionLabel="label"
                                                                    optionValue="value"
                                                                    placeholder="Select industries"
                                                                    filter
                                                                    display="chip"
                                                                    panelStyle={{ maxWidth: '350px' }}
                                                                    className={`w-100 slim-multiselect rounded-3 shadow-none ${(errors as any)[`lender_visibilities.${i}.allowed_industries`] ? 'p-invalid border-danger' : ''}`}
                                                                />
                                                                {renderError('allowed_industries', i)}
                                                            </td>
                                                            <td className="py-3">
                                                                <MultiSelect
                                                                    value={row.restricted_industries}
                                                                    options={industryTypes}
                                                                    onChange={(e) => onChange(i, 'restricted_industries', e.value)}
                                                                    optionLabel="label"
                                                                    optionValue="value"
                                                                    placeholder="Blocked industries"
                                                                    filter
                                                                    display="chip"
                                                                    panelStyle={{ maxWidth: '350px' }}
                                                                    className={`w-100 slim-multiselect rounded-3 shadow-none ${(errors as any)[`lender_visibilities.${i}.restricted_industries`] ? 'p-invalid border-danger' : ''}`}
                                                                />
                                                                {renderError('restricted_industries', i)}
                                                            </td>
                                                            <td className="py-3 text-center">
                                                                <button
                                                                    type="button"
                                                                    className="btn bg-danger-subtle text-danger rounded-circle d-inline-flex align-items-center justify-content-center border-0 p-0"
                                                                    style={{ width: '32px', height: '32px' }}
                                                                    onClick={() => onRemoveRow(i)}
                                                                    title="Remove row"
                                                                >
                                                                    <i className="ri-delete-bin-line fs-14"></i>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-muted fs-14 mt-2 mb-2 d-flex align-items-center">
                                        <i className="ri-arrow-up-line me-2 fs-16 text-primary"></i>
                                        Select a lender from the dropdown above to generate rows for its product categories.
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

            </div>

            <div className="card-footer bg-warning-subtle py-3 d-flex align-items-center gap-2 border-top-0">
                <i className="ri-error-warning-line text-warning fs-18"></i>
                <span className="fs-13 text-warning fw-medium">The order of these visibility rules determines borrower qualification for each lender.</span>
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
        </div>
    );
};

export default LenderVisibilityGrid;
