import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { createTier, updateTier, getTier } from '../../modules/tiers/services';
import FormLoader from '../../components/Loader/FormLoader';
import TierTasks from './components/TierTasks';
import TierVendors from './components/TierVendors';
import { TIER_STATUS_OPTIONS } from '../../config/creditBuilder';   


export default function TierForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const isEditMode = !!id;

    const [loading, setLoading] = useState(false);
    // initialLoading removed, replaced by query's isLoading
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        name: '',
        title: '',
        subtitle: '',
        description: '',
        status: TIER_STATUS_OPTIONS[0].value,
        has_vendor: 0
    });

    // Initialize activeTab from navigation state or default to 'tierInfo'
    const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'tierInfo');

    // Summernote Ref
    const editorRef = useRef(null);
    const vendorsRef = useRef(null);

    // Update activeTab when location state changes
    useEffect(() => {
        if (location.state?.activeTab) {
            setActiveTab(location.state.activeTab);
        }
    }, [location.state]);

    // React Query for fetching tier data
    const { data: tierData, isLoading: isTierLoading, isError } = useQuery({
        queryKey: ['tier', id],
        queryFn: async () => {
            const response = await getTier(id);
            return response.data || response;
        },
        enabled: isEditMode,
        refetchOnWindowFocus: false, // Prevent refetching on window focus to avoid overwriting unsaved changes
    });

    // Populate form data when tierData is available
    useEffect(() => {
        if (tierData) {
            setFormData({
                name: tierData.name || '',
                title: tierData.title || '',
                subtitle: tierData.subtitle || '',
                description: tierData.description || '',
                status: tierData.status,
                has_vendor: tierData.has_vendor ? 1 : 0
            });
        }
    }, [tierData]);

    // Initialize Summernote
    useEffect(() => {
        if (activeTab === 'tierInfo' && !isTierLoading && editorRef.current) {
            const $ = window.$;
            const $editor = $(editorRef.current);

            // Destroy previous instance to be safe
            if ($editor.summernote) {
                // Initialize
                $editor.summernote({
                    height: 200,
                    placeholder: 'Enter description...',
                    dialogsInBody: true,
                    callbacks: {
                        onChange: (contents) => {
                            setFormData(prev => ({ ...prev, description: contents }));
                            if (errors.description) {
                                setErrors(prev => ({ ...prev, description: null }));
                            }
                        }
                    },
                    toolbar: [
                        ['style', ['style']],
                        ['font', ['bold', 'underline', 'clear']],
                        ['para', ['ul', 'ol', 'paragraph']],
                        ['color', ['color']],
                        ['table', ['table']],
                        ['insert', ['link', 'picture', 'video']],
                        ['view', ['fullscreen', 'codeview', 'help']]
                    ]
                });

                // Set initial content
                if (formData.description) {
                    $editor.summernote('code', formData.description);
                }
            }
        }

        return () => {
            if (window.$ && editorRef.current) {
                const $ = window.$;
                try {
                    $(editorRef.current).summernote('destroy');
                } catch (e) { }
            }
        };
    }, [activeTab, isTierLoading]);

    // Removed manual useEffect fetching logic replaced by useQuery


    const handleDefaultTemplate = () => {
        const defaultTemplate = `<div class="p-4 mb-3 rounded d-flex align-items-start gap-2 position-relative" style="background: #f5f1e8; border: 1px solid #e5dac4;">
    <small class="position-absolute top-0 end-0 m-2 text-muted" style="font-size: 11px;">Progress updates only after accounts</small>
    <div class="flex-shrink-0" style="font-size: 30px; color: #f59e0b; margin-top: -4px;">
        <i class="ri-lightbulb-line"></i>
    </div>
    <div>
        <h5 class="fw-semibold mb-2" style="font-size: 16px; color: #1a1a1a;">Before Starting Tier 1, Please Read Carefully.</h5>
        <ul class="mb-0 ps-3" style="font-size: 13px; color: #3a3a3a; line-height: 1.5;">
            <li class="mb-1">Tier 1 requires <b>opening accounts</b> with approved starter vendors below.</li>
            <li class="mb-1">Every business is unique; always <b>read</b> guidance before acting.</li>
            <li class="mb-1">Account progress is only confirmed after opening and verified by FCH.</li>
            <li>Do not apply for vendors outside this list. Doing so may result in denials and hard inquiries.</li>
        </ul>
    </div>
</div>`;

        if (editorRef.current && window.$) {
            const $editor = window.$(editorRef.current);
            if ($editor.summernote('isEmpty')) {
                $editor.summernote('code', defaultTemplate);
            } else {
                $editor.summernote('pasteHTML', defaultTemplate);
            }
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        setLoading(true);
        try {
            if (activeTab === 'tierInfo') {
                let result;
                if (isEditMode) {
                    result = await updateTier(Number(id), formData);
                    // Show success toast
                    toast.success(result?.message || 'Tier updated successfully');
                    // Switch to Task Information tab after a short delay
                    setTimeout(() => {
                        setActiveTab('taskInfo');
                    }, 500);
                } else {
                    result = await createTier(formData);
                    // Show success toast
                    toast.success(result?.message || 'Tier created successfully');
                    // Get the newly created tier ID and navigate to edit mode with Task Information tab
                    const newTierId = result?.data?.id || result?.id;
                    if (newTierId) {
                        setTimeout(() => {
                            navigate(`/tiers/${newTierId}`, { state: { activeTab: 'taskInfo' } });
                        }, 500);
                    }
                }
            }
        } catch (err) {
            console.error(err);
            if (err.response?.data?.errors) {
                // Validation errors from backend - set in state for field display only
                const backendErrors = err.response.data.errors;
                const errorObj = {};
                Object.entries(backendErrors).forEach(([field, errorMsg]) => {
                    const message = Array.isArray(errorMsg) ? errorMsg[0] : errorMsg;
                    errorObj[field] = message;
                });
                setErrors(errorObj);
                // Do NOT show any toast for errors - only field-level display
            }
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (checked ? 1 : 0) : (type === 'number' ? Number(value) : value)
        }));
    };

    // Track selected vendors
    const [selectedVendorsCount, setSelectedVendorsCount] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            if (vendorsRef.current && activeTab === 'vendorInfo') {
                const selected = vendorsRef.current.getSelectedVendors();
                setSelectedVendorsCount(selected?.length || 0);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [activeTab]);

    if (isEditMode && isTierLoading) {
        return (
            <div className="page-content">
                <ToastContainer position="top-right" autoClose={3000} />
                <div className="container-fluid">
                    <div className="row pb-1 mb-3 page-subheader-sticky bg-body">
                        <div className="col-12">
                            <div className="d-flex align-items-lg-center flex-lg-row flex-column">
                                <div className="flex-grow-1">
                                    <h4 className="fs-20 mb-1">Edit Tier</h4>
                                    <nav aria-label="breadcrumb">
                                        <ol className="breadcrumb m-0">
                                            <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                            <li className="breadcrumb-item"><Link to="/tiers">Manage Tier</Link></li>
                                            <li className="breadcrumb-item active">Edit</li>
                                        </ol>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-xxl-12">
                            <div className="card">
                                <div className="card-body p-4">
                                    <FormLoader count={6} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    return (
        <div className="page-content">
            <ToastContainer position="top-right" autoClose={3000} />
            <div className="container-fluid">
                <div className="row pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-lg-center flex-lg-row flex-column">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">{isEditMode ? 'Edit Tier' : 'Add New Tier'}</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item"><Link to="/tiers">Manage Tier</Link></li>
                                        <li className="breadcrumb-item active">{isEditMode ? 'Edit' : 'Add'}</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
                                <Link to="/tiers" className="btn btn-outline-secondary w-lg waves-effect">
                                    <i className="ri-arrow-left-line align-middle me-1"></i> Back
                                </Link>

                                {/* Show Save button only for Tier Info tab */}
                                {activeTab === 'tierInfo' && (
                                    <button
                                        type="button"
                                        className="btn btn-primary w-lg waves-effect"
                                        onClick={handleSubmit}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <i className="ri-save-3-line align-middle me-1"></i> Save
                                            </>
                                        )}
                                    </button>
                                )}

                                {/* Show Add Vendor or Delete Selected button for Vendors tab */}
                                {activeTab === 'vendorInfo' && (
                                    selectedVendorsCount > 0 ? (
                                        <div className="btn-group">
                                            <button type="button" className="btn bg-success text-white fw-medium">
                                                Actions
                                            </button>
                                            <button type="button" className="btn bg-success text-white fw-medium dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
                                                <span className="visually-hidden">Toggle dropdown</span>
                                            </button>
                                            <ul className="dropdown-menu dropdown-menu-end">
                                                <li>
                                                    <button
                                                        type="button"
                                                        className="dropdown-item text-danger"
                                                        onClick={() => {
                                                            if (vendorsRef.current) {
                                                                vendorsRef.current.openDeleteModal();
                                                            }
                                                        }}
                                                    >
                                                        <i className="ri-delete-bin-6-line me-1 align-bottom"></i> Delete Selected
                                                    </button>
                                                </li>
                                            </ul>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            className="btn btn-primary w-lg waves-effect"
                                            onClick={() => {
                                                if (vendorsRef.current) {
                                                    vendorsRef.current.openAddModal();
                                                }
                                            }}
                                        >
                                            <i className="ri-add-line align-middle me-1"></i> Add Vendor
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-xxl-12">
                        <div className="card">
                            <div className="card-header">
                                <ul className="nav nav-tabs-custom rounded card-header-tabs border-bottom-0" role="tablist">
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${activeTab === 'tierInfo' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('tierInfo')}
                                            type="button"
                                            role="tab"
                                        >
                                            <i className="fas fa-home"></i> Tier Information
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button
                                            className={`nav-link ${activeTab === 'taskInfo' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('taskInfo')}
                                            type="button"
                                            role="tab"
                                        >
                                            <i className="far fa-user"></i> Task Information
                                        </button>
                                    </li>
                                    {isEditMode && formData.has_vendor === 1 && (
                                        <li className="nav-item">
                                            <button
                                                className={`nav-link ${activeTab === 'vendorInfo' ? 'active' : ''}`}
                                                onClick={() => setActiveTab('vendorInfo')}
                                                type="button"
                                                role="tab"
                                            >
                                                <i className="fas fa-store"></i> Vendors
                                            </button>
                                        </li>
                                    )}
                                </ul>
                            </div>
                            <div className="card-body p-4">
                                {activeTab === 'tierInfo' && (
                                    <form>
                                        <div className="row g-3">
                                            {/* Row 1: Name and Title */}
                                            <div className="col-md-6">
                                                <label htmlFor="name" className="form-label">Name <span className="text-danger">*</span></label>
                                                <input
                                                    type="text"
                                                    className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                                                    id="name"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={(e) => {
                                                        handleChange(e);
                                                        setErrors({ ...errors, name: null });
                                                    }}
                                                    placeholder="e.g. Tier 0"
                                                />
                                                {errors.name && (
                                                    <div className="invalid-feedback d-block">
                                                        {errors.name}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="col-md-6">
                                                <label htmlFor="title" className="form-label">Title <span className="text-danger">*</span></label>
                                                <input
                                                    type="text"
                                                    className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                                                    id="title"
                                                    name="title"
                                                    value={formData.title}
                                                    onChange={(e) => {
                                                        handleChange(e);
                                                        setErrors({ ...errors, title: null });
                                                    }}
                                                    placeholder="e.g. Business Foundation & Compliance"
                                                />
                                                {errors.title && (
                                                    <div className="invalid-feedback d-block">
                                                        {errors.title}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Row 2: Subtitle and Vendor */}
                                            <div className="col-md-6">
                                                <label htmlFor="subtitle" className="form-label">Subtitle</label>
                                                <input
                                                    type="text"
                                                    className={`form-control ${errors.subtitle ? 'is-invalid' : ''}`}
                                                    id="subtitle"
                                                    name="subtitle"
                                                    value={formData.subtitle}
                                                    onChange={(e) => {
                                                        handleChange(e);
                                                        setErrors({ ...errors, subtitle: null });
                                                    }}
                                                    placeholder="Enter subtitle..."
                                                />
                                                {errors.subtitle && (
                                                    <div className="invalid-feedback d-block">
                                                        {errors.subtitle}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="col-md-12">
                                                <div className="form-check form-switch form-switch-lg mt-2">
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        role="switch"
                                                        id="has_vendor"
                                                        name="has_vendor"
                                                        checked={formData.has_vendor === 1}
                                                        onChange={handleChange}
                                                    />
                                                    <label className="form-check-label" htmlFor="has_vendor">
                                                        Has Vendor
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Row 3: Description */}
                                            <div className="col-md-12">
                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                    <label htmlFor="description" className="form-label mb-0">Description</label>
                                                    <span 
                                                        className="text-primary text-decoration-underline" 
                                                        style={{ cursor: 'pointer', fontSize: '13px' }} 
                                                        onClick={handleDefaultTemplate}
                                                    >
                                                        Add default Template
                                                    </span>
                                                </div>
                                                <div className={errors.description ? 'is-invalid' : ''}>
                                                    <textarea
                                                        ref={editorRef}
                                                        id="description"
                                                        name="description"
                                                    />
                                                </div>
                                                {errors.description && (
                                                    <div className="invalid-feedback d-block">
                                                        {errors.description}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </form>
                                )}
                                {activeTab === 'taskInfo' && (
                                    <TierTasks tierId={Number(id)} />
                                )}
                                {activeTab === 'vendorInfo' && (
                                    <TierVendors ref={vendorsRef} tierId={Number(id)} />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
