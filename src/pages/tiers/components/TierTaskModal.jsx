import React, { useEffect, useState, useRef } from 'react';
import { Dropdown } from 'primereact/dropdown';
import Modal from 'bootstrap/js/dist/modal';
import { useSummernote } from '../../../hooks/useSummernote';

const TierTaskModal = ({
    show,
    onHide,
    onSubmit,
    task,
    tierId,
    tier,
    relatedApis = [],
    vendors = [],
    loadingApis = false,
    loadingSave,
    serverErrors = {}
}) => {
    const isEdit = !!task;
    const modalRef = useRef(null);
    const modalInstanceRef = useRef(null);

    const [formData, setFormData] = useState({
        title: '',
        subtitle: '',
        description: '',
        button_title: '',
        estimated_completion_days: '',
        order: '',
        manual_verification: false,
        related_api_id: null,
        vendor_id: null
    });

    // Use global Summernote hook
    const { editorRef: descriptionRef } = useSummernote('description', formData.description, (e) => {
        const { value } = e.target;
        setFormData(prev => ({ ...prev, description: value }));
    }, {
        height: 200,
        placeholder: 'Enter task description...',
        dialogsInBody: true
    }, show);

    const [errors, setErrors] = useState({});

    // Initialize Bootstrap Modal
    useEffect(() => {
        if (modalRef.current && !modalInstanceRef.current) {
            modalInstanceRef.current = new Modal(modalRef.current, {
                backdrop: 'static',
                keyboard: false
            });
        }
    }, []);

    // Show/Hide Modal based on prop
    useEffect(() => {
        if (modalInstanceRef.current) {
            if (show) {
                modalInstanceRef.current.show();
            } else {
                modalInstanceRef.current.hide();
            }
        }
    }, [show]);

    // Update form data when task or show changes
    useEffect(() => {
        if (show) {
            if (task) {
                setFormData({
                    title: task.title || '',
                    subtitle: task.subtitle || '',
                    description: task.description || '',
                    button_title: task.button_title || '',
                    estimated_completion_days: task.estimated_completion_days || '',
                    order: task.order || '',
                    manual_verification: task.manual_verification == 1 || task.manual_verification === true,
                    related_api_id: task.related_api_id || null,
                    vendor_id: task.vendor_id || null
                });
            } else {
                setFormData({
                    title: '',
                    subtitle: '',
                    description: '',
                    button_title: '',
                    estimated_completion_days: '',
                    order: '',
                    manual_verification: false,
                    related_api_id: null,
                    vendor_id: null
                });
            }
            setErrors({});
        }
    }, [show, task]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const getError = (name) => {
        if (errors[name]) return errors[name];
        if (serverErrors[name]) {
            return Array.isArray(serverErrors[name]) ? serverErrors[name][0] : serverErrors[name];
        }
        return null;
    };

    const validate = () => {
        let tempErrors = {};
        let isValid = true;

        if (!formData.manual_verification) {
            if (tier?.code === 'T1') {
                if (!formData.vendor_id) {
                    tempErrors.vendor_id = "Vendor is required for automated tasks";
                    isValid = false;
                }
            }
        }
        setErrors(tempErrors);
        return isValid;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) {
            const payload = {
                ...formData,
                tier_id: tierId,
                estimated_completion_days: formData.estimated_completion_days ? Number(formData.estimated_completion_days) : null,
                order: formData.order ? Number(formData.order) : 0,
                manual_verification: formData.manual_verification ? 1 : 0
            };

            // Handle conditional IDs
            if (tier?.code === 'T1') {
                payload.vendor_id = formData.vendor_id || null;
                payload.related_api_id = null; // Ensure this is null for T1
            } else {
                payload.related_api_id = formData.related_api_id || null;
                payload.vendor_id = null; // Ensure this is null for others
            }

            onSubmit(payload);
        }
    };

    return (
        <div
            className="modal fade flip"
            ref={modalRef}
            tabIndex="-1"
            aria-hidden="true"
        >
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">{isEdit ? 'Edit Task' : 'Add New Task'}</h5>
                        <button type="button" className="btn-close" onClick={onHide}></button>
                    </div>
                    <div className="modal-body">
                        <form onSubmit={handleSubmit}>
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="form-label">Title <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        name="title"
                                        className={`form-control ${getError('title') ? 'is-invalid' : ''}`}
                                        value={formData.title}
                                        onChange={handleChange}
                                        placeholder="Enter task title"
                                    />
                                    {getError('title') && <div className="invalid-feedback">{getError('title')}</div>}
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Subtitle</label>
                                    <input
                                        type="text"
                                        name="subtitle"
                                        className={`form-control ${getError('subtitle') ? 'is-invalid' : ''}`}
                                        value={formData.subtitle}
                                        onChange={handleChange}
                                        placeholder="Enter task subtitle"
                                    />
                                    {getError('subtitle') && <div className="invalid-feedback">{getError('subtitle')}</div>}
                                </div>

                                <div className="col-md-12">
                                    <label className="form-label">Description</label>
                                    <div className={getError('description') ? 'is-invalid' : ''}>
                                        <textarea
                                            ref={descriptionRef}
                                            name="description"
                                            className="d-none"
                                        ></textarea>
                                    </div>
                                    {getError('description') && <div className="invalid-feedback">{getError('description')}</div>}
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label">Button Title</label>
                                    <input
                                        type="text"
                                        name="button_title"
                                        className={`form-control ${getError('button_title') ? 'is-invalid' : ''}`}
                                        value={formData.button_title}
                                        onChange={handleChange}
                                        placeholder="e.g. Apply Now"
                                    />
                                    {getError('button_title') && <div className="invalid-feedback">{getError('button_title')}</div>}
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label">{tier?.code === 'T1' ? 'Related Vendor' : 'Verified By Api'}</label>
                                    {tier?.code === 'T1' ? (
                                        <>
                                            <Dropdown
                                                value={formData.vendor_id}
                                                options={vendors || []}
                                                optionLabel="name"
                                                optionValue="id"
                                                itemTemplate={(option) => (
                                                    <div>
                                                        <span className="fw-medium">{option.name}</span>
                                                        <span className="ms-2 text-muted small">({option.category})</span>
                                                    </div>
                                                )}
                                                onChange={(e) => {
                                                    setFormData(prev => ({ ...prev, vendor_id: e.value }));
                                                    if (errors.vendor_id) {
                                                        setErrors(prev => ({ ...prev, vendor_id: null }));
                                                    }
                                                }}
                                                placeholder="Select Vendor"
                                                className={`w-100 ${getError('vendor_id') ? 'p-invalid' : ''}`}
                                                showClear
                                                appendTo={document.body}
                                                filter
                                            />
                                            {getError('vendor_id') && <div className="text-danger small mt-1">{getError('vendor_id')}</div>}
                                        </>
                                    ) : (
                                        <>
                                            <Dropdown
                                                value={(relatedApis || []).find(api => api.id == formData.related_api_id)?.id}
                                                options={relatedApis || []}
                                                optionLabel="name"
                                                optionValue="id"
                                                itemTemplate={(option) => (
                                                    <div>
                                                        <span className="fw-medium">{option.name}</span>
                                                        <span className="ms-2 text-muted small">({option.provider})</span>
                                                    </div>
                                                )}
                                                onChange={(e) => {
                                                    setFormData(prev => ({ ...prev, related_api_id: e.value }));
                                                    if (errors.related_api_id) {
                                                        setErrors(prev => ({ ...prev, related_api_id: null }));
                                                    }
                                                }}
                                                placeholder={loadingApis ? "Loading..." : "Select Verification API"}
                                                className={`w-100 ${getError('related_api_id') ? 'p-invalid' : ''}`}
                                                showClear
                                                appendTo={document.body}
                                            />
                                            {getError('related_api_id') && <div className="text-danger small mt-1">{getError('related_api_id')}</div>}
                                        </>
                                    )}
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label">Est. Completion Days</label>
                                    <input
                                        type="number"
                                        name="estimated_completion_days"
                                        className={`form-control ${getError('estimated_completion_days') ? 'is-invalid' : ''}`}
                                        value={formData.estimated_completion_days}
                                        onChange={handleChange}
                                        placeholder="Enter days"
                                        min="1"
                                    />
                                    {getError('estimated_completion_days') && <div className="invalid-feedback">{getError('estimated_completion_days')}</div>}
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label">Order Value</label>
                                    <input
                                        type="number"
                                        name="order"
                                        className={`form-control ${getError('order') ? 'is-invalid' : ''}`}
                                        value={formData.order}
                                        onChange={handleChange}
                                        placeholder="Enter display order"
                                    />
                                    {getError('order') && <div className="invalid-feedback">{getError('order')}</div>}
                                </div>

                                {/* <div className="col-md-6">
                                    <div className="mb-3">
                                        <div className="form-check">
                                            <input
                                                id="manualVerificationCheckbox"
                                                type="checkbox"
                                                className="form-check-input"
                                                name="manual_verification"
                                                checked={formData.manual_verification}
                                                onChange={handleChange}
                                            />
                                            <label className="form-check-label" htmlFor="manualVerificationCheckbox">Manual Verification</label>
                                        </div>
                                    </div>
                                </div> */}
                            </div>

                            <div className="d-flex justify-content-end mt-4 pt-2 border-top">
                                <button type="button" className="btn btn-light me-2" onClick={onHide}>Cancel</button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={loadingSave}
                                >
                                    {loadingSave ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <i className={`me-1 align-bottom ${isEdit ? 'ri-edit-2-fill' : 'ri-save-3-fill'}`}></i>
                                            {isEdit ? 'Update' : 'Save'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TierTaskModal;
