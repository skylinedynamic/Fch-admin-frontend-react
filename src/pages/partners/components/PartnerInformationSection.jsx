import React, { useState, useEffect, useRef } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Calendar } from 'primereact/calendar';

import { relationOptions } from '../../../config';
import { parseDate } from '../../../utils/formatters';
import { PARTNER_TYPES } from '../../../config/partnerTypeOptions';
import { formatPhoneNumber } from '../../../utils/formatters';
import avatarDefault from "../../../../assets/images/users/avatar-1.jpg";
import { FileManagerModal } from '../../../components/FileManagerModal/FileManagerModal';
import InstallmentDetailsModal from '../../../components/Common/Payment/InstallmentDetailsModal';
import { toast } from 'react-toastify';
import { getCountryPhoneInfo } from '../../../config/locations';
import { buildStorageUrl } from '../../../utils/imageHelpers';
import { ENROLLMENT_TYPE_ONE_TIME, ENROLLMENT_TYPE_INSTALLMENT, ENROLLMENT_TYPE_OPTIONS } from '../../../config/subscriptionConfig';


export default function PartnerInformationSection({
    formData,
    errors,
    profileImage,
    handleInputChange,
    countries,
    states,
    cities,
    partnerId,
    partnerPlans = [],
    wasFreeTrial = false
}) {
    const [showFileManager, setShowFileManager] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [showInstallmentModal, setShowInstallmentModal] = useState(false);
    const domainManuallyEditedRef = useRef(false);

    // Show partner_domain field: always in create mode, only for Certified in edit mode
    const showPartnerDomain = !partnerId || formData.partner_type === PARTNER_TYPES.CERTIFIED;

    // Auto-sync partner_domain from company_name in create mode when user hasn't manually edited it
    useEffect(() => {
        if (!partnerId && !domainManuallyEditedRef.current && formData.company_name) {
            const autoDomain = formData.company_name.toLowerCase().replace(/[^a-z]/g, '');
            handleInputChange({ target: { name: 'partner_domain', value: autoDomain } });
        }
    }, [formData.company_name]);

    // Calculate dynamic values for summary and overrides
    const enrollmentType = formData.enrollment_type || formData.enrollment_details?.enrollment_type;
    const enrollmentAmount = formData.enrollment_amount || formData.enrollment_details?.enrollment_amount;
    const payableAmount = formData.payable_amount || formData.enrollment_details?.payable_amount;
    const monthlyPlatformFee = formData.monthly_platform_fee || formData.enrollment_details?.monthly_platform_fee;
    const recurringAmount = formData.recurring_amount || formData.enrollment_details?.recurring_amount;
    const platformFee = formData.platform_fee || formData.enrollment_details?.platform_fee;
    const totalSubscriptionAmount = formData.total_subscription_amount || formData.enrollment_details?.total_subscription_amount;
    const isFreeTrial = formData.is_free_trail == 1 || formData.is_free_trail === true || formData.is_free_trail === 'true' || formData.is_free_trail === '1';

    const selectedPlan = partnerPlans.find(
        plan => plan.partner_type === formData.partner_type &&
            (plan.enrollment_type || '').toString().toLowerCase() === (enrollmentType || '').toString().toLowerCase()
    );

    // Auto-sync plan_id whenever matching selectedPlan is resolved
    useEffect(() => {
        if (selectedPlan && selectedPlan.id && String(formData.plan_id) !== String(selectedPlan.id)) {
            handleInputChange({ target: { name: 'plan_id', value: selectedPlan.id } });
        }
    }, [selectedPlan?.id, formData.plan_id]);

    const hasCustomEnrollment = (enrollmentAmount !== undefined && enrollmentAmount !== '') || (payableAmount !== undefined && payableAmount !== '');
    const hasCustomPlatformFee = (monthlyPlatformFee !== undefined && monthlyPlatformFee !== '') || (recurringAmount !== undefined && recurringAmount !== '') || (platformFee !== undefined && platformFee !== '');

    const currentPaymentAmount = enrollmentAmount || payableAmount || (selectedPlan?.total_amount || 0);
    const currentPlatformFee = monthlyPlatformFee || recurringAmount || platformFee || (selectedPlan?.platform_fee || 0);
    const isOneTime = (enrollmentType || '').toString().toLowerCase() === ENROLLMENT_TYPE_ONE_TIME.toLowerCase() || (enrollmentType || '').toString().toLowerCase().includes('one time');
    const partnerTypeName = selectedPlan?.partner_type || formData.partner_type;
    const enrollmentTypeName = selectedPlan?.enrollment_type || enrollmentType;
    const enrollmentTypeSlug = (selectedPlan?.enrollment_type_slug || formData.enrollment_type_slug || '').toString().toLowerCase();
    const isInstallmentPlan = enrollmentTypeSlug === ENROLLMENT_TYPE_INSTALLMENT.toLowerCase() || (enrollmentType || '').toString().toLowerCase() === ENROLLMENT_TYPE_INSTALLMENT.toLowerCase();

    const totalInvestment = totalSubscriptionAmount || (Number(currentPaymentAmount) * (selectedPlan?.total_installments_count || 11));

    // Filter results from file manager based on allowed extensions
    const handleFileSelection = (selectedFiles) => {
        if (!selectedFiles || selectedFiles.length === 0) return;

        const file = selectedFiles[0];
        const extension = file.path.split('.').pop()?.toLowerCase();
        const allowed = ['jpg', 'jpeg', 'png'];

        if (!extension || !allowed.includes(extension)) {
            toast.error(`File type ".${extension}" not allowed. Please select JPG, JPEG or PNG.`);
            return;
        }

        // Set local preview URL for immediate display
        setPreviewUrl(file.url);

        // Update form data with the selected file path for backend
        handleInputChange({
            target: {
                name: 'partner_image',
                value: file.path
            }
        });
        setShowFileManager(false);
    };

    // Helper function to get image source - matches EmployeeDetails pattern
    const getImageSrc = () => {
        // 1. If user selected a new image file from browser (Blob)
        if (formData.partner_image instanceof File) {
            return URL.createObjectURL(formData.partner_image);
        }

        // 2. If we have a preview URL from file manager selection (Highest priority for selected files)
        if (previewUrl) {
            return previewUrl;
        }

        const buildUrl = (path) => {
            if (!path || typeof path !== 'string' || path === avatarDefault) return avatarDefault;

            let cleanPath = path.trim().replace(/^\/+/, '');

            // Ensure partners directory structure if it's just a filename
            if (partnerId && !cleanPath.includes('partners/')) {
                if (!cleanPath.includes('/')) {
                    cleanPath = `partners/${partnerId}/${cleanPath}`;
                }
            }

            return buildStorageUrl(cleanPath, avatarDefault);
        };

        // 3. Use current partner_image if it's a string (path from DB or selected from file manager)
        if (typeof formData.partner_image === 'string' && formData.partner_image.trim() !== '') {
            // If the string is already a full URL (returned by some API resources), return it
            if (formData.partner_image.startsWith('http')) {
                return formData.partner_image;
            }
            return buildUrl(formData.partner_image);
        }

        // 4. Fall back to profileImage prop
        if (typeof profileImage === 'string' && profileImage.trim() !== '') {
            return buildUrl(profileImage);
        }

        // 5. Default avatar
        return avatarDefault;
    };

    return (
        <>
            {/* Profile Image */}
            <div className="col-lg-12">
                <div className="card mt-3 mt-lg-0">
                    <div className="profile-user position-relative d-inline-block mx-auto mb-4 mt-3 mt-lg-2">
                        <img
                            src={getImageSrc()}
                            className="rounded-circle avatar-xl img-thumbnail user-profile-image material-shadow"
                            alt="user-profile-image"
                        />
                        <div className="avatar-xs p-0 rounded-circle profile-photo-edit">
                            <button
                                type="button"
                                className="btn p-0 border-0 rounded-circle profile-photo-edit avatar-xs"
                                onClick={() => setShowFileManager(true)}
                                title="Upload profile image"
                            >
                                <span className="avatar-title rounded-circle bg-light text-body material-shadow">
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
                        entityType="partners"
                        entityId={partnerId || formData?.id || formData?.entity_id}
                    />
                    {window.location.pathname === '/partners/create' && (
                        <input
                            type="hidden"
                            className="form-control bg-light text-center fw-bold border-dashed"
                            id="entityId"
                            name="entity_id"
                            value={formData.entity_id || ''}
                            readOnly
                            disabled
                        />
                    )}

                    <div className="text-center mb-3">
                        <span className="badge bg-light text-muted border text-wrap lh-base px-3 py-2" style={{ whiteSpace: 'normal' }}>
                            <i className="ri-information-line me-1"></i>
                            Allowed image types: JPG, JPEG, PNG (Maximum size: 1 MB).
                        </span>
                    </div>
                    {errors.partner_image && (
                        <div className="alert alert-danger mt-2 text-center p-1">
                            <small>{errors.partner_image}</small>
                        </div>
                    )}
                </div>
            </div>

            {/* Full Name */}
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Full Name <span className="text-danger">*</span></label>
                    <input
                        type="text"
                        className={`form-control ${errors.full_name ? 'is-invalid' : ''}`}
                        name="full_name"
                        placeholder="Enter full name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                    />
                    {errors.full_name && <div className="invalid-feedback">{errors.full_name}</div>}
                </div>
            </div>

            {/* Company Name */}
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">
                        Company Name <span className="text-danger">*</span>
                        {formData.company_name && !partnerId && (
                            <span className="ms-1 text-muted fw-normal" style={{ fontSize: '0.85em' }}>
                                &nbsp;(Partner portal url be like : <code className="text-primary font-monospace">
                                    {formData.partner_domain ? (
                                        <>
                                            {formData.partner_domain}.
                                            {new URL(import.meta.env.VITE_BASE_URL || window.location.href).host}
                                        </>
                                    ) : (
                                        <>
                                            {formData.company_name.toLowerCase().replace(/[^a-z]/g, '')}.
                                            {new URL(import.meta.env.VITE_BASE_URL || window.location.href).host}
                                        </>
                                    )}
                                </code>)
                            </span>
                        )}
                    </label>
                    <input
                        type="text"
                        className={`form-control ${errors.company_name ? 'is-invalid' : ''}`}
                        name="company_name"
                        placeholder="Enter company name"
                        value={formData.company_name}
                        onChange={handleInputChange}
                    />
                    {errors.company_name && <div className="invalid-feedback">{errors.company_name}</div>}
                </div>
            </div>

            {/* Portal URL / Custom Domain - Visible on create (all types) and edit (Certified only) */}
            {showPartnerDomain && partnerId && formData.partner_type === PARTNER_TYPES.CERTIFIED && (
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label className="form-label">Partner Subdomain <span className="text-danger">*</span>
                        </label>
                        <div className="input-group material-shadow">
                            <input
                                type="text"
                                className={`form-control ${errors.partner_domain ? 'is-invalid' : ''}`}
                                name="partner_domain"
                                placeholder="Enter custom subdomain"
                                value={formData.partner_domain ? formData.partner_domain.split('.')[0] : ''}
                                onChange={(e) => {
                                    const cleanedValue = e.target.value
                                        .toLowerCase()
                                        .replace(/[^a-z0-9-]/g, '')
                                        .replace(/-+/g, '-')
                                        .replace(/^[^a-z]+/g, '');
                                    handleInputChange({ target: { name: 'partner_domain', value: cleanedValue } });
                                }}
                            />
                            <span className="input-group-text text-muted px-3">
                                .{new URL(import.meta.env.VITE_BASE_URL || window.location.href).host}
                            </span>
                        </div>
                        {errors.partner_domain && <div className="invalid-feedback d-block mt-1">{errors.partner_domain}</div>}
                    </div>
                </div>
            )}
            {showPartnerDomain && !partnerId && (
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label className="form-label">Partner Subdomain <span className="text-danger">*</span>
                        </label>
                        <div className="input-group material-shadow">
                            <input
                                type="text"
                                className={`form-control ${formData.partner_type !== PARTNER_TYPES.CERTIFIED ? 'bg-light text-muted fw-medium' : ''} ${errors.partner_domain ? 'is-invalid' : ''}`}
                                name="partner_domain"
                                placeholder={formData.partner_type === PARTNER_TYPES.CERTIFIED ? "Enter custom subdomain" : ""}
                                value={domainManuallyEditedRef.current
                                    ? (formData.partner_domain || '')
                                    : (formData.company_name ? formData.company_name.toLowerCase().replace(/[^a-z]/g, '') : '')
                                }
                                onChange={(e) => {
                                    domainManuallyEditedRef.current = true;
                                    const cleanedValue = e.target.value
                                        .toLowerCase()
                                        .replace(/[^a-z0-9-]/g, '')
                                        .replace(/-+/g, '-')
                                        .replace(/^[^a-z]+/g, '');
                                    handleInputChange({ target: { name: 'partner_domain', value: cleanedValue } });
                                }}
                            />
                            <span className="input-group-text text-muted px-3">
                                .{new URL(import.meta.env.VITE_BASE_URL || window.location.href).host}
                            </span>
                        </div>
                        {errors.partner_domain && <div className="invalid-feedback d-block mt-1">{errors.partner_domain}</div>}
                    </div>
                </div>
            )}

            {/* Phone Number */}
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Phone Number <span className="text-danger">*</span></label>
                    <div className="input-group">
                        {/* Country Code Display */}
                        {getCountryPhoneInfo(formData.country) && (
                            <span className="input-group-text bg-light border">
                                <span className="me-1">{getCountryPhoneInfo(formData.country).label}</span>
                                <span className="text-muted">{getCountryPhoneInfo(formData.country).prefix}</span>
                            </span>
                        )}
                        <input
                            type="text"
                            className={`form-control ${errors.phone_number ? 'is-invalid' : ''}`}
                            name="phone_number"
                            placeholder="(555) 555-5555"
                            value={formData.phone_number}
                            onChange={(e) => {
                                const formatted = formatPhoneNumber(e.target.value);
                                handleInputChange({ target: { name: 'phone_number', value: formatted } });
                            }}
                        />
                        {errors.phone_number && <div className="invalid-feedback">{errors.phone_number}</div>}
                    </div>
                </div>
            </div>

            {/* Email */}
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">E-mail <span className="text-danger">*</span></label>
                    <input
                        type="email"
                        className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                        name="email"
                        placeholder="Enter email address"
                        value={formData.email}
                        onChange={handleInputChange}
                    />
                    {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                </div>
            </div>



            {/* Address */}
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Address</label>
                    <input
                        type="text"
                        className={`form-control ${errors.address_line_1 || errors.address ? 'is-invalid' : ''}`}
                        name="address_line_1"
                        placeholder="Enter address"
                        value={formData.address_line_1}
                        onChange={handleInputChange}
                    />
                    {(errors.address_line_1 || errors.address) && <div className="invalid-feedback d-block">{errors.address_line_1 || errors.address}</div>}
                </div>
            </div>

            {/* Country - PrimeReact Dropdown */}
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Country <span className="text-danger">*</span></label>
                    <Dropdown
                        value={formData.country}
                        options={countries || []}
                        onChange={(e) => handleInputChange({ target: { name: 'country', value: e.value } })}
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Select Country"
                        className={`w-100 ${errors.country || errors.country_id ? 'p-invalid' : ''}`}
                        appendTo="self"
                    />
                    {(errors.country || errors.country_id) && <div className="invalid-feedback d-block">{errors.country || errors.country_id}</div>}
                </div>
            </div>

            {/* State - PrimeReact Dropdown */}
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">State</label>
                    <Dropdown
                        value={formData.state}
                        options={states || []}
                        onChange={(e) => handleInputChange({ target: { name: 'state', value: e.value } })}
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Select State"
                        filter
                        className={`w-100 ${errors.state || errors.state_id ? 'p-invalid' : ''}`}
                        disabled={!formData.country}
                        appendTo="self"
                    />
                    {(errors.state || errors.state_id) && <div className="invalid-feedback d-block">{errors.state || errors.state_id}</div>}
                </div>
            </div>

            {/* City - PrimeReact Dropdown */}
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">City</label>
                    <Dropdown
                        value={formData.city}
                        options={[...(cities || []), { label: 'Others', value: 'Others' }]}
                        onChange={(e) => handleInputChange({ target: { name: 'city', value: e.value } })}
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Select City"
                        filter
                        className={`w-100 ${errors.city || errors.city_id ? 'p-invalid' : ''}`}
                        disabled={!formData.state}
                        appendTo="self"
                    />
                    {(errors.city || errors.city_id) && <div className="invalid-feedback d-block">{errors.city || errors.city_id}</div>}
                </div>
            </div>

            {/* Other City Input - Shown when "Others" is selected */}
            {formData.city === 'Others' && (
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label className="form-label">Other City <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className={`form-control ${errors.other_city ? 'is-invalid' : ''}`}
                            name="other_city"
                            placeholder="Enter city name"
                            value={formData.other_city || ''}
                            onChange={handleInputChange}
                        />
                        {errors.other_city && <div className="invalid-feedback">{errors.other_city}</div>}
                    </div>
                </div>
            )}

            {/* Zip Code */}
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Zip Code</label>
                    <input type="text" className="form-control" name="postal_code" placeholder="Enter zip code" value={formData.postal_code} onChange={handleInputChange} />
                </div>
            </div>

            {/* Joining Date - PrimeReact Calendar with Custom Styling */}
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Joining Date</label>
                    <div className="custom-datepicker">
                        <Calendar
                            value={parseDate(formData.joining_date)}
                            onChange={(e) => {
                                const date = e.value;
                                const dateString = date
                                    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                    : "";
                                handleInputChange({ target: { name: "joining_date", value: dateString } });
                            }}
                            dateFormat="dd M, yy"
                            placeholder="Select date"
                            showIcon
                            className="w-100"
                            appendTo="self"
                            readOnlyInput
                        />
                    </div>
                </div>
            </div>

            {/* Tax ID */}
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Tax ID</label>
                    <input type="text" className="form-control" name="tax_id" placeholder="Enter tax ID" value={formData.tax_id} onChange={handleInputChange} />
                </div>
            </div>

            {/* Website */}
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Website</label>
                    <input type="text" className="form-control" name="website" placeholder="Enter website" value={formData.website} onChange={handleInputChange} />
                </div>
            </div>





            {/* Partner Type */}
            {!(!!partnerId && !wasFreeTrial) && (
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label className="form-label">Partner Type <span className="text-danger">*</span></label>
                        <Dropdown
                            value={formData.partner_type}
                            options={(() => {
                                const types = new Set((partnerPlans || []).map(p => p.partner_type));
                                // Ensure current value is included so it's visible when disabled
                                if (formData.partner_type) types.add(formData.partner_type);

                                return Array.from(types).map(type => ({
                                    label: type,
                                    value: type
                                }));
                            })()}
                            onChange={(e) => {
                                handleInputChange({ target: { name: 'partner_type', value: e.value } });
                                handleInputChange({ target: { name: 'plan_id', value: '' } });
                            }}
                            optionLabel="label"
                            optionValue="value"
                            placeholder="Select partner type..."
                            className={`w-100 ${errors.partner_type || errors.partner_type_id ? 'p-invalid' : ''}`}
                            disabled={!!partnerId}
                            appendTo="self"
                        />
                        {/* Partner Type Error Handling */}
                        {(errors.partner_type || errors.partner_type_id) && (
                            <div className="invalid-feedback d-block">
                                {errors.partner_type || errors.partner_type_id}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Free Trial Section */}
            {(!partnerId || wasFreeTrial) && (
                <div className="col-12 mt-4">
                    <div className="card border-0 bg-light-subtle shadow-sm mb-4">
                        <div className="card-body p-4 rounded" style={{ backgroundColor: 'var(--vz-light)' }}>
                            <div className="d-flex align-items-center mb-3">
                                <i className="ri-gift-line text-warning fs-3 me-2"></i>
                                <h5 className="mb-0 text-primary fw-semibold">Enable Free Trial</h5>
                            </div>
                            <p className="text-muted fs-13 mb-4">
                                Enable a free trial period for this partner. During the trial period, they will have access to the platform without regular billing restrictions.
                            </p>
                            <div className="row align-items-center g-3">
                                <div className="col-md-6">
                                    <div className="form-check form-switch form-switch-md">
                                        <input
                                            id="is_free_trail"
                                            name="is_free_trail"
                                            checked={isFreeTrial}
                                            className="form-check-input"
                                            type="checkbox"
                                            disabled={!!partnerId && !wasFreeTrial}
                                            onChange={(e) => {
                                                if (!!partnerId && !wasFreeTrial) return;
                                                const checked = e.target.checked;
                                                handleInputChange({
                                                    target: {
                                                        name: 'is_free_trail',
                                                        value: checked
                                                    }
                                                });

                                                let dateString = '';
                                                if (checked) {
                                                    const defaultDate = new Date();
                                                    defaultDate.setMonth(defaultDate.getMonth() + 1);
                                                    dateString = `${defaultDate.getFullYear()}-${String(defaultDate.getMonth() + 1).padStart(2, "0")}-${String(defaultDate.getDate()).padStart(2, "0")}`;
                                                }

                                                handleInputChange({
                                                    target: {
                                                        name: 'free_trail_end_date',
                                                        value: dateString
                                                    }
                                                });
                                            }}
                                        />
                                        <label className="form-check-label fw-semibold text-dark fs-14 ms-2 mb-0" htmlFor="is_free_trail">
                                            Activate Free Trial
                                        </label>
                                    </div>
                                </div>

                                {isFreeTrial && (
                                    <div className="col-md-6">
                                        <div className="mb-0">
                                            <label className="form-label fw-medium text-dark fs-13 mb-1">Trial End Date <span className="text-danger">*</span></label>
                                            <div className="custom-datepicker">
                                                <Calendar
                                                    value={parseDate(formData.free_trail_end_date)}
                                                    disabled={!!partnerId && !wasFreeTrial}
                                                    onChange={(e) => {
                                                        if (!!partnerId && !wasFreeTrial) return;
                                                        const date = e.value;
                                                        const dateString = date
                                                            ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                                            : "";
                                                        handleInputChange({ target: { name: "free_trail_end_date", value: dateString } });
                                                    }}
                                                    dateFormat="dd M, yy"
                                                    placeholder="Select trial end date"
                                                    showIcon
                                                    className={`w-100 ${errors.free_trail_end_date ? 'is-invalid' : ''}`}
                                                    appendTo="self"
                                                    readOnlyInput
                                                />
                                            </div>
                                            {errors.free_trail_end_date && <div className="invalid-feedback d-block mt-1">{errors.free_trail_end_date}</div>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!isFreeTrial && (
                <>
                    {/* Enrollment Type — always visible */}
                    {!(!!partnerId && !wasFreeTrial) && (
                        <div className="col-lg-6">
                            <div className="mb-3">
                                <label className="form-label">Enrollment Type <span className="text-danger">*</span></label>
                                <Dropdown
                                    value={formData.enrollment_type}
                                    options={(() => {
                                        // Base options from plans matching partner type
                                        const matchedPlans = partnerPlans.filter(plan =>
                                            plan.partner_type === formData.partner_type
                                        );

                                        const options = matchedPlans.map(plan => ({
                                            label: `${plan.enrollment_type}`,
                                            value: plan.enrollment_type
                                        }));

                                        // Ensure current enrollment type is in the list
                                        if (formData.enrollment_type && !options.find(opt => opt.value === formData.enrollment_type)) {
                                            options.unshift({
                                                label: formData.enrollment_type,
                                                value: formData.enrollment_type
                                            });
                                        }

                                        return options.length > 0 ? options : (ENROLLMENT_TYPE_OPTIONS || []);
                                    })()}
                                    onChange={(e) => {
                                        handleInputChange({ target: { name: 'enrollment_type', value: e.value } });
                                        // Resolve and persist the matched plan_id immediately
                                        const matchedPlan = partnerPlans.find(
                                            plan => plan.partner_type === formData.partner_type &&
                                                (plan.enrollment_type || '').toString().toLowerCase() === (e.value || '').toString().toLowerCase()
                                        );
                                        handleInputChange({ target: { name: 'plan_id', value: matchedPlan?.id || '' } });
                                        if ((e.value || '').toString().toLowerCase() === ENROLLMENT_TYPE_INSTALLMENT.toLowerCase()) {
                                            setShowInstallmentModal(true);
                                        }
                                    }}
                                    optionLabel="label"
                                    optionValue="value"
                                    placeholder="Select enrollment type..."
                                    className={`w-100 ${errors.enrollment_type ? 'p-invalid' : ''}`}
                                    disabled={!formData.partner_type || (!!partnerId && !wasFreeTrial)}
                                    appendTo="self"
                                />
                                {errors.enrollment_type && <div className="invalid-feedback d-block">{errors.enrollment_type}</div>}
                            </div>
                        </div>
                    )}

                    {/* Enrollment Payment — hidden for installment plans */}
                    {!(!!partnerId && !wasFreeTrial) && formData.enrollment_type && !isInstallmentPlan && !(formData.installment_applied === true || formData.installment_applied === 'true') && (
                        <div className="col-lg-6">
                            <div className="mb-3">
                                <label className="form-label">
                                    Enrollment Payment ($) <span className="text-danger">*</span>
                                </label>
                                <InputText
                                    type="number"
                                    className={`form-control ${errors.enrollment_amount || errors.payable_amount || errors.amount ? 'is-invalid' : ''}`}
                                    name="enrollment_amount"
                                    placeholder="Enter amount"
                                    value={formData.enrollment_amount !== undefined && formData.enrollment_amount !== null && formData.enrollment_amount !== '' ? formData.enrollment_amount : (formData.payable_amount !== undefined && formData.payable_amount !== null && formData.payable_amount !== '' ? formData.payable_amount : (formData.enrollment_amount === 0 || formData.payable_amount === 0 ? 0 : ''))}
                                    onChange={handleInputChange}
                                    disabled={!!partnerId && !wasFreeTrial}
                                />
                                {(errors.enrollment_amount || errors.payable_amount || errors.amount) && (
                                    <div className="invalid-feedback">{errors.enrollment_amount || errors.payable_amount || errors.amount}</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Platform Fee Payment — always visible when enrollment type is set */}
                    {!(!!partnerId && !wasFreeTrial) && formData.enrollment_type && (
                        <div className="col-lg-6">
                            <div className="mb-3">
                                <label className="form-label">
                                    Platform Fee Payment ($) <span className="text-danger">*</span>
                                </label>
                                <InputText
                                    type="number"
                                    className={`form-control ${errors.platform_fee || errors.monthly_platform_fee || errors.recurring_amount ? 'is-invalid' : ''}`}
                                    name="monthly_platform_fee"
                                    placeholder="Enter amount"
                                    value={formData.monthly_platform_fee !== undefined && formData.monthly_platform_fee !== null && formData.monthly_platform_fee !== '' ? formData.monthly_platform_fee : (formData.recurring_amount !== undefined && formData.recurring_amount !== null && formData.recurring_amount !== '' ? formData.recurring_amount : (formData.platform_fee !== undefined && formData.platform_fee !== null && formData.platform_fee !== '' ? formData.platform_fee : (formData.monthly_platform_fee === 0 || formData.recurring_amount === 0 || formData.platform_fee === 0 ? 0 : '')))}
                                    onChange={handleInputChange}
                                    disabled={!!partnerId && !wasFreeTrial}
                                />
                                {(errors.platform_fee || errors.monthly_platform_fee || errors.recurring_amount) && (
                                    <div className="invalid-feedback">{errors.platform_fee || errors.monthly_platform_fee || errors.recurring_amount}</div>
                                )}
                            </div>
                        </div>
                    )}


                    {/* Enrollment Amount - Dynamic Display */}
                    {formData.partner_type && formData.enrollment_type && (
                        <div className="col-lg-12">
                            <div className="mb-3">
                                <label className="form-label">{partnerId ? 'Enrollment Details' : 'Enrollment Amount'}</label>
                                <div className="enrollment-base-alert">
                                    <div className="card-body">
                                        {(() => {
                                            if (!enrollmentTypeName) return null;

                                            return (
                                                <>
                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                        <span className="info-label">
                                                            <i className="ri-user-settings-line"></i> Partner Type:
                                                        </span>
                                                        <span className="info-value text-primary">{formData.partner_type}</span>
                                                    </div>
                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                        <span className="info-label">
                                                            <i className="ri-bank-card-line"></i> Payment Plan:
                                                        </span>
                                                        <span className="info-value">{enrollmentTypeName}</span>
                                                    </div>
                                                    <hr />
                                                    {isOneTime ? (
                                                          <>
                                                              <div className="d-flex justify-content-between align-items-center mb-2">
                                                                  <span className="info-label">
                                                                      <i className="ri-hand-coin-line"></i> One-Time Cost:
                                                                  </span>
                                                                  <span className="amount-value amount-success">
                                                                      {formData.enrollment_amount_formatted || ('$' + Number(currentPaymentAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
                                                                  </span>
                                                              </div>
                                                              <div className="custom-notice">
                                                                  <i className="ri-information-line"></i>
                                                                  <p className="custom-notice-text">
                                                                      After the full enrollment amount is paid, a monthly platform fee of <strong>{formData.monthly_platform_fee_formatted || ('$' + Number(currentPlatformFee).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</strong> will apply each month.
                                                                  </p>
                                                              </div>
                                                          </>
                                                      ) : isInstallmentPlan ? (
                                                          (() => {
                                                              const isAlreadyInPaidMode = !!partnerId && !wasFreeTrial;
                                                              const showDetailsDirectly = isAlreadyInPaidMode || (formData.installment_applied === true || formData.installment_applied === 'true');

                                                              return (
                                                                  <>
                                                                      {showDetailsDirectly ? (
                                                                          <>
                                                                              <div className="d-flex justify-content-between align-items-center mb-2">
                                                                                  <span className="info-label">
                                                                                      <i className="ri-hand-coin-line text-success"></i> Total Enrollment Amount:
                                                                                  </span>
                                                                                  <span className="info-value fw-semibold">
                                                                                      {formData.enrollment_amount_formatted || ('$' + Number(formData.enrollment_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
                                                                                  </span>
                                                                              </div>
                                                                              <div className="d-flex justify-content-between align-items-center mb-2">
                                                                                  <span className="info-label">
                                                                                      <i className="ri-wallet-3-line text-success"></i> Down Payment (Upfront):
                                                                                  </span>
                                                                                  <span className="info-value text-success fw-semibold">
                                                                                      {formData.installment_down_payment_formatted || ('$' + Number(formData.installment_down_payment || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
                                                                                  </span>
                                                                              </div>
                                                                              <div className="d-flex justify-content-between align-items-center mb-2">
                                                                                  <span className="info-label">
                                                                                      <i className="ri-calendar-line text-success"></i> Installment Duration:
                                                                                  </span>
                                                                                  <span className="info-value fw-semibold">
                                                                                      {formData.installment_months || 12} Months
                                                                                  </span>
                                                                              </div>
                                                                              <div className="d-flex justify-content-between align-items-center mb-2">
                                                                                  <span className="info-label">
                                                                                      <i className="ri-money-dollar-circle-line text-success"></i> Monthly Installment Amount:
                                                                                  </span>
                                                                                  <span className="amount-value text-success fw-semibold">
                                                                                      {formData.installment_monthly_amount_formatted || ('$' + Number(
                                                                                          formData.installment_monthly_amount !== undefined && formData.installment_monthly_amount !== ''
                                                                                              ? formData.installment_monthly_amount
                                                                                              : ((Number(formData.enrollment_amount) || 0) - (Number(formData.installment_down_payment) || 0)) / (Number(formData.installment_months) || 12)
                                                                                      ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
                                                                                  </span>
                                                                              </div>
                                                                              {!isAlreadyInPaidMode && (
                                                                                  <div className="d-flex gap-2 mt-3">
                                                                                      <button
                                                                                          type="button"
                                                                                          className="btn btn-sm installment-trigger-btn"
                                                                                          onClick={() => setShowInstallmentModal(true)}
                                                                                          disabled={!!partnerId && !wasFreeTrial}
                                                                                          style={{ opacity: 1, cursor: 'pointer' }}
                                                                                      >
                                                                                          <i className="ri-edit-line me-1"></i> View Payment Details
                                                                                      </button>
                                                                                      {!(!!partnerId && !wasFreeTrial) && (
                                                                                          <button
                                                                                              type="button"
                                                                                              className="btn btn-sm btn-light border"
                                                                                              onClick={() => {
                                                                                                  handleInputChange({ target: { name: 'installment_applied', value: false } });
                                                                                                  handleInputChange({ target: { name: 'installment_down_payment', value: 0 } });
                                                                                                  handleInputChange({ target: { name: 'installment_months', value: 0 } });
                                                                                                  handleInputChange({ target: { name: 'installment_monthly_amount', value: 0 } });
                                                                                                  handleInputChange({ target: { name: 'enrollment_type', value: '' } });
                                                                                                  handleInputChange({ target: { name: 'enrollment_amount', value: '' } });
                                                                                                  handleInputChange({ target: { name: 'monthly_platform_fee', value: '' } });
                                                                                              }}
                                                                                          >
                                                                                              <i className="ri-refresh-line me-1"></i> Reset
                                                                                          </button>
                                                                                      )}
                                                                                  </div>
                                                                              )}
                                                                              <div className="custom-notice mt-2">
                                                                                  <i className="ri-information-line"></i>
                                                                                  <p className="custom-notice-text">
                                                                                      After the full enrollment amount is paid, a monthly platform fee of <strong>{formData.monthly_platform_fee_formatted || ('$' + Number(formData.monthly_platform_fee || currentPlatformFee || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</strong> will apply each month.
                                                                                  </p>
                                                                              </div>
                                                                          </>
                                                                      ) : (
                                                                          <>
                                                                              <div className="d-flex justify-content-between align-items-center mb-2">
                                                                                  <span className="info-label">
                                                                                      <i className="ri-hand-coin-line"></i> Total Enrollment Cost:
                                                                                  </span>
                                                                                  <span className="amount-value amount-success">
                                                                                      ${Number(selectedPlan?.total_amount || formData.total_subscription_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                  </span>
                                                                              </div>
                                                                              <div className="custom-notice">
                                                                                  <i className="ri-information-line"></i>
                                                                                  <p className="custom-notice-text">
                                                                                      Flexible installment plan. Choose a down payment and duration to calculate the monthly amount. After the full enrollment amount is paid, a monthly platform fee of <strong>{formData.monthly_platform_fee_formatted || ('$' + Number(formData.monthly_platform_fee || currentPlatformFee || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</strong> will apply each month.
                                                                                  </p>
                                                                              </div>
                                                                              <button
                                                                                  type="button"
                                                                                  className="btn btn-sm installment-trigger-btn mt-2"
                                                                                  onClick={() => setShowInstallmentModal(true)}
                                                                                  disabled={!!partnerId && !wasFreeTrial}
                                                                              >
                                                                                  <i className="ri-calculator-line me-1"></i> View Installment Details
                                                                              </button>
                                                                          </>
                                                                      )}
                                                                  </>
                                                              );
                                                          })()
                                                     ) : (
                                                         <>
                                                             <div className="d-flex justify-content-between align-items-center mb-2">
                                                                 <span className="info-label">
                                                                     <i className="ri-money-dollar-circle-line"></i> Monthly Payment:
                                                                 </span>
                                                                 <span className="amount-value text-success">
                                                                     ${Number(currentPaymentAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                 </span>
                                                             </div>
                                                             <div className="d-flex justify-content-between align-items-center mb-2">
                                                                 <span className="info-label">
                                                                     <i className="ri-calendar-line"></i> Duration:
                                                                 </span>
                                                                 <span className="info-value text-muted">{selectedPlan?.total_installments_count || 11} months</span>
                                                             </div>
                                                             <div className="d-flex justify-content-between align-items-center mb-2">
                                                                 <span className="info-label">
                                                                     <i className="ri-calculator-line"></i> Total Amount:
                                                                 </span>
                                                                 <span className="info-value text-success">
                                                                     ${Number(totalInvestment).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                 </span>
                                                             </div>
                                                             <div className="custom-notice">
                                                                 <i className="ri-information-line text-success"></i>
                                                                 <p className="custom-notice-text">
                                                                     After the full enrollment amount is paid, a monthly platform fee of <strong>${Number(currentPlatformFee).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> will apply each month.
                                                                 </p>
                                                             </div>
                                                         </>
                                                     )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Secondary Contact Section */}
            <div className="col-lg-12">
                <h5 className="pb-2 mb-3 mt-3">Secondary Contact</h5>
            </div>

            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Name</label>
                    <input type="text" className="form-control" name="contact_person" placeholder="Enter name" value={formData.contact_person} onChange={handleInputChange} />
                </div>
            </div>

            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Phone</label>
                    <div className="input-group">
                        {/* Country Code Display */}
                        {getCountryPhoneInfo(formData.country) && (
                            <span className="input-group-text bg-light border">
                                <span className="me-1">{getCountryPhoneInfo(formData.country).label}</span>
                                <span className="text-muted">{getCountryPhoneInfo(formData.country).prefix}</span>
                            </span>
                        )}
                        <input
                            type="text"
                            className="form-control"
                            name="contact_person_phone_number"
                            placeholder="(555) 555-5555"
                            value={formData.contact_person_phone_number}
                            onChange={(e) => {
                                const formatted = formatPhoneNumber(e.target.value);
                                handleInputChange({ target: { name: 'contact_person_phone_number', value: formatted } });
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" name="contact_person_email" placeholder="Enter email" value={formData.contact_person_email} onChange={handleInputChange} />
                </div>
            </div>

            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Relation</label>
                    <Dropdown
                        value={formData.contact_person_relation}
                        options={relationOptions}
                        onChange={(e) => handleInputChange({ target: { name: 'contact_person_relation', value: e.value } })}
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Select relation..."
                        className="w-100"
                    />
                </div>
            </div>

            {formData.contact_person_relation === 'Other' && (
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label className="form-label">Other Relation</label>
                        <input type="text" className="form-control" name="contact_person_relation_other" placeholder="Specify relation" value={formData.contact_person_relation_other} onChange={handleInputChange} />
                    </div>
                </div>
            )}

            <InstallmentDetailsModal
                show={showInstallmentModal}
                onHide={() => setShowInstallmentModal(false)}
                totalAmount={selectedPlan?.total_amount || formData.enrollment_amount || formData.total_subscription_amount || 0}
                defaultMonths={selectedPlan?.total_installments_count || 12}
                planLabel={enrollmentTypeName}
                partnerType={partnerTypeName}
                appliedTotalAmount={formData.enrollment_amount}
                appliedDownPayment={formData.installment_down_payment}
                appliedMonths={formData.installment_months}
                appliedApplied={formData.installment_applied}
                installmentMinMonths={selectedPlan?.installment_min_months}
                installmentMaxMonths={selectedPlan?.installment_max_months}
                installmentDefaultMonths={selectedPlan?.installment_default_months}
                onApply={(data) => {
                    handleInputChange({ target: { name: 'enrollment_amount', value: data.totalAmount } });
                    handleInputChange({ target: { name: 'installment_down_payment', value: data.downPayment } });
                    handleInputChange({ target: { name: 'installment_months', value: data.months } });
                    handleInputChange({ target: { name: 'installment_monthly_amount', value: data.monthlyPayment } });
                    handleInputChange({ target: { name: 'installment_remaining_balance', value: Math.max(0, Number(data.totalAmount || 0) - Number(data.downPayment || 0)) } });
                    handleInputChange({ target: { name: 'installment_applied', value: true } });
                }}
            />
        </>
    );
}
