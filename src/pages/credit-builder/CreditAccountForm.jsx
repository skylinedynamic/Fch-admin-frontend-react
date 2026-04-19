import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Dropdown } from 'primereact/dropdown';
import { toast } from 'react-toastify';
import FormLoader from '../../components/Loader/FormLoader';
import { createCreditAccount, updateCreditAccount, getCreditAccount } from '../../modules/credit-accounts/services';
import { usePermissions } from '../../lib/auth/usePermissions';
import { FileManagerModal } from '../../components/FileManagerModal/FileManagerModal';
import { STATUS_OPTIONS, CREDIT_CATEGORY_OPTIONS } from '../../config/creditBuilder';

const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || '';

export default function CreditAccountForm() {
    const { hasPermission } = usePermissions();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(isEditMode);
    const [showFileManager, setShowFileManager] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        card_name: '',
        issuer: '',
        credit_category: '',
        typical_personal_fico_min: '',
        time_in_business_min_months: '',
        image_url: '',
        reference_url: '',
        status: 'Active',
        personal_guarantee: '',
        business_credit_profile: '',
        final_approval: ''
    });

    useEffect(() => {
        if (isEditMode) {
            const loadAccount = async () => {
                try {
                    const response = await getCreditAccount(id);
                    const data = response.data || response;
                    setFormData({
                        ...data,
                        typical_personal_fico_min: data.typical_personal_fico_min || '',
                        time_in_business_min_months: data.time_in_business_min_months || '',
                        status: data.status || 'Active',
                        personal_guarantee: data.personal_guarantee || '',
                        business_credit_profile: data.business_credit_profile || '',
                        final_approval: data.final_approval || ''
                    });
                } catch (err) {
                    toast.error('Failed to load account details');
                    navigate('/credit-accounts');
                } finally {
                    setInitialLoading(false);
                }
            };
            loadAccount();
        }
    }, [id, isEditMode, navigate]);

    const handleFileSelection = (selectedFiles) => {
        if (!selectedFiles || selectedFiles.length === 0) return;

        const file = selectedFiles[0];
        const extension = file.path.split('.').pop()?.toLowerCase();
        const allowed = ['jpg', 'jpeg', 'png', 'svg', 'webp', 'avif'];

        if (!extension || !allowed.includes(extension)) {
            toast.error(`File type ".${extension}" not allowed. Please select an image file.`);
            return;
        }

        setPreviewUrl(file.url);

        // Ensure accurate path is set (prepended with entity directory)
        const cleanPath = file.path.trim().replace(/^\/+/, '');
        const fullPath = `credit-accounts/${cleanPath}`;

        setFormData(prev => ({
            ...prev,
            image_url: fullPath
        }));
        setShowFileManager(false);
    };

    const getImageSrc = () => {
        const buildUrl = (path) => {
            if (!path || typeof path !== 'string' || path.startsWith('http') || path.startsWith('blob:')) {
                return path;
            }
            const baseUrl = STORAGE_URL.trim().replace(/\/+$/, '');
            let cleanPath = path.trim().replace(/^\/+/, '');
            // Consolidate the URL and encode spaces/special characters
            const fullUrl = `${baseUrl}/${cleanPath}`.replace(/([^:]\/)\/+/g, "$1");
            return encodeURI(fullUrl);
        };

        if (previewUrl && formData.image_url && !formData.image_url.startsWith('http')) {
            return buildUrl(previewUrl);
        }

        if (formData.full_image_url) {
            return formData.full_image_url;
        }

        if (formData.image_url && typeof formData.image_url === 'string') {
            return buildUrl(formData.image_url);
        }

        return null;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            if (isEditMode) {
                await updateCreditAccount(id, formData);
                toast.success('Credit Account updated successfully');
            } else {
                await createCreditAccount(formData);
                toast.success('Credit Account created successfully');
            }
            navigate('/credit-accounts');
        } catch (err) {
            console.error(err);
            if (err.response?.status === 422) {
                setErrors(err.response.data.errors || {});
            } else {
                const errorMsg = err.response?.data?.message || 'Failed to save account';
                toast.error(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-content page-content-fit">
            <div className="container-fluid">
                {/* Page Header */}
                <div className="row pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-lg-center flex-lg-row flex-column py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">{isEditMode ? 'Edit Credit Account' : 'Add Credit Account'}</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item"><Link to="/credit-accounts">Credit Accounts</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">{isEditMode ? 'Edit' : 'Add'}</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
                                <Link to="/credit-accounts" className="btn btn-outline-secondary w-lg waves-effect">
                                    <i className="ri-arrow-left-line align-middle me-1"></i> Back
                                </Link>
                                {((isEditMode && hasPermission('update credit accounts')) || (!isEditMode && hasPermission('create credit accounts'))) && (
                                    <button
                                        type="submit"
                                        form="credit-account-form"
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
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-12">
                        <div className="card">
                            <div className="card-header">
                                <ul className="nav nav-tabs-custom rounded card-header-tabs border-bottom-0" role="tablist">
                                    <li className="nav-item">
                                        <button className="nav-link" type="button" role="tab">
                                            <i className="ri-bank-card-line me-1"></i> Card Details
                                        </button>
                                    </li>
                                </ul>
                            </div>
                            <div className="card-body p-4">
                                {initialLoading ? (
                                    <FormLoader count={8} />
                                ) : (
                                    <form id="credit-account-form" onSubmit={handleSubmit}>
                                        <div className="row g-4">

                                            {/* Row 1: Logo and Card Info */}
                                            <div className="col-md-5 text-center d-flex flex-column align-items-center justify-content-center pe-lg-4 border-end-xl">
                                                <div className="position-relative w-100 px-lg-4">
                                                    <div
                                                        className={`p-3 bg-light rounded-3 border-dashed border-2 d-flex align-items-center justify-content-center w-100 ${errors.image_url ? 'border-danger' : 'border-secondary'}`}
                                                        style={{ minHeight: '180px', transition: 'all 0.3s ease' }}
                                                    >
                                                        {getImageSrc() ? (
                                                            <img
                                                                src={getImageSrc()}
                                                                alt="Preview"
                                                                className="rounded img-fluid shadow-sm"
                                                                style={{ maxWidth: '100%', maxHeight: '160px', objectFit: 'contain' }}
                                                            />
                                                        ) : (
                                                            <div className="text-muted text-center py-4">
                                                                <i className="ri-image-add-line fs-32 d-block mb-2 text-primary opacity-75"></i>
                                                                <span className="small fw-medium">Upload Card Image Preview</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {errors.image_url && <div className="text-danger small mt-2 w-100 text-start">{errors.image_url}</div>}
                                                    <div className="avatar-xs p-0 rounded-circle profile-photo-edit" style={{ position: 'absolute', bottom: '-15px', right: '15px', zIndex: 1, border: '3px solid #fff' }}>
                                                        <button
                                                            type="button"
                                                            className="btn p-0 border-0 rounded-circle profile-photo-edit avatar-xs"
                                                            onClick={() => setShowFileManager(true)}
                                                            title="Upload card image"
                                                        >
                                                            <span className="avatar-title rounded-circle bg-primary text-white shadow-lg">
                                                                <i className="ri-camera-fill"></i>
                                                            </span>
                                                        </button>
                                                    </div>
                                                </div>

                                                <FileManagerModal
                                                    isOpen={showFileManager}
                                                    toggle={() => setShowFileManager(!showFileManager)}
                                                    selectionMode={true}
                                                    onSelectFiles={handleFileSelection}
                                                    entityType="credit-accounts"
                                                    entityId={id || formData?.id || 0}
                                                    getAll={true}
                                                />
                                            </div>

                                            <div className="col-md-7 ps-lg-4">
                                                <div className="row g-4">
                                                    <div className="col-12">
                                                        <label className="form-label">Card Name <span className="text-danger">*</span></label>
                                                        <input type="text" name="card_name" className={`form-control ${errors.card_name ? 'is-invalid' : ''}`} value={formData.card_name} onChange={handleChange} placeholder="e.g. Chase Sapphire Reserve" />
                                                        {errors.card_name && <div className="invalid-feedback">{errors.card_name}</div>}
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="form-label">Issuer <span className="text-danger">*</span></label>
                                                        <input type="text" name="issuer" className={`form-control ${errors.issuer ? 'is-invalid' : ''}`} value={formData.issuer} onChange={handleChange} placeholder="e.g. Chase" />
                                                        {errors.issuer && <div className="invalid-feedback">{errors.issuer}</div>}
                                                    </div>
                                                    <div className="col-12">
                                                        <label className="form-label">Reference URL <span className="text-muted small">(Optional)</span></label>
                                                        <div className="input-group">
                                                            <span className="input-group-text bg-light border-end-0 text-muted"><i className="ri-link"></i></span>
                                                            <input type="text" name="reference_url" className={`form-control border-start-0 ps-0 ${errors.reference_url ? 'is-invalid' : ''}`} value={formData.reference_url} onChange={handleChange} placeholder="https://..." />
                                                            {errors.reference_url && <div className="invalid-feedback">{errors.reference_url}</div>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-12 mt-4 mb-0">
                                                <h5 className="text-primary fs-16 mb-1">Underwriting & Criteria</h5>
                                                <hr className="mt-1" />
                                            </div>

                                            <div className="col-lg-4">
                                                <div className="mb-3">
                                                    <label className="form-label">FICO Min <span className="text-danger">*</span></label>
                                                    <div className="input-group">
                                                        <span className="input-group-text bg-light text-muted"><i className="ri-dashboard-line"></i></span>
                                                        <input type="number" name="typical_personal_fico_min" className={`form-control ${errors.typical_personal_fico_min ? 'is-invalid' : ''}`} value={formData.typical_personal_fico_min} onChange={handleChange} placeholder="e.g. 680" />
                                                        {errors.typical_personal_fico_min && <div className="invalid-feedback">{errors.typical_personal_fico_min}</div>}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-lg-4">
                                                <div className="mb-3">
                                                    <label className="form-label">Min Months <span className="text-danger">*</span></label>
                                                    <div className="input-group">
                                                        <span className="input-group-text bg-light text-muted"><i className="ri-calendar-event-line"></i></span>
                                                        <input type="number" name="time_in_business_min_months" className={`form-control ${errors.time_in_business_min_months ? 'is-invalid' : ''}`} value={formData.time_in_business_min_months} onChange={handleChange} placeholder="Months" />
                                                        {errors.time_in_business_min_months && <div className="invalid-feedback">{errors.time_in_business_min_months}</div>}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-lg-4">
                                                <div className="mb-3">
                                                    <label className="form-label">Credit Category</label>
                                                    <div className="p-inputgroup flex-1">
                                                        <span className="p-inputgroup-addon bg-light text-muted border border-end-0" style={{ borderRight: 'none' }}><i className="ri-shape-2-line"></i></span>
                                                        <Dropdown
                                                            value={formData.credit_category}
                                                            options={CREDIT_CATEGORY_OPTIONS}
                                                            onChange={(e) => handleInputChange({ target: { name: 'credit_category', value: e.value } })}
                                                            optionLabel="label"
                                                            optionValue="value"
                                                            placeholder="Select Category"
                                                            className={`w-100 border-start-0 shadow-none ${errors.credit_category ? 'p-invalid' : ''}`}
                                                            style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                                                        />
                                                    </div>
                                                    {errors.credit_category && <small className="p-error">{errors.credit_category}</small>}
                                                </div>
                                            </div>

                                            <div className="col-lg-4">
                                                <div className="mb-3">
                                                    <label className="form-label">Personal Guarantee</label>
                                                    <div className="input-group">
                                                        <span className="input-group-text bg-light text-muted"><i className="ri-shield-user-line"></i></span>
                                                        <input
                                                            type="text"
                                                            name="personal_guarantee"
                                                            className={`form-control ${errors.personal_guarantee ? 'is-invalid' : ''}`}
                                                            value={formData.personal_guarantee}
                                                            onChange={handleChange}
                                                        />
                                                        {errors.personal_guarantee && <div className="invalid-feedback">{errors.personal_guarantee}</div>}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-lg-4">
                                                <div className="mb-3">
                                                    <label className="form-label">Business Credit Profile</label>
                                                    <div className="input-group">
                                                        <span className="input-group-text bg-light text-muted"><i className="ri-briefcase-line"></i></span>
                                                        <input
                                                            type="text"
                                                            name="business_credit_profile"
                                                            className={`form-control ${errors.business_credit_profile ? 'is-invalid' : ''}`}
                                                            value={formData.business_credit_profile}
                                                            onChange={handleChange}
                                                        />
                                                        {errors.business_credit_profile && <div className="invalid-feedback">{errors.business_credit_profile}</div>}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-lg-4">
                                                <div className="mb-3">
                                                    <label className="form-label">Final Approval</label>
                                                    <div className="input-group">
                                                        <span className="input-group-text bg-light text-muted"><i className="ri-checkbox-circle-line"></i></span>
                                                        <input
                                                            type="text"
                                                            name="final_approval"
                                                            className={`form-control ${errors.final_approval ? 'is-invalid' : ''}`}
                                                            value={formData.final_approval}
                                                            onChange={handleChange}
                                                        />
                                                        {errors.final_approval && <div className="invalid-feedback">{errors.final_approval}</div>}
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
