import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link, useLocation, useSearchParams } from 'react-router-dom';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { toast } from 'react-toastify';
import FormLoader from '../../../components/Loader/FormLoader';
import { STATUS_ACTIVE } from '../../../config/statusOptions';
import { createFundingSequencing, updateFundingSequencing, updateFundingSequencingDisplay, updateFundingSequencingVisibility, updateFundingSequencingSingleLenderVisibility, updateFundingSequencingSingleCategoryVisibility, getFundingSequencing, getFundingGroups, getFundingTypes } from '../../../modules/funding/services';
import { getAllLenders, getLenderProductCategories } from '../../../modules/lender/services';
import { usePermissions } from '../../../lib/auth/usePermissions';
import { FUNDING_STATUS_OPTIONS, FUNDING_ICON_MAP, FUNDING_COLOR_MAP, USES_OPTIONS, READINESS_FACTOR_STATUS_OPTIONS, READINESS_FACTORS_OPTIONS, DEFAULT_READINESS_FACTORS } from '../../../config/funding';
import { industryTypes } from '../../../config/borrower';
import { locationData } from '../../../config/locations';
import { useSummernote } from '../../../hooks/useSummernote';
import { fetchBorrowerDocumentTypes } from '../../../modules/client/services';
import FundingGroupModal from './FundingGroupModal';
import FundingTypeModal from './FundingTypeModal';
import LenderVisibilityGrid from './LenderVisibilityGrid';
import { scrollToFirstError } from '../../../utils/formUtils';
import '../../../../assets/css/funding.css';

const mapStateCodeToName = (stateArray: any[]) => {
    if (!Array.isArray(stateArray)) return [];
    return stateArray.map(st => {
        if (typeof st === 'string' && locationData.USA.states[st as keyof typeof locationData.USA.states]) {
            return locationData.USA.states[st as keyof typeof locationData.USA.states].name;
        }
        return st;
    });
};

const stateOptions = Object.entries(locationData.USA.states).map(([code, state]) => ({
    label: state.name,
    value: state.name
}));



