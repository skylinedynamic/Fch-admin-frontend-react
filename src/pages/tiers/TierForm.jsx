import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import PageHeader from '../common/PageHeader';
import { Dropdown } from 'primereact/dropdown';

import { toast } from 'react-toastify';

import { createTier, updateTier, getTier } from '../../modules/tiers/services';
import FormLoader from '../../components/Loader/FormLoader';
import TierTasks from './components/TierTasks';
import TierVendors from './components/TierVendors';
import { useSummernote } from '../../hooks/useSummernote';
import { usePermissions } from '../../lib/auth/usePermissions';


export default function TierForm() {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const isEditMode = !!id;
    const { hasPermission } = usePermissions();

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(isEditMode);
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        name: '',
        title: '',
        subtitle: '',
        description: '',
        status: 'Active',
        has_vendor: 0
    });

    // Initialize activeTab from navigation state or default to 'tierInfo'
    const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'tierInfo');
    const [tierCode, setTierCode] = useState('');

    const vendorsRef = useRef(null);
    const tasksRef = useRef(null);

    // Use global Summernote hook
    const { editorRef: descriptionRef } = useSummernote('description', formData.description, (e) => {
        const { value } = e.target;
        setFormData(prev => ({ ...prev, description: value }));
        if (errors.description) {
            setErrors(prev => ({ ...prev, description: null }));
        }
    }, {
        height: 200,
        placeholder: 'Enter description...',
        dialogsInBody: true
    }, activeTab === 'tierInfo' && !initialLoading);

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
                        status: ['active', 'Active'].includes(tierData.status) ? 'Active' : 'Inactive',
                        has_vendor: tierData.has_vendor || 0
                    });
                    setTierCode(tierData.code || '');
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
                    // setTimeout(() => {
                    //     setActiveTab('taskInfo');
                    // }, 500);
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

    // Track selected count for vendors and tasks
    const [selectedVendorsCount, setSelectedVendorsCount] = useState(0);
    const [selectedTasksCount, setSelectedTasksCount] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            if (vendorsRef.current && activeTab === 'vendorInfo') {
                const selected = vendorsRef.current.getSelectedVendors();
                setSelectedVendorsCount(selected?.length || 0);
            }
            if (tasksRef.current && activeTab === 'taskInfo') {
                // If T0, selection is disabled anyway, but let's be safe
                setSelectedTasksCount(tierCode === 'T1' ? (tasksRef.current.selectedCount || 0) : 0);
            }
        }, 100);

        return () => clearInterval(interval);
    }, [activeTab]);

    if (initialLoading) {
        return (
            <div className="page-content">
                <div className="container-fluid">
                    <PageHeader 
                        title="Edit Tier" 
                        breadcrumbs={[
                            { label: 'Manage Tier', path: '/tiers' },
                            { label: 'Edit' }
                        ]} 
                    />
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
            <div className="container-fluid">
                <PageHeader 
                    title={isEditMode ? 'Edit Tier' : 'Add New Tier'} 
                    breadcrumbs={[
                        { label: 'Manage Tier', path: '/tiers' },
                        { label: isEditMode ? 'Edit' : 'Add' }
                    ]} 
                >
                            <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
                                <Link to="/tiers" className="btn btn-outline-secondary w-lg waves-effect">
                                    <i className="ri-arrow-left-line align-middle me-1"></i> Back
                                </Link>

                                {hasPermission('update tier') && (
                                    <>
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
                                                        Updating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="ri-save-3-line align-middle me-1"></i> Update
                                                    </>
                                                )}
                                            </button>
                                        )}

                                        {/* Show Add Task or Delete Selected button for Task Information tab */}
                                        {activeTab === 'taskInfo' && (
                                            selectedTasksCount > 0 ? (
                                                tierCode === 'T1' && (
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
                                                                        if (tasksRef.current) {
                                                                            tasksRef.current.openDeleteModal();
                                                                        }
                                                                    }}
                                                                >
                                                                    <i className="ri-delete-bin-6-line me-1 align-bottom"></i> Delete Selected
                                                                </button>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                )
                                            ) : (
                                                tierCode === 'T1' && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary w-lg waves-effect"
                                                        onClick={() => {
                                                            if (tasksRef.current) {
                                                                tasksRef.current.openAddModal();
                                                            }
                                                        }}
                                                    >
                                                        <i className="ri-add-line align-middle me-1"></i> Add Task
                                                    </button>
                                                )
                                            )
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
                                    </>
                                )}
                            </div>
                </PageHeader>

                <div className="row tier-section">
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
                                    {formData.has_vendor === 1 && (
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
                                            {/* <div className="col-md-6">
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
                                            </div> */}

                                            {/* Row 3: Description */}
                                            <div className="col-md-12">
                                                <label htmlFor="description" className="form-label">Description</label>
                                                <div className={errors.description ? 'is-invalid' : ''}>
                                                    <textarea
                                                        ref={descriptionRef}
                                                        id="description"
                                                        name="description"
                                                        className="d-none"
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
                                    <TierTasks ref={tasksRef} tierId={Number(id)} tierCode={tierCode} />
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