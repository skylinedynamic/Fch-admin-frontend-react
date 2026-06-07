import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { toast } from 'react-toastify';
import FormLoader from '../../../components/Loader/FormLoader';
import { STATUS_ACTIVE } from '../../../config/statusOptions';
import { createFundingSequencing, updateFundingSequencing, updateFundingSequencingDisplay, updateFundingSequencingVisibility, getFundingSequencing, getFundingGroups, getFundingTypes } from '../../../modules/funding/services';
import { usePermissions } from '../../../lib/auth/usePermissions';
import { FUNDING_STATUS_OPTIONS, FUNDING_ICON_MAP, FUNDING_COLOR_MAP } from '../../../config/funding';
import { industryTypes } from '../../../config/borrower';
import { locationData } from '../../../config/locations';
import { useSummernote } from '../../../hooks/useSummernote';
import FundingGroupModal from './FundingGroupModal';
import FundingTypeModal from './FundingTypeModal';
import { scrollToFirstError } from '../../../utils/formUtils';

const stateOptions = Object.entries(locationData.USA.states).map(([code, state]) => ({
    label: `${state.name} (${code})`,
    value: code
}));

export default function FundingSequencingForm() {
    const { hasPermission } = usePermissions();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;

    const location = useLocation();
    const [activeTab, setActiveTab] = useState('display');

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const tab = queryParams.get('tab');
        if (tab === 'visibility' || tab === 'display') {
            setActiveTab(tab);
        }
    }, [location.search]);

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(isEditMode);
    const [groups, setGroups] = useState([]);
    const [types, setTypes] = useState([]);
    const [errors, setErrors] = useState({});
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [showTypeModal, setShowTypeModal] = useState(false);

    const [showIconDropdown, setShowIconDropdown] = useState(false);
    const [iconSearch, setIconSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState({
        name: '',
        subtitle: '',
        funding_group_id: null,
        funding_type_id: null,
        min_amount: '',
        max_amount: '',
        terms: '',
        status: STATUS_ACTIVE,
        action_url: '',
        description: '',
        icon: '',
        icon_color: 'blue',
        min_fico: '',
        min_tib_months: '',
        min_monthly_revenue: '',
        min_monthly_deposits: '',
        min_average_daily_balance: '',
        max_nsf_count: '',
        max_negative_days: '',
        min_dscr: '',
        sort_order: '',
        allowed_states: [],
        restricted_states: [],
        allowed_industries: [],
        restricted_industries: [],
        require_completed_application: true,
        require_documents_uploaded: true,
        manual_review_allowed: true,
        exception_allowed: true
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
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowIconDropdown(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

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
                console.error('Failed to fetch dependencies', err);
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
                    const parseAmount = (val: string) => {
                        if (!val) return '';
                        let clean = val.replace(/[^0-9.KkMm]/g, '');
                        if (clean.toLowerCase().includes('k')) {
                            return (parseFloat(clean.toLowerCase().replace('k', '')) * 1000).toString();
                        }
                        if (clean.toLowerCase().includes('m')) {
                            return (parseFloat(clean.toLowerCase().replace('m', '')) * 1000000).toString();
                        }
                        return clean;
                    };
                    setFormData({
                        ...data,
                        subtitle: data.subtitle || '',
                        min_amount: data.amount_range && data.amount_range.includes('-') ? parseAmount(data.amount_range.split('-')[0]) : '',
                        max_amount: data.amount_range && data.amount_range.includes('-') ? parseAmount(data.amount_range.split('-')[1]) : '',
                        terms: data.terms || '',
                        status: data.status || 'Active',
                        action_url: data.action_url || '',
                        description: data.description || '',
                        funding_group_id: data.funding_group_id || null,
                        funding_type_id: data.funding_type_id || null,
                        icon: data.icon || '',
                        icon_color: data.icon_color || 'blue',
                        min_fico: data.min_fico || '',
                        min_tib_months: data.min_tib_months || '',
                        min_monthly_revenue: data.min_monthly_revenue || '',
                        min_monthly_deposits: data.min_monthly_deposits || '',
                        min_average_daily_balance: data.min_average_daily_balance || '',
                        max_nsf_count: data.max_nsf_count || '',
                        max_negative_days: data.max_negative_days || '',
                        min_dscr: data.min_dscr || '',
                        sort_order: data.sort_order || '',
                        allowed_states: data.allowed_states?.length && data.allowed_states[0] !== '' ? data.allowed_states : [],
                        restricted_states: data.restricted_states?.length && data.restricted_states[0] !== '' ? data.restricted_states : [],
                        allowed_industries: data.allowed_industries?.length && data.allowed_industries[0] !== '' ? data.allowed_industries : [],
                        restricted_industries: data.restricted_industries?.length && data.restricted_industries[0] !== '' ? data.restricted_industries : [],
                        require_completed_application: data.require_completed_application || false,
                        require_documents_uploaded: data.require_documents_uploaded || false,
                        manual_review_allowed: data.manual_review_allowed || false,
                        exception_allowed: data.exception_allowed || false
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
        const target = e.target || e;
        const name = target.name;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e?: any) => {
        if (e) e.preventDefault();
        setLoading(true);

        const cleanData = { ...formData };
        ['allowed_states', 'restricted_states', 'allowed_industries', 'restricted_industries'].forEach(field => {
            if (Array.isArray(cleanData[field as keyof typeof cleanData])) {
                cleanData[field as keyof typeof cleanData] = (cleanData[field as keyof typeof cleanData] as any[]).filter(item => typeof item === 'string' && item.trim() !== '');
            }
        });

        let payload = cleanData;

        // If in edit mode, only send the fields for the active tab to separate APIs logically
        if (isEditMode) {
            if (activeTab === 'display') {
                payload = {
                    name: cleanData.name,
                    subtitle: cleanData.subtitle,
                    funding_group_id: cleanData.funding_group_id,
                    funding_type_id: cleanData.funding_type_id,
                    min_amount: cleanData.min_amount,
                    max_amount: cleanData.max_amount,
                    terms: cleanData.terms,
                    status: cleanData.status,
                    action_url: cleanData.action_url,
                    description: cleanData.description,
                    icon: cleanData.icon,
                    icon_color: cleanData.icon_color,
                    sort_order: cleanData.sort_order
                } as any;
            } else if (activeTab === 'visibility') {
                payload = {
                    min_fico: cleanData.min_fico,
                    min_tib_months: cleanData.min_tib_months,
                    min_monthly_revenue: cleanData.min_monthly_revenue,
                    min_monthly_deposits: cleanData.min_monthly_deposits,
                    min_average_daily_balance: cleanData.min_average_daily_balance,
                    max_nsf_count: cleanData.max_nsf_count,
                    max_negative_days: cleanData.max_negative_days,
                    min_dscr: cleanData.min_dscr,
                    allowed_states: cleanData.allowed_states,
                    restricted_states: cleanData.restricted_states,
                    allowed_industries: cleanData.allowed_industries,
                    restricted_industries: cleanData.restricted_industries,
                    require_completed_application: cleanData.require_completed_application,
                    require_documents_uploaded: cleanData.require_documents_uploaded,
                    manual_review_allowed: cleanData.manual_review_allowed,
                    exception_allowed: cleanData.exception_allowed
                } as any;
            }
        }

        try {
            if (isEditMode) {
                if (activeTab === 'display') {
                    await updateFundingSequencingDisplay(id, payload);
                    toast.success('Display settings updated successfully');
                    setActiveTab('visibility'); // redirect to visibility tab
                } else {
                    await updateFundingSequencingVisibility(id, payload);
                    toast.success('Visibility logic updated successfully');
                    navigate('/funding');
                }
            } else {
                const res = await createFundingSequencing(payload);
                toast.success('Funding created successfully. Please configure visibility logic.');
                const newId = res?.data?.id || res?.id;
                if (newId) {
                    navigate(`/funding/${newId}?tab=visibility`);
                } else {
                    navigate('/funding');
                }
            }
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
        info: '#299cdb',
        blue: '#3b82f6',
        indigo: '#6366f1',
        purple: '#a855f7',
        pink: '#ec4899',
        red: '#ef4444',
        orange: '#f97316',
        yellow: '#eab308',
        green: '#22c55e',
        teal: '#14b8a6',
        cyan: '#06b6d4',
        slate: '#64748b'
    };

    const colorOptions = Object.entries(FUNDING_COLOR_MAP).map(([colorKey, bsColor]) => ({
        label: colorKey.charAt(0).toUpperCase() + colorKey.slice(1),
        value: colorKey,
        bsColor,
        hex: colorHexMap[bsColor] || colorHexMap[colorKey] || '#405189'
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
                                <h4 className="fs-18 fw-semibold mb-1">{isEditMode ? 'Edit Funding Sequence' : 'New Funding Sequence'}</h4>
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
                                            <i className="ri-save-line align-middle me-1"></i> {isEditMode ? 'Save Changes' : 'Save Configuration'}
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
                                <div className="card shadow-sm border-0">
                                    <div className="card-header border-bottom-dashed pt-4 pb-0 bg-white">
                                        <div className="d-flex justify-content-between align-items-center mb-4">
                                            <div>
                                                <h2 className="fw-bold mb-1 text-dark" style={{ fontSize: '24px' }}>
                                                    Configure display and visibility logic
                                                </h2>
                                            </div>
                                        </div>

                                        {/* Tabs Navigation */}
                                        <ul className="nav nav-tabs-custom mb-0 border-bottom-0" role="tablist" style={{ gap: '30px' }}>
                                            <li className="nav-item">
                                                <a
                                                    className={`nav-link fw-semibold fs-15 px-0 py-2 ${activeTab === 'display' ? 'active text-primary border-primary' : 'text-muted border-transparent'}`}
                                                    onClick={() => { setActiveTab('display'); setErrors({}); }}
                                                    style={{ cursor: 'pointer', borderBottom: activeTab === 'display' ? '2px solid #2563eb' : '2px solid transparent', color: activeTab === 'display' ? '#2563eb' : '#64748b' }}
                                                >
                                                    Display
                                                </a>
                                            </li>
                                            <li className="nav-item">
                                                <a
                                                    className={`nav-link fw-semibold fs-15 px-0 py-2 ${activeTab === 'visibility' ? 'active text-primary border-primary' : 'text-muted border-transparent'} ${!isEditMode ? 'opacity-50' : ''}`}
                                                    onClick={() => { if (isEditMode) { setActiveTab('visibility'); setErrors({}); } }}
                                                    style={{ cursor: isEditMode ? 'pointer' : 'not-allowed', borderBottom: activeTab === 'visibility' ? '2px solid #2563eb' : '2px solid transparent', color: activeTab === 'visibility' ? '#2563eb' : '#64748b' }}
                                                    title={!isEditMode ? 'Please save the display configuration first' : ''}
                                                >
                                                    Visibility Logic {!isEditMode && <i className="ri-lock-line ms-1 fs-12"></i>}
                                                </a>
                                            </li>
                                        </ul>
                                    </div>
                                    <div className="card-body pt-4">
                                        <div className="tab-content text-muted">
                                            {/* ── Display Tab ─────────────────────────────────────────────────── */}
                                            <div className={`tab-pane ${activeTab === 'display' ? 'active' : ''}`} id="display">
                                                {/* <div className="row g-5 mb-4">
                                                    <div className="col-lg-6">
                                                        <h6 className="fw-bold fs-14 mb-1 text-uppercase" style={{ letterSpacing: '0.05em', color: '#0f172a' }}>IDENTITY</h6>
                                                        <p className="text-muted fs-14 mb-0">How this funding option appears to borrowers</p>
                                                    </div>
                                                    <div className="col-lg-6">
                                                        <h6 className="fw-bold fs-14 mb-1 text-uppercase" style={{ letterSpacing: '0.05em', color: '#0f172a' }}>PRESENTATION</h6>
                                                        <p className="text-muted fs-14 mb-0">Visual configuration for the funding card</p>
                                                    </div>
                                                </div> */}

                                                <div className="row g-4 align-items-start">
                                                    {/* Row 1 */}
                                                    <div className="col-lg-6">
                                                        <div className="mb-2">
                                                            <label className="form-label text-dark fw-medium mb-2">Funding Sequence Name <span className="text-danger">*</span></label>
                                                            <input type="text" name="name" className={`form-control rounded-3 py-2 ${(errors as any).name ? 'is-invalid' : ''}`} value={formData.name} onChange={handleChange} placeholder="Borrower-facing display name" />
                                                            {(errors as any).name && <div className="invalid-feedback">{(errors as any).name}</div>}
                                                        </div>
                                                    </div>
                                                    <div className="col-lg-6">
                                                        <div className="mb-2">
                                                            <label className="form-label text-dark fw-medium mb-2">Amount Range <span className="text-danger">*</span></label>
                                                            {/* <p className="text-muted fs-13 mb-2 opacity-0">Placeholder</p> */}
                                                            <div className="d-flex gap-2 align-items-start">
                                                                <div className="w-50">
                                                                    <div className="input-group">
                                                                        <span className={`input-group-text bg-light text-muted px-3 ${(errors as any).min_amount ? 'border-danger text-danger' : ''}`}>$</span>
                                                                        <input type="number" name="min_amount" className={`form-control py-2 ${(errors as any).min_amount ? 'is-invalid border-danger' : ''}`} value={formData.min_amount} onChange={handleChange} placeholder="Min" />
                                                                    </div>
                                                                    {(errors as any).min_amount && <div className="text-danger mt-1 fs-13">{(errors as any).min_amount}</div>}
                                                                </div>
                                                                <div className="text-muted fw-bold mt-2 pt-1">-</div>
                                                                <div className="w-50">
                                                                    <div className="input-group">
                                                                        <span className={`input-group-text bg-light text-muted px-3 ${(errors as any).max_amount ? 'border-danger text-danger' : ''}`}>$</span>
                                                                        <input type="number" name="max_amount" className={`form-control py-2 ${(errors as any).max_amount ? 'is-invalid border-danger' : ''}`} value={formData.max_amount} onChange={handleChange} placeholder="Max" />
                                                                    </div>
                                                                    {(errors as any).max_amount && <div className="text-danger mt-1 fs-13">{(errors as any).max_amount}</div>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Row 2 */}
                                                    <div className="col-lg-6">
                                                        <div className="mb-2">
                                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                                <label className="form-label text-dark fw-medium mb-0">Funding Group <span className="text-danger">*</span></label>
                                                                <button type="button" className="btn btn-link p-0 text-decoration-none fs-13" onClick={() => setShowGroupModal(true)}>Add New</button>
                                                            </div>
                                                            <Dropdown
                                                                value={formData.funding_group_id}
                                                                options={groups}
                                                                onChange={(e) => handleInputChange({ target: { name: 'funding_group_id', value: e.value } })}
                                                                optionLabel="name"
                                                                optionValue="id"
                                                                placeholder="Select group"
                                                                className={`w-100 rounded-3 ${(errors as any).funding_group_id ? 'p-invalid border-danger' : ''}`}
                                                            />
                                                            {(errors as any).funding_group_id && <small className="text-danger mt-1 d-block">{(errors as any).funding_group_id}</small>}
                                                        </div>
                                                    </div>
                                                    <div className="col-lg-6">
                                                        <div className="mb-2">
                                                            <label className="form-label text-dark fw-medium mb-2">Terms</label>
                                                            <input type="text" name="terms" className={`form-control rounded-3 py-2 ${(errors as any).terms ? 'is-invalid' : ''}`} value={formData.terms} onChange={handleChange} placeholder="e.g. 3–24 months, 12–60 months" />
                                                        </div>
                                                    </div>

                                                    {/* Row 3 */}
                                                    <div className="col-lg-6">
                                                        <div className="mb-2">
                                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                                <label className="form-label text-dark fw-medium mb-0">Funding Type <span className="text-danger">*</span></label>
                                                                <button type="button" className="btn btn-link p-0 text-decoration-none fs-13" onClick={() => setShowTypeModal(true)}>Add New</button>
                                                            </div>
                                                            <Dropdown
                                                                value={formData.funding_type_id}
                                                                options={types}
                                                                onChange={(e) => handleInputChange({ target: { name: 'funding_type_id', value: e.value } })}
                                                                optionLabel="name"
                                                                optionValue="id"
                                                                placeholder="Select type"
                                                                className={`w-100 rounded-3 ${(errors as any).funding_type_id ? 'p-invalid border-danger' : ''}`}
                                                            />
                                                            {(errors as any).funding_type_id && <small className="text-danger mt-1 d-block">{(errors as any).funding_type_id}</small>}
                                                        </div>
                                                    </div>
                                                    <div className="col-lg-6">
                                                        <div className="mb-2">
                                                            <label className="form-label text-dark fw-medium mb-2">Display Icon</label>
                                                            <div className="position-relative" ref={dropdownRef}>
                                                                <button type="button" className={`display-icon-btn form-control d-flex align-items-center gap-2 text-start ${(errors as any).icon ? 'is-invalid border-danger' : ''}`} onClick={() => { setShowIconDropdown(p => !p); setIconSearch(''); }}>
                                                                    {formData.icon ? <i className={`${formData.icon?.startsWith('ri-') ? formData.icon : (FUNDING_ICON_MAP[formData.icon as keyof typeof FUNDING_ICON_MAP] ? `ri-${FUNDING_ICON_MAP[formData.icon as keyof typeof FUNDING_ICON_MAP]}-line` : formData.icon)} fs-16 text-${FUNDING_COLOR_MAP[formData.icon_color as keyof typeof FUNDING_COLOR_MAP] || 'primary'}`}></i> : <i className="ri-image-line text-muted"></i>}
                                                                    <span className="fs-13 flex-grow-1 text-truncate">{iconOptions.find(i => i.value === formData.icon || i.value === `ri-${FUNDING_ICON_MAP[formData.icon as keyof typeof FUNDING_ICON_MAP]}-line`)?.label || 'Select an icon...'}</span>
                                                                    <i className="ri-arrow-down-s-line text-muted ms-auto"></i>
                                                                </button>
                                                                {showIconDropdown && (
                                                                    <div className="position-absolute w-100 bg-white border rounded shadow mt-1" style={{ zIndex: 1055, top: '100%' }}>
                                                                        <div className="p-2 border-bottom bg-light">
                                                                            <input type="text" className="form-control form-control-sm shadow-none" placeholder="Search icons..." value={iconSearch} onChange={(e) => setIconSearch(e.target.value)} autoFocus />
                                                                        </div>
                                                                        <div className="overflow-auto" style={{ maxHeight: '200px' }}>
                                                                            {iconOptions.filter(ico => !iconSearch || ico.label.toLowerCase().includes(iconSearch.toLowerCase())).map((ico) => {
                                                                                const isSelected = formData.icon === ico.value || (formData.icon && `ri-${FUNDING_ICON_MAP[formData.icon as keyof typeof FUNDING_ICON_MAP]}-line` === ico.value);
                                                                                return (
                                                                                    <button key={ico.value} type="button" className={`dropdown-item d-flex align-items-center gap-3 py-2 px-3 ${isSelected ? `bg-${FUNDING_COLOR_MAP[formData.icon_color as keyof typeof FUNDING_COLOR_MAP] || 'primary'}-subtle text-${FUNDING_COLOR_MAP[formData.icon_color as keyof typeof FUNDING_COLOR_MAP] || 'primary'}` : ''}`} onClick={() => { handleInputChange({ target: { name: 'icon', value: ico.value } }); setShowIconDropdown(false); }}>
                                                                                        <i className={`${ico.icon} fs-16`}></i><span className="fs-13">{ico.label}</span>
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {(errors as any).icon && <small className="text-danger mt-1 d-block">{(errors as any).icon}</small>}
                                                        </div>
                                                    </div>

                                                    {/* Row 4 */}
                                                    <div className="col-lg-6">
                                                        <div className="mb-2">
                                                            <label className="form-label text-dark fw-medium mb-2">Subtitle <span className="text-danger">*</span></label>
                                                            <input type="text" name="subtitle" className={`form-control rounded-3 py-2 ${(errors as any).subtitle ? 'is-invalid' : ''}`} value={formData.subtitle} onChange={handleChange} placeholder="e.g. Revolving access to working capital" />
                                                            {(errors as any).subtitle && <div className="invalid-feedback">{(errors as any).subtitle}</div>}
                                                        </div>
                                                    </div>
                                                    <div className="col-lg-6">
                                                        <div className="mb-2">
                                                            <label className="form-label text-dark fw-medium mb-2">Display Color</label>
                                                            <Dropdown
                                                                value={formData.icon_color}
                                                                options={colorOptions}
                                                                onChange={(e) => handleInputChange({ target: { name: 'icon_color', value: e.value } })}
                                                                optionLabel="label"
                                                                optionValue="value"
                                                                placeholder="Select a color..."
                                                                valueTemplate={colorValueTemplate}
                                                                itemTemplate={colorItemTemplate}
                                                                className="w-100 rounded-3"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Row 5 */}
                                                    <div className="col-lg-6">
                                                        <div className="mb-2">
                                                            <label className="form-label text-dark fw-medium mb-2">Action URL</label>
                                                            <input type="text" name="action_url" className={`form-control rounded-3 py-2 ${(errors as any).action_url ? 'is-invalid' : ''}`} value={formData.action_url} onChange={handleChange} placeholder="e.g. https://example.com/apply" />
                                                            {(errors as any).action_url && <div className="invalid-feedback">{(errors as any).action_url}</div>}
                                                        </div>
                                                    </div>
                                                    <div className="col-lg-6">
                                                        <div className="mb-2">
                                                            <label className="form-label text-dark fw-medium mb-2">Display Order</label>
                                                            <input type="number" name="sort_order" className={`form-control rounded-3 py-2 ${(errors as any).sort_order ? 'is-invalid' : ''}`} value={formData.sort_order} onChange={handleChange} placeholder="e.g. 1" />
                                                            {(errors as any).sort_order && <div className="invalid-feedback">{(errors as any).sort_order}</div>}
                                                        </div>
                                                    </div>
                                                    <div className="col-lg-6">
                                                        <div className="mb-2">
                                                            <label className="form-label text-dark fw-medium mb-2">Status</label>
                                                            <Dropdown
                                                                value={formData.status}
                                                                options={FUNDING_STATUS_OPTIONS}
                                                                onChange={(e) => handleInputChange({ target: { name: 'status', value: e.value } })}
                                                                optionLabel="label"
                                                                optionValue="value"
                                                                className={`w-100 rounded-3 ${(errors as any).status ? 'p-invalid border-danger' : ''}`}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Full Width Row 6 */}
                                                    <div className="col-lg-12">
                                                        <div className="mt-3 mb-2">
                                                            <label className="form-label text-dark fw-medium mb-2">Description</label>
                                                            <div className={(errors as any).description ? 'is-invalid' : ''}>
                                                                <textarea
                                                                    ref={descriptionRef}
                                                                    id="description"
                                                                    name="description"
                                                                    className="d-none"
                                                                />
                                                            </div>
                                                            {(errors as any).description && <div className="invalid-feedback">{(errors as any).description}</div>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ── Visibility Logic Tab ────────────────────────────────────────── */}
                                            <div className={`tab-pane ${activeTab === 'visibility' ? 'active' : ''}`} id="visibility">
                                                <div className="row g-5">
                                                    {/* Left Column: Financial Thresholds */}
                                                    <div className="col-lg-6">
                                                        <h6 className="fw-bold fs-14 mb-4 text-uppercase" style={{ letterSpacing: '0.05em', color: '#0f172a' }}>FINANCIAL THRESHOLDS</h6>

                                                        <div className="mb-4">
                                                            <label className="form-label text-dark fw-medium mb-2">Minimum FICO Score <span className="text-danger">*</span></label>
                                                            <div className="position-relative w-100">
                                                                <input type="number" name="min_fico" className={`form-control rounded-3 py-2 ps-3 pe-5 ${(errors as any).min_fico ? 'is-invalid border-danger' : ''}`} value={formData.min_fico} onChange={handleChange} placeholder="None" />
                                                                <span className={`position-absolute text-muted fs-13 bg-light rounded-end px-3 d-flex align-items-center ${(errors as any).min_fico ? 'border-danger text-danger' : ''}`} style={{ right: '1px', top: '1px', bottom: '1px', borderLeft: '1px solid #e2e8f0' }}>FICO</span>
                                                            </div>
                                                            {(errors as any).min_fico && <div className="text-danger mt-1 fs-13">{(errors as any).min_fico}</div>}
                                                        </div>

                                                        <div className="mb-4">
                                                            <label className="form-label text-dark fw-medium mb-2">Minimum Time in Business <span className="text-danger">*</span></label>
                                                            <div className="position-relative w-100">
                                                                <input type="number" name="min_tib_months" className={`form-control rounded-3 py-2 ps-3 pe-5 ${(errors as any).min_tib_months ? 'is-invalid border-danger' : ''}`} value={formData.min_tib_months} onChange={handleChange} placeholder="None" />
                                                                <span className={`position-absolute text-muted fs-13 bg-light rounded-end px-3 d-flex align-items-center ${(errors as any).min_tib_months ? 'border-danger text-danger' : ''}`} style={{ right: '1px', top: '1px', bottom: '1px', borderLeft: '1px solid #e2e8f0' }}>months</span>
                                                            </div>
                                                            {(errors as any).min_tib_months && <div className="text-danger mt-1 fs-13">{(errors as any).min_tib_months}</div>}
                                                        </div>

                                                        <div className="mb-4">
                                                            <label className="form-label text-dark fw-medium mb-2">Minimum Monthly Revenue <span className="text-danger">*</span></label>
                                                            <div className="position-relative w-100">
                                                                <span className={`position-absolute text-muted fs-14 ${(errors as any).min_monthly_revenue ? 'text-danger' : ''}`} style={{ left: '14px', top: '50%', transform: 'translateY(-50%)' }}>$</span>
                                                                <input type="number" name="min_monthly_revenue" className={`form-control rounded-3 py-2 pe-5 ${(errors as any).min_monthly_revenue ? 'is-invalid border-danger' : ''}`} style={{ paddingLeft: '32px' }} value={formData.min_monthly_revenue} onChange={handleChange} placeholder="None" />
                                                                <span className={`position-absolute text-muted fs-13 bg-light rounded-end px-3 d-flex align-items-center ${(errors as any).min_monthly_revenue ? 'border-danger text-danger' : ''}`} style={{ right: '1px', top: '1px', bottom: '1px', borderLeft: '1px solid #e2e8f0' }}>/ mo</span>
                                                            </div>
                                                            {(errors as any).min_monthly_revenue && <div className="text-danger mt-1 fs-13">{(errors as any).min_monthly_revenue}</div>}
                                                        </div>

                                                        <div className="mb-4">
                                                            <label className="form-label text-dark fw-medium mb-2">Minimum Monthly Deposits <span className="text-danger">*</span></label>
                                                            <div className="position-relative w-100">
                                                                <span className={`position-absolute text-muted fs-14 ${(errors as any).min_monthly_deposits ? 'text-danger' : ''}`} style={{ left: '14px', top: '50%', transform: 'translateY(-50%)' }}>$</span>
                                                                <input type="number" name="min_monthly_deposits" className={`form-control rounded-3 py-2 pe-5 ${(errors as any).min_monthly_deposits ? 'is-invalid border-danger' : ''}`} style={{ paddingLeft: '32px' }} value={formData.min_monthly_deposits} onChange={handleChange} placeholder="None" />
                                                                <span className={`position-absolute text-muted fs-13 bg-light rounded-end px-3 d-flex align-items-center ${(errors as any).min_monthly_deposits ? 'border-danger text-danger' : ''}`} style={{ right: '1px', top: '1px', bottom: '1px', borderLeft: '1px solid #e2e8f0' }}>/ mo</span>
                                                            </div>
                                                            {(errors as any).min_monthly_deposits && <div className="text-danger mt-1 fs-13">{(errors as any).min_monthly_deposits}</div>}
                                                        </div>

                                                        <div className="mb-4">
                                                            <label className="form-label text-dark fw-medium mb-2">Minimum Average Daily Balance <span className="text-danger">*</span></label>
                                                            <div className="position-relative w-100">
                                                                <span className={`position-absolute text-muted fs-14 ${(errors as any).min_average_daily_balance ? 'text-danger' : ''}`} style={{ left: '14px', top: '50%', transform: 'translateY(-50%)' }}>$</span>
                                                                <input type="number" name="min_average_daily_balance" className={`form-control rounded-3 py-2 ${(errors as any).min_average_daily_balance ? 'is-invalid border-danger' : ''}`} style={{ paddingLeft: '32px' }} value={formData.min_average_daily_balance} onChange={handleChange} placeholder="None" />
                                                            </div>
                                                            {(errors as any).min_average_daily_balance && <div className="text-danger mt-1 fs-13">{(errors as any).min_average_daily_balance}</div>}
                                                        </div>

                                                        <div className="mb-4">
                                                            <label className="form-label text-dark fw-medium mb-2">Maximum NSF Count</label>
                                                            <div className="position-relative w-100">
                                                                <input type="number" name="max_nsf_count" className={`form-control rounded-3 py-2 ps-3 pe-5 ${(errors as any).max_nsf_count ? 'is-invalid border-danger' : ''}`} value={formData.max_nsf_count} onChange={handleChange} placeholder="None" />
                                                                <span className={`position-absolute text-muted fs-13 bg-light rounded-end px-3 d-flex align-items-center ${(errors as any).max_nsf_count ? 'border-danger text-danger' : ''}`} style={{ right: '1px', top: '1px', bottom: '1px', borderLeft: '1px solid #e2e8f0' }}>per period</span>
                                                            </div>
                                                            {(errors as any).max_nsf_count && <div className="text-danger mt-1 fs-13">{(errors as any).max_nsf_count}</div>}
                                                        </div>

                                                        <div className="mb-4">
                                                            <label className="form-label text-dark fw-medium mb-2">Maximum Negative Days</label>
                                                            <div className="position-relative w-100">
                                                                <input type="number" name="max_negative_days" className={`form-control rounded-3 py-2 ps-3 pe-5 ${(errors as any).max_negative_days ? 'is-invalid border-danger' : ''}`} value={formData.max_negative_days} onChange={handleChange} placeholder="None" />
                                                                <span className={`position-absolute text-muted fs-13 bg-light rounded-end px-3 d-flex align-items-center ${(errors as any).max_negative_days ? 'border-danger text-danger' : ''}`} style={{ right: '1px', top: '1px', bottom: '1px', borderLeft: '1px solid #e2e8f0' }}>days</span>
                                                            </div>
                                                            {(errors as any).max_negative_days && <div className="text-danger mt-1 fs-13">{(errors as any).max_negative_days}</div>}
                                                        </div>

                                                        <div className="mb-4">
                                                            <label className="form-label text-dark fw-medium mb-1">Minimum DSCR</label>
                                                            <input type="number" name="min_dscr" className={`form-control rounded-3 py-2 ${(errors as any).min_dscr ? 'is-invalid border-danger' : ''}`} value={formData.min_dscr} onChange={handleChange} placeholder="For amortized / SBA products (e.g. 1.25)" />
                                                            {(errors as any).min_dscr && <div className="text-danger mt-1 fs-13">{(errors as any).min_dscr}</div>}
                                                        </div>
                                                    </div>

                                                    {/* Right Column: Geography & Industry + Review Settings */}
                                                    <div className="col-lg-6">
                                                        <h6 className="fw-bold fs-14 mb-4 text-uppercase" style={{ letterSpacing: '0.05em', color: '#0f172a' }}>GEOGRAPHY & INDUSTRY</h6>

                                                        <div className="mb-4">
                                                            <label className="form-label text-dark fw-medium mb-1">Allowed States</label>
                                                            <MultiSelect
                                                                value={formData.allowed_states}
                                                                options={stateOptions}
                                                                onChange={(e) => handleInputChange({ target: { name: 'allowed_states', value: e.value } })}
                                                                optionLabel="label"
                                                                placeholder="Leave empty = all states allowed"
                                                                className="w-100 rounded-3"
                                                                display="chip"
                                                                maxSelectedLabels={100}
                                                                filter
                                                            />
                                                        </div>

                                                        <div className="mb-4">
                                                            <label className="form-label text-dark fw-medium mb-1">Restricted States</label>
                                                            <MultiSelect
                                                                value={formData.restricted_states}
                                                                options={stateOptions}
                                                                onChange={(e) => handleInputChange({ target: { name: 'restricted_states', value: e.value } })}
                                                                optionLabel="label"
                                                                placeholder="Hard stop - blocked (e.g. ND)"
                                                                className="w-100 rounded-3"
                                                                display="chip"
                                                                maxSelectedLabels={100}
                                                                filter
                                                            />
                                                        </div>

                                                        <div className="mb-4">
                                                            <label className="form-label text-dark fw-medium mb-1">Allowed Industries</label>
                                                            <MultiSelect
                                                                value={formData.allowed_industries}
                                                                options={industryTypes}
                                                                onChange={(e) => handleInputChange({ target: { name: 'allowed_industries', value: e.value } })}
                                                                optionLabel="label"
                                                                placeholder="Leave empty = all industries allowed"
                                                                className="w-100 rounded-3"
                                                                display="chip"
                                                                maxSelectedLabels={100}
                                                                filter
                                                            />
                                                        </div>

                                                        <div className="mb-5">
                                                            <label className="form-label text-dark fw-medium mb-1">Restricted Industries</label>
                                                            <MultiSelect
                                                                value={formData.restricted_industries}
                                                                options={industryTypes}
                                                                onChange={(e) => handleInputChange({ target: { name: 'restricted_industries', value: e.value } })}
                                                                optionLabel="label"
                                                                placeholder="Hard stop - blocked (e.g. Real Estate)"
                                                                className="w-100 rounded-3"
                                                                display="chip"
                                                                maxSelectedLabels={100}
                                                                filter
                                                            />
                                                        </div>

                                                        <h6 className="fw-bold fs-14 mb-4 text-uppercase" style={{ letterSpacing: '0.05em', color: '#0f172a' }}>REVIEW SETTINGS</h6>

                                                        <div className="d-flex align-items-center justify-content-between mb-4">
                                                            <div>
                                                                <label className="form-label text-dark fw-medium mb-0">Require Completed Fund Application</label>
                                                                <p className="text-muted fs-13 mb-0">Funding sequence only shown after application is complete</p>
                                                            </div>
                                                            <div className="form-check form-switch form-switch-md form-switch-success ms-3" style={{ transform: 'scale(1.2)', transformOrigin: 'right' }}>
                                                                <input className="form-check-input" type="checkbox" role="switch" name="require_completed_application" checked={formData.require_completed_application} onChange={handleInputChange} />
                                                            </div>
                                                        </div>

                                                        <div className="d-flex align-items-center justify-content-between mb-4">
                                                            <div>
                                                                <label className="form-label text-dark fw-medium mb-0">Require Documents Uploaded</label>
                                                                <p className="text-muted fs-13 mb-0">Documents must be uploaded before sequence is active</p>
                                                            </div>
                                                            <div className="form-check form-switch form-switch-md form-switch-success ms-3" style={{ transform: 'scale(1.2)', transformOrigin: 'right' }}>
                                                                <input className="form-check-input" type="checkbox" role="switch" name="require_documents_uploaded" checked={formData.require_documents_uploaded} onChange={handleInputChange} />
                                                            </div>
                                                        </div>

                                                        <div className="d-flex align-items-center justify-content-between mb-4">
                                                            <div>
                                                                <label className="form-label text-dark fw-medium mb-0">Manual Review Allowed</label>
                                                                <p className="text-muted fs-13 mb-0">Soft misses can be escalated to manual review</p>
                                                            </div>
                                                            <div className="form-check form-switch form-switch-md form-switch-primary ms-3" style={{ transform: 'scale(1.2)', transformOrigin: 'right' }}>
                                                                <input className="form-check-input" type="checkbox" role="switch" name="manual_review_allowed" checked={formData.manual_review_allowed} onChange={handleInputChange} />
                                                            </div>
                                                        </div>

                                                        <div className="d-flex align-items-center justify-content-between mb-4">
                                                            <div>
                                                                <label className="form-label text-dark fw-medium mb-0">Exception Allowed</label>
                                                                <p className="text-muted fs-13 mb-0">Compensating factors can upgrade a soft fail</p>
                                                            </div>
                                                            <div className="form-check form-switch form-switch-md form-switch-primary ms-3" style={{ transform: 'scale(1.2)', transformOrigin: 'right' }}>
                                                                <input className="form-check-input" type="checkbox" role="switch" name="exception_allowed" checked={formData.exception_allowed} onChange={handleInputChange} />
                                                            </div>
                                                        </div>

                                                    </div>
                                                </div>
                                            </div>

                                            {/* Preview Tab Removed */}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                )}

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
        </div>
    );
}
