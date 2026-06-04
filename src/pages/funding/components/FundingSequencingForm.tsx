import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Dropdown } from 'primereact/dropdown';
import { toast } from 'react-toastify';
import FormLoader from '../../../components/Loader/FormLoader';
import { createFundingSequencing, updateFundingSequencing, getFundingSequencing, getFundingGroups, getFundingTypes } from '../../../modules/funding/services';
import { usePermissions } from '../../../lib/auth/usePermissions';
import { FUNDING_STATUS_OPTIONS, FUNDING_ICON_MAP, FUNDING_COLOR_MAP } from '../../../config/funding';
import { useSummernote } from '../../../hooks/useSummernote';
import FundingGroupModal from './FundingGroupModal';
import FundingTypeModal from './FundingTypeModal';
import { scrollToFirstError } from '../../../utils/formUtils';

export default function FundingSequencingForm() {
    const { hasPermission } = usePermissions();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;

    const [loading, setLoading] = useState<boolean>(false);
    const [initialLoading, setInitialLoading] = useState<boolean>(isEditMode);
    const [groups, setGroups] = useState<any[]>([]);
    const [types, setTypes] = useState<any[]>([]);
    const [errors, setErrors] = useState<any>({});
    const [showGroupModal, setShowGroupModal] = useState<boolean>(false);
    const [showTypeModal, setShowTypeModal] = useState<boolean>(false);

    const [showIconDropdown, setShowIconDropdown] = useState(false);
    const [iconSearch, setIconSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState({
        name: '',
        subtitle: '',
        funding_group_id: null,
        funding_type_id: null,
        amount_range: '',
        terms: '',
        status: 'Active',
        action_url: '',
        description: '',
        icon: '',
        icon_color: 'blue',
        speed_to_funds: '',
        uses: '',
        qualify_reasons: [''],
        missing_documents: [''],
        readiness_factors: [{ label: '', status: 'Good' }],
        eligibility_status: 'likely_eligible',
        eligibility_label: 'Likely Eligible'
    });

    const handleArrayChange = (name: string, index: number, value: any, key?: string) => {
        setFormData(prev => {
            const newArray = [...(prev[name as keyof typeof prev] as any[])];
            if (key) {
                newArray[index] = { ...newArray[index], [key]: value };
            } else {
                newArray[index] = value;
            }
            return { ...prev, [name]: newArray };
        });
    };

    const addArrayItem = (name: string, defaultItem: any) => {
        setFormData(prev => ({
            ...prev,
            [name]: [...(prev[name as keyof typeof prev] as any[]), defaultItem]
        }));
    };

    const removeArrayItem = (name: string, index: number) => {
        setFormData(prev => {
            const newArray = [...(prev[name as keyof typeof prev] as any[])];
            newArray.splice(index, 1);
            return { ...prev, [name]: newArray };
        });
    };

    const { editorRef: descriptionRef } = useSummernote('description', formData.description, (e) => {
        setFormData(prev => ({ ...prev, description: e.target.value }));
        if (errors.description) {
            setErrors(prev => ({ ...prev, description: null }));
        }
    }, {
        height: 200,
        placeholder: 'Description...',
        dialogsInBody: true
    }, !initialLoading);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowIconDropdown(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const refreshGroups = async () => {
        try {
            const res = await getFundingGroups();
            setGroups(res.data || []);
        } catch (err) {
            console.error('Failed to refresh groups', err);
        }
    };

    const refreshTypes = async () => {
        try {
            const res = await getFundingTypes();
            setTypes(res.data || []);
        } catch (err) {
            console.error('Failed to refresh types', err);
        }
    };

    useEffect(() => {
        const fetchDependencies = async () => {
            try {
                const [groupsRes, typesRes] = await Promise.all([
                    getFundingGroups(),
                    getFundingTypes()
                ]);
                setGroups(groupsRes.data || []);
                setTypes(typesRes.data || []);
            } catch (err) {
                console.error("Failed to fetch dependencies", err);
            }
        };
        fetchDependencies();
    }, []);

    useEffect(() => {
        if (isEditMode) {
            const loadAccount = async () => {
                try {
                    const response = await getFundingSequencing(id);
                    const data = response.data || response;
                    setFormData({
                        ...data,
                        subtitle: data.subtitle || '',
                        amount_range: data.amount_range || '',
                        terms: data.terms || '',
                        status: data.status || 'Active',
                        action_url: data.action_url || '',
                        description: data.description || '',
                        funding_group_id: data.funding_group_id || null,
                        funding_type_id: data.funding_type_id || null,
                        icon: data.icon || '',
                        icon_color: data.icon_color || 'blue',
                        speed_to_funds: data.speed_to_funds || '',
                        uses: data.uses || '',
                        qualify_reasons: data.qualify_reasons?.length ? data.qualify_reasons : [''],
                        missing_documents: data.missing_documents?.length ? data.missing_documents : [''],
                        readiness_factors: data.readiness_factors?.length ? data.readiness_factors : [{ label: '', status: 'Good' }],
                        eligibility_status: data.eligibility_status || 'likely_eligible',
                        eligibility_label: data.eligibility_label || 'Likely Eligible'
                    });
                } catch (err) {
                    toast.error('Failed to load funding details');
                    navigate('/funding');
                } finally {
                    setInitialLoading(false);
                }
            };
            loadAccount();
        }
    }, [id, isEditMode, navigate]);

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleInputChange = (e: any) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e?: any) => {
        if (e) e.preventDefault();
        setLoading(true);

        try {
            if (isEditMode) {
                await updateFundingSequencing(id, formData);
                toast.success('Funding updated successfully');
            } else {
                await createFundingSequencing(formData);
                toast.success('Funding created successfully');
            }
            navigate('/funding');
        } catch (err: any) {
            console.error(err);
            if (err.response?.status === 422) {
                const mappedErrors = err.response.data.errors || {};
                setErrors(mappedErrors);
                scrollToFirstError(mappedErrors);
            } else {
                const errorMsg = err.response?.data?.message || 'Failed to save funding';
                toast.error(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };
    const iconOptions = Object.entries(FUNDING_ICON_MAP).map(([key, riName]) => ({
        label: key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        value: `ri-${riName}-line`,
        icon: `ri-${riName}-line`
    }));

    const colorHexMap: Record<string, string> = {
        success: '#0ab39c',
        primary: '#405189',
        secondary: '#6c757d',
        warning: '#f7b731',
        danger: '#f06548',
        info: '#299cdb'
    };

    const colorOptions = Object.entries(FUNDING_COLOR_MAP).map(([colorKey, bsColor]) => ({
        label: colorKey.charAt(0).toUpperCase() + colorKey.slice(1),
        value: colorKey,
        bsColor,
        hex: colorHexMap[bsColor] || '#405189'
    }));

    const colorItemTemplate = (option: any) => (
        <div className="d-flex align-items-center gap-2">
            <span style={{ width: 14, height: 14, borderRadius: '50%', background: option.hex, display: 'inline-block', border: '1px solid rgba(0,0,0,0.1)' }}></span>
            <span>{option.label}</span>
        </div>
    );

    const colorValueTemplate = (option: any, props: any) => {
        if (option) {
            return (
                <div className="d-flex align-items-center gap-2">
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: option.hex, display: 'inline-block', border: '1px solid rgba(0,0,0,0.1)' }}></span>
                    <span>{option.label}</span>
                </div>
            );
        }
        return <span>{props.placeholder}</span>;
    };

    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Page Header */}
                <div className="row page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-lg-center flex-lg-row flex-column py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-18 fw-semibold mb-1">{isEditMode ? 'Edit Funding' : 'Add New Funding'}</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/" className="text-muted">Dashboard</Link></li>
                                        <li className="breadcrumb-item"><Link to="/funding" className="text-muted">Funding</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">{isEditMode ? 'Edit' : 'Add'}</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
                                <Link to="/funding" className="btn btn-outline-secondary w-lg waves-effect">
                                    <i className="ri-arrow-left-line align-middle me-1"></i> Back
                                </Link>
                                <button
                                    type="submit"
                                    form="funding-sequencing-form"
                                    className="btn btn-primary waves-effect"
                                    disabled={loading || initialLoading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                            {isEditMode ? 'Updating...' : 'Saving...'}
                                        </>
                                    ) : (
                                        <>
                                            <i className="ri-save-line align-middle me-1"></i> {isEditMode ? 'Save Changes' : 'Create Funding'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {initialLoading ? (
                    <div className="row">
                        <div className="col-12"><FormLoader count={8} /></div>
                    </div>
                ) : (
                    <form id="funding-sequencing-form" onSubmit={handleSubmit}>
                        <div className="row credit-account-section">
                            <div className="col-lg-12">
                                <div className="card shadow-sm">
                                    <div className="card-header border-bottom-dashed">
                                        <h5 className="card-title mb-0"><i className="ri-information-line align-middle text-muted me-1 fs-18"></i> Basic Information</h5>
                                    </div>
                                    <div className="card-body">
                                        <div className="row g-4 mb-4">
                                            <div className="col-lg-6">
                                                <div>
                                                    <label className="form-label" htmlFor="name">Name <span className="text-danger">*</span></label>
                                                    <input type="text" id="name" name="name" className={`form-control ${errors.name ? 'is-invalid' : ''}`} value={formData.name} onChange={handleChange} placeholder="e.g. 0% Intro Business Cards" />
                                                    {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div>
                                                    <label className="form-label" htmlFor="subtitle">Subtitle <span className="text-danger">*</span></label>
                                                    <input type="text" id="subtitle" name="subtitle" className={`form-control ${errors.subtitle ? 'is-invalid' : ''}`} value={formData.subtitle} onChange={handleChange} placeholder="e.g. Low / No personal guarantee" />
                                                    {errors.subtitle && <div className="invalid-feedback">{errors.subtitle}</div>}
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div>
                                                    <label className="form-label d-flex justify-content-between align-items-center">
                                                        <span>Funding Group <span className="text-danger">*</span></span>
                                                        <button type="button" className="btn btn-sm btn-link p-0" onClick={() => setShowGroupModal(true)}>
                                                            <i className="ri-add-circle-line"></i> Add New
                                                        </button>
                                                    </label>
                                                    <div className="p-inputgroup flex-1">
                                                        <span className="p-inputgroup-addon bg-light text-muted border border-end-0" style={{ borderRight: 'none' }}><i className="ri-folder-2-line"></i></span>
                                                        <Dropdown
                                                            value={formData.funding_group_id}
                                                            options={groups}
                                                            onChange={(e) => handleInputChange({ target: { name: 'funding_group_id', value: e.value } })}
                                                            optionLabel="name"
                                                            optionValue="id"
                                                            placeholder="Select Group"
                                                            className={`w-100 ${errors.funding_group_id ? 'p-invalid border-danger' : ''} border-start-0`}
                                                            style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                                                        />
                                                    </div>
                                                    {errors.funding_group_id && <small className="text-danger mt-1 d-block">{errors.funding_group_id}</small>}
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div>
                                                    <label className="form-label d-flex justify-content-between align-items-center">
                                                        <span>Funding Type <span className="text-danger">*</span></span>
                                                        <button type="button" className="btn btn-sm btn-link p-0" onClick={() => setShowTypeModal(true)}>
                                                            <i className="ri-add-circle-line"></i> Add New
                                                        </button>
                                                    </label>
                                                    <div className="p-inputgroup flex-1">
                                                        <span className="p-inputgroup-addon bg-light text-muted border border-end-0" style={{ borderRight: 'none' }}><i className="ri-price-tag-3-line"></i></span>
                                                        <Dropdown
                                                            value={formData.funding_type_id}
                                                            options={types}
                                                            onChange={(e) => handleInputChange({ target: { name: 'funding_type_id', value: e.value } })}
                                                            optionLabel="name"
                                                            optionValue="id"
                                                            placeholder="Select Type"
                                                            className={`w-100 ${errors.funding_type_id ? 'p-invalid border-danger' : ''} border-start-0`}
                                                            style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                                                        />
                                                    </div>
                                                    {errors.funding_type_id && <small className="text-danger mt-1 d-block">{errors.funding_type_id}</small>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="row g-4 mb-4">
                                            <div className="col-lg-6">
                                                <div>
                                                    <label className="form-label">Amount Range</label>
                                                    <div className="input-group">
                                                        <span className="input-group-text bg-light text-muted"><i className="ri-money-dollar-circle-line"></i></span>
                                                        <input type="text" name="amount_range" className={`form-control ${errors.amount_range ? 'is-invalid' : ''}`} value={formData.amount_range} onChange={handleChange} placeholder="e.g. $5K - $250K" />
                                                        {errors.amount_range && <div className="invalid-feedback">{errors.amount_range}</div>}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-lg-6">
                                                <div>
                                                    <label className="form-label">Terms</label>
                                                    <div className="input-group">
                                                        <span className="input-group-text bg-light text-muted"><i className="ri-calendar-event-line"></i></span>
                                                        <input type="text" name="terms" className={`form-control ${errors.terms ? 'is-invalid' : ''}`} value={formData.terms} onChange={handleChange} placeholder="e.g. 0% APR" />
                                                        {errors.terms && <div className="invalid-feedback">{errors.terms}</div>}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-lg-6">
                                                <div>
                                                    <label className="form-label">Action URL</label>
                                                    <div className="input-group">
                                                        <span className="input-group-text bg-light text-muted"><i className="ri-link"></i></span>
                                                        <input type="text" name="action_url" className={`form-control ${errors.action_url ? 'is-invalid' : ''}`} value={formData.action_url} onChange={handleChange} placeholder="e.g. https://example.com/apply" />
                                                        {errors.action_url && <div className="invalid-feedback">{errors.action_url}</div>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div>
                                                    <label className="form-label">Status</label>
                                                    <Dropdown
                                                        value={formData.status}
                                                        options={FUNDING_STATUS_OPTIONS}
                                                        onChange={(e) => handleInputChange({ target: { name: 'status', value: e.value } })}
                                                        optionLabel="label"
                                                        optionValue="value"
                                                        className={`w-100 ${errors.status ? 'p-invalid border-danger' : ''}`}
                                                    />
                                                    {errors.status && <small className="text-danger mt-1 d-block">{errors.status}</small>}
                                                </div>
                                            </div>

                                            {/* Details Page Specifics */}
                                            <div className="col-lg-12 mt-5">
                                                <h6 className="fw-semibold text-uppercase text-muted border-bottom pb-2 mb-1">Details Page Information</h6>
                                            </div>

                                            <div className="col-lg-6">
                                                <div>
                                                    <label className="form-label">Speed to Funds</label>
                                                    <input type="text" name="speed_to_funds" className={`form-control ${errors.speed_to_funds ? 'is-invalid' : ''}`} value={formData.speed_to_funds} onChange={handleChange} placeholder="e.g. 1-7 Days" />
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div>
                                                    <label className="form-label">Uses</label>
                                                    <input type="text" name="uses" className={`form-control ${errors.uses ? 'is-invalid' : ''}`} value={formData.uses} onChange={handleChange} placeholder="e.g. Working Capital, Inventory" />
                                                </div>
                                            </div>

                                            <div className="col-lg-6">
                                                <div>
                                                    <label className="form-label">Eligibility Status</label>
                                                    <select name="eligibility_status" className="form-select" value={formData.eligibility_status} onChange={handleChange}>
                                                        <option value="likely_eligible">Likely Eligible</option>
                                                        <option value="eligible">Eligible</option>
                                                        <option value="review_needed">Review Needed</option>
                                                        <option value="not_eligible">Not Eligible</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div>
                                                    <label className="form-label">Eligibility Label</label>
                                                    <input type="text" name="eligibility_label" className={`form-control ${errors.eligibility_label ? 'is-invalid' : ''}`} value={formData.eligibility_label} onChange={handleChange} placeholder="e.g. Likely Eligible" />
                                                </div>
                                            </div>

                                            <div className="col-lg-12 mt-4">
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <label className="form-label mb-0">Qualify Reasons</label>
                                                    <button type="button" className="btn btn-sm btn-soft-primary" onClick={() => addArrayItem('qualify_reasons', '')}>
                                                        <i className="ri-add-line align-middle me-1"></i> Add Reason
                                                    </button>
                                                </div>
                                                {formData.qualify_reasons.map((reason, index) => (
                                                    <div key={index} className="d-flex gap-2 mb-2">
                                                        <input type="text" className="form-control" value={reason} onChange={(e) => handleArrayChange('qualify_reasons', index, e.target.value)} placeholder="e.g. Revenue exceeds minimum threshold" />
                                                        <button type="button" className="btn btn-soft-danger px-3" onClick={() => removeArrayItem('qualify_reasons', index)}>
                                                            <i className="ri-delete-bin-line"></i>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="col-lg-12 mt-3">
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <label className="form-label mb-0">Missing Documents</label>
                                                    <button type="button" className="btn btn-sm btn-soft-primary" onClick={() => addArrayItem('missing_documents', '')}>
                                                        <i className="ri-add-line align-middle me-1"></i> Add Document
                                                    </button>
                                                </div>
                                                {formData.missing_documents.map((doc, index) => (
                                                    <div key={index} className="d-flex gap-2 mb-2">
                                                        <input type="text" className="form-control" value={doc} onChange={(e) => handleArrayChange('missing_documents', index, e.target.value)} placeholder="e.g. Last 3 months business bank statements" />
                                                        <button type="button" className="btn btn-soft-danger px-3" onClick={() => removeArrayItem('missing_documents', index)}>
                                                            <i className="ri-delete-bin-line"></i>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="col-lg-12 mt-3">
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <label className="form-label mb-0">Readiness Factors</label>
                                                    <button type="button" className="btn btn-sm btn-soft-primary" onClick={() => addArrayItem('readiness_factors', { label: '', status: 'Good' })}>
                                                        <i className="ri-add-line align-middle me-1"></i> Add Factor
                                                    </button>
                                                </div>
                                                {formData.readiness_factors.map((factor, index) => (
                                                    <div key={index} className="row g-2 mb-2">
                                                        <div className="col-md-7">
                                                            <input type="text" className="form-control" value={factor.label} onChange={(e) => handleArrayChange('readiness_factors', index, e.target.value, 'label')} placeholder="e.g. Business Credit" />
                                                        </div>
                                                        <div className="col-md-4">
                                                            <select className="form-select" value={factor.status} onChange={(e) => handleArrayChange('readiness_factors', index, e.target.value, 'status')}>
                                                                <option value="Good">Good</option>
                                                                <option value="Strong">Strong</option>
                                                                <option value="Fair">Fair</option>
                                                                <option value="Weak">Weak</option>
                                                                <option value="Missing">Missing</option>
                                                            </select>
                                                        </div>
                                                        <div className="col-md-1">
                                                            <button type="button" className="btn btn-soft-danger w-100" onClick={() => removeArrayItem('readiness_factors', index)}>
                                                                <i className="ri-delete-bin-line"></i>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="col-lg-12 mt-5">
                                                <h6 className="fw-semibold text-uppercase text-muted border-bottom pb-2 mb-4">Display Configurations</h6>
                                            </div>

                                            {/* Icon Picker */}
                                            <div className="col-lg-6">
                                                <div>
                                                    <label className="form-label">Display Icon</label>
                                                    <div className="position-relative" ref={dropdownRef}>
                                                        <button type="button" className={`display-icon-btn form-control d-flex align-items-center gap-2 text-start ${errors.icon ? 'is-invalid border-danger' : ''}`} onClick={() => { setShowIconDropdown(p => !p); setIconSearch(''); }}>
                                                            {formData.icon ? <i className={`${formData.icon?.startsWith('ri-') ? formData.icon : (FUNDING_ICON_MAP[formData.icon] ? `ri-${FUNDING_ICON_MAP[formData.icon]}-line` : formData.icon)} fs-16 text-${FUNDING_COLOR_MAP[formData.icon_color] || 'primary'}`}></i> : <i className="ri-image-line text-muted"></i>}
                                                            <span className="fs-13 flex-grow-1 text-truncate">{iconOptions.find(i => i.value === formData.icon || i.value === `ri-${FUNDING_ICON_MAP[formData.icon]}-line`)?.label || 'Select an icon...'}</span>
                                                            <i className="ri-arrow-down-s-line text-muted ms-auto"></i>
                                                        </button>
                                                        {showIconDropdown && (
                                                            <div className="position-absolute w-100 bg-white border rounded shadow mt-1" style={{ zIndex: 1055, top: '100%' }}>
                                                                <div className="p-2 border-bottom bg-light">
                                                                    <input type="text" className="form-control form-control-sm shadow-none" placeholder="Search icons..." value={iconSearch} onChange={(e) => setIconSearch(e.target.value)} autoFocus />
                                                                </div>
                                                                <div className="overflow-auto" style={{ maxHeight: '200px' }}>
                                                                    {iconOptions.filter(ico => !iconSearch || ico.label.toLowerCase().includes(iconSearch.toLowerCase())).map((ico) => {
                                                                        const isSelected = formData.icon === ico.value || (formData.icon && `ri-${FUNDING_ICON_MAP[formData.icon]}-line` === ico.value);
                                                                        return (
                                                                            <button key={ico.value} type="button" className={`dropdown-item d-flex align-items-center gap-3 py-2 px-3 ${isSelected ? `bg-${FUNDING_COLOR_MAP[formData.icon_color] || 'primary'}-subtle text-${FUNDING_COLOR_MAP[formData.icon_color] || 'primary'}` : ''}`} onClick={() => { handleInputChange({ target: { name: 'icon', value: ico.value } }); setShowIconDropdown(false); }}>
                                                                                <i className={`${ico.icon} fs-16`}></i><span className="fs-13">{ico.label}</span>
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {errors.icon && <small className="text-danger mt-1 d-block">{errors.icon}</small>}
                                                </div>
                                            </div>

                                            {/* Color Picker */}
                                            <div className="col-lg-6">
                                                <div>
                                                    <label className="form-label">Icon Color</label>
                                                    <Dropdown
                                                        value={formData.icon_color}
                                                        options={colorOptions}
                                                        onChange={(e) => handleInputChange({ target: { name: 'icon_color', value: e.value } })}
                                                        optionLabel="label"
                                                        optionValue="value"
                                                        placeholder="Select a color..."
                                                        valueTemplate={colorValueTemplate}
                                                        itemTemplate={colorItemTemplate}
                                                        className="w-100"
                                                    />
                                                </div>
                                            </div>

                                            {/* Description */}
                                            <div className="col-lg-12">
                                                <div>
                                                    <label className="form-label">Description</label>
                                                    <div className={errors.description ? 'is-invalid' : ''}>
                                                        <textarea
                                                            ref={descriptionRef}
                                                            id="description"
                                                            name="description"
                                                            className="d-none"
                                                        />
                                                    </div>
                                                    {errors.description && <div className="invalid-feedback">{errors.description}</div>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                )}
            </div>

            {/* Funding Group Modal */}
            <FundingGroupModal
                visible={showGroupModal}
                onHide={() => setShowGroupModal(false)}
                onSuccess={() => { refreshGroups(); }}
                groups={groups}
            />

            {/* Funding Type Modal */}
            <FundingTypeModal
                visible={showTypeModal}
                onHide={() => setShowTypeModal(false)}
                onSuccess={() => { refreshTypes(); }}
                types={types}
            />
        </div>
    );
}
