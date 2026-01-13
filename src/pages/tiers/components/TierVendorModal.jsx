import React, { useEffect, useState, useRef } from 'react';
import Modal from 'bootstrap/js/dist/modal';
import { Chips } from 'primereact/chips';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';

import { CATEGORY_OPTIONS, STATUS_OPTIONS, REPORT_TO_OPTIONS, VENDOR_STATUS_OPTIONS } from '../../../config';
import { SUMMERNOTE_CONFIG } from '../../../config/summernote';

const TierVendorModal = ({
    show,
    onHide,
    onSubmit,
    vendor,
    tierId,
    loadingSave,
    serverErrors
}) => {
    const isEdit = !!vendor;
    const modalRef = useRef(null);
    const modalInstanceRef = useRef(null);
    const editorRef = useRef(null);

    const [formData, setFormData] = useState({
        name: '',
        category: null,
        description: '',
        affiliate_url: '',
        general_url: '',
        logo: null,
        requirements: [],
        benefits: [],
        report_to: [],
        status: VENDOR_STATUS_OPTIONS['Active']
    });
    const [errors, setErrors] = useState({});

    // Handle Server Errors
    useEffect(() => {
        if (serverErrors && Object.keys(serverErrors).length > 0) {
            const newErrors = {};
            Object.keys(serverErrors).forEach(key => {
                // Take the first error message for each field
                newErrors[key] = Array.isArray(serverErrors[key]) ? serverErrors[key][0] : serverErrors[key];
            });
            setErrors(newErrors);
        }
    }, [serverErrors]);

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

    // Update form data when vendor or show changes
    useEffect(() => {
        if (show) {
            if (vendor) {
                setFormData({
                    name: vendor.name || '',
                    category: vendor.category || null,
                    description: vendor.description || '',
                    affiliate_url: vendor.affiliate_url || '',
                    general_url: vendor.general_url || '',
                    logo: null, // Don't preload file object, maybe show preview if needed
                    requirements: vendor.requirements || [],
                    benefits: vendor.benefits || [],
                    report_to: vendor.report_to || [],
                    status: vendor.status || STATUS_OPTIONS[0].value
                });
            } else {
                setFormData({
                    name: '',
                    category: null,
                    description: '',
                    affiliate_url: '',
                    general_url: '',
                    logo: null,
                    requirements: [],
                    benefits: [],
                    report_to: [],
                    status: STATUS_OPTIONS[0].value
                });
            }
            setErrors({});
        }
    }, [show, vendor]);

    // Initialize Summernote
    useEffect(() => {
        let $editor = null;

        if (show && editorRef.current && window.$) {
            const $ = window.$;
            $editor = $(editorRef.current);

            // Initialize if not already initialized
            // We can destroy and recreate to ensure clean state or just set code if already init
            // But destruction ensures options are fresh and handlers are bound correctly
            if ($editor.summernote) {
                 try {
                     $editor.summernote('destroy');
                 } catch (e) {}

                $editor.summernote({
                    ...SUMMERNOTE_CONFIG,
                    placeholder: 'Enter vendor description...',
                    callbacks: {
                        onChange: (contents) => {
                            setFormData(prev => ({ ...prev, description: contents }));
                        }
                    }
                });

                // Set initial content from props/state
                const initialContent = vendor?.description || '';
                $editor.summernote('code', initialContent);
            }
        }

        return () => {
            if ($editor) {
                try {
                    $editor.summernote('destroy');
                } catch (e) {}
            }
        };
    }, [show, vendor]); // Re-init if vendor changes in edit mode

    const handleChange = (e) => {
        const { name, value, type, files } = e.target;
        if (type === 'file') {
            const file = files[0];
            let processedFile = file;
            
            // Sanitize filename if it has spaces
            if (file && /\s/.test(file.name)) {
                const sanitizedName = file.name.replace(/\s+/g, '_');
                processedFile = new File([file], sanitizedName, { type: file.type });
            }

            setFormData(prev => ({
                ...prev,
                [name]: processedFile
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleChipsChange = (name, value) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            tier_id: tierId
        });
    };

    const handleDescriptionTemplate = () => {
        const template = `<div>
<div class="alert alert-warning d-flex align-items-start gap-2 border-0 rounded-3 mb-3 p-3 task-modal-alert"><i class="ri-alert-fill text-warning fs-5 mt-0"></i><div class="text-dark task-modal-alert-text"><strong>Important:</strong> Read these instructions carefully before proceeding.</div></div>
<div class="task-content"><div class="styled-content"><h6 class="fw-bold mb-1 text-dark task-modal-section-title">Eligibility</h6><ul class="mb-3 text-dark ps-3 task-modal-list"><li class="mb-1">It's recommended that your business is at least 30 days old.</li><li class="mb-1">Use your exact business legal name, address, and information when applying.</li><li class="mb-1">Orders should be consistent with normal business purchases; do not order luxury items, gift cards, or personal items.</li></ul><h6 class="fw-bold mb-1 text-dark task-modal-section-title">Ordering Guidelines</h6><ul class="mb-3 text-dark ps-3 task-modal-list"><li class="mb-1">Place an initial order of at least $70 worth of shipping, packaging, or cleaning supplies.</li><li class="mb-1">Always make payments on <span class="fw-bold text-black">time</span> to build a positive payment history.</li></ul><h6 class="fw-bold mb-1 text-dark task-modal-section-title">Reporting Timeline</h6><ul class="mb-3 text-dark ps-3 task-modal-list"><li class="mb-1">After making a <span class="fw-bold text-black">purchase</span>, reporting to bureaus typically occurs after two or more on-time payment cycles.</li></ul><hr class="my-3 opacity-25"><p class="text-dark fst-italic mb-0 task-modal-footer-note">Opening an account and making purchases does not guarantee credit reporting. Accounts are reviewed before reporting.</p></div></div>
</div>`;

        if (editorRef.current && window.$) {
            const $editor = window.$(editorRef.current);
            // Always replace content with template
            $editor.summernote('code', template);
        }
    };

    return (
        <div
            className="modal fade flip tier-vendor-modal"
            ref={modalRef}
            tabIndex="-1"
            aria-hidden="true"
        >
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">{isEdit ? 'Edit Vendor' : 'Add New Vendor'}</h5>
                        <button type="button" className="btn-close" onClick={onHide}></button>
                    </div>
                    <div className="modal-body">
                        <form onSubmit={handleSubmit}>
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <label className="form-label">Name <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        name="name"
                                        className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Enter vendor name"
                                    />
                                    {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">Category <span className="text-danger">*</span></label>
                                    <Dropdown
                                        value={formData.category}
                                        options={CATEGORY_OPTIONS}
                                        onChange={(e) => {
                                            setFormData(prev => ({ ...prev, category: e.value }));
                                            if (errors.category) setErrors(prev => ({ ...prev, category: null }));
                                        }}
                                        optionLabel="label"
                                        placeholder="Select a Category"
                                        className={`w-100 ${errors.category ? 'p-invalid' : ''}`}
                                        appendTo="self"
                                    />
                                    {errors.category && <div className="invalid-feedback d-block">{errors.category}</div>}
                                </div>

                                <div className="col-md-12">
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                        <label className="form-label mb-0">Description</label>
                                        <span 
                                            className="text-primary text-decoration-underline" 
                                            style={{ cursor: 'pointer', fontSize: '13px' }} 
                                            onClick={handleDescriptionTemplate}
                                        >
                                            Add Template
                                        </span>
                                    </div>
                                    <textarea ref={editorRef}></textarea>
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label">Affiliate URL</label>
                                    <input
                                        type="text"
                                        name="affiliate_url"
                                        className={`form-control ${errors.affiliate_url ? 'is-invalid' : ''}`}
                                        value={formData.affiliate_url}
                                        onChange={handleChange}
                                        placeholder="Enter affiliate URL"
                                    />
                                    {errors.affiliate_url && <div className="invalid-feedback">{errors.affiliate_url}</div>}
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">General URL <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        name="general_url"
                                        className={`form-control ${errors.general_url ? 'is-invalid' : ''}`}
                                        value={formData.general_url}
                                        onChange={handleChange}
                                        placeholder="Enter general URL"
                                    />
                                    {errors.general_url && <div className="invalid-feedback">{errors.general_url}</div>}
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label">Requirements</label>
                                    <Chips
                                        value={formData.requirements}
                                        onChange={(e) => handleChipsChange('requirements', e.value)}
                                        className="w-100"
                                        separator=","
                                        placeholder="Type and press enter"
                                    />
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label">Benefits</label>
                                    <Chips
                                        value={formData.benefits}
                                        onChange={(e) => handleChipsChange('benefits', e.value)}
                                        className="w-100"
                                        separator=","
                                        placeholder="Type and press enter"
                                    />
                                </div>

                                <div className="col-md-12">
                                    <label className="form-label d-block">Report To</label>
                                    <div className="d-flex flex-wrap gap-3">
                                        {REPORT_TO_OPTIONS.map((option) => (
                                            <div key={option.value} className="form-check">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id={`report_${option.value}`}
                                                    value={option.value}
                                                    checked={formData.report_to.includes(option.value)}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        const value = option.value;
                                                        setFormData(prev => {
                                                            const current = prev.report_to || [];
                                                            if (checked) {
                                                                return { ...prev, report_to: [...current, value] };
                                                            } else {
                                                                return { ...prev, report_to: current.filter(item => item !== value) };
                                                            }
                                                        });
                                                    }}
                                                />
                                                <label className="form-check-label" htmlFor={`report_${option.value}`}>
                                                    {option.label}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="col-md-12">
                                    <label className="form-label">Logo <small className="text-muted">(recommended size: 300 x 100)</small></label>
                                    <div 
                                        className={`border rounded-3 d-flex align-items-center justify-content-center position-relative ${errors.logo ? 'border-danger' : 'border-secondary-subtle'}`}
                                        style={{ 
                                            height: '100px', 
                                            backgroundColor: '#f8f9fa',
                                            borderStyle: 'dashed',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <input
                                            type="file"
                                            name="logo"
                                            id="logo-upload"
                                            className="d-none"
                                            onChange={handleChange}
                                            accept="image/*"
                                        />
                                        
                                        {(formData.logo instanceof File || (vendor?.logo && !formData.logo)) ? (
                                            <div className="w-100 h-100 d-flex align-items-center justify-content-center p-2 position-relative">
                                                <img 
                                                    src={formData.logo instanceof File ? URL.createObjectURL(formData.logo) : (typeof vendor.logo === 'string' ? vendor.logo.replace(/ /g, '%20') : vendor.logo)} 
                                                    alt="Logo" 
                                                    className="img-fluid" 
                                                    style={{ maxHeight: '100%', objectFit: 'contain' }}
                                                />
                                                <div 
                                                    className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                                                    style={{ backgroundColor: 'rgba(0,0,0,0.5)', opacity: 0, transition: 'opacity 0.2s', cursor: 'pointer' }}
                                                    onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                                                    onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
                                                    onClick={() => document.getElementById('logo-upload').click()}
                                                >
                                                    <span className="btn btn-sm btn-light rounded-pill">
                                                        <i className="ri-upload-2-fill me-1"></i> Change
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <label 
                                                htmlFor="logo-upload" 
                                                className="w-100 h-100 d-flex flex-column align-items-center justify-content-center cursor-pointer text-muted"
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <i className="ri-image-add-line fs-3 mb-1 opacity-50"></i>
                                                <small className="fw-medium" style={{ fontSize: '0.75rem' }}>Click to upload</small>
                                            </label>
                                        )}
                                    </div>
                                    {errors.logo && <div className="invalid-feedback d-block">{errors.logo}</div>}
                                </div>

                                <div className="col-md-6">
                                    <label className="form-label">Status</label>
                                    <Dropdown
                                        value={formData.status}
                                        options={STATUS_OPTIONS}
                                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.value }))}
                                        optionLabel="label"
                                        className="w-100"
                                        appendTo="self"
                                    />
                                </div>
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

export default TierVendorModal;
