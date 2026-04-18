import React, { useState, useEffect, useRef } from 'react';
import Modal from 'bootstrap/js/dist/modal';
import { useCreateResource, useUpdateResource } from '../../modules/resource/queries';
import { getResourceNextId } from '../../modules/resource/services';
import { ResourceItem, ResourceFormData } from '../../modules/resource/types';
import { toast } from 'react-toastify';
import { FileManagerModal } from '../../components/FileManagerModal/FileManagerModal';
import { RESOURCE_TYPE_OPTIONS, TYPES_REQUIRING_FILE, TYPES_REQUIRING_LINK, RESOURCE_ICONS } from '../../utils/resourceConfig';

interface ResourceModalProps {
    show: boolean;
    onHide: () => void;
    resource?: ResourceItem | null;
    type?: string;
}

export default function ResourceModal({ show, onHide, resource, type }: ResourceModalProps) {
    const isEdit = !!resource;

    const [showFileManager, setShowFileManager] = useState(false);
    const [nextId, setNextId] = useState<number | string>('0');

    // Local form state
    const [formData, setFormData] = useState<ResourceFormData>({
        resource_type: type || 'legal_registration',
        title: '',
        subtitle: '',
        icon: '',
        link: '',
        status: true,
    });

    const [fileOptions, setFileOptions] = useState<File | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
    const [showIconDropdown, setShowIconDropdown] = useState(false);
    const [iconSearch, setIconSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const createMutation = useCreateResource();
    const updateMutation = useUpdateResource();

    const modalRef = useRef<HTMLDivElement>(null);
    const modalInstanceRef = useRef<any>(null);

    // Fetch next ID for new resources to ensure accurate folder creation
    useEffect(() => {
        if (show && !isEdit) {
            getResourceNextId().then(res => {
                if (res?.next_id) {
                    setNextId(res.next_id);
                }
            }).catch(err => {
                console.error('Failed to fetch next resource ID', err);
                setNextId('0');
            });
        }
    }, [show, isEdit]);

    // Initialize Bootstrap Modal instance once
    useEffect(() => {
        if (!modalRef.current) return;
        if (!modalInstanceRef.current) {
            modalInstanceRef.current = new Modal(modalRef.current, {
                backdrop: 'static',
                keyboard: false,
            });
        }
    }, []);

    // Show/hide based on `show` prop
    useEffect(() => {
        const modal = modalInstanceRef.current;
        if (!modal) return;
        if (show) {
            setValidationErrors({});
            modal.show();
        } else {
            modal.hide();
            // Fallback cleanup in case of fast transitions
            setTimeout(() => {
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.paddingRight = '';
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach(b => b.remove());
            }, 300);
        }
    }, [show]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            const modal = modalInstanceRef.current;
            if (modal) {
                try {
                    modal.hide();
                    if (typeof modal.dispose === 'function') modal.dispose();
                } catch (_) { }
            }
            modalInstanceRef.current = null;

            // Aggressive fallback cleanup for HMR / unexpected unmounts
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(b => b.remove());
        };
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowIconDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (show) {
            if (isEdit && resource) {
                setFormData({
                    resource_type: resource.resource_type,
                    title: resource.title,
                    subtitle: resource.subtitle || '',
                    icon: resource.icon || '',
                    link: resource.link || '',
                    status: resource.status,
                    file: (resource as any).file || '',
                });
                setFileOptions(null);
            } else {
                setFormData({
                    resource_type: type || 'legal_registration',
                    title: '',
                    subtitle: '',
                    icon: '',
                    link: '',
                    status: true,
                    file: '',
                });
                setFileOptions(null);
            }
        }
    }, [show, isEdit, resource, type]);

    const isFileRequired = TYPES_REQUIRING_FILE.includes(formData.resource_type);
    const isLinkRequired = TYPES_REQUIRING_LINK.includes(formData.resource_type);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type, checked } = e.target as HTMLInputElement;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        // Clear error for this field
        if (validationErrors[name]) {
            setValidationErrors(prev => ({ ...prev, [name]: [] }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFileOptions(e.target.files[0]);
        } else {
            setFileOptions(null);
        }
        if (validationErrors['file']) {
            setValidationErrors(prev => ({ ...prev, ['file']: [] }));
        }
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationErrors({});

        try {
            const submitData = { ...formData };
            // If we have a local file from the file input, it would be in fileOptions.
            // But the user is using the File Manager, so we use formData.file.
            if (fileOptions) {
                submitData.file = fileOptions;
            }

            if (isEdit && resource) {
                await updateMutation.mutateAsync({ id: resource.id, data: submitData });
                toast.success('Resource updated successfully');
            } else {
                await createMutation.mutateAsync(submitData);
                toast.success('Resource created successfully');
            }
            onHide();
        } catch (err: any) {
            if (err.response?.status === 422 && err.response?.data?.errors) {
                setValidationErrors(err.response.data.errors);
            } else {
                toast.error(err.response?.data?.message || 'Action failed');
            }
        }
    };

    useEffect(() => {
        if (!showFileManager && show) {
            // When FileManagerModal (Reactstrap) closes, it strips the 'modal-open' class from the body.
            // But since our ResourceModal (Native Bootstrap) is still open, we lose our scrollbar and layout structure.
            // We forcefully restore it after the Reactstrap exit transition completes.
            const timer = setTimeout(() => {
                document.body.classList.add('modal-open');
                document.body.style.overflow = 'hidden';
            }, 350);
            return () => clearTimeout(timer);
        }
    }, [showFileManager, show]);

    return (
        <>
            <div
                className="modal fade flip"
                tabIndex={-1}
                ref={modalRef}
                aria-hidden="true"
                style={{ zIndex: showFileManager ? 1045 : undefined }}
            >
                <div className="modal-dialog modal-lg modal-dialog-centered">
                    <div className="modal-content border-0 shadow-lg border-top border-3 border-primary overflow-hidden">
                        <div className="modal-header bg-light p-3">
                            <h5 className="modal-title fs-16 fw-bold text-dark d-flex align-items-center gap-2">
                                {isEdit ? <i className="ri-edit-2-line text-primary fs-18"></i> : <i className="ri-file-add-line text-primary fs-18"></i>}
                                {isEdit ? 'Update Resource' : 'Add New Resource'}
                            </h5>
                            <button type="button" className="btn-close shadow-none focus-ring-none" onClick={onHide} aria-label="Close"></button>
                        </div>
                        <form onSubmit={onSubmit} noValidate>
                            <div className="modal-body p-4 bg-white">
                                <div className="row g-4">
                                    <div className="col-12 col-md-8">
                                        <label className="form-label fs-13 fw-semibold text-dark tracking-wider">Type <span className="text-danger">*</span></label>
                                        <div className="position-relative">
                                            <select
                                                className={`form-select border-light bg-light py-2 shadow-none ${validationErrors.resource_type ? 'is-invalid' : ''}`}
                                                name="resource_type"
                                                value={formData.resource_type}
                                                onChange={handleInputChange}
                                                disabled
                                            >
                                                {RESOURCE_TYPE_OPTIONS.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                            {validationErrors.resource_type && <div className="invalid-feedback d-block">{validationErrors.resource_type}</div>}
                                        </div>
                                    </div>

                                    <div className="col-12 col-md-4">
                                        <label className="form-label fs-13 fw-semibold text-dark tracking-wider">Status</label>
                                        <div className="form-check form-switch form-switch-md mt-1 d-flex align-items-center">
                                            <input
                                                className="form-check-input mt-0 cursor-pointer shadow-none focus-ring-none"
                                                type="checkbox"
                                                role="switch"
                                                id="resourceStatus"
                                                name="status"
                                                checked={formData.status}
                                                onChange={handleInputChange}
                                            />
                                            <label className="form-check-label ms-2 fw-medium mb-0" htmlFor="resourceStatus">
                                                {formData.status ? <span className="text-success">Active</span> : <span className="text-muted">Inactive</span>}
                                            </label>
                                        </div>
                                        {validationErrors.status && <div className="invalid-feedback d-block">{validationErrors.status}</div>}
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label fs-13 fw-semibold text-dark tracking-wider">Title <span className="text-danger">*</span></label>
                                        <div className="form-icon">
                                            <input
                                                type="text"
                                                className={`form-control form-control-icon border-light bg-light py-2 shadow-none ${validationErrors.title ? 'is-invalid border-danger' : ''}`}
                                                name="title"
                                                value={formData.title}
                                                onChange={handleInputChange}
                                                placeholder="Resource Title"
                                            />
                                            <i className="ri-heading text-muted"></i>
                                        </div>
                                        {validationErrors.title && <div className="invalid-feedback d-block fw-medium mt-1">{validationErrors.title}</div>}
                                    </div>

                                    <div className="col-6">
                                        <label className="form-label fs-13 fw-semibold text-dark tracking-wider">Subtitle </label>
                                        <div className="form-icon">
                                            <input
                                                type="text"
                                                className={`form-control form-control-icon border-light bg-light py-2 shadow-none ${validationErrors.subtitle ? 'is-invalid border-danger' : ''}`}
                                                name="subtitle"
                                                value={formData.subtitle}
                                                onChange={handleInputChange}
                                                placeholder="Resource Subtitle"
                                            />
                                            <i className="ri-text text-muted"></i>
                                        </div>
                                        {validationErrors.subtitle && <div className="invalid-feedback d-block fw-medium mt-1">{validationErrors.subtitle}</div>}
                                    </div>

                                    <div className="col-6">
                                        <label className="form-label fs-13 fw-semibold text-dark tracking-wider">Icon Class</label>
                                        <div className="position-relative" ref={dropdownRef}>
                                            {/* Combobox Trigger */}
                                            <button
                                                type="button"
                                                className={`form-control border-light bg-light py-2 shadow-none d-flex align-items-center gap-2 text-start ${validationErrors.icon ? 'is-invalid border-danger' : ''}`}
                                                onClick={() => { setShowIconDropdown(prev => !prev); setIconSearch(''); }}
                                                style={{ height: '42px' }}
                                            >
                                                {formData.icon ? (
                                                    <>
                                                        <i className={`${formData.icon} fs-16 text-primary flex-shrink-0`}></i>
                                                        <span className="fs-13 text-dark flex-grow-1 text-truncate">{RESOURCE_ICONS.find(i => i.value === formData.icon)?.label || formData.icon}</span>
                                                        <i
                                                            className="ri-close-line text-muted fs-16 flex-shrink-0"
                                                            onClick={(e) => { e.stopPropagation(); setFormData(prev => ({ ...prev, icon: '' })); setShowIconDropdown(false); }}
                                                        ></i>
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="ri-remixicon-line text-muted fs-16 flex-shrink-0"></i>
                                                        <span className="fs-13 text-muted">Select icon...</span>
                                                        <i className="ri-arrow-down-s-line text-muted ms-auto flex-shrink-0"></i>
                                                    </>
                                                )}
                                            </button>

                                            {/* Dropdown Panel */}
                                            {showIconDropdown && (
                                                <div
                                                    className="position-absolute w-100 bg-white border border-light rounded-2 shadow-lg mt-1"
                                                    style={{ zIndex: 1055, top: '100%' }}
                                                >
                                                    {/* Search Input inside dropdown */}
                                                    <div className="p-2 border-bottom border-light">
                                                        <div className="input-group input-group-sm">
                                                            <span className="input-group-text bg-light border-light"><i className="ri-search-2-line text-muted"></i></span>
                                                            <input
                                                                type="text"
                                                                className="form-control bg-light border-light shadow-none fs-13"
                                                                placeholder="Search icons..."
                                                                value={iconSearch}
                                                                onChange={(e) => setIconSearch(e.target.value)}
                                                                autoFocus
                                                                autoComplete="off"
                                                            />
                                                            {iconSearch && (
                                                                <button type="button" className="btn btn-light border-light px-2" onClick={() => setIconSearch('')}>
                                                                    <i className="ri-close-line text-muted"></i>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Icon List */}
                                                    <div className="overflow-auto" style={{ maxHeight: '220px' }}>
                                                        {RESOURCE_ICONS.filter(ico =>
                                                            !iconSearch ||
                                                            ico.label.toLowerCase().includes(iconSearch.toLowerCase()) ||
                                                            ico.value.toLowerCase().includes(iconSearch.toLowerCase())
                                                        ).length > 0 ? (
                                                            RESOURCE_ICONS.filter(ico =>
                                                                !iconSearch ||
                                                                ico.label.toLowerCase().includes(iconSearch.toLowerCase()) ||
                                                                ico.value.toLowerCase().includes(iconSearch.toLowerCase())
                                                            ).map((ico) => (
                                                                <button
                                                                    key={ico.value}
                                                                    type="button"
                                                                    className={`dropdown-item d-flex align-items-center gap-3 py-2 px-3 ${formData.icon === ico.value ? 'bg-primary bg-opacity-10' : ''}`}
                                                                    onClick={() => {
                                                                        setFormData(prev => ({ ...prev, icon: ico.value }));
                                                                        setIconSearch('');
                                                                        setShowIconDropdown(false);
                                                                        if (validationErrors.icon) setValidationErrors(prev => ({ ...prev, icon: [] }));
                                                                    }}
                                                                >
                                                                    <div className="bg-light rounded p-1 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '32px', height: '32px' }}>
                                                                        <i className={`${ico.value} fs-18 ${formData.icon === ico.value ? 'text-primary' : 'text-secondary'}`}></i>
                                                                    </div>
                                                                    <div className="min-width-0">
                                                                        <div className="fw-semibold fs-13 text-dark">{ico.label}</div>
                                                                        <div className="text-muted fs-11 text-truncate">{ico.value}</div>
                                                                    </div>
                                                                    {formData.icon === ico.value && <i className="ri-check-line text-primary ms-auto flex-shrink-0"></i>}
                                                                </button>
                                                            ))
                                                        ) : (
                                                            <div className="text-center py-4 text-muted fs-13">
                                                                <i className="ri-search-line d-block fs-22 mb-1"></i>
                                                                No icons found for "{iconSearch}"
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {validationErrors.icon && <div className="invalid-feedback d-block fw-medium mt-1">{validationErrors.icon}</div>}
                                    </div>

                                    {isLinkRequired && (
                                        <div className="col-12 col-md-6">
                                            <label className="form-label fs-13 fw-semibold text-dark tracking-wider"> URL <span className="text-danger">*</span></label>
                                            <div className="form-icon">
                                                <input
                                                    type="url"
                                                    className={`form-control form-control-icon border-light bg-light py-2 shadow-none ${validationErrors.link ? 'is-invalid border-danger' : ''}`}
                                                    name="link"
                                                    value={formData.link}
                                                    onChange={handleInputChange}
                                                    placeholder="https://example.com/..."
                                                />
                                                <i className="ri-link text-muted"></i>
                                            </div>
                                            {validationErrors.link && (
                                                <div className="invalid-feedback d-block fw-medium mt-1">
                                                    {Array.isArray(validationErrors.link) ? validationErrors.link[0] : validationErrors.link}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {isFileRequired && (
                                        <div className="col-12">
                                            <label className="form-label fs-13 fw-semibold text-dark tracking-wider">File Upload {(!isEdit) && <span className="text-danger">*</span>}</label>
                                            <div className="input-group">
                                                <span className={`input-group-text bg-light ${validationErrors.file ? 'border-danger text-danger' : 'border-light text-primary'}`} id="fileUploadAddon">
                                                    <i className="ri-folder-open-line fs-16"></i>
                                                </span>
                                                <input
                                                    type="text"
                                                    className={`form-control bg-light cursor-pointer shadow-none py-2 ${validationErrors.file ? 'is-invalid border-danger' : 'border-light'}`}
                                                    readOnly
                                                    placeholder="Click to browse file manager..."
                                                    value={typeof formData.file === 'string' ? formData.file : (fileOptions ? fileOptions.name : '')}
                                                    onClick={() => setShowFileManager(true)}
                                                />
                                                <button className="btn btn-primary fw-medium px-4" type="button" onClick={() => setShowFileManager(true)}>
                                                    Browse
                                                </button>
                                            </div>
                                            {validationErrors.file && <div className="invalid-feedback d-block fw-medium mt-1">{validationErrors.file}</div>}
                                            {isEdit && resource?.file_url && (
                                                <div className="mt-3 p-2 bg-light rounded-2 border border-dashed border-light d-flex align-items-center justify-content-between">
                                                    <div className="d-flex align-items-center">
                                                        <div className="avatar-sm bg-white rounded shadow-sm d-flex align-items-center justify-content-center me-3 border border-light">
                                                            <i className="ri-file-pdf-fill text-danger fs-22"></i>
                                                        </div>
                                                        <div>
                                                            <p className="mb-0 fs-12 fw-bold text-dark lh-1">Existing File</p>
                                                            <span className="text-muted fs-11 text-truncate d-inline-block" style={{ maxWidth: '150px' }}>
                                                                {typeof formData.file === 'string' ? formData.file.split('/').pop() : 'Resource Document'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <a href={resource.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-soft-primary px-3 fs-11 d-flex align-items-center">
                                                        <i className="ri-external-link-line me-1"></i> View
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer p-3 bg-light border-top border-light d-flex justify-content-end gap-2">
                                <button type="button" className="btn btn-soft-danger fw-medium px-4 lift" onClick={onHide}>Cancel</button>
                                <button type="submit" className="btn btn-primary fw-medium px-4 shadow-sm d-inline-flex align-items-center gap-2 lift" disabled={createMutation.isPending || updateMutation.isPending}>
                                    {(createMutation.isPending || updateMutation.isPending) ? (
                                        <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>Saving</>
                                    ) : (
                                        isEdit ? <><i className="ri-save-line fs-16"></i> Update </> : <><i className="ri-check-line fs-16"></i> Save</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <FileManagerModal
                isOpen={showFileManager}
                toggle={() => setShowFileManager(!showFileManager)}
                selectionMode={true}
                entityType="resources"
                entityId={resource?.id || nextId || '0'}
                initialPath={formData.file && typeof formData.file === 'string' ? formData.file.split('/').slice(0, -1).join('/') || '/' : '/'}
                onSelectFiles={(files) => {
                    if (files && files.length > 0) {
                        setFormData(prev => ({ ...prev, file: files[0].path }));
                        setFileOptions(null);
                        if (validationErrors['file']) {
                            setValidationErrors(prev => ({ ...prev, ['file']: [] }));
                        }
                    }
                }}
                section="Resources"
            />
        </>
    );
}
