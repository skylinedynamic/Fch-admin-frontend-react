import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { useCreateResource, useUpdateResource, useGroupedResources } from '../../modules/resource/queries';
import { getResourceNextId } from '../../modules/resource/services';
import { ResourceItem, ResourceFormData } from '../../modules/resource/types';
import { toast } from 'react-toastify';
import { FileManagerModal } from '../../components/FileManagerModal/FileManagerModal';
import { RESOURCE_TYPE_OPTIONS, TYPES_REQUIRING_FILE, TYPES_REQUIRING_LINK, RESOURCE_ICONS } from '../../utils/resourceConfig';
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
                    providers: resource.providers || [],
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
        setFormData(prev => ({ ...prev, providers: [...(prev.providers || []), { name: '', desc: '', is_recommended: false, btn_label: 'Get Started', link: '' }] }));

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
            if (err.response?.status === 422 && err.response?.data?.errors) {
                setValidationErrors(err.response.data.errors);
            } else {
                toast.error(err.response?.data?.message || 'Action failed');
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
            <style>{`
                .p-dropdown .p-dropdown-label {
                    display: flex !important;
                    align-items: center !important;
                    padding-top: 0 !important;
                    padding-bottom: 0 !important;
                }
                .p-dropdown {
                    display: flex !important;
                    align-items: center !important;
                }
            `}</style>
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
                                                <button type="button" className="form-control d-flex align-items-center gap-2 text-start" onClick={() => { setShowIconDropdown(p => !p); setIconSearch(''); }}>
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
                                            <label htmlFor="subtitle" className="form-label">{isBusinessService ? 'Short Description' : 'Subtitle'}</label>
                                            <textarea className={`form-control ${validationErrors.subtitle ? 'is-invalid' : ''}`} id="subtitle" name="subtitle" rows={2} placeholder="Enter a brief description" value={formData.subtitle} onChange={handleInputChange}></textarea>
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
                                                        <div className={`d-flex align-items-center justify-content-between p-3 border rounded cursor-pointer bg-light ${validationErrors.file ? 'border-danger' : ''}`} onClick={() => setShowFileManager(true)}>
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
                                            <div className="row g-3 mt-3">
                                                {/* Overview Points */}
                                                <div className="col-lg-6">
                                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                                        <label className="form-label mb-0">
                                                            Overview
                                                        </label>
                                                        <button type="button" className="btn btn-sm btn-link text-primary text-decoration-underline p-0" onClick={() => addArrayItem('overview')}>
                                                            + Add Point
                                                        </button>
                                                    </div>
                                                    {(formData.overview || []).length === 0 && (
                                                        <div className="text-center py-3 bg-light rounded border">
                                                            <p className="text-muted fs-13 mb-0">No overview points added. Click "Add Point" to begin.</p>
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
                                                                    placeholder="Enter overview point..."
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
                                                    <div className="d-flex align-items-center justify-content-between mb-3">
                                                        <label className="form-label mb-0">
                                                            Why It Matters
                                                        </label>
                                                        <button type="button" className="btn btn-sm btn-link text-warning text-decoration-underline p-0" onClick={() => addArrayItem('impact')}>
                                                            + Add Point
                                                        </button>
                                                    </div>
                                                    {(formData.impact || []).length === 0 && (
                                                        <div className="text-center py-3 bg-light rounded border">
                                                            <p className="text-muted fs-13 mb-0">No impact points added. Click "Add Impact" to begin.</p>
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
                                                                    placeholder="Enter impact point..."
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
                                                                        <input type="text" className="form-control" value={p.name} onChange={(e) => handleProviderChange(idx, 'name', e.target.value)} placeholder="e.g. Acme Corp" />
                                                                    </div>

                                                                    <div className="col-12">
                                                                        <label className="form-label">Short Description</label>
                                                                        <textarea className="form-control" rows={2} value={p.desc} onChange={(e) => handleProviderChange(idx, 'desc', e.target.value)} placeholder="Brief description of services offered..."></textarea>
                                                                    </div>
                                                                    <div className="col-12">
                                                                        <label className="form-label">Button Label</label>
                                                                        <input type="text" className="form-control" value={p.btn_label} onChange={(e) => handleProviderChange(idx, 'btn_label', e.target.value)} placeholder="Get Started" />
                                                                    </div>

                                                                    <div className="col-12">
                                                                        <label className="form-label">Button URL</label>
                                                                        <div className="input-group">
                                                                            <span className="input-group-text bg-light"><i className="ri-link"></i></span>
                                                                            <input type="text" className="form-control" value={p.link} onChange={(e) => handleProviderChange(idx, 'link', e.target.value)} placeholder="https://..." />
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
                toggle={() => setShowFileManager(!showFileManager)}
                selectionMode={true}
                entityType="resources"
                entityId={id || nextId || '0'}
                initialPath={formData.file && typeof formData.file === 'string' ? formData.file.split('/').slice(0, -1).join('/') || '/' : '/'}
                onSelectFiles={(files) => {
                    if (files && files.length > 0) {
                        setFormData(prev => ({ ...prev, file: files[0].path }));
                        setFileOptions(null);
                        if (validationErrors['file']) setValidationErrors(prev => ({ ...prev, file: [] }));
                    }
                }}
                section="Resources"
                getAll={true}
            />
        </div>
    );
};

export default ResourceForm;
