import React, { useState } from 'react';
import { Dropdown } from 'primereact/dropdown';
import Flatpickr from 'react-flatpickr';
import { relationOptions } from '../../../config';
import { PARTNER_INFORMATION_TYPE_OPTIONS } from '../../../config/partnerTypeOptions';
import { formatPhoneNumber } from '../../../utils/formatters';
import avatarDefault from '../../../../assets/images/users/avatar-1.jpg';
import { FileManagerModal } from '../../../components/FileManagerModal/FileManagerModal';
import { toast } from 'react-toastify';

const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || '';

export default function PartnerInformationSection({
    formData,
    errors,
    profileImage,
    handleInputChange,
    countries,
    states,
    cities,
    partnerId
}) {
    const [showFileManager, setShowFileManager] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);

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

        const buildUrl = (path) => {
            if (!path || typeof path !== 'string' || path.startsWith('http') || path.startsWith('blob:')) {
                return path;
            }

            // Clean up BOTH base URL and path
            const baseUrl = STORAGE_URL.trim().replace(/\/+$/, '');
            let cleanPath = path.trim().replace(/^\/+/, '');

            // Ensure partners structure if missing
            if (partnerId && !cleanPath.includes('partners/')) {
                // If it already has some other path, we preserve it, 
                // but if it's just a filename, we add the partner path
                if (!cleanPath.includes('/')) {
                    cleanPath = `partners/${partnerId}/${cleanPath}`;
                }
            }

            // Construct full URL and remove any double slashes except after protocol
            const fullUrl = `${baseUrl}/${cleanPath}`;
            return fullUrl.replace(/([^:]\/)\/+/g, "$1");
        };

        // 2. If we have a preview URL from file manager selection
        if (previewUrl && formData.partner_image && typeof formData.partner_image === 'string' && !formData.partner_image.startsWith('http')) {
            return buildUrl(previewUrl);
        }

        // 3. Use current partner_image if it's a string (from DB)
        if (typeof formData.partner_image === 'string' && formData.partner_image.trim() !== '') {
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
                    <label className="form-label">Company Name <span className="text-danger">*</span></label>
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

            {/* Phone Number */}
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Phone Number <span className="text-danger">*</span></label>
                    <div className="input-group">
                        {/* Country Code Display */}
                        {(formData.country === 'USA' || formData.country === 'Canada') && (
                            <span className="input-group-text bg-light border">
                                <span className="me-1">{formData.country === 'USA' ? 'USA' : 'CAN'}</span>
                                <span className="text-muted">+1</span>
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

            {/* Partner Type */}
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Partner Type <span className="text-danger">*</span></label>
                    <Dropdown
                        value={formData.partner_type}
                        options={PARTNER_INFORMATION_TYPE_OPTIONS}
                        onChange={(e) => handleInputChange({ target: { name: 'partner_type', value: e.value } })}
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Select partner type..."
                        className={`w-100 ${errors.partner_type || errors.partner_type_id ? 'p-invalid' : ''}`}
                    />
                    {/* Partner Type Error Handling */}
                    {(errors.partner_type || errors.partner_type_id) && (
                        <div className="invalid-feedback d-block">
                            {errors.partner_type || errors.partner_type_id}
                        </div>
                    )}
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
                        options={countries}
                        onChange={(e) => handleInputChange({ target: { name: 'country', value: e.value } })}
                        optionLabel="label"
                        placeholder="Select Country"
                        filter
                        className={`w-100 ${errors.country || errors.country_id ? 'p-invalid' : ''}`}
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
                        options={states}
                        onChange={(e) => handleInputChange({ target: { name: 'state', value: e.value } })}
                        optionLabel="label"
                        placeholder="Select State"
                        filter
                        className={`w-100 ${errors.state || errors.state_id ? 'p-invalid' : ''}`}
                        disabled={!formData.country}
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
                        options={[...cities, { label: 'Others', value: 'Others' }]}
                        onChange={(e) => handleInputChange({ target: { name: 'city', value: e.value } })}
                        optionLabel="label"
                        placeholder="Select City"
                        filter
                        className={`w-100 ${errors.city || errors.city_id ? 'p-invalid' : ''}`}
                        disabled={!formData.state}
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
                        value={formData.joining_date ? new Date(formData.joining_date) : null}
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

            {/* Secondary Contact Section */}
            <div className="col-lg-12">
                <h5 className="border-bottom pb-2 mb-3 mt-3">Secondary Contact</h5>
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
                        {(formData.country === 'USA' || formData.country === 'Canada') && (
                            <span className="input-group-text bg-light border">
                                <span className="me-1">{formData.country === 'USA' ? 'USA' : 'CAN'}</span>
                                <span className="text-muted">+1</span>
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
