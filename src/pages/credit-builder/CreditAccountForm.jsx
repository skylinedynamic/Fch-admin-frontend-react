import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import FormLoader from '../../components/Loader/FormLoader';
import { createCreditAccount, updateCreditAccount, getCreditAccount } from '../../modules/credit-accounts/services';
import { usePermissions } from '../../lib/auth/usePermissions';
import { FileManagerModal } from '../../components/FileManagerModal/FileManagerModal';
import { STATUS_OPTIONS, YES_NO_OPTIONS, CATEGORY_OPTIONS } from '../../config/creditBuilder';

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
        difficulty_rank: '',
        difficulty_tier: '',
        engine_eligibility_band: '',
        approval_level: '',
        typical_personal_fico_min: '',
        typical_personal_fico_ideal: '',
        time_in_business_min_months: '',
        revenue_expectation: '',
        business_credit_required: 'No',
        pg_required: 'No',
        cash_based: '',
        velocity_sensitive: '',
        relationship_required: 'No',
        portal_tier_unlock: '',
        borrower_exposure: '',
        sequencing_priority: '',
        image_url: '',
        reference_url: '',
        status: 'Active'
    });

    useEffect(() => {
        if (isEditMode) {
            const loadAccount = async () => {
                try {
                    const response = await getCreditAccount(id);
                    const data = response.data || response;
                    setFormData({
                        ...data,
                        difficulty_rank: data.difficulty_rank || '',
                        typical_personal_fico_min: data.typical_personal_fico_min || '',
                        typical_personal_fico_ideal: data.typical_personal_fico_ideal || '',
                        time_in_business_min_months: data.time_in_business_min_months || '',
                        status: data.status || 'Active'
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
        // Clear error when field changes
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            if (isEditMode) {
                await updateCreditAccount(id, formData);
                toast.success('Account updated successfully');
            } else {
                await createCreditAccount(formData);
                toast.success('Account created successfully');
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

    if (initialLoading) {
        return (
            <div className="page-content">
                <div className="container-fluid">
                    <div className="row pb-3">
                        <div className="col-12">
                            <div className="card shadow-none border">
                                <div className="card-body p-4">
                                    <FormLoader count={8} />
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
                <div className="row pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-lg-center flex-lg-row flex-column py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">{isEditMode ? 'Edit Credit Account' : 'Add Credit Account'}</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item">Credit Builder</li>
                                        <li className="breadcrumb-item active">{isEditMode ? 'Edit' : 'Add'}</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="mt-3 mt-lg-0">
                                <Link to="/credit-accounts" className="btn btn-outline-secondary w-lg waves-effect me-2">
                                    <i className="ri-arrow-left-line align-middle me-1"></i> Back
                                </Link>
                                {((isEditMode && hasPermission('update credit accounts')) || (!isEditMode && hasPermission('create credit accounts'))) && (
                                    <button type="submit" form="credit-account-form" className="btn btn-primary w-lg waves-effect" disabled={loading}>
                                        {loading ? <span className="spinner-border spinner-border-sm me-1"></span> : <i className="ri-save-3-line align-middle me-1"></i>}
                                        {isEditMode ? 'Update' : 'Save'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-12">
                        <div className="card border">
                            <div className="card-body p-4">
                                <form id="credit-account-form" onSubmit={handleSubmit}>
                                    <div className="row g-3">
                                        {/* Row 1: Logo and Card Info */}
                                        <div className="col-md-6 text-center border-end pe-4 d-flex flex-column align-items-center justify-content-center">
                                            <div className="mb-2">
                                                <label className="form-label d-block text-start w-100">Card Image</label>
                                            </div>
                                            <div className="position-relative">
                                                <div className={`p-3 bg-light rounded ${errors.image_url ? 'border border-danger' : ''}`} style={{ minWidth: '220px', minHeight: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {getImageSrc() ? (
                                                        <img
                                                            src={getImageSrc()}
                                                            alt="Preview"
                                                            style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain' }}
                                                        />
                                                    ) : (
                                                        <div className="text-muted small py-4">Image Preview Will Appear Here</div>
                                                    )}
                                                </div>
                                                {errors.image_url && <div className="text-danger small mt-1">{errors.image_url}</div>}
                                                <div className="avatar-xs p-0 rounded-circle profile-photo-edit" style={{ position: 'absolute', bottom: errors.image_url ? '12px' : '-10px', right: '-10px', zIndex: 1 }}>
                                                    <button
                                                        type="button"
                                                        className="btn p-0 border-0 rounded-circle profile-photo-edit avatar-xs"
                                                        onClick={() => setShowFileManager(true)}
                                                        title="Upload card image"
                                                    >
                                                        <span className="avatar-title rounded-circle bg-light text-body shadow">
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
                                            />
                                        </div>

                                        <div className="col-md-6 ps-4">
                                            <div className="row g-3">
                                                <div className="col-12">
                                                    <label className="form-label">Card Name <span className="text-danger">*</span></label>
                                                    <input type="text" name="card_name" className={`form-control ${errors.card_name ? 'is-invalid' : ''}`} value={formData.card_name} onChange={handleChange} />
                                                    {errors.card_name && <div className="invalid-feedback">{errors.card_name}</div>}
                                                </div>
                                                <div className="col-12">
                                                    <label className="form-label">Issuer <span className="text-danger">*</span></label>
                                                    <input type="text" name="issuer" className={`form-control ${errors.issuer ? 'is-invalid' : ''}`} value={formData.issuer} onChange={handleChange} />
                                                    {errors.issuer && <div className="invalid-feedback">{errors.issuer}</div>}
                                                </div>
                                                <div className="col-12">
                                                    <label className="form-label">Reference URL (Link)</label>
                                                    <input type="text" name="reference_url" className="form-control" value={formData.reference_url} onChange={handleChange} placeholder="https://..." />
                                                </div>
                                            </div>
                                        </div>

                                        <hr className="my-4" />

                                        {/* Details Grid */}
                                        <div className="col-md-3">
                                            <label className="form-label">FICO Min <span className="text-danger">*</span></label>
                                            <input type="number" name="typical_personal_fico_min" className={`form-control ${errors.typical_personal_fico_min ? 'is-invalid' : ''}`} value={formData.typical_personal_fico_min} onChange={handleChange} />
                                            {errors.typical_personal_fico_min && <div className="invalid-feedback">{errors.typical_personal_fico_min}</div>}
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label">FICO Ideal <span className="text-danger">*</span></label>
                                            <input type="number" name="typical_personal_fico_ideal" className={`form-control ${errors.typical_personal_fico_ideal ? 'is-invalid' : ''}`} value={formData.typical_personal_fico_ideal} onChange={handleChange} />
                                            {errors.typical_personal_fico_ideal && <div className="invalid-feedback">{errors.typical_personal_fico_ideal}</div>}
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label">Biz Min Months <span className="text-danger">*</span></label>
                                            <input type="number" name="time_in_business_min_months" className={`form-control ${errors.time_in_business_min_months ? 'is-invalid' : ''}`} value={formData.time_in_business_min_months} onChange={handleChange} />
                                            {errors.time_in_business_min_months && <div className="invalid-feedback">{errors.time_in_business_min_months}</div>}
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label">Approval Level</label>
                                            <input type="text" name="approval_level" className="form-control" value={formData.approval_level} onChange={handleChange} />
                                        </div>

                                        <div className="col-md-3">
                                            <label className="form-label">Difficulty Rank</label>
                                            <input type="number" name="difficulty_rank" className="form-control" value={formData.difficulty_rank} onChange={handleChange} />
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label">Difficulty Tier</label>
                                            <input type="text" name="difficulty_tier" className="form-control" value={formData.difficulty_tier} onChange={handleChange} />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label">Credit Category</label>
                                            <select name="credit_category" className="form-select" value={formData.credit_category} onChange={handleChange}>
                                                <option value="">Select Category</option>
                                                {CATEGORY_OPTIONS.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="col-md-3">
                                            <label className="form-label">Business Credit Req</label>
                                            <select name="business_credit_required" className="form-select" value={formData.business_credit_required} onChange={handleChange}>
                                                {YES_NO_OPTIONS.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label">Cash Based</label>
                                            <select name="cash_based" className="form-select" value={formData.cash_based} onChange={handleChange}>
                                                <option value="">Select</option>
                                                {YES_NO_OPTIONS.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label">Velocity Sensitive</label>
                                            <select name="velocity_sensitive" className="form-select" value={formData.velocity_sensitive} onChange={handleChange}>
                                                <option value="">Select</option>
                                                {YES_NO_OPTIONS.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label">PG Required</label>
                                            <select name="pg_required" className="form-select" value={formData.pg_required} onChange={handleChange}>
                                                {YES_NO_OPTIONS.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-3">
                                            <label className="form-label">Status</label>
                                            <select name="status" className={`form-select ${errors.status ? 'is-invalid' : ''}`} value={formData.status} onChange={handleChange}>
                                                {STATUS_OPTIONS.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                            {errors.status && <div className="invalid-feedback">{errors.status}</div>}
                                        </div>


                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