export default function FundingSequencingForm() {
    const { hasPermission } = usePermissions();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;

    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const isVisibilityRoute = location.pathname.includes('/visibility-rules') || queryParams.get('tab') === 'visibility';
    const [activeTab, setActiveTab] = useState(isVisibilityRoute ? 'visibility' : 'display');

    const lenderMatch = location.pathname.match(/\/lender\/(\d+)/);
    const categoryMatch = location.pathname.match(/\/category\/(\w+)/);

    const urlLenderId = lenderMatch ? lenderMatch[1] : null;
    const activeLenderId = urlLenderId ? parseInt(urlLenderId, 10) : null;

    const urlCategoryId = categoryMatch ? categoryMatch[1] : null;
    const activeCategoryId = urlCategoryId === 'general' ? 'general' : (urlCategoryId ? parseInt(urlCategoryId, 10) : null);

    const setActiveLenderIdAndCategory = (newLenderId: number | null, newCategoryId: string | number | null = null) => {
        if (newLenderId === null) {
            navigate(`/funding/visibility-rules/${id}`);
        } else {
            const catPath = newCategoryId !== null ? `/category/${newCategoryId}` : '';
            navigate(`/funding/visibility-rules/${id}/lender/${newLenderId}${catPath}`);
        }
    };

    const isMasterList = activeTab === 'visibility' && activeLenderId === null;

    // Visibility list page: track selection from the grid to render page-header Actions button
    const [visibilitySelectionCount, setVisibilitySelectionCount] = React.useState(0);
    const [showVisibilityBulkDelete, setShowVisibilityBulkDelete] = React.useState(false);

    useEffect(() => {
        if (isVisibilityRoute) {
            setActiveTab('visibility');
        } else {
            setActiveTab('display');
        }
    }, [location.pathname, location.search, isVisibilityRoute]);

    const handleTabClick = (tabId: string) => {
        if (!isEditMode) return;

        if (tabId === 'visibility') {
            navigate(`/funding/visibility-rules/${id}`);
            setActiveTab('visibility');
        } else {
            navigate(`/funding/${id}`);
            setActiveTab('display');
        }
    };

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(isEditMode);
    const [groups, setGroups] = useState<any[]>([]);
    const [types, setTypes] = useState<any[]>([]);
    const [lendersList, setLendersList] = useState<any[]>([]);
    const [productCategories, setProductCategories] = useState<any[]>([]);
    const [errors, setErrors] = useState<any>({});
    const [allowedDocumentOptions, setAllowedDocumentOptions] = useState<{ label: string, value: string }[]>([]);
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
        max_nsf_negative_days: '', // Deprecated field, remove later if safe
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
        uses: [] as any[],
        readiness_factors: (id ? [] : DEFAULT_READINESS_FACTORS) as any[],
        missing_documents: [] as any[],
        allowed_documents: (id ? [] : [3, 2]) as any[],
        lender_visibilities: [] as any[]
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

        const loadProductCategories = async () => {
            try {
                const res = await getLenderProductCategories();
                setProductCategories(res.data || []);
            } catch (error) {
                console.error('Failed to load product categories', error);
            }
        };

        loadGroups();
        loadTypes();
        loadDocTypes();
        loadLenders();
        loadProductCategories();

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
                        min_deposit_count: data.lenders?.[0]?.min_deposit_count || '',
                        max_nsf_negative_days: '', // Deprecated field, remove later if safe
                        min_dscr: data.lenders?.[0]?.min_dscr || '',
                        sort_order: data.sort_order || '',
                        allowed_states: mapStateCodeToName(data.lenders?.[0]?.allowed_states?.length && data.lenders[0].allowed_states[0] !== '' ? data.lenders[0].allowed_states : []),
                        restricted_states: mapStateCodeToName(data.lenders?.[0]?.restricted_states?.length && data.lenders[0].restricted_states[0] !== '' ? data.lenders[0].restricted_states : []),
                        allowed_industries: data.lenders?.[0]?.allowed_industries?.length && data.lenders[0].allowed_industries[0] !== '' ? data.lenders[0].allowed_industries : [],
                        restricted_industries: data.lenders?.[0]?.restricted_industries?.length && data.lenders[0].restricted_industries[0] !== '' ? data.lenders[0].restricted_industries : [],
                        require_completed_application: data.require_completed_application ?? (data.lenders?.[0]?.require_completed_application || false),
                        require_documents_uploaded: data.require_documents_uploaded ?? (data.lenders?.[0]?.require_documents_uploaded || false),
                        manual_review_allowed: data.manual_review_allowed ?? (data.lenders?.[0]?.manual_review_allowed || false),
                        exception_allowed: data.exception_allowed ?? (data.lenders?.[0]?.exception_allowed || false),
                        speed_to_funds: data.speed_to_funds || '',
                        uses: Array.isArray(data.uses) ? data.uses : [],
                        readiness_factors: Array.isArray(data.readiness_factors) ? data.readiness_factors.map((f: any) => typeof f === 'object' ? f.label : f) : [],
                        missing_documents: Array.isArray(data.missing_documents) ? data.missing_documents : [],
                        allowed_documents: Array.isArray(data.allowed_documents) ? data.allowed_documents : (Array.isArray(data.lenders?.[0]?.allowed_documents) ? data.lenders[0].allowed_documents : []),
                        lender_visibilities: Array.isArray(data.lender_visibilities) && data.lender_visibilities.length > 0
                            ? data.lender_visibilities.map((v: any) => ({
                                ...v,
                                allowed_states: mapStateCodeToName(v.allowed_states),
                                restricted_states: mapStateCodeToName(v.restricted_states)
                            }))
                            : []
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

        const cleanData = { ...formData } as any;
        ['allowed_states', 'restricted_states', 'allowed_industries', 'restricted_industries', 'uses', 'missing_documents', 'allowed_documents'].forEach(field => {
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
            readiness_factors: cleanData.readiness_factors,
            missing_documents: cleanData.missing_documents,
            require_completed_application: cleanData.require_completed_application,
            require_documents_uploaded: cleanData.require_documents_uploaded,
            allowed_documents: cleanData.allowed_documents,
            manual_review_allowed: cleanData.manual_review_allowed,
            exception_allowed: cleanData.exception_allowed,
            lender_visibilities: Array.isArray(cleanData.lender_visibilities)
                ? cleanData.lender_visibilities
                    .filter((v: any) => v.lender_id !== null && v.lender_id !== '')
                    .map((v: any) => ({
                        lender_id: v.lender_id,
                        lender_product_category_id: v.lender_product_category_id || null,
                        min_fico: v.min_fico || null,
                        min_tib_months: v.min_tib_months || null,
                        min_monthly_revenue: v.min_monthly_revenue || null,
                        min_monthly_deposits: v.min_monthly_deposits || null,
                        min_average_daily_balance: v.min_average_daily_balance || null,
                        min_deposit_count: v.min_deposit_count || null,
                        max_nsf_count: v.max_nsf_count || null,
                        max_negative_days: v.max_negative_days || null,
                        min_dscr: v.min_dscr || null,
                        allowed_states: v.allowed_states || [],
                        restricted_states: v.restricted_states || [],
                        allowed_industries: v.allowed_industries || [],
                        restricted_industries: v.restricted_industries || [],
                    }))
                : []
        };
        try {
            if (isEditMode && id) {
                if (activeTab === 'display') {
                    await updateFundingSequencingDisplay(id, unifiedPayload);
                    toast.success('Display settings updated successfully!');
                    setActiveTab('visibility');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else if (id && activeTab === 'visibility') {
                    if (activeLenderId && activeCategoryId !== null) {
                        // Save ONLY the active category's visibility rule
                        const singleCategoryPayload = {
                            ...unifiedPayload,
                            lender_visibilities: unifiedPayload.lender_visibilities.filter((v: any) => {
                                if (String(v.lender_id) !== String(activeLenderId)) return false;
                                const vCatId = v.lender_product_category_id;
                                if (activeCategoryId === 'general') {
                                    return vCatId === null || vCatId === '';
                                } else {
                                    return String(vCatId) === String(activeCategoryId);
                                }
                            })
                        };
                        await updateFundingSequencingSingleCategoryVisibility(id, activeLenderId, activeCategoryId, singleCategoryPayload);
                    } else if (activeLenderId) {
                        // Save ONLY the active lender's visibility rules
                        const singleLenderPayload = {
                            ...unifiedPayload,
                            lender_visibilities: unifiedPayload.lender_visibilities.filter((v: any) => String(v.lender_id) === String(activeLenderId))
                        };
                        await updateFundingSequencingSingleLenderVisibility(id, activeLenderId, singleLenderPayload);
                    } else {
                        // Update all visibilities (usually just deletion/ordering from master list)
                        await updateFundingSequencingVisibility(id, unifiedPayload);
                    }

                    toast.success('Visibility logic updated successfully');
                    navigate(`/funding/visibility-rules/${id}`);
                }
            } else {
                const response = await createFundingSequencing(unifiedPayload);
                toast.success('Funding sequence created successfully!');
                const newId = response?.data?.id || response?.id;
                if (newId && activeTab === 'display') {
                    navigate(`/funding/${newId}?tab=visibility`);
                } else {
                    navigate('/funding');
                }
            }
        } catch (err: any) {
            console.error(err);
            if (err.response?.status === 422) {
                // Clone the object to ensure React triggers a state update
                const mappedErrors = { ...(err.response?.data?.errors || {}) };

                // Map all lenders.0.* errors to their base keys (if any still exist)
                Object.keys(mappedErrors).forEach(key => {
                    if (Array.isArray(mappedErrors[key])) {
                        mappedErrors[key] = mappedErrors[key][0];
                    }
                    if (key.startsWith('lenders.0.')) {
                        const baseKey = key.replace('lenders.0.', '');
                        mappedErrors[baseKey] = mappedErrors[key];
                    }
                });

                // Switch to the correct tab based on where the error occurred
                const visibilityKeys = ['lender_visibilities'];
                const hasVisibilityError = Object.keys(mappedErrors).some(key => key.startsWith('lender_visibilities'));
                const displayKeys = ['name', 'subtitle', 'funding_group_id', 'funding_type_id', 'lender_id', 'min_amount', 'max_amount', 'terms', 'icon', 'icon_color', 'sort_order', 'readiness_factors', 'allowed_documents'];
                const hasDisplayError = Object.keys(mappedErrors).some(key => displayKeys.includes(key));

                if (activeLenderId !== null && hasVisibilityError) {
                    // Build a list of original visibilities indices that were sent to the backend.
                    // We must iterate the UNFILTERED array so that `i` equals the same index
                    // used by renderError in LenderVisibilityGrid's visibilities.map().
                    const sentPayloadIndices: number[] = [];
                    (cleanData.lender_visibilities as any[]).forEach((v: any, i: number) => {
                        // Skip rows with no lender assigned (they are excluded from the sent payload)
                        if (v.lender_id === null || v.lender_id === '') return;
                        // Only include rows for the currently-active lender
                        if (String(v.lender_id) !== String(activeLenderId)) return;
                        // Apply category filter if a specific category is active
                        if (activeCategoryId !== null) {
                            const vCatId = v.lender_product_category_id;
                            if (activeCategoryId === 'general') {
                                if (vCatId !== null && vCatId !== '') return;
                            } else {
                                if (String(vCatId) !== String(activeCategoryId)) return;
                            }
                        }
                        sentPayloadIndices.push(i); // `i` matches visibilities.map index used by renderError
                    });

                    const newMappedErrors: any = {};
                    Object.keys(mappedErrors).forEach(key => {
                        const match = key.match(/^lender_visibilities\.(\d+)\.(.*)$/);
                        if (match) {
                            const backendIndex = parseInt(match[1], 10);
                            const globalIndex = sentPayloadIndices[backendIndex];
                            if (globalIndex !== undefined) {
                                newMappedErrors[`lender_visibilities.${globalIndex}.${match[2]}`] = mappedErrors[key];
                                delete mappedErrors[key]; // Remove the old key
                            }
                        }
                    });

                    // Merge the remapped errors back into mappedErrors
                    Object.assign(mappedErrors, newMappedErrors);
                }

                if (hasVisibilityError) {
                    if (!hasDisplayError && activeTab === 'display') {
                        setActiveTab('visibility');
                    }

                    if (!activeLenderId) {
                        const firstErrorKey = Object.keys(mappedErrors).find(key => key.startsWith('lender_visibilities.'));
                        if (firstErrorKey) {
                            const parts = firstErrorKey.split('.');
                            const index = parseInt(parts[1], 10);
                            if (!isNaN(index) && unifiedPayload.lender_visibilities[index]) {
                                const errorLenderId = unifiedPayload.lender_visibilities[index].lender_id;
                                if (errorLenderId) {
                                    navigate(`/funding/visibility-rules/${id}/lender/${errorLenderId}`);
                                }
                            }
                        }
                    }
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
            <style>{`
                #layout-wrapper, .main-content, .page-content {
                    overflow: clip !important;
                    overflow-x: clip !important;
                }
            `}</style>
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
                                        <li className="breadcrumb-item"><Link to="/funding" className="text-muted">Funding Sequence</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">{isEditMode ? 'Edit' : 'Add'}</li>
                                    </ol>
                                </nav>
                            </div>
                            {!(isVisibilityRoute && activeLenderId === null && !location.pathname.includes('/configuration')) ? (
                                <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
                                    <Link
                                        to={isVisibilityRoute && activeLenderId !== null ? `/funding/visibility-rules/${id}` : '/funding'}
                                        className="btn btn-outline-secondary w-lg waves-effect"
                                    >
                                        <i className="ri-arrow-left-line align-middle me-1"></i> Back
                                    </Link>
                                    <button
                                        type="submit"
                                        form="funding-sequencing-form"
                                        className="btn btn-primary w-lg waves-effect"
                                        disabled={loading || initialLoading}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                {isEditMode ? 'Updating...' : 'Saving...'}
                                            </>
                                        ) : (
                                            <>
                                                <i className="ri-save-3-line align-middle me-1"></i> {isEditMode ? 'Update' : 'Save'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
                                    {visibilitySelectionCount > 0 ? (
                                        <div className="btn-group">
                                            <button type="button" className="btn bg-success text-white fw-medium">Actions</button>
                                            <button type="button" className="btn bg-success text-white fw-medium dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
                                                <span className="visually-hidden">Toggle dropdown</span>
                                            </button>
                                            <ul className="dropdown-menu dropdown-menu-end">
                                                <li>
                                                    <button type="button" className="dropdown-item text-danger" onClick={() => setShowVisibilityBulkDelete(true)}>
                                                        <i className="ri-delete-bin-6-line me-1 align-bottom"></i> Delete Selected
                                                    </button>
                                                </li>
                                            </ul>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            className="btn btn-primary w-lg waves-effect"
                                            onClick={() => navigate(`/funding/visibility-rules/${id}/configuration`)}
                                        >
                                            <i className="ri-add-line align-middle me-1"></i> Add Visibility Logic
                                        </button>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                </div>

                {initialLoading ? (
                    <div className="row">
                        <div className="col-12"><FormLoader count={8} /></div>
                    </div>
                ) : (
                    <form id="funding-sequencing-form" onSubmit={handleSubmit}>
                        <div className="row funding-sequencing-section">
                            <div className="col-lg-12">
                                <div className="card shadow-sm border-0">
                                    <div className="card-header border-bottom-dashed pt-0 pb-0 bg-white">
                                        {/* Title removed per user request */}

                                        {/* Tabs Navigation */}
                                        <ul className="nav nav-tabs-custom mb-0 border-bottom-0" role="tablist">
                                            <li className="nav-item">
                                                <button
                                                    type="button"
                                                    className={`nav-link fw-semibold fs-15 pb-3 ${activeTab === 'display' ? 'active text-primary border-primary border-bottom border-3' : 'text-muted border-transparent'}`}
                                                    onClick={() => handleTabClick('display')}
                                                    style={{ backgroundColor: 'transparent', transition: 'all 0.2s', border: 'none' }}
                                                >
                                                    Display
                                                </button>
                                            </li>
                                            <li className="nav-item">
                                                <button
                                                    type="button"
                                                    className={`nav-link fw-semibold fs-15 pb-3 ${activeTab === 'visibility' ? 'active text-primary border-primary border-bottom border-3' : 'text-muted border-transparent'} ${!isEditMode ? 'opacity-50' : ''}`}
                                                    onClick={() => handleTabClick('visibility')}
                                                    style={{ cursor: !isEditMode ? 'not-allowed' : 'pointer', backgroundColor: 'transparent', transition: 'all 0.2s', border: 'none' }}
                                                    title={!isEditMode ? "Please save the sequence first to unlock visibility logic" : ""}
                                                >
                                                    {!isEditMode && <i className="ri-lock-line align-middle me-1"></i>}
                                                    Visibility Logic
                                                </button>
                                            </li>
                                        </ul>
                                    </div>
                                    <div className="card-body pt-1">
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
                                                                        <input type="number" min="0" onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }} name="min_amount" className={`form-control py-2 ${(errors as any).min_amount ? 'is-invalid border-danger' : ''}`} value={formData.min_amount} onChange={handleChange} placeholder="Min" />
                                                                    </div>
                                                                    {(errors as any).min_amount && <div className="text-danger mt-1 fs-13">{(errors as any).min_amount}</div>}
                                                                </div>
                                                                <div className="text-muted fw-bold mt-2 pt-1">-</div>
                                                                <div className="w-50">
                                                                    <div className="input-group">
                                                                        <span className={`input-group-text bg-light text-muted px-3 ${(errors as any).max_amount ? 'border-danger text-danger' : ''}`}>$</span>
                                                                        <input type="number" min="0" onKeyDown={(e) => { if (e.key === '-' || e.key === 'e') e.preventDefault(); }} name="max_amount" className={`form-control py-2 ${(errors as any).max_amount ? 'is-invalid border-danger' : ''}`} value={formData.max_amount} onChange={handleChange} placeholder="Max" />
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
                                                    {/* Row 4 */}
                                                    <div className="col-lg-6 col-md-6">
                                                        <div className="mb-2">
                                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                                <label className="form-label text-dark fw-medium mb-0">Funding Type <span className="text-danger">*</span></label>
                                                            </div>
                                                            <Dropdown
                                                                value={formData.funding_type_id}
                                                                options={productCategories}
                                                                onChange={(e) => handleInputChange({ target: { name: 'funding_type_id', value: e.value } })}
                                                                optionLabel="name"
                                                                optionValue="id"
                                                                placeholder="Select type"
                                                                className={`w-100 rounded-3 slim-dropdown ${(errors as any).funding_type_id ? 'p-invalid border-danger' : ''}`}
                                                            />
                                                            {(errors as any).funding_type_id && <small className="text-danger mt-1 d-block">{(errors as any).funding_type_id}</small>}
                                                        </div>
                                                    </div>

                                                    {/* Row 3 */}
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
                                                            <label className="form-label text-dark fw-medium mb-2">Terms</label>
                                                            <input type="text" name="terms" className={`form-control rounded-3 py-2 ${(errors as any).terms ? 'is-invalid' : ''}`} value={formData.terms} onChange={handleChange} placeholder="e.g. 3–24 months, 12–60 months" />
                                                        </div>
                                                    </div>
                                                    {/* Row 4 */}
                                                    <div className="col-lg-4 col-md-4">
                                                        <div className="mb-2">
                                                            <label className="form-label text-dark fw-medium mb-2">Display Order</label>
                                                            <input type="number" name="sort_order" className={`form-control rounded-3 py-2 ${(errors as any).sort_order ? 'is-invalid' : ''}`} value={formData.sort_order} onChange={handleChange} placeholder="e.g. 1" />
                                                            {(errors as any).sort_order && <div className="invalid-feedback">{(errors as any).sort_order}</div>}
                                                        </div>
                                                    </div>
                                                    <div className="col-lg-4 col-md-4">
                                                        <div className="mb-2">
                                                            <label className="form-label text-dark fw-medium mb-2">Action URL</label>
                                                            <input type="text" name="action_url" className={`form-control rounded-3 py-2 ${(errors as any).action_url ? 'is-invalid' : ''}`} value={formData.action_url} onChange={handleChange} placeholder="e.g. https://example.com/apply" />
                                                            {(errors as any).action_url && <div className="invalid-feedback">{(errors as any).action_url}</div>}
                                                        </div>
                                                    </div>
                                                    <div className="col-lg-4 col-md-4">
                                                        <div className="mb-2">
                                                            <label className="form-label text-dark fw-medium mb-2">Speed to Funds</label>
                                                            <input type="text" name="speed_to_funds" className={`form-control rounded-3 py-2 ${(errors as any).speed_to_funds ? 'is-invalid' : ''}`} value={formData.speed_to_funds} onChange={handleChange} placeholder="e.g. 1 - 7 Days" />
                                                            {(errors as any).speed_to_funds && <div className="invalid-feedback">{(errors as any).speed_to_funds}</div>}
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
                                                            <label className="form-label text-dark fw-medium mb-2">Status <span className="text-danger">*</span></label>
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

                                                    {/* Review Settings */}
                                                    <div className="col-lg-12 mt-4">
                                                        <hr className="my-2 border-dashed" />
                                                        <h6 className="fw-bold fs-14 mt-3 mb-4 text-uppercase" style={{ letterSpacing: '0.05em', color: '#0f172a' }}>REVIEW SETTINGS</h6>

                                                        <div className="row g-4">
                                                            <div className="col-lg-6">
                                                                <div className="d-flex align-items-center justify-content-between mb-4">
                                                                    <div>
                                                                        <label className="form-label text-dark fw-medium mb-0">Require Completed Fund Application</label>
                                                                        <p className="text-muted fs-13 mb-0">Funding sequence only shown after application is complete</p>
                                                                    </div>
                                                                    <div className="form-check form-switch form-switch-md form-switch-primary ms-3" style={{ transform: 'scale(1.2)', transformOrigin: 'right' }}>
                                                                        <input className="form-check-input" type="checkbox" role="switch" name="require_completed_application" checked={formData.require_completed_application || false} onChange={handleInputChange} />
                                                                    </div>
                                                                </div>
                                                                {(errors as any).require_completed_application && <small className="text-danger mb-4 d-block" style={{ marginTop: '-20px' }}>{(errors as any).require_completed_application}</small>}

                                                                <div className="d-flex align-items-center justify-content-between mb-4">
                                                                    <div>
                                                                        <label className="form-label text-dark fw-medium mb-0">Require Documents Uploaded</label>
                                                                        <p className="text-muted fs-13 mb-0">Documents must be uploaded before sequence is active</p>
                                                                    </div>
                                                                    <div className="form-check form-switch form-switch-md form-switch-primary ms-3" style={{ transform: 'scale(1.2)', transformOrigin: 'right' }}>
                                                                        <input className="form-check-input" type="checkbox" role="switch" name="require_documents_uploaded" checked={formData.require_documents_uploaded || false} onChange={(e) => {
                                                                            handleInputChange(e);
                                                                            if (!e.target.checked) {
                                                                                handleInputChange({ target: { name: 'allowed_documents', value: [] } });
                                                                            }
                                                                        }} />
                                                                    </div>
                                                                </div>
                                                                {(errors as any).require_documents_uploaded && <small className="text-danger mb-4 d-block" style={{ marginTop: '-20px' }}>{(errors as any).require_documents_uploaded}</small>}

                                                                <div style={{ minHeight: '90px', transition: 'all 0.3s ease-in-out' }}>
                                                                    {formData.require_documents_uploaded && (
                                                                        <div className="mb-4">
                                                                            <label className="form-label text-dark fw-medium mb-2">Required Documents <span className="text-danger">*</span></label>
                                                                            <MultiSelect
                                                                                value={formData.allowed_documents || []}
                                                                                options={allowedDocumentOptions}
                                                                                onChange={(e) => handleInputChange({ target: { name: 'allowed_documents', value: e.value } })}
                                                                                optionLabel="label"
                                                                                optionValue="value"
                                                                                display="chip"
                                                                                appendTo="self"
                                                                                placeholder="Select required documents"
                                                                                className={`w-100 rounded-3 slim-multiselect ${(errors as any).allowed_documents ? 'p-invalid border-danger' : ''}`}
                                                                            />
                                                                            {(errors as any).allowed_documents && <small className="text-danger mt-1 d-block">{(errors as any).allowed_documents}</small>}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="col-lg-6">
                                                                <div className="d-flex align-items-center justify-content-between mb-4">
                                                                    <div>
                                                                        <label className="form-label text-dark fw-medium mb-0">Manual Review Allowed</label>
                                                                        <p className="text-muted fs-13 mb-0">Soft misses can be escalated to manual review</p>
                                                                    </div>
                                                                    <div className="form-check form-switch form-switch-md form-switch-primary ms-3" style={{ transform: 'scale(1.2)', transformOrigin: 'right' }}>
                                                                        <input className="form-check-input" type="checkbox" role="switch" name="manual_review_allowed" checked={formData.manual_review_allowed || false} onChange={handleInputChange} />
                                                                    </div>
                                                                </div>

                                                                <div className="d-flex align-items-center justify-content-between mb-4">
                                                                    <div>
                                                                        <label className="form-label text-dark fw-medium mb-0">Exception Allowed</label>
                                                                        <p className="text-muted fs-13 mb-0">Compensating factors can upgrade a soft fail</p>
                                                                    </div>
                                                                    <div className="form-check form-switch form-switch-md form-switch-primary ms-3" style={{ transform: 'scale(1.2)', transformOrigin: 'right' }}>
                                                                        <input className="form-check-input" type="checkbox" role="switch" name="exception_allowed" checked={formData.exception_allowed || false} onChange={handleInputChange} />
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
                                            <div className={`tab-pane ${activeTab === 'visibility' ? 'active' : ''}`} id="visibility" style={{ marginTop: '-1rem' }}>
                                                <LenderVisibilityGrid
                                                    visibilities={formData.lender_visibilities}
                                                    lenders={lendersList}
                                                    errors={errors}
                                                    setVisibilities={(newVisibilities: any[]) => {
                                                        setFormData(prev => ({ ...prev, lender_visibilities: newVisibilities }));
                                                    }}
                                                    setErrors={setErrors}
                                                    stateOptions={stateOptions}
                                                    industryTypes={industryTypes}
                                                    productCategories={productCategories}
                                                    onSelectionChange={setVisibilitySelectionCount}
                                                    onBulkDelete={() => setShowVisibilityBulkDelete(true)}
                                                    externalBulkDelete={showVisibilityBulkDelete}
                                                    onExternalBulkDeleteHandled={() => setShowVisibilityBulkDelete(false)}
                                                />
                                            </div>
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
