import React, { useState, useEffect, useRef } from 'react';
import Modal from 'bootstrap/js/dist/modal';
import { useCreateResource, useUpdateResource } from '../../modules/resource/queries';
import { getResourceNextId } from '../../modules/resource/services';
import { ResourceItem, ResourceFormData } from '../../modules/resource/types';
import { toast } from 'react-toastify';
import { useFileManagerStore } from '../../../store/fileManager/fileManagerStore';
import { Dropdown } from 'primereact/dropdown';
import { FileManagerModal } from '../../components/FileManagerModal/FileManagerModal';
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
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
                <div className="modal-dialog modal-lg modal-dialog-centered resource-modal">
                    <div className="modal-content border-0 shadow-lg">
                        <div className="modal-header px-4 py-3 bg-white border-bottom border-light">
                            <h5 className="modal-title fs-15 fw-bold text-dark d-flex align-items-center gap-2">
                                <span className={`avatar-xs d-flex align-items-center justify-content-center rounded-circle ${isEdit ? 'bg-primary-subtle text-primary' : 'bg-success-subtle text-success'}`}>
                                    <i className={isEdit ? 'ri-edit-2-fill' : 'ri-add-line'}></i>
                                </span>
                                {isEdit ? 'Update Resource' : 'Add New Resource'}
                            </h5>
                            <button type="button" className="btn-close shadow-none" onClick={onHide} aria-label="Close"></button>
                        </div>
                        <form onSubmit={onSubmit} noValidate>
                            <div className="modal-body p-4">
                                <div className="row g-3">
                                    <div className="col-12 col-md-8">
                                        <label className="form-label fw-bold text-muted fs-12 uppercase-label mb-2">Resource Type <span className="text-danger">*</span></label>
                                        <Dropdown
                                            value={formData.resource_type}
                                            options={RESOURCE_TYPE_OPTIONS}
                                            onChange={(e) => setFormData(p => ({ ...p, resource_type: e.value }))}
                                            placeholder="Select Resource Type"
                                            className={`w-100 shadow-none ${validationErrors.resource_type ? 'p-invalid' : ''}`}
                                            id="resource_type_dropdown"
                                        />
                                        {validationErrors.resource_type && <div className="invalid-feedback d-block mt-1">{validationErrors.resource_type}</div>}
                                    </div>

                                    <div className="col-12 col-md-4">
                                        <label className="form-label fw-bold text-muted fs-12 uppercase-label mb-2">Publish Status</label>
                                        <div className="form-control d-flex align-items-center justify-content-between p-2 shadow-none custom-height" style={{ height: '37.5px' }}>
                                            <label className="form-check-label ms-1 fw-bold fs-12 mb-0 cursor-pointer" htmlFor="resourceStatus">
                                                {formData.status ? <span className="text-success">Published</span> : <span className="text-muted">Inactive</span>}
                                            </label>
                                            <div className="form-check form-switch form-switch-md mb-0 d-flex align-items-center" style={{ height: '20px' }}>
                                                <input
                                                    className="form-check-input cursor-pointer shadow-none mt-0"
                                                    type="checkbox"
                                                    role="switch"
                                                    id="resourceStatus"
                                                    name="status"
                                                    checked={formData.status}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                        </div>
                                        {validationErrors.status && <div className="invalid-feedback d-block mt-1">{validationErrors.status}</div>}
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label fw-bold text-muted fs-12 uppercase-label mb-2">Title <span className="text-danger">*</span></label>
                                        <input
                                            type="text"
                                            className={`form-control shadow-none custom-height ${validationErrors.title ? 'is-invalid border-danger' : ''}`}
                                            name="title"
                                            value={formData.title}
                                            onChange={handleInputChange}
                                            placeholder="Enter resource title"
                                        />
                                        {validationErrors.title && <div className="invalid-feedback d-block mt-1">{validationErrors.title}</div>}
                                    </div>

                                    <div className="col-12 col-md-6">
                                        <label className="form-label fw-bold text-muted fs-12 uppercase-label mb-2">Subtitle</label>
                                        <input
                                            type="text"
                                            className={`form-control shadow-none custom-height ${validationErrors.subtitle ? 'is-invalid border-danger' : ''}`}
                                            name="subtitle"
                                            value={formData.subtitle}
                                            onChange={handleInputChange}
                                            placeholder="Enter subtitle (optional)"
                                        />
                                        {validationErrors.subtitle && <div className="invalid-feedback d-block mt-1">{validationErrors.subtitle}</div>}
                                    </div>

                                    <div className="col-12 col-md-6">
                                        <label className="form-label fw-bold text-muted fs-12 uppercase-label mb-2">Icon</label>
                                        <div className="position-relative" ref={dropdownRef}>
                                            <button
                                                type="button"
                                                className={`form-control shadow-none d-flex align-items-center gap-2 text-start custom-height ${validationErrors.icon ? 'is-invalid border-danger' : ''}`}
                                                onClick={() => { setShowIconDropdown(prev => !prev); setIconSearch(''); }}
                                            >
                                                {formData.icon ? (
                                                    <><i className={`${formData.icon} fs-16 text-primary`}></i>
                                                        <span className="fs-13 text-dark flex-grow-1 text-truncate">{RESOURCE_ICONS.find(i => i.value === formData.icon)?.label || formData.icon}</span>
                                                    </>
                                                ) : (
                                                    <span className="fs-13 text-muted">Select an icon...</span>
                                                )}
                                                <i className="ri-arrow-down-s-line text-muted ms-auto"></i>
                                            </button>

                                            {showIconDropdown && (
                                                <div className="position-absolute w-100 bg-white border border-light-subtle rounded-3 shadow-lg mt-1 overflow-hidden" style={{ zIndex: 1055, top: '100%' }}>
                                                    <div className="p-2 bg-light border-bottom border-light-subtle">
                                                        <input
                                                            type="text"
                                                            className="form-control shadow-none fs-12 custom-height"
                                                            placeholder="Search icons..."
                                                            value={iconSearch}
                                                            onChange={(e) => setIconSearch(e.target.value)}
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <div className="overflow-auto custom-scrollbar" style={{ maxHeight: '200px' }}>
                                                        {RESOURCE_ICONS.filter(ico => !iconSearch || ico.label.toLowerCase().includes(iconSearch.toLowerCase())).length > 0 ? (
                                                            RESOURCE_ICONS.filter(ico => !iconSearch || ico.label.toLowerCase().includes(iconSearch.toLowerCase())).map((ico) => (
                                                                <button
                                                                    key={ico.value}
                                                                    type="button"
                                                                    className={`dropdown-item d-flex align-items-center gap-3 py-2 px-3 border-bottom border-light-subtle border-opacity-50 ${formData.icon === ico.value ? 'bg-primary-subtle' : ''}`}
                                                                    onClick={() => { setFormData(prev => ({ ...prev, icon: ico.value })); setShowIconDropdown(false); }}
                                                                >
                                                                    <i className={`${ico.value} fs-18 ${formData.icon === ico.value ? 'text-primary' : 'text-muted'}`} style={{ width: '20px' }}></i>
                                                                    <span className={`fs-13 ${formData.icon === ico.value ? 'text-primary fw-medium' : 'text-dark'}`}>{ico.label}</span>
                                                                    {formData.icon === ico.value && <i className="ri-check-line ms-auto text-primary"></i>}
                                                                </button>
                                                            ))
                                                        ) : (
                                                            <div className="text-center py-3 text-muted fs-12">No icons found</div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {validationErrors.icon && <div className="invalid-feedback d-block">{validationErrors.icon}</div>}
                                    </div>

                                    {isLinkRequired && (
                                        <div className="col-12">
                                            <label className="form-label fw-bold text-muted fs-12 uppercase-label mb-2">Link URL <span className="text-danger">*</span></label>
                                            <input
                                                type="url"
                                                className={`form-control shadow-none custom-height ${validationErrors.link ? 'is-invalid border-danger' : ''}`}
                                                name="link"
                                                value={formData.link}
                                                onChange={handleInputChange}
                                                placeholder="https://..."
                                            />
                                            {validationErrors.link && <div className="invalid-feedback d-block mt-1">{validationErrors.link}</div>}
                                        </div>
                                    )}

                                    {isFileRequired && (
                                        <div className="col-12">
                                            <label className="form-label fw-bold text-muted fs-12 uppercase-label mb-2">Resource Document {(!isEdit) && <span className="text-danger">*</span>}</label>

                                            <div
                                                className={`file-dropzone d-flex align-items-center p-2 px-3 border rounded-2 cursor-pointer transition-all ${validationErrors.file ? 'border-danger' : 'border-light-subtle'}`}
                                                onClick={() => setShowFileManager(true)}
                                                style={{ minHeight: '52px' }}
                                            >
                                                <div className="avatar-xs bg-primary-subtle bg-opacity-25 rounded d-flex align-items-center justify-content-center me-3" style={{ width: '32px', height: '32px' }}>
                                                    <i className="ri-file-upload-line text-primary fs-18"></i>
                                                </div>
                                                <div className="flex-grow-1 overflow-hidden">
                                                    <p className="mb-0  fs-13 text-dark text-truncate">
                                                        {typeof formData.file === 'string' && formData.file ? formData.file.split('/').pop() : (formData.resource_type === 'download_asset' ? 'Choose Asset (PDF/DOCS)...' : 'Choose Document (PDF)...')}
                                                    </p>
                                                    <p className="mb-0 text-muted fs-11">
                                                        {formData.resource_type === 'download_asset' ? 'Click to select asset files' : 'Click to select PDF document'}
                                                    </p>
                                                </div>
                                                <button type="button" className="btn btn-sm btn-link text-primary text-decoration-none fw-medium fs-12 p-0 ms-2">
                                                    {formData.file ? 'Change' : 'Browse'}
                                                </button>
                                            </div>

                                            {validationErrors.file && <div className="invalid-feedback d-block mt-1">{validationErrors.file}</div>}

                                            {isEdit && resource?.file_url && (
                                                <div className="mt-2 p-2 px-3 bg-light rounded d-flex align-items-center justify-content-between border border-light-subtle">
                                                    <div className="d-flex align-items-center gap-2 overflow-hidden">
                                                        <i className="ri-file-pdf-fill text-danger fs-18"></i>
                                                        <div className="text-truncate">
                                                            <p className="mb-0 fs-12 fw-bold text-dark text-truncate">{resource.file_url.split('/').pop()}</p>
                                                        </div>
                                                    </div>

                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer p-3 bg-light border-top d-flex justify-content-end gap-2">
                                <button type="button" className="btn btn-soft-secondary px-4" onClick={onHide}>Cancel</button>
                                <button type="submit" className="btn btn-primary px-4 shadow-sm d-inline-flex align-items-center gap-2" disabled={createMutation.isPending || updateMutation.isPending}>
                                    {(createMutation.isPending || updateMutation.isPending) ? (
                                        <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>Saving</>
                                    ) : (
                                        isEdit ? <><i className="ri-save-fill fs-16"></i> Save Changes</> : <><i className="ri-check-line fs-16"></i> Create Resource</>
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
                getAll={true}
            />
        </>
    );
}
