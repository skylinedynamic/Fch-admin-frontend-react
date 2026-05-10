import React, { useState, useEffect } from 'react';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import Flatpickr from 'react-flatpickr';
import { relationOptions } from '../../../config';
import { parseDate } from '../../../utils/formatters';
import { PAYMENT_TYPE_OPTIONS, ENROLLMENT_TYPES, PARTNER_TYPES } from '../../../config/partnerTypeOptions';
import { formatPhoneNumber } from '../../../utils/formatters';
import avatarDefault from '../../../../assets/images/users/avatar-1.jpg';
import { FileManagerModal } from '../../../components/FileManagerModal/FileManagerModal';
import { toast } from 'react-toastify';
import { getCountryPhoneInfo } from '../../../config/locations';
import { buildStorageUrl } from '../../../utils/imageHelpers';


export default function PartnerInformationSection({
    formData,
    errors,
    profileImage,
    handleInputChange,
    countries,
    states,
    cities,
    partnerId,
    partnerPlans = []
}) {
    const [showFileManager, setShowFileManager] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);

    // Calculate dynamic values for summary and overrides
    const selectedPlan = partnerPlans.find(
        plan => plan.partner_type === formData.partner_type &&
            plan.enrollment_type === formData.enrollment_type
    );

    const hasCustomEnrollment = (formData.enrollment_amount !== undefined && formData.enrollment_amount !== '') || (formData.payable_amount !== undefined && formData.payable_amount !== '');
    const hasCustomPlatformFee = (formData.monthly_platform_fee !== undefined && formData.monthly_platform_fee !== '') || (formData.recurring_amount !== undefined && formData.recurring_amount !== '') || (formData.platform_fee !== undefined && formData.platform_fee !== '');

    const currentPaymentAmount = formData.enrollment_amount || formData.payable_amount || (selectedPlan?.payment_amount || formData.first_reg_amount || 0);
    const currentPlatformFee = formData.monthly_platform_fee || formData.recurring_amount || formData.platform_fee || (selectedPlan?.platform_fee || 0);
    const isOneTime = formData.enrollment_type === ENROLLMENT_TYPES.ONE_TIME_STR || formData.enrollment_type?.includes('One Time');
    const partnerTypeName = selectedPlan?.partner_type || formData.partner_type;
    const enrollmentTypeName = selectedPlan?.enrollment_type || formData.enrollment_type;

    const totalInvestment = formData.total_subscription_amount || (Number(currentPaymentAmount) * (selectedPlan?.total_installments_count || 11));

    // Auto-scroll to first error field
    useEffect(() => {
        if (errors && Object.keys(errors).length > 0) {
            // Find the first error field
            const firstErrorField = document.querySelector('.is-invalid, .p-invalid');
            if (firstErrorField) {
                firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [errors]);

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
                <div className="card">
                    <div className="profile-user position-relative d-inline-block mx-auto mb-4">
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
                        <span className="badge bg-light text-muted border">
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
                        {formData.company_name && (
                            <span className="ms-1 text-muted fw-normal" style={{ fontSize: '0.85em' }}>
                                &nbsp;(Partner portal url be like : <code className="text-primary font-monospace">
                                    {formData.partner_domain ? (
                                        formData.partner_domain
                                    ) : (
                                        <>
                                            {formData.company_name.toLowerCase().replace(/[^a-z]/g, '')}
                                            .{new URL(import.meta.env.VITE_BASE_URL || window.location.href).host}
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

            {/* Portal URL / Custom Domain - Visible only in update mode */}
            {partnerId && (
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label className="form-label">
                            {formData.partner_type === PARTNER_TYPES.CERTIFIED ? "Custom Domain" : "Portal Subdomain"}
                        </label>
                        <div className="input-group material-shadow">
                            <input
                                type="text"
                                className={`form-control ${formData.partner_type === PARTNER_TYPES.CERTIFIED ? '' : 'bg-light text-muted fw-medium'} ${errors.partner_domain ? 'is-invalid' : ''}`}
                                name="partner_domain"
                                placeholder={formData.partner_type === PARTNER_TYPES.CERTIFIED ? "Enter custom subdomain" : ""}
                                value={formData.partner_type === PARTNER_TYPES.CERTIFIED ? (formData.partner_domain || '') : (formData.company_name ? formData.company_name.toLowerCase().replace(/[^a-z]/g, '') : '')}
                                onChange={handleInputChange}
                                readOnly={formData.partner_type !== PARTNER_TYPES.CERTIFIED}
                            />
                            <span className="input-group-text bg-light text-muted px-3">
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
                    <label className="form-label">Address <span className="text-danger">*</span></label>
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
                    <label className="form-label">State <span className="text-danger">*</span></label>
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
                    <label className="form-label">City <span className="text-danger">*</span></label>
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

            {/* Joining Date - Flatpickr */}
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Joining Date</label>
                    <Flatpickr
                        options={{ dateFormat: "d M, Y" }}
                        value={parseDate(formData.joining_date)}
                        onChange={(dates) => {
                            const date = dates[0];
                            const dateString = date
                                ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                : "";
                            handleInputChange({ target: { name: "joining_date", value: dateString } });
                        }}
                        className="form-control"
                        placeholder="Select date"
                        readOnly
                    />
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
                        onChange={(e) => handleInputChange({ target: { name: 'partner_type', value: e.value } })}
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

            {/* Enrollment Type */}
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
                                label: `${plan.enrollment_type} ($${(plan.payment_amount || 0).toLocaleString()})`,
                                value: plan.enrollment_type
                            }));

                            // Ensure current enrollment type is in the list
                            if (formData.enrollment_type && !options.find(opt => opt.value === formData.enrollment_type)) {
                                options.unshift({
                                    label: formData.enrollment_type,
                                    value: formData.enrollment_type
                                });
                            }

                            return options.length > 0 ? options : (PAYMENT_TYPE_OPTIONS || []);
                        })()}
                        onChange={(e) => handleInputChange({ target: { name: 'enrollment_type', value: e.value } })}
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Select enrollment type..."
                        className={`w-100 ${errors.enrollment_type ? 'p-invalid' : ''}`}
                        disabled={!formData.partner_type || !!partnerId}
                        appendTo="self"
                    />
                    {errors.enrollment_type && <div className="invalid-feedback d-block">{errors.enrollment_type}</div>}
                </div>
            </div>

            {/* Custom Enrollment Amount & Platform Fee */}
            {formData.enrollment_type && (
                <>
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
                                disabled={!!partnerId}
                            />
                            {(errors.enrollment_amount || errors.payable_amount || errors.amount) && (
                                <div className="invalid-feedback">{errors.enrollment_amount || errors.payable_amount || errors.amount}</div>
                            )}
                        </div>
                    </div>

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
                                disabled={!!partnerId}
                            />
                            {(errors.platform_fee || errors.monthly_platform_fee || errors.recurring_amount) && (
                                <div className="invalid-feedback">{errors.platform_fee || errors.monthly_platform_fee || errors.recurring_amount}</div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Enrollment Amount - Dynamic Display */}
            {formData.partner_type && formData.enrollment_type && (
                <div className="col-lg-12">
                    <div className="mb-3">
                        <label className="form-label">Enrollment Amount</label>
                        <div className="enrollment-base-alert">
                            <div className="card-body">
                                {(() => {
                                    if (!enrollmentTypeName) return null;

                                    return (
                                        <>
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <span className="info-label">
                                                    <i className="ri-building-line"></i> Partner Type:
                                                </span>
                                                <span className="info-value text-success">{partnerTypeName}</span>
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
                                                            ${Number(currentPaymentAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                    <div className="custom-notice">
                                                        <i className="ri-information-line"></i>
                                                        <p className="custom-notice-text">
                                                            Platform fee of <strong>${Number(currentPlatformFee).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month</strong> starts on the 12th month
                                                        </p>
                                                    </div>
                                                </>
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
                                                            Platform fee of <strong>${Number(currentPlatformFee).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month</strong> starts on the 12th month
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
        </>
    );
}
