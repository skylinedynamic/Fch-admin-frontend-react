import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { toast } from 'react-toastify';
import FormLoader from '../../../components/Loader/FormLoader';
import { STATUS_ACTIVE } from '../../../config/statusOptions';
import { createFundingSequencing, updateFundingSequencing, updateFundingSequencingDisplay, updateFundingSequencingVisibility, getFundingSequencing, getFundingGroups, getFundingTypes } from '../../../modules/funding/services';
import { getAllLenders } from '../../../modules/lender/services';
import { usePermissions } from '../../../lib/auth/usePermissions';
import { FUNDING_STATUS_OPTIONS, FUNDING_ICON_MAP, FUNDING_COLOR_MAP, USES_OPTIONS, READINESS_FACTOR_STATUS_OPTIONS, READINESS_FACTORS_OPTIONS } from '../../../config/funding';
import { industryTypes } from '../../../config/borrower';
import { locationData } from '../../../config/locations';
import { useSummernote } from '../../../hooks/useSummernote';
import { fetchBorrowerDocumentTypes } from '../../../modules/client/services';
import FundingGroupModal from './FundingGroupModal';
import FundingTypeModal from './FundingTypeModal';
import { scrollToFirstError } from '../../../utils/formUtils';
import '../../../assets/css/funding.css';

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
    const [lendersList, setLendersList] = useState([]);
    const [errors, setErrors] = useState({});
    const [allowedDocumentOptions, setAllowedDocumentOptions] = useState<{label: string, value: string}[]>([]);
    const [groupModalOpen, setGroupModalOpen] = useState(false);
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
        lender_id: null,
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
        exception_allowed: true,
        speed_to_funds: '',
        uses: [],
        qualify_reasons: [],
        readiness_factors: [],
        missing_documents: [],
        allowed_documents: []
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
        const loadGroups = async () => {
            try {
                const res = await getFundingGroups();
                setGroups(res.data || []);
            } catch (error) {
                console.error('Failed to load groups', error);
            }
        };

        const loadTypes = async () => {
            try {
                const res = await getFundingTypes();
                if (res?.data) {
                    setTypes(res.data);
                }
            } catch (error) {
                console.error('Failed to load types', error);
            }
        };

        const loadDocTypes = async () => {
            try {
                const res = await fetchBorrowerDocumentTypes();
                if (res?.data) {
                    const formatted = res.data.map((item: any) => ({ label: item.name, value: item.id }));
                    setAllowedDocumentOptions(formatted);
                }
            } catch (error) {
                console.error('Failed to load document types', error);
            }
        };

        const loadLenders = async () => {
            try {
                const res = await getAllLenders();
                setLendersList(res.data || res);
            } catch (error) {
                console.error('Failed to load lenders', error);
            }
        };

        loadGroups();
        loadTypes();
        loadDocTypes();
        loadLenders();
        
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
                        lender_id: data.lenders && data.lenders.length > 0 ? data.lenders[0].lender_id : null,
                        icon: data.icon || '',
                        icon_color: data.icon_color || 'blue',
                        min_fico: data.lenders?.[0]?.min_fico || '',
                        min_tib_months: data.lenders?.[0]?.min_tib_months || '',
                        min_monthly_revenue: data.lenders?.[0]?.min_monthly_revenue || '',
                        min_monthly_deposits: data.lenders?.[0]?.min_monthly_deposits || '',
                        min_average_daily_balance: data.lenders?.[0]?.min_average_daily_balance || '',
                        max_nsf_count: data.lenders?.[0]?.max_nsf_count || '',
                        max_negative_days: data.lenders?.[0]?.max_negative_days || '',
                        min_dscr: data.lenders?.[0]?.min_dscr || '',
                        sort_order: data.sort_order || '',
                        allowed_states: data.lenders?.[0]?.allowed_states?.length && data.lenders[0].allowed_states[0] !== '' ? data.lenders[0].allowed_states : [],
                        restricted_states: data.lenders?.[0]?.restricted_states?.length && data.lenders[0].restricted_states[0] !== '' ? data.lenders[0].restricted_states : [],
                        allowed_industries: data.lenders?.[0]?.allowed_industries?.length && data.lenders[0].allowed_industries[0] !== '' ? data.lenders[0].allowed_industries : [],
                        restricted_industries: data.lenders?.[0]?.restricted_industries?.length && data.lenders[0].restricted_industries[0] !== '' ? data.lenders[0].restricted_industries : [],
                        require_completed_application: data.lenders?.[0]?.require_completed_application || false,
                        require_documents_uploaded: data.lenders?.[0]?.require_documents_uploaded || false,
                        manual_review_allowed: data.lenders?.[0]?.manual_review_allowed || false,
                        exception_allowed: data.lenders?.[0]?.exception_allowed || false,
                        speed_to_funds: data.speed_to_funds || '',
                        uses: Array.isArray(data.uses) ? data.uses : [],
                        qualify_reasons: Array.isArray(data.qualify_reasons) ? data.qualify_reasons : [],
                        readiness_factors: Array.isArray(data.readiness_factors) ? data.readiness_factors.map((f: any) => typeof f === 'object' ? f.label : f) : [],
                        missing_documents: Array.isArray(data.missing_documents) ? data.missing_documents : [],
                        allowed_documents: Array.isArray(data.lenders?.[0]?.allowed_documents) ? data.lenders[0].allowed_documents : []
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
        ['allowed_states', 'restricted_states', 'allowed_industries', 'restricted_industries', 'uses', 'qualify_reasons', 'missing_documents', 'allowed_documents'].forEach(field => {
            if (Array.isArray(cleanData[field as keyof typeof cleanData])) {
                cleanData[field as keyof typeof cleanData] = (cleanData[field as keyof typeof cleanData] as any[]).filter(item => 
                    (typeof item === 'string' && item.trim() !== '') || typeof item === 'number'
                );
            }
        });

        if (Array.isArray(cleanData.readiness_factors)) {
            cleanData.readiness_factors = cleanData.readiness_factors.filter(item => typeof item === 'string' && item.trim() !== '');
        }

        const unifiedPayload = {
            name: cleanData.name.trim(),
            subtitle: cleanData.subtitle.trim(),
            funding_group_id: cleanData.funding_group_id,
            funding_type_id: cleanData.funding_type_id,
            lender_id: cleanData.lender_id,
            min_amount: cleanData.min_amount,
            max_amount: cleanData.max_amount,
            terms: cleanData.terms.trim(),
            status: cleanData.status,
            action_url: cleanData.action_url.trim(),
            icon: cleanData.icon,
            icon_color: cleanData.icon_color,
            sort_order: cleanData.sort_order ? Number(cleanData.sort_order) : 0,
            description: cleanData.description,
            speed_to_funds: cleanData.speed_to_funds,
            uses: cleanData.uses,
            qualify_reasons: cleanData.qualify_reasons,
            readiness_factors: cleanData.readiness_factors,
            missing_documents: cleanData.missing_documents,
            lenders: [
                {
                    lender_id: cleanData.lender_id,
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
                    allowed_documents: cleanData.allowed_documents,
                    manual_review_allowed: cleanData.manual_review_allowed,
                    exception_allowed: cleanData.exception_allowed
                }
            ]
        };

        try {
            if (isEditMode && id) {
                await updateFundingSequencing(id, unifiedPayload);
                toast.success('Funding sequence updated successfully!');
                navigate('/funding');
            } else {
                await createFundingSequencing(unifiedPayload);
                toast.success('Funding sequence created successfully!');
                navigate('/funding');
            }
        } catch (err: any) {
            console.error(err);
            if (err.response?.status === 422) {
                // Clone the object to ensure React triggers a state update
                const mappedErrors = { ...(err.response?.data?.errors || {}) };
                
                // Map all lenders.0.* errors to their base keys
                Object.keys(mappedErrors).forEach(key => {
                    if (key.startsWith('lenders.0.')) {
                        const baseKey = key.replace('lenders.0.', '');
                        mappedErrors[baseKey] = Array.isArray(mappedErrors[key]) ? mappedErrors[key][0] : mappedErrors[key];
                    }
                });

                // Switch to the correct tab based on where the error occurred
                const visibilityKeys = ['min_fico', 'min_tib_months', 'min_monthly_revenue', 'min_monthly_deposits', 'min_average_daily_balance', 'max_nsf_count', 'max_negative_days', 'min_dscr', 'allowed_states', 'restricted_states', 'allowed_industries', 'restricted_industries', 'allowed_documents'];
                const hasVisibilityError = Object.keys(mappedErrors).some(key => visibilityKeys.includes(key));
                const displayKeys = ['name', 'subtitle', 'funding_group_id', 'funding_type_id', 'lender_id', 'min_amount', 'max_amount', 'terms', 'icon', 'icon_color', 'sort_order', 'readiness_factors'];
                const hasDisplayError = Object.keys(mappedErrors).some(key => displayKeys.includes(key));

                if (hasVisibilityError && !hasDisplayError && activeTab === 'display') {
                    setActiveTab('visibility');
                } else if (hasDisplayError && activeTab === 'visibility') {
                    setActiveTab('display');
                }
                setErrors(mappedErrors);
                setTimeout(() => scrollToFirstError(mappedErrors), 100);
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
                                        {/* Title removed per user request */}

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
                                                    className={`nav-link fw-semibold fs-15 px-0 py-2 ${activeTab === 'visibility' ? 'active text-primary border-primary' : 'text-muted border-transparent'} ${!formData.lender_id ? 'opacity-50' : ''}`}
                                                    onClick={() => { if (formData.lender_id) { setActiveTab('visibility'); setErrors({}); } }}
                                                    style={{ cursor: formData.lender_id ? 'pointer' : 'not-allowed', borderBottom: activeTab === 'visibility' ? '2px solid #2563eb' : '2px solid transparent', color: activeTab === 'visibility' ? '#2563eb' : '#64748b' }}
                                                    title={!formData.lender_id ? 'Please select a lender first' : ''}
                                                >
                                                    Visibility Logic {!formData.lender_id && <i className="ri-lock-line ms-1 fs-12"></i>}
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
                                                    <div className="col-lg-6 col-md-6">
                                                        <div className="mb-2">
                                                            <label className="form-label text-dark fw-medium mb-2">Funding Sequence Name <span className="text-danger">*</span></label>
                                                            <input type="text" name="name" className={`form-control rounded-3 py-2 ${(errors as any).name ? 'is-invalid' : ''}`} value={formData.name} onChange={handleChange} placeholder="Borrower-facing display name" />
                                                            {(errors as any).name && <div className="invalid-feedback">{(errors as any).name}</div>}
                                                        </div>
                                                    </div>
                                                    <div className="col-lg-6 col-md-6">
                                                        <div className="mb-2">
                                                            <label className="form-label text-dark fw-medium mb-2">Amount Range <span className="text-danger">*</span></label>
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
                                                    <div className="col-lg-6 col-md-6">
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
                                                                filter
                                                                placeholder="Select group"
                                                                className={`w-100 rounded-3 slim-dropdown ${(errors as any).funding_group_id ? 'p-invalid border-danger' : ''}`}
                                                            />
                                                            {(errors as any).funding_group_id && <small className="text-danger mt-1 d-block">{(errors as any).funding_group_id}</small>}
                                                        </div>
                                                    </div>
                                                    <div className="col-lg-6 col-md-6">
                                                        <div className="mb-2">
                                                            <label className="form-label text-dark fw-medium mb-2">Terms</label>
                                                            <input type="text" name="terms" className={`form-control rounded-3 py-2 ${(errors as any).terms ? 'is-invalid' : ''}`} value={formData.terms} onChange={handleChange} placeholder="e.g. 3–24 months, 12–60 months" />
                                                        </div>
                                                    </div>

                                                    {/* Row 3 */}
                                                    <div className="col-lg-6 col-md-6">
                                                        <div className="mb-2">
                                                            <label className="form-label text-dark fw-medium mb-2">Lender <span className="text-danger">*</span></label>
                                                            <Dropdown
                                                                value={formData.lender_id}
                                                                options={lendersList.filter((l: any) => l.status === STATUS_ACTIVE || l.id === formData.lender_id)}
                                                                onChange={(e) => handleInputChange({ target: { name: 'lender_id', value: e.value } })}
                                                                optionLabel="name"
                                                                optionValue="id"
                                                                filter
                                                                placeholder="Select lender"
                                                                className={`w-100 rounded-3 slim-dropdown ${(errors as any).lender_id ? 'p-invalid border-danger' : ''}`}
                                                            />
                                                            {(errors as any).lender_id && <small className="text-danger mt-1 d-block">{(errors as any).lender_id}</small>}
                                                        </div>
                                                    </div>
                                                    <div className="col-lg-6 col-md-6">
                                                        <div className="mb-2">
                                                            <label className="form-label text-dark fw-medium mb-2">Display Icon <span className="text-danger">*</span></label>
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
                                                    <div className="col-lg-6 col-md-6">
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
                                                                className={`w-100 rounded-3 slim-dropdown ${(errors as any).funding_type_id ? 'p-invalid border-danger' : ''}`}
                                                            />
                                                            {(errors as any).funding_type_id && <small className="text-danger mt-1 d-block">{(errors as any).funding_type_id}</small>}
                                                        </div>
                                                    </div>
                                                    <div className="col-lg-6 col-md-6">
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
                                                                className="w-100 rounded-3 slim-dropdown"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Row 5 */}
                                                    <div className="col-lg-6 col-md-6">
                                                        <div className="mb-2">
                                                            <label className="form-label text-dark fw-medium mb-2">Subtitle <span className="text-danger">*</span></label>
                                                            <input type="text" name="subtitle" className={`form-control rounded-3 py-2 ${(errors as any).subtitle ? 'is-invalid' : ''}`} value={formData.subtitle} onChange={handleChange} placeholder="e.g. Revolving access to working capital" />
                                                            {(errors as any).subtitle && <div className="invalid-feedback">{(errors as any).subtitle}</div>}
                                                        </div>
                                                    </div>
                                                    <div className="col-lg-6 col-md-6">
                                                        <div className="mb-2">
                                                            <label className="form-label text-dark fw-medium mb-2">Display Order</label>
                                                            <input type="number" name="sort_order" className={`form-control rounded-3 py-2 ${(errors as any).sort_order ? 'is-invalid' : ''}`} value={formData.sort_order} onChange={handleChange} placeholder="e.g. 1" />
                                                            {(errors as any).sort_order && <div className="invalid-feedback">{(errors as any).sort_order}</div>}
                                                        </div>
                                                    </div>

                                                    {/* Row 6 */}
                                                    <div className="col-lg-6 col-md-6">
                                                        <div className="mb-2">
                                                            <label className="form-label text-dark fw-medium mb-2">Action URL</label>
                                                            <input type="text" name="action_url" className={`form-control rounded-3 py-2 ${(errors as any).action_url ? 'is-invalid' : ''}`} value={formData.action_url} onChange={handleChange} placeholder="e.g. https://example.com/apply" />
                                                            {(errors as any).action_url && <div className="invalid-feedback">{(errors as any).action_url}</div>}
                                                        </div>
                                                    </div>
                                                    <div className="col-lg-6 col-md-6">
                                                        <div className="mb-2">
                                                            <label className="form-label text-dark fw-medium mb-2">Uses</label>
                                                            <MultiSelect
                                                                value={formData.uses}
                                                                options={USES_OPTIONS}
                                                                onChange={(e) => handleInputChange({ target: { name: 'uses', value: e.value } })}
                                                                optionLabel="label"
                                                                optionValue="value"
                                                                placeholder="Select uses..."
                                                                className="w-100 rounded-3 slim-multiselect"
                                                                display="chip"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Row 7 */}
                                                    <div className="col-lg-6 col-md-6">
                                                        <div className="mb-2">
                                                            <label className="form-label text-dark fw-medium mb-2">Status</label>
                                                            <Dropdown
                                                                value={formData.status}
                                                                options={FUNDING_STATUS_OPTIONS}
                                                                onChange={(e) => handleInputChange({ target: { name: 'status', value: e.value } })}
                                                                optionLabel="label"
                                                                optionValue="value"
                                                                className={`w-100 rounded-3 slim-dropdown ${(errors as any).status ? 'p-invalid border-danger' : ''}`}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="col-lg-6 col-md-6">
                                                        <div className="mb-2">
                                                            <label className="form-label text-dark fw-medium mb-2">Speed to Funds</label>
                                                            <input type="text" name="speed_to_funds" className={`form-control rounded-3 py-2 ${(errors as any).speed_to_funds ? 'is-invalid' : ''}`} value={formData.speed_to_funds} onChange={handleChange} placeholder="e.g. 1 - 7 Days" />
                                                            {(errors as any).speed_to_funds && <div className="invalid-feedback">{(errors as any).speed_to_funds}</div>}
                                                        </div>
                                                    </div>

                                                    {/* Row 7: Readiness Factors */}
                                                    <div className="col-lg-12">
                                                        <div className="card shadow-sm border rounded-3 mt-4 mb-2">
                                                            <div className="card-header bg-light border-bottom py-3">
                                                                <h6 className="card-title mb-0 fw-bold text-dark">Readiness Factors <span className="text-danger">*</span></h6>
                                                            </div>
                                                            <div className="card-body p-4">
                                                                <div className="row g-4">
                                                                    <div className="col-lg-12">
                                                                        <div className="mb-3">
                                                                            <Dropdown
                                                                                options={READINESS_FACTORS_OPTIONS.filter(t => !formData.readiness_factors.includes(t)).map(t => ({ label: t, value: t }))}
                                                                                onChange={(e) => {
                                                                                    if (e.value) {
                                                                                        setFormData(prev => ({
                                                                                            ...prev,
                                                                                            readiness_factors: [...prev.readiness_factors, e.value]
                                                                                        }));
                                                                                    }
                                                                                }}
                                                                                placeholder="Select Requirement to Add"
                                                                                className={`w-100 ${(errors as any).readiness_factors ? 'p-invalid border-danger' : ''}`}
                                                                                value={null}
                                                                                emptyMessage="All requirements added"
                                                                            />
                                                                            {(errors as any).readiness_factors && <div className="text-danger mt-1 fs-13">{(errors as any).readiness_factors}</div>}
                                                                        </div>
                                                                        <div className="d-flex flex-column gap-2 mb-3">
                                                                            {formData.readiness_factors.map((item, index) => (
                                                                                <div key={index} className="d-flex align-items-center justify-content-between p-2 border border-light-subtle rounded bg-white shadow-sm transition">
                                                                                    <div className="d-flex align-items-center gap-2">
                                                                                        <i className="ri-checkbox-circle-line text-primary fs-18"></i>
                                                                                        <span className="fw-medium text-dark fs-13">{typeof item === 'string' ? item : ((item as any)?.label || '')}</span>
                                                                                    </div>
                                                                                    <div className="d-flex align-items-center gap-2">
                                                                                        <button type="button" className="btn btn-sm btn-ghost-danger p-1 lh-1 rounded" onClick={() => removeArrayItem('readiness_factors', index)}>
                                                                                            <i className="ri-close-line fs-16"></i>
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                            {formData.readiness_factors.length === 0 && (
                                                                                <div className={`fs-13 py-3 px-3 rounded border text-center border-dashed mt-2 ${(errors as any).readiness_factors ? 'border-danger bg-danger-subtle text-danger' : 'text-muted bg-light'}`}>
                                                                                    No readiness factors added yet. Select from the dropdown above to begin.
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Full Width Row 8 */}
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
                                                            <div className="input-group">
                                                                <input type="number" name="min_fico" className={`form-control rounded-start-3 py-2 ${(errors as any).min_fico ? 'is-invalid border-danger' : ''}`} value={formData.min_fico} onChange={handleChange} placeholder="None" />
                                                                <span className={`input-group-text bg-light text-muted rounded-end-3 px-3 ${(errors as any).min_fico ? 'border-danger text-danger' : ''}`}>FICO</span>
                                                            </div>
                                                            {(errors as any).min_fico && <div className="text-danger mt-1 fs-13">{(errors as any).min_fico}</div>}
                                                        </div>

                                                        <div className="mb-4">
                                                            <label className="form-label text-dark fw-medium mb-2">Minimum Time in Business <span className="text-danger">*</span></label>
                                                            <div className="input-group">
                                                                <input type="number" name="min_tib_months" className={`form-control rounded-start-3 py-2 ${(errors as any).min_tib_months ? 'is-invalid border-danger' : ''}`} value={formData.min_tib_months} onChange={handleChange} placeholder="None" />
                                                                <span className={`input-group-text bg-light text-muted rounded-end-3 px-3 ${(errors as any).min_tib_months ? 'border-danger text-danger' : ''}`}>months</span>
                                                            </div>
                                                            {(errors as any).min_tib_months && <div className="text-danger mt-1 fs-13">{(errors as any).min_tib_months}</div>}
                                                        </div>

                                                        <div className="mb-4">
                                                            <label className="form-label text-dark fw-medium mb-2">Minimum Monthly Revenue <span className="text-danger">*</span></label>
                                                            <div className="input-group">
                                                                <span className={`input-group-text bg-white text-muted rounded-start-3 pe-2 border-end-0 ${(errors as any).min_monthly_revenue ? 'border-danger text-danger' : ''}`}>$</span>
                                                                <input type="number" name="min_monthly_revenue" className={`form-control py-2 ps-1 border-start-0 ${(errors as any).min_monthly_revenue ? 'is-invalid border-danger' : ''}`} value={formData.min_monthly_revenue} onChange={handleChange} placeholder="None" />
                                                                <span className={`input-group-text bg-light text-muted rounded-end-3 px-3 ${(errors as any).min_monthly_revenue ? 'border-danger text-danger' : ''}`}>/ mo</span>
                                                            </div>
                                                            {(errors as any).min_monthly_revenue && <div className="text-danger mt-1 fs-13">{(errors as any).min_monthly_revenue}</div>}
                                                        </div>

                                                        <div className="mb-4">
                                                            <label className="form-label text-dark fw-medium mb-2">Minimum Monthly Deposits <span className="text-danger">*</span></label>
                                                            <div className="input-group">
                                                                <span className={`input-group-text bg-white text-muted rounded-start-3 pe-2 border-end-0 ${(errors as any).min_monthly_deposits ? 'border-danger text-danger' : ''}`}>$</span>
                                                                <input type="number" name="min_monthly_deposits" className={`form-control py-2 ps-1 border-start-0 ${(errors as any).min_monthly_deposits ? 'is-invalid border-danger' : ''}`} value={formData.min_monthly_deposits} onChange={handleChange} placeholder="None" />
                                                                <span className={`input-group-text bg-light text-muted rounded-end-3 px-3 ${(errors as any).min_monthly_deposits ? 'border-danger text-danger' : ''}`}>/ mo</span>
                                                            </div>
                                                            {(errors as any).min_monthly_deposits && <div className="text-danger mt-1 fs-13">{(errors as any).min_monthly_deposits}</div>}
                                                        </div>

                                                        <div className="mb-4">
                                                            <label className="form-label text-dark fw-medium mb-2">Minimum Average Daily Balance <span className="text-danger">*</span></label>
                                                            <div className="input-group">
                                                                <span className={`input-group-text bg-white text-muted rounded-start-3 pe-2 border-end-0 ${(errors as any).min_average_daily_balance ? 'border-danger text-danger' : ''}`}>$</span>
                                                                <input type="number" name="min_average_daily_balance" className={`form-control rounded-end-3 py-2 ps-1 border-start-0 ${(errors as any).min_average_daily_balance ? 'is-invalid border-danger' : ''}`} value={formData.min_average_daily_balance} onChange={handleChange} placeholder="None" />
                                                            </div>
                                                            {(errors as any).min_average_daily_balance && <div className="text-danger mt-1 fs-13">{(errors as any).min_average_daily_balance}</div>}
                                                        </div>

                                                        <div className="mb-4">
                                                            <label className="form-label text-dark fw-medium mb-2">Maximum NSF Count</label>
                                                            <div className="input-group">
                                                                <input type="number" name="max_nsf_count" className={`form-control rounded-start-3 py-2 ${(errors as any).max_nsf_count ? 'is-invalid border-danger' : ''}`} value={formData.max_nsf_count} onChange={handleChange} placeholder="None" />
                                                                <span className={`input-group-text bg-light text-muted rounded-end-3 px-3 ${(errors as any).max_nsf_count ? 'border-danger text-danger' : ''}`}>per period</span>
                                                            </div>
                                                            {(errors as any).max_nsf_count && <div className="text-danger mt-1 fs-13">{(errors as any).max_nsf_count}</div>}
                                                        </div>

                                                        <div className="mb-4">
                                                            <label className="form-label text-dark fw-medium mb-2">Maximum Negative Days</label>
                                                            <div className="input-group">
                                                                <input type="number" name="max_negative_days" className={`form-control rounded-start-3 py-2 ${(errors as any).max_negative_days ? 'is-invalid border-danger' : ''}`} value={formData.max_negative_days} onChange={handleChange} placeholder="None" />
                                                                <span className={`input-group-text bg-light text-muted rounded-end-3 px-3 ${(errors as any).max_negative_days ? 'border-danger text-danger' : ''}`}>days</span>
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
                                                                value={formData.restricted_states}
                                                                options={stateOptions}
                                                                onChange={(e) => handleInputChange({ target: { name: 'restricted_states', value: e.value } })}
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
                                                                value={formData.allowed_industries}
                                                                options={industryTypes}
                                                                onChange={(e) => handleInputChange({ target: { name: 'allowed_industries', value: e.value } })}
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
                                                                value={formData.restricted_industries}
                                                                options={industryTypes}
                                                                onChange={(e) => handleInputChange({ target: { name: 'restricted_industries', value: e.value } })}
                                                                optionLabel="label"
                                                                optionValue="value"
                                                                placeholder="Hard stop - blocked (e.g. Real Estate)"
                                                                className="w-100 rounded-3 slim-multiselect"
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
                                                            <div className="form-check form-switch form-switch-md form-switch-primary ms-3" style={{ transform: 'scale(1.2)', transformOrigin: 'right' }}>
                                                                <input className="form-check-input" type="checkbox" role="switch" name="require_completed_application" checked={formData.require_completed_application} onChange={handleInputChange} />
                                                            </div>
                                                        </div>

                                                        <div className="d-flex align-items-center justify-content-between mb-4">
                                                            <div>
                                                                <label className="form-label text-dark fw-medium mb-0">Require Documents Uploaded</label>
                                                                <p className="text-muted fs-13 mb-0">Documents must be uploaded before sequence is active</p>
                                                            </div>
                                                            <div className="form-check form-switch form-switch-md form-switch-primary ms-3" style={{ transform: 'scale(1.2)', transformOrigin: 'right' }}>
                                                                <input className="form-check-input" type="checkbox" role="switch" name="require_documents_uploaded" checked={formData.require_documents_uploaded} onChange={(e) => {
                                                                    handleInputChange(e);
                                                                    if (!e.target.checked) {
                                                                        setFormData(prev => ({ ...prev, allowed_documents: [] }));
                                                                    }
                                                                }} />
                                                            </div>
                                                        </div>

                                                        {formData.require_documents_uploaded && (
                                                            <div className="mb-4">
                                                                <label className="form-label text-dark fw-medium mb-2">Allowed Documents <span className="text-danger">*</span></label>
                                                                <MultiSelect
                                                                    value={formData.allowed_documents}
                                                                    options={allowedDocumentOptions}
                                                                    onChange={(e) => handleInputChange({ target: { name: 'allowed_documents', value: e.value } })}
                                                                    optionLabel="label"
                                                                    optionValue="value"
                                                                    display="chip"
                                                                    placeholder="Select required documents"
                                                                    className={`w-100 rounded-3 slim-multiselect ${(errors as any).allowed_documents ? 'p-invalid border-danger' : ''}`}
                                                                />
                                                                {(errors as any).allowed_documents && <small className="text-danger mt-1 d-block">{(errors as any).allowed_documents}</small>}
                                                            </div>
                                                        )}

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
