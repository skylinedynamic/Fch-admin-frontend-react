import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import PageHeader from '../../../common/PageHeader';
import { Dropdown } from 'primereact/dropdown';
import { toast } from 'react-toastify';
import FormLoader from '../../../../components/Loader/FormLoader';
import { createCreditAccount, updateCreditAccount, getCreditAccount } from '../../../../modules/credit-accounts/services';
import { usePermissions } from '../../../../lib/auth/usePermissions';
import { FileManagerModal } from '../../../../components/FileManagerModal/FileManagerModal';
import { STATUS_ACTIVE, STATUS_INACTIVE, CREDIT_CATEGORY_OPTIONS } from '../../../../config/creditBuilder';
import { buildStorageUrl } from '../../../../utils/imageHelpers';


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

    const isActive = (formData.status || STATUS_ACTIVE) !== STATUS_INACTIVE;

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
                <PageHeader 
                    title={isEditMode ? 'Edit Credit Account' : 'Add Credit Account'} 
                    breadcrumbs={[
                        { label: 'Credit Builder' },
                        { label: 'Credit Accounts', path: '/credit-accounts' },
                        { label: isEditMode ? 'Edit' : 'Create' }
                    ]} 
                >
                    <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
                        <Link to="/credit-accounts" className="btn btn-outline-secondary w-lg waves-effect">
                            <i className="ri-arrow-left-line align-middle me-1"></i> Back
                        </Link>
                        {(hasPermission('create credit accounts') || hasPermission('update credit accounts')) && (
                            <button
                                type="submit"
                                form="credit-account-form"
                                className="btn btn-primary w-lg waves-effect"
                                disabled={loading}
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
                </PageHeader>

                {initialLoading ? (
                    <div className="row">
                        <div className="col-12"><FormLoader count={8} /></div>
                    </div>
                ) : (
                    <form id="credit-account-form" onSubmit={handleSubmit}>
                        <div className="row credit-account-section credit-account-form g-3">
                            <div className="col-xl-8">
                                {/* What the card is */}
                                <div className="card credit-account-form__card mb-3">
                                    <div className="card-header">
                                        <h5 className="card-title mb-0"><i className="ri-bank-card-line align-middle text-muted me-1"></i> Card Details</h5>
                                    </div>
                                    <div className="card-body">
                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <label className="form-label" htmlFor="card_name">Card Name <span className="text-danger">*</span></label>
                                                <input type="text" id="card_name" name="card_name" className={`form-control ${errors.card_name ? 'is-invalid' : ''}`} value={formData.card_name} onChange={handleChange} placeholder="e.g. Chase Ink Business Cash" />
                                                {errors.card_name && <div className="invalid-feedback">{errors.card_name}</div>}
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label" htmlFor="issuer">Issuer <span className="text-danger">*</span></label>
                                                <input type="text" id="issuer" name="issuer" className={`form-control ${errors.issuer ? 'is-invalid' : ''}`} value={formData.issuer} onChange={handleChange} placeholder="e.g. Chase" />
                                                {errors.issuer && <div className="invalid-feedback">{errors.issuer}</div>}
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label" htmlFor="credit_category">Credit Category</label>
                                                <Dropdown
                                                    inputId="credit_category"
                                                    value={formData.credit_category}
                                                    options={CREDIT_CATEGORY_OPTIONS}
                                                    onChange={(e) => handleInputChange({ target: { name: 'credit_category', value: e.value } })}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    placeholder="Select category"
                                                    className={`w-100 credit-account-form__select ${errors.credit_category ? 'p-invalid' : ''}`}
                                                />
                                                {errors.credit_category && <small className="text-danger mt-1 d-block">{errors.credit_category}</small>}
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label" htmlFor="reference_url">Reference URL <span className="text-danger">*</span></label>
                                                <input type="url" id="reference_url" name="reference_url" className={`form-control ${errors.reference_url ? 'is-invalid' : ''}`} value={formData.reference_url} onChange={handleChange} placeholder="https://" />
                                                {errors.reference_url && <div className="invalid-feedback">{errors.reference_url}</div>}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Who it is offered to */}
                                <div className="card credit-account-form__card mb-3">
                                    <div className="card-header">
                                        <h5 className="card-title mb-0"><i className="ri-user-follow-line align-middle text-muted me-1"></i> Eligibility</h5>
                                    </div>
                                    <div className="card-body">
                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <label className="form-label" htmlFor="typical_personal_fico_min">FICO Min Requirement <span className="text-danger">*</span></label>
                                                <input type="number" id="typical_personal_fico_min" name="typical_personal_fico_min" className={`form-control ${errors.typical_personal_fico_min ? 'is-invalid' : ''}`} value={formData.typical_personal_fico_min} onChange={handleChange} placeholder="300 - 850" />
                                                {errors.typical_personal_fico_min && <div className="invalid-feedback">{errors.typical_personal_fico_min}</div>}
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label" htmlFor="time_in_business_min_months">Min Months in Business <span className="text-danger">*</span></label>
                                                <input type="number" id="time_in_business_min_months" name="time_in_business_min_months" className={`form-control ${errors.time_in_business_min_months ? 'is-invalid' : ''}`} value={formData.time_in_business_min_months} onChange={handleChange} placeholder="e.g. 6" />
                                                {errors.time_in_business_min_months && <div className="invalid-feedback">{errors.time_in_business_min_months}</div>}
                                            </div>
                                        </div>
                                        <p className="credit-account-form__hint mb-0 mt-2">Borrowers below either minimum are not offered this card.</p>
                                    </div>
                                </div>

                                {/* What the borrower is told */}
                                <div className="card credit-account-form__card mb-0">
                                    <div className="card-header">
                                        <h5 className="card-title mb-0"><i className="ri-file-list-3-line align-middle text-muted me-1"></i> Approval Notes</h5>
                                    </div>
                                    <div className="card-body">
                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <label className="form-label" htmlFor="personal_guarantee">Personal Guarantee</label>
                                                <input type="text" id="personal_guarantee" name="personal_guarantee" className={`form-control ${errors.personal_guarantee ? 'is-invalid' : ''}`} value={formData.personal_guarantee} onChange={handleChange} placeholder="e.g. Typically required" />
                                                {errors.personal_guarantee && <div className="invalid-feedback">{errors.personal_guarantee}</div>}
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label" htmlFor="business_credit_profile">Business Credit Profile</label>
                                                <input type="text" id="business_credit_profile" name="business_credit_profile" className={`form-control ${errors.business_credit_profile ? 'is-invalid' : ''}`} value={formData.business_credit_profile} onChange={handleChange} placeholder="e.g. Improves approval strength" />
                                                {errors.business_credit_profile && <div className="invalid-feedback">{errors.business_credit_profile}</div>}
                                            </div>
                                            <div className="col-12">
                                                <label className="form-label" htmlFor="final_approval">Final Approval</label>
                                                <input type="text" id="final_approval" name="final_approval" className={`form-control ${errors.final_approval ? 'is-invalid' : ''}`} value={formData.final_approval} onChange={handleChange} placeholder="e.g. Final approval is determined by the issuing bank" />
                                                {errors.final_approval && <div className="invalid-feedback">{errors.final_approval}</div>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-xl-4">
                                {/* Offered to borrowers or not (BUG-042) */}
                                <div className="card credit-account-form__card mb-3">
                                    <div className="card-header">
                                        <h5 className="card-title mb-0"><i className="ri-toggle-line align-middle text-muted me-1"></i> Status</h5>
                                    </div>
                                    <div className="card-body">
                                        <div className="d-flex align-items-center justify-content-between gap-3">
                                            <div>
                                                <div className="fw-semibold">{isActive ? STATUS_ACTIVE : STATUS_INACTIVE}</div>
                                                <div className="credit-account-form__hint">
                                                    {isActive
                                                        ? 'Offered to borrowers in Credit Accounts and in Capital Access plays.'
                                                        : 'No longer offered to borrowers - in Credit Accounts or in any Capital Access play.'}
                                                </div>
                                            </div>
                                            <div className="form-check form-switch form-switch-md mb-0">
                                                <input
                                                    type="checkbox"
                                                    role="switch"
                                                    id="credit-account-status"
                                                    className="form-check-input"
                                                    aria-label="Active"
                                                    checked={isActive}
                                                    onChange={(e) => handleInputChange({ target: { name: 'status', value: e.target.checked ? STATUS_ACTIVE : STATUS_INACTIVE } })}
                                                />
                                            </div>
                                        </div>
                                        {errors.status && <small className="text-danger mt-1 d-block">{errors.status}</small>}
                                    </div>
                                </div>

                                {/* Card artwork */}
                                <div className="card credit-account-form__card mb-0">
                                    <div className="card-header">
                                        <h5 className="card-title mb-0"><i className="ri-image-line align-middle text-muted me-1"></i> Card Image <span className="text-danger">*</span></h5>
                                    </div>
                                    <div className="card-body">
                                        <button
                                            type="button"
                                            className={`credit-account-form__image ${errors.image_url ? 'is-invalid' : ''}`}
                                            onClick={() => setShowFileManager(true)}
                                            aria-label={getImageSrc() ? 'Change card image' : 'Choose card image'}
                                        >
                                            {getImageSrc() ? (
                                                <>
                                                    <img src={getImageSrc()} alt="Card preview" className="credit-account-form__image-preview" />
                                                    <span className="credit-account-form__image-change"><i className="ri-pencil-line me-1"></i> Change</span>
                                                </>
                                            ) : (
                                                <span className="d-flex flex-column align-items-center text-muted">
                                                    <i className="ri-image-add-line fs-24 text-primary mb-1"></i>
                                                    <span className="fw-medium text-body">Choose image</span>
                                                    <small>PNG, JPG, WEBP or AVIF</small>
                                                </span>
                                            )}
                                        </button>
                                        {errors.image_url && <div className="invalid-feedback d-block">{errors.image_url}</div>}
                                        <p className="credit-account-form__hint mb-0 mt-2">A clear image of the card on a transparent or plain background, landscape (about 1.6 : 1).</p>
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
