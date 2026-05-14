import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Dropdown } from 'primereact/dropdown';
import { toast } from 'react-toastify';
import FormLoader from '../../../components/Loader/FormLoader';
import { createCreditAccount, updateCreditAccount, getCreditAccount } from '../../../modules/credit-accounts/services';
import { usePermissions } from '../../../lib/auth/usePermissions';
import { FileManagerModal } from '../../../components/FileManagerModal/FileManagerModal';
import { STATUS_OPTIONS, CREDIT_CATEGORY_OPTIONS } from '../../../config/creditBuilder';
import { buildStorageUrl } from '../../../utils/imageHelpers';


export default function CreditAccountForm() {
    const { hasPermission } = usePermissions();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;

    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(isEditMode);
    const [showFileManager, setShowFileManager] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
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
        if (previewUrl && formData.image_url && !formData.image_url.startsWith('http')) {
            return buildStorageUrl(previewUrl);
        }

        if (formData.full_image_url) {
            return formData.full_image_url;
        }

        if (formData.image_url && typeof formData.image_url === 'string') {
            return buildStorageUrl(formData.image_url);
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
        <div className="page-content">
            <div className="container-fluid">
                {/* Page Header */}
                <div className="row page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-lg-center flex-lg-row flex-column py-2">
                            <div className="flex-grow-1">
                                <h4 className="fs-18 fw-semibold mb-1">{isEditMode ? 'Edit Credit Account' : 'Add New Credit Account'}</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/" className="text-muted">Dashboard</Link></li>
                                        <li className="breadcrumb-item"><Link to="/credit-accounts" className="text-muted">Credit Accounts</Link></li>
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
                                        className="btn btn-primary waves-effect"
                                        disabled={loading || initialLoading}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                {isEditMode ? 'Updating...' : 'Saving...'}
                                            </>
                                        ) : (
                                            <>
                                                <i className="ri-save-line align-middle me-1"></i> {isEditMode ? 'Save Changes' : 'Create Account'}
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {initialLoading ? (
                    <div className="row">
                        <div className="col-12"><FormLoader count={8} /></div>
                    </div>
                ) : (
                    <form id="credit-account-form" onSubmit={handleSubmit}>
                        <div className="row credit-account-section">
                            <div className="col-lg-8">
                                <div className="card shadow-sm">
                                    <div className="card-header border-bottom-dashed">
                                        <h5 className="card-title mb-0"><i className="ri-information-line align-middle text-muted me-1 fs-18"></i> Basic Information</h5>
                                    </div>
                                    <div className="card-body">
                                        <div className="row g-4 mb-4">
                                            <div className="col-lg-6">
                                                <div>
                                                    <label className="form-label" htmlFor="card_name">Card Name <span className="text-danger">*</span></label>
                                                    <input type="text" id="card_name" name="card_name" className={`form-control ${errors.card_name ? 'is-invalid' : ''}`} value={formData.card_name} onChange={handleChange} placeholder="e.g. Chase Sapphire Reserve" />
                                                    {errors.card_name && <div className="invalid-feedback">{errors.card_name}</div>}
                                                </div>
                                            </div>
                                            <div className="col-lg-6">
                                                <div>
                                                    <label className="form-label" htmlFor="issuer">Issuer <span className="text-danger">*</span></label>
                                                    <input type="text" id="issuer" name="issuer" className={`form-control ${errors.issuer ? 'is-invalid' : ''}`} value={formData.issuer} onChange={handleChange} placeholder="e.g. Chase" />
                                                    {errors.issuer && <div className="invalid-feedback">{errors.issuer}</div>}
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div>
                                                    <label className="form-label" htmlFor="reference_url">Reference URL <span className="text-danger">*</span></label>
                                                    <input type="url" id="reference_url" name="reference_url" className={`form-control ${errors.reference_url ? 'is-invalid' : ''}`} value={formData.reference_url} onChange={handleChange} placeholder="https://..." />
                                                    {errors.reference_url && <div className="invalid-feedback">{errors.reference_url}</div>}
                                                </div>
                                            </div>

                                            <div className="col-lg-6">
                                                <div>
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
                                                            className={`w-100 ${errors.credit_category ? 'p-invalid border-danger' : ''} border-start-0`}
                                                            style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                                                        />
                                                    </div>
                                                    {errors.credit_category && <small className="text-danger mt-1 d-block">{errors.credit_category}</small>}
                                                </div>
                                            </div>

                                        </div>


                                        <div className="row g-4 mb-4">
                                            <div className="col-lg-6">
                                                <div>
                                                    <label className="form-label">FICO Min Requirement <span className="text-danger">*</span></label>
                                                    <div className="input-group">
                                                        <span className="input-group-text bg-light text-muted"><i className="ri-dashboard-2-line"></i></span>
                                                        <input type="number" name="typical_personal_fico_min" className={`form-control ${errors.typical_personal_fico_min ? 'is-invalid' : ''}`} value={formData.typical_personal_fico_min} onChange={handleChange} placeholder="e.g. 680" />
                                                        {errors.typical_personal_fico_min && <div className="invalid-feedback">{errors.typical_personal_fico_min}</div>}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-lg-6">
                                                <div>
                                                    <label className="form-label">Min Months in Business <span className="text-danger">*</span></label>
                                                    <div className="input-group">
                                                        <span className="input-group-text bg-light text-muted"><i className="ri-calendar-event-line"></i></span>
                                                        <input type="number" name="time_in_business_min_months" className={`form-control ${errors.time_in_business_min_months ? 'is-invalid' : ''}`} value={formData.time_in_business_min_months} onChange={handleChange} placeholder="e.g. 12" />
                                                        {errors.time_in_business_min_months && <div className="invalid-feedback">{errors.time_in_business_min_months}</div>}
                                                    </div>
                                                </div>
                                            </div>



                                            <div className="col-lg-6">
                                                <div>
                                                    <label className="form-label">Personal Guarantee</label>
                                                    <div className="input-group">
                                                        <span className="input-group-text bg-light text-muted"><i className="ri-shield-user-line"></i></span>
                                                        <input
                                                            type="text"
                                                            name="personal_guarantee"
                                                            className={`form-control ${errors.personal_guarantee ? 'is-invalid' : ''}`}
                                                            value={formData.personal_guarantee}
                                                            onChange={handleChange}
                                                            placeholder="Typically required"
                                                        />
                                                        {errors.personal_guarantee && <div className="invalid-feedback">{errors.personal_guarantee}</div>}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-lg-6">
                                                <div>
                                                    <label className="form-label">Business Credit Profile</label>
                                                    <div className="input-group">
                                                        <span className="input-group-text bg-light text-muted"><i className="ri-briefcase-4-line"></i></span>
                                                        <input
                                                            type="text"
                                                            name="business_credit_profile"
                                                            className={`form-control ${errors.business_credit_profile ? 'is-invalid' : ''}`}
                                                            value={formData.business_credit_profile}
                                                            onChange={handleChange}
                                                            placeholder="Improves approval strength"
                                                        />
                                                        {errors.business_credit_profile && <div className="invalid-feedback">{errors.business_credit_profile}</div>}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="col-lg-6">
                                                <div>
                                                    <label className="form-label">Final Approval</label>
                                                    <div className="input-group">
                                                        <span className="input-group-text bg-light text-muted"><i className="ri-checkbox-circle-line"></i></span>
                                                        <input
                                                            type="text"
                                                            name="final_approval"
                                                            className={`form-control ${errors.final_approval ? 'is-invalid' : ''}`}
                                                            value={formData.final_approval}
                                                            onChange={handleChange}
                                                            placeholder="Final approval is determined by the issuing bank"
                                                        />
                                                        {errors.final_approval && <div className="invalid-feedback">{errors.final_approval}</div>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-lg-4">
                                <div className="card shadow-sm">
                                    <div className="card-header border-bottom-dashed">
                                        <h5 className="card-title mb-0"><i className="ri-image-line align-middle text-muted me-1 fs-18"></i> Card Image <span className="text-danger">*</span></h5>
                                    </div>
                                    <div className="card-body">
                                        <div className="text-center">
                                            <div
                                                className={`position-relative d-inline-block cursor-pointer mx-auto credit-artwork-dropzone`}
                                                onClick={() => setShowFileManager(true)}
                                            >
                                                <div className={`bg-light rounded d-flex flex-column align-items-center justify-content-center p-3 credit-artwork-dropzone-inner ${errors.image_url ? 'border-danger' : ''}`}>
                                                    {getImageSrc() ? (
                                                        <img
                                                            src={getImageSrc()}
                                                            alt="Preview"
                                                            className="img-fluid rounded shadow-sm credit-artwork-preview"
                                                        />
                                                    ) : (
                                                        <div className="text-center p-2">
                                                            <div className="avatar-md mx-auto mb-3">
                                                                <div className="avatar-title bg-white text-primary rounded-circle shadow-sm fs-24">
                                                                    <i className="ri-image-add-line"></i>
                                                                </div>
                                                            </div>
                                                            <h5 className="fs-15 fw-semibold text-dark">Upload Image</h5>
                                                            <p className="text-muted small mb-0">SVG, PNG, JPG or GIF</p>
                                                        </div>
                                                    )}
                                                </div>
                                                {getImageSrc() && (
                                                    <div className="position-absolute bottom-0 end-0 mb-3 me-3">
                                                        <span className="btn btn-sm btn-primary rounded-circle shadow p-2 lh-1 text-white">
                                                            <i className="ri-pencil-fill"></i>
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            {errors.image_url && <div className="invalid-feedback d-block text-start fw-medium mt-1">{errors.image_url}</div>}
                                            <div className="mt-2 text-start">
                                                <p className="text-muted small mb-0">
                                                    <b>Note: </b>
                                                    For best results, upload a clear image of the credit card with a transparent or solid background. Recommended aspect ratio is 16:9.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
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
                    </form>
                )}
            </div>
        </div>
    );
}
