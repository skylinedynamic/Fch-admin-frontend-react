import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { useCreateResource, useUpdateResource, useGroupedResources } from '../../modules/resource/queries';
import { getResourceNextId } from '../../modules/resource/services';
import { ResourceItem, ResourceFormData } from '../../modules/resource/types';
import { toast } from 'react-toastify';
import { FileManagerModal } from '../../components/FileManagerModal/FileManagerModal';
import { RESOURCE_TYPE_OPTIONS, TYPES_REQUIRING_FILE, TYPES_REQUIRING_LINK, RESOURCE_ICONS } from '../../utils/resourceConfig';
import { buildStorageUrl } from '../../utils/imageHelpers';
import { Dropdown } from 'primereact/dropdown';
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import ResourceFormLoader from '../../components/Loader/ResourceFormLoader';

const ResourceForm: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const isEdit = !!id;

    const { data: groupedData } = useGroupedResources();
    const createMutation = useCreateResource();
    const updateMutation = useUpdateResource();

    const [isLoading, setIsLoading] = useState(isEdit);
    const [showFileManager, setShowFileManager] = useState(false);
    const [nextId, setNextId] = useState<number | string>('0');
    const [showIconDropdown, setShowIconDropdown] = useState(false);
    const [iconSearch, setIconSearch] = useState('');
    const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
    const [fileOptions, setFileOptions] = useState<File | null>(null);
    const [activeProviderLogoIdx, setActiveProviderLogoIdx] = useState<number | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState<ResourceFormData>({
        resource_type: location.state?.type || 'legal_registration',
        title: '',
        subtitle: '',
        icon: '',
        is_partner: false,
        is_borrower: false,
        link: '',
        status: true,
        overview: [],
        impact: [],
        overview_text: '',
        impact_text: '',
        providers: [],
    });

    useEffect(() => {
        if (!isEdit) {
            getResourceNextId().then(res => { if (res?.next_id) setNextId(res.next_id); }).catch(() => setNextId('0'));
        }
    }, [isEdit]);

    useEffect(() => {
        if (isEdit && groupedData?.data) {
            let resource: ResourceItem | undefined;
            for (const cat in groupedData.data) {
                resource = (groupedData.data as any)[cat].find((r: ResourceItem) => r.id === parseInt(id!));
                if (resource) break;
            }
            if (resource) {
                setFormData({
                    resource_type: resource.resource_type,
                    title: resource.title,
                    subtitle: resource.subtitle || '',
                    icon: resource.icon || '',
                    is_partner: resource.is_partner,
                    is_borrower: resource.is_borrower,
                    link: resource.link || '',
                    status: resource.status,
                    file: (resource as any).file || '',
                    overview: resource.overview || [],
                    impact: resource.impact || [],
                    overview_text: resource.overview_text || '',
                    impact_text: resource.impact_text || '',
                    providers: (resource.providers || []).map((p: any) => ({
                        ...p,
                        logo: p.actual_path || p.logo
                    })),
                });
                setIsLoading(false);
            }
        }
    }, [isEdit, id, groupedData]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowIconDropdown(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const isFileRequired = TYPES_REQUIRING_FILE.includes(formData.resource_type);
    const isLinkRequired = TYPES_REQUIRING_LINK.includes(formData.resource_type);
    const isBusinessService = formData.resource_type === 'business_services';

    const handleInputChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        if (validationErrors[name]) setValidationErrors(prev => ({ ...prev, [name]: [] }));
    };

    const handleArrayChange = (field: 'overview' | 'impact', index: number, value: string) => {
        setFormData(prev => { const arr = [...(prev[field] || [])]; arr[index] = value; return { ...prev, [field]: arr }; });
    };

    const addArrayItem = (field: 'overview' | 'impact') =>
        setFormData(prev => ({ ...prev, [field]: [...(prev[field] || []), ''] }));

    const removeArrayItem = (field: 'overview' | 'impact', index: number) =>
        setFormData(prev => ({ ...prev, [field]: (prev[field] || []).filter((_, i) => i !== index) }));

    const handleProviderChange = (index: number, field: string, value: any) => {
        setFormData(prev => {
            const providers = [...(prev.providers || [])];
            providers[index] = { ...providers[index], [field]: value };
            return { ...prev, providers };
        });
    };

    const addProvider = () =>
        setFormData(prev => ({ ...prev, providers: [...(prev.providers || []), { name: '', desc: '', desc_list: [], logo: '', is_recommended: false, btn_label: 'Get Started', link: '' }] }));

    const removeProvider = (index: number) =>
        setFormData(prev => ({ ...prev, providers: (prev.providers || []).filter((_, i) => i !== index) }));

    const onSubmit = async () => {
        setValidationErrors({});
        try {
            const submitData = { ...formData };
            if (fileOptions) submitData.file = fileOptions;
            if (isEdit) {
                await updateMutation.mutateAsync({ id: parseInt(id!), data: submitData });
                toast.success('Resource updated successfully');
            } else {
                await createMutation.mutateAsync(submitData);
                toast.success('Resource created successfully');
            }
            navigate('/resources');
        } catch (err: any) {
            const resp = err.response;
            const data = resp?.data;
            let msg = 'Action failed';

            if (typeof data === 'string') {
                msg = data;
            } else if (data?.message) {
                msg = data.message;
            } else if (err.message) {
                msg = err.message;
            }

            if (resp?.status === 422 && data?.errors) {
                setValidationErrors({ ...data.errors, general: [msg] });
            } else {
                setValidationErrors({ general: [msg] });
            }
        }
    };


    if (isLoading && isEdit) {
        return (
            <div className="page-content">
                <ResourceFormLoader />
            </div>
        );
    }

    return (
        <div className="page-content">

            <div className="container-fluid">
                {/* Page Header */}
                <div className="row page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-lg-center flex-lg-row flex-column py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">{isEdit ? 'Edit Resource' : 'Add Resource'} Details</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item"><Link to="/resources">Resources</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">{isEdit ? 'Edit Resource' : 'Add Resource'}</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
                                <Link to="/resources" className="btn btn-outline-secondary w-lg waves-effect">
                                    <i className="ri-arrow-left-line align-middle me-1"></i> Back
                                </Link>
                                <button type="button" className="btn btn-primary w-lg waves-effect" onClick={onSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                                    {(createMutation.isPending || updateMutation.isPending)
                                        ? <><span className="spinner-border spinner-border-sm me-1" role="status"></span>{isEdit ? 'Updating...' : 'Saving...'}</>
                                        : <><i className="ri-save-3-line align-middle me-1"></i>{isEdit ? 'Update' : 'Save'}</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    {/* Main Form col-8 */}
                    <div className="col-lg-8">
                        <div className="card">
                            <div className="card-body p-4">
                                <form onSubmit={(e) => e.preventDefault()}>
                                    {validationErrors.general && (
                                        <div className="col-12 mb-4">
                                            <div className="form-control is-invalid border-danger bg-danger-subtle p-3 text-danger fw-medium d-flex align-items-center gap-3">
                                                <i className="ri-error-warning-fill fs-20"></i>
                                                <div className="flex-grow-1">
                                                    <span className="d-block fs-14 fw-bold mb-1 text-uppercase">Server Error</span>
                                                    <span className="d-block fs-13 lh-base">{validationErrors.general[0]}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Resource Information */}
                                    <div className="col-12">
                                        <h5 className="text-primary fs-16">Resource Information</h5>
                                        <hr className="mt-1" />
                                    </div>

                                    <div className="row g-3">
                                        <div className="col-lg-6">
                                            <label className="form-label">Resource Type <span className="text-danger">*</span></label>
                                            <Dropdown
                                                value={formData.resource_type}
                                                options={RESOURCE_TYPE_OPTIONS}
                                                onChange={(e) => {
                                                    const newType = e.value;
                                                    setFormData({
                                                        resource_type: newType,
                                                        title: '',
                                                        subtitle: '',
                                                        icon: '',
                                                        is_partner: false,
                                                        is_borrower: false,
                                                        link: '',
                                                        status: true,
                                                        overview: [],
                                                        impact: [],
                                                        overview_text: '',
                                                        impact_text: '',
                                                        providers: [],
                                                    });
                                                }}
                                                placeholder="Select Resource Type"
                                                className={`w-100 ${validationErrors.resource_type ? 'p-invalid' : ''}`}
                                                appendTo="self"
                                                style={{ display: 'flex', alignItems: 'center' }}
                                            />
                                            {validationErrors.resource_type && <small className="p-error d-block mt-1">{validationErrors.resource_type}</small>}
                                        </div>

                                        <div className="col-lg-6">
                                            <label className="form-label">Display Icon</label>
                                            <div className="position-relative" ref={dropdownRef}>
                                                <button type="button" className="display-icon-btn form-control d-flex align-items-center gap-2 text-start" onClick={() => { setShowIconDropdown(p => !p); setIconSearch(''); }}>
                                                    {formData.icon ? <i className={`${formData.icon} fs-16 text-primary`}></i> : <i className="ri-image-line text-muted"></i>}
                                                    <span className="fs-13 flex-grow-1 text-truncate">{RESOURCE_ICONS.find(i => i.value === formData.icon)?.label || 'Select an icon...'}</span>
                                                    <i className="ri-arrow-down-s-line text-muted ms-auto"></i>
                                                </button>
                                                {showIconDropdown && (
                                                    <div className="position-absolute w-100 bg-white border rounded shadow mt-1" style={{ zIndex: 1055, top: '100%' }}>
                                                        <div className="p-2 border-bottom bg-light">
                                                            <input type="text" className="form-control form-control-sm shadow-none" placeholder="Search icons..." value={iconSearch} onChange={(e) => setIconSearch(e.target.value)} autoFocus />
                                                        </div>
                                                        <div className="overflow-auto" style={{ maxHeight: '200px' }}>
                                                            {RESOURCE_ICONS.filter(ico => !iconSearch || ico.label.toLowerCase().includes(iconSearch.toLowerCase())).map((ico) => (
                                                                <button key={ico.value} type="button" className={`dropdown-item d-flex align-items-center gap-3 py-2 px-3 ${formData.icon === ico.value ? 'bg-primary-subtle text-primary' : ''}`} onClick={() => { setFormData(p => ({ ...p, icon: ico.value })); setShowIconDropdown(false); }}>
                                                                    <i className={`${ico.value} fs-16`}></i><span className="fs-13">{ico.label}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="col-lg-12">
                                            <label htmlFor="title" className="form-label">Title <span className="text-danger">*</span></label>
                                            <input type="text" className={`form-control ${validationErrors.title ? 'is-invalid' : ''}`} id="title" name="title" placeholder="Enter resource title" value={formData.title} onChange={handleInputChange} />
                                            {validationErrors.title && <div className="invalid-feedback">{validationErrors.title}</div>}
                                        </div>

                                        <div className="col-lg-12">
                                            <label htmlFor="subtitle" className="form-label">Subtitle</label>
                                            <input type="text" className={`form-control ${validationErrors.subtitle ? 'is-invalid' : ''}`} id="subtitle" name="subtitle" placeholder="Enter subtitle" value={formData.subtitle} onChange={handleInputChange} />
                                            {validationErrors.subtitle && <div className="invalid-feedback">{validationErrors.subtitle}</div>}
                                        </div>
                                    </div>

                                    {/* Asset Config */}
                                    {!isBusinessService && (isLinkRequired || isFileRequired) && (
                                        <>
                                            <div className="col-12 mt-4 mb-2">
                                                <h5 className="text-primary fs-16 mb-1">Asset Configuration</h5>
                                                <hr className="mt-1" />
                                            </div>
                                            <div className="row g-3">
                                                {isLinkRequired && (
                                                    <div className="col-lg-12">
                                                        <label htmlFor="link" className="form-label">Resource Link <span className="text-danger">*</span></label>
                                                        <div className="input-group">
                                                            <span className="input-group-text bg-light"><i className="ri-link"></i></span>
                                                            <input type="url" className={`form-control ${validationErrors.link ? 'is-invalid' : ''}`} id="link" name="link" placeholder="https://..." value={formData.link} onChange={handleInputChange} />
                                                            {validationErrors.link && <div className="invalid-feedback">{validationErrors.link}</div>}
                                                        </div>
                                                    </div>
                                                )}
                                                {isFileRequired && (
                                                    <div className="col-lg-12">
                                                        <label className="form-label">Resource Document {!isEdit && <span className="text-danger">*</span>}</label>
                                                        <div className={`d-flex align-items-center justify-content-between p-3 border rounded cursor-pointer bg-light ${validationErrors.file ? 'border-danger' : ''}`} onClick={() => { setActiveProviderLogoIdx(null); setShowFileManager(true); }}>
                                                            <div className="d-flex align-items-center gap-3">
                                                                <i className="ri-file-upload-line fs-24 text-primary"></i>
                                                                <div>
                                                                    <p className="mb-0 fw-medium">{formData.file && typeof formData.file === 'string' ? formData.file.split('/').pop() : 'Choose Document (PDF)...'}</p>
                                                                    <p className="text-muted fs-12 mb-0">Click to select a file</p>
                                                                </div>
                                                            </div>
                                                            <span className="btn btn-sm btn-link text-primary text-decoration-none">Browse</span>
                                                        </div>
                                                        {validationErrors.file && <small className="text-danger d-block mt-1">{validationErrors.file}</small>}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {/* Business Service Fields */}
                                    {isBusinessService && (
                                        <>
                                            <div className="row g-4 mt-3">
                                                {/* Overview */}
                                                <div className="col-lg-6">
                                                    <div className="mb-4">
                                                        <label className="form-label fw-semibold">Overview Description</label>
                                                        <textarea
                                                            className="form-control"
                                                            rows={2}
                                                            name="overview_text"
                                                            value={formData.overview_text}
                                                            onChange={handleInputChange}
                                                            placeholder="Main service overview text..."
                                                        ></textarea>
                                                    </div>

                                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                                        <label className="form-label mb-0">Overview Highlights</label>
                                                        <button type="button" className="btn btn-sm btn-link text-primary text-decoration-underline p-0" onClick={() => addArrayItem('overview')}>
                                                            + Add Point
                                                        </button>
                                                    </div>
                                                    {(formData.overview || []).length === 0 && (
                                                        <div className="text-center py-3 bg-light rounded border border-dashed">
                                                            <p className="text-muted fs-12 mb-0">No highlight points added.</p>
                                                        </div>
                                                    )}
                                                    <div className="vstack gap-2">
                                                        {(formData.overview || []).map((point, idx) => (
                                                            <div key={idx} className="d-flex align-items-center gap-3">
                                                                <span className="text-muted fs-13" style={{ minWidth: '20px' }}>{idx + 1}.</span>
                                                                <input
                                                                    type="text"
                                                                    className="form-control bg-light border-0 shadow-none"
                                                                    value={point}
                                                                    onChange={(e) => handleArrayChange('overview', idx, e.target.value)}
                                                                    placeholder="Enter point..."
                                                                />
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-link text-danger p-0"
                                                                    onClick={() => removeArrayItem('overview', idx)}
                                                                >
                                                                    <i className="ri-delete-bin-line fs-18"></i>
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Why It Matters */}
                                                <div className="col-lg-6">
                                                    <div className="mb-4">
                                                        <label className="form-label fw-semibold">Impact Description</label>
                                                        <textarea
                                                            className="form-control"
                                                            rows={2}
                                                            name="impact_text"
                                                            value={formData.impact_text}
                                                            onChange={handleInputChange}
                                                            placeholder="Main impact explanation text..."
                                                        ></textarea>
                                                    </div>

                                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                                        <label className="form-label mb-0">Impact Highlights</label>
                                                        <button type="button" className="btn btn-sm btn-link text-warning text-decoration-underline p-0" onClick={() => addArrayItem('impact')}>
                                                            + Add Point
                                                        </button>
                                                    </div>
                                                    {(formData.impact || []).length === 0 && (
                                                        <div className="text-center py-3 bg-light rounded border border-dashed">
                                                            <p className="text-muted fs-12 mb-0">No highlight points added.</p>
                                                        </div>
                                                    )}
                                                    <div className="vstack gap-2">
                                                        {(formData.impact || []).map((point, idx) => (
                                                            <div key={idx} className="d-flex align-items-center gap-3">
                                                                <span className="text-muted fs-13" style={{ minWidth: '20px' }}>{idx + 1}.</span>
                                                                <input
                                                                    type="text"
                                                                    className="form-control bg-light border-0 shadow-none"
                                                                    value={point}
                                                                    onChange={(e) => handleArrayChange('impact', idx, e.target.value)}
                                                                    placeholder="Enter point..."
                                                                />
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-link text-danger p-0"
                                                                    onClick={() => removeArrayItem('impact', idx)}
                                                                >
                                                                    <i className="ri-delete-bin-line fs-18"></i>
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Provider Network */}
                                            <div className="col-12 mt-4 mb-2">
                                                <h5 className="text-primary fs-16 mb-1">Add Provider</h5>
                                                <hr className="mt-1" />
                                            </div>
                                            <div className="d-flex justify-content-end mb-3">
                                                <button type="button" className="btn btn-sm btn-link text-success text-decoration-underline p-0" onClick={addProvider}>
                                                    + Add Provider
                                                </button>
                                            </div>
                                            {(formData.providers || []).length === 0 && (
                                                <div className="text-center py-3 bg-light rounded border mb-3">
                                                    <p className="text-muted fs-13 mb-0">No providers added yet. Click "Add Provider" to start.</p>
                                                </div>
                                            )}
                                            <div className="row g-3">
                                                {(formData.providers || []).map((p, idx) => (
                                                    <div key={idx} className="col-lg-6">
                                                        <div className="border rounded overflow-hidden h-100">
                                                            {/* Provider card header */}
                                                            <div className="d-flex align-items-center justify-content-between px-3 py-2 bg-light border-bottom">
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <span className="avatar-xs bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center text-primary fw-bold fs-12 flex-shrink-0" style={{ width: '28px', height: '28px' }}>
                                                                        {idx + 1}
                                                                    </span>
                                                                    <span className="fw-semibold fs-14">{p.name || `Provider ${idx + 1}`}</span>
                                                                    {p.is_recommended && <span className="badge bg-success-subtle text-success fs-10">Recommended</span>}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-link text-danger p-0"
                                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeProvider(idx); }}
                                                                >
                                                                    <i className="ri-delete-bin-line fs-18"></i>
                                                                </button>
                                                            </div>
                                                            {/* Provider card body */}
                                                            <div className="p-3">
                                                                <div className="row g-2">
                                                                    <div className="col-12">
                                                                        <label className="form-label">Provider Name</label>
                                                                        <input type="text" className={`form-control ${validationErrors[`providers.${idx}.name`] ? 'is-invalid' : ''}`} value={p.name} onChange={(e) => handleProviderChange(idx, 'name', e.target.value)} placeholder="e.g. Acme Corp" />
                                                                        {validationErrors[`providers.${idx}.name`] && <div className="invalid-feedback">{validationErrors[`providers.${idx}.name`]}</div>}
                                                                    </div>

                                                                    <div className="col-12">
                                                                        <label className="form-label">Short Description</label>
                                                                        <textarea
                                                                            className="form-control"
                                                                            rows={2}
                                                                            value={p.desc}
                                                                            onChange={(e) => handleProviderChange(idx, 'desc', e.target.value)}
                                                                            placeholder="Brief description of services offered..."
                                                                        ></textarea>
                                                                    </div>

                                                                    <div className="col-12">
                                                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                                                            <label className="form-label mb-0">Description Points</label>
                                                                            <button
                                                                                type="button"
                                                                                className="btn btn-sm btn-link text-primary text-decoration-underline p-0"
                                                                                onClick={() => {
                                                                                    const newList = [...(p.desc_list || []), ''];
                                                                                    handleProviderChange(idx, 'desc_list', newList);
                                                                                }}
                                                                            >
                                                                                + Add Point
                                                                            </button>
                                                                        </div>
                                                                        {(p.desc_list || []).length === 0 && (
                                                                            <div className="text-center py-2 bg-light rounded border border-dashed">
                                                                                <p className="text-muted fs-12 mb-0">No points added yet.</p>
                                                                            </div>
                                                                        )}
                                                                        <div className="vstack gap-2">
                                                                            {(p.desc_list || []).map((point, pIdx) => (
                                                                                <div key={pIdx} className="d-flex align-items-center gap-2">
                                                                                    <span className="text-muted fs-12" style={{ minWidth: '15px' }}>{pIdx + 1}.</span>
                                                                                    <input
                                                                                        type="text"
                                                                                        className="form-control form-control-sm bg-light border-0 shadow-none"
                                                                                        value={point}
                                                                                        onChange={(e) => {
                                                                                            const newList = [...(p.desc_list || [])];
                                                                                            newList[pIdx] = e.target.value;
                                                                                            handleProviderChange(idx, 'desc_list', newList);
                                                                                        }}
                                                                                        placeholder="Enter description point..."
                                                                                    />
                                                                                    <button
                                                                                        type="button"
                                                                                        className="btn btn-sm btn-link text-danger p-0"
                                                                                        onClick={() => {
                                                                                            const newList = (p.desc_list || []).filter((_, i) => i !== pIdx);
                                                                                            handleProviderChange(idx, 'desc_list', newList);
                                                                                        }}
                                                                                    >
                                                                                        <i className="ri-delete-bin-line fs-16"></i>
                                                                                    </button>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                    <div className="col-12">
                                                                        <label className="form-label">Button Label</label>
                                                                        <input type="text" className="form-control" value={p.btn_label} onChange={(e) => handleProviderChange(idx, 'btn_label', e.target.value)} placeholder="Get Started" />
                                                                    </div>

                                                                    <div className="col-12">
                                                                        <label className="form-label">Button URL</label>
                                                                        <div className="input-group has-validation">
                                                                            <span className="input-group-text bg-light"><i className="ri-link"></i></span>
                                                                            <input type="text" className={`form-control ${validationErrors[`providers.${idx}.link`] ? 'is-invalid' : ''}`} value={p.link} onChange={(e) => handleProviderChange(idx, 'link', e.target.value)} placeholder="https://..." />
                                                                            {validationErrors[`providers.${idx}.link`] && <div className="invalid-feedback">{validationErrors[`providers.${idx}.link`]}</div>}
                                                                        </div>
                                                                    </div>

                                                                    <div className="col-12">
                                                                        <label className="form-label">Provider Logo</label>
                                                                        <div className={`d-flex align-items-center justify-content-between p-2 border rounded cursor-pointer bg-light`} onClick={() => { setActiveProviderLogoIdx(idx); setShowFileManager(true); }}>
                                                                            <div className="d-flex align-items-center gap-2 overflow-hidden">
                                                                                {p.logo ? (
                                                                                    <img src={buildStorageUrl(p.logo)} alt="" style={{ width: '28px', height: '28px', objectFit: 'contain' }} className="rounded border bg-white flex-shrink-0" />
                                                                                ) : (
                                                                                    <div className="avatar-xs bg-white rounded border d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '28px', height: '28px' }}>
                                                                                        <i className="ri-image-line text-muted"></i>
                                                                                    </div>
                                                                                )}
                                                                                <div className="overflow-hidden">
                                                                                    <p className="mb-0 fw-medium fs-13 text-truncate">{p.logo ? p.logo.split('/').pop() : 'No logo selected'}</p>
                                                                                    <p className="text-muted fs-11 mb-0 text-truncate">Click to browse (Dimension 180 x 54)</p>
                                                                                </div>
                                                                            </div>
                                                                            <span className="btn btn-sm btn-link text-primary text-decoration-none p-0 flex-shrink-0">Browse</span>
                                                                        </div>
                                                                    </div>

                                                                    <div className="col-12">
                                                                        <div className="form-check form-switch form-switch-md d-flex align-items-center justify-content-between p-3 bg-light rounded">
                                                                            <label className="form-check-label mb-0" htmlFor={`rec_${idx}`}>Mark as Recommended</label>
                                                                            <input className="form-check-input ms-0" type="checkbox" id={`rec_${idx}`} checked={p.is_recommended} onChange={(e) => handleProviderChange(idx, 'is_recommended', e.target.checked)} />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar col-4 */}
                    <div className="col-lg-4">
                        <div className="card">
                            <div className="card-body p-4">
                                <div className="col-12 mb-2">
                                    <h5 className="text-primary fs-16 mb-1">Publishing Settings</h5>
                                    <hr className="mt-1" />
                                </div>
                                <div className="row g-3">
                                    <div className="col-12">
                                        <label className="form-label">Publish Status</label>
                                        <div className="form-check form-switch form-switch-md d-flex align-items-center justify-content-between p-3 bg-light rounded">
                                            <label className="form-check-label mb-0">
                                                {formData.status ? <span className="text-success fw-medium">Published</span> : <span className="text-muted">Unpublished</span>}
                                            </label>
                                            <input className="form-check-input ms-0" type="checkbox" name="status" checked={formData.status} onChange={handleInputChange} />
                                        </div>
                                    </div>
                                </div>

                                <div className="col-12 mt-4 mb-2">
                                    <h5 className="text-primary fs-16 mb-1">Target Audience</h5>
                                    <hr className="mt-1" />
                                </div>
                                <div className="d-flex align-items-center justify-content-around py-2 bg-light rounded-pill mx-2">
                                    <div
                                        className="text-center cursor-pointer d-flex align-items-center gap-2 px-3 py-1 rounded-pill transition-all"
                                        onClick={() => handleInputChange({ target: { name: 'is_partner', value: !formData.is_partner } })}
                                    >
                                        <div className={`avatar-xs rounded-circle d-flex align-items-center justify-content-center fw-bold transition-all ${formData.is_partner ? 'bg-primary text-white shadow-sm' : 'bg-white text-muted border'}`} style={{ width: '28px', height: '28px' }}>
                                            P
                                        </div>
                                        <span className={`fs-12 fw-semibold ${formData.is_partner ? 'text-primary' : 'text-muted'}`}>Partners</span>
                                    </div>

                                    <div className="vr text-muted opacity-25" style={{ height: '20px' }}></div>

                                    <div
                                        className="text-center cursor-pointer d-flex align-items-center gap-2 px-3 py-1 rounded-pill transition-all"
                                        onClick={() => handleInputChange({ target: { name: 'is_borrower', value: !formData.is_borrower } })}
                                    >
                                        <div className={`avatar-xs rounded-circle d-flex align-items-center justify-content-center fw-bold transition-all ${formData.is_borrower ? 'bg-success text-white shadow-sm' : 'bg-white text-muted border'}`} style={{ width: '28px', height: '28px' }}>
                                            B
                                        </div>
                                        <span className={`fs-12 fw-semibold ${formData.is_borrower ? 'text-success' : 'text-muted'}`}>Borrowers</span>
                                    </div>
                                </div>
                                {(validationErrors.is_partner || validationErrors.is_borrower) && (
                                    <div className="text-center mt-2">
                                        <small className="text-danger fw-medium fs-11">Selection required.</small>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <FileManagerModal
                isOpen={showFileManager}
                toggle={() => { setShowFileManager(!showFileManager); if (showFileManager) setActiveProviderLogoIdx(null); }}
                selectionMode={true}
                entityType="resources"
                entityId={id || nextId || '0'}
                initialPath="/"
                onSelectFiles={(files) => {
                    if (files && files.length > 0) {
                        const selectedPath = files[0].path.trim().replace(/^\/+/, '');
                        const fullPath = selectedPath.startsWith('resources/') ? selectedPath : `resources/${selectedPath}`;

                        if (activeProviderLogoIdx !== null) {
                            handleProviderChange(activeProviderLogoIdx, 'logo', fullPath);
                            setActiveProviderLogoIdx(null);
                        } else {
                            setFormData(prev => ({ ...prev, file: fullPath }));
                            setFileOptions(null);
                            if (validationErrors['file']) setValidationErrors(prev => ({ ...prev, file: [] }));
                        }
                        setShowFileManager(false);
                    }
                }}
                section="Resources"
                getAll={true}
            />
        </div>
    );
};

export default ResourceForm;
