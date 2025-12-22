import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { Dropdown } from 'primereact/dropdown';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { createTier, updateTier, getTier } from '../../modules/tiers/services';
import { TIER_STATUS_OPTIONS } from '../../config/tierOptions';
import FormLoader from '../../components/Loader/FormLoader';
import TierTasks from './components/TierTasks';

// Import Summernote JS (it will attach itself to the global jQuery)
import 'summernote/dist/summernote-lite.js';

export default function TierForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const isEditMode = !!id;

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(isEditMode);
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        name: '',
        title: '',
        subtitle: '',
        description: '',
        status: 'Active'
    });

    // Initialize activeTab from navigation state or default to 'tierInfo'
    const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'tierInfo');

    // Summernote Ref
    const editorRef = useRef(null);

    // Update activeTab when location state changes
    useEffect(() => {
        if (location.state?.activeTab) {
            setActiveTab(location.state.activeTab);
        }
    }, [location.state]);

    // Initialize Summernote
    useEffect(() => {
        if (activeTab === 'tierInfo' && !initialLoading && editorRef.current) {
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
                        ['color', ['color']],
                        ['para', ['ul', 'ol', 'paragraph']],
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
    }, [activeTab, initialLoading]);

    useEffect(() => {
        if (isEditMode) {
            const loadTier = async () => {
                setInitialLoading(true); // Ensure loader shows when ID changes
                try {
                    const response = await getTier(id);
                    // Extract the actual tier data from response.data
                    const tierData = response.data || response;
                    setFormData({
                        name: tierData.name || '',
                        title: tierData.title || '',
                        subtitle: tierData.subtitle || '',
                        description: tierData.description || '',
                        status: ['active', 'Active'].includes(tierData.status) ? 'Active' : 'Inactive'
                    });
                } catch (err) {
                    console.error('Failed to load tier:', err);
                    toast.error('Failed to load tier details');
                    navigate('/tiers');
                } finally {
                    setInitialLoading(false);
                }
            };
            loadTier();
        }
    }, [id, isEditMode, navigate]);

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
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));
    };

    if (initialLoading) {
        return (
            <div className="page-content">
                <ToastContainer position="top-right" autoClose={3000} />
                <div className="container-fluid">
                    <div className="row pb-1 page-subheader-sticky bg-body">
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

                                            {/* Row 2: Subtitle and Status */}
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
                                            <div className="col-md-6">
                                                <label className="form-label">Status </label>
                                                <Dropdown
                                                    value={formData.status}
                                                    options={TIER_STATUS_OPTIONS}
                                                    onChange={(e) => {
                                                        setFormData({ ...formData, status: e.value });
                                                        setErrors({ ...errors, status: null });
                                                    }}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    placeholder="Select status..."
                                                    className={`w-100 ${errors.status ? 'p-invalid' : ''}`}
                                                />
                                                {errors.status && (
                                                    <div className="invalid-feedback d-block">
                                                        {errors.status}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Row 3: Description */}
                                            <div className="col-md-12">
                                                <label htmlFor="description" className="form-label">Description</label>
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
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
