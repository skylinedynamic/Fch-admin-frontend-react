import React from 'react';
import { Dropdown } from 'primereact/dropdown';
import Flatpickr from 'react-flatpickr';
import { relationOptions } from '../../../config/relations';

export default function PartnerInformationSection({
    formData,
    errors,
    profileImage,
    handleInputChange,
    countries,
    states,
    cities
}) {
    // Helper function to get image source - matches EmployeeDetails pattern
    const getImageSrc = () => {
        // If user selected a new image file
        if (formData.partner_image instanceof File) {
            return URL.createObjectURL(formData.partner_image);
        }

        // If there's an existing image URL from formData
        if (typeof formData.partner_image === 'string' && formData.partner_image.trim() !== '') {
            return formData.partner_image;
        }

        // Fall back to profileImage prop
        if (typeof profileImage === 'string' && profileImage.trim() !== '') {
            return profileImage;
        }

        // Default avatar
        return '/assets/images/users/avatar-1.jpg';
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
                            <input
                                id="profile-img-file-input"
                                type="file"
                                className="profile-img-file-input"
                                onChange={handleInputChange}
                                name="partner_image"
                                accept="image/*"
                            />
                            <label htmlFor="profile-img-file-input" className="profile-photo-edit avatar-xs">
                                <span className="avatar-title rounded-circle bg-light text-body material-shadow">
                                    <i className="ri-camera-fill"></i>
                                </span>
                            </label>
                        </div>
                    </div>
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
                        required
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
                        required
                    />
                    {errors.company_name && <div className="invalid-feedback">{errors.company_name}</div>}
                </div>
            </div>

            {/* Phone Number */}
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Phone Number <span className="text-danger">*</span></label>
                    <input
                        type="text"
                        className={`form-control ${errors.phone_number ? 'is-invalid' : ''}`}
                        name="phone_number"
                        placeholder="Enter phone number"
                        value={formData.phone_number}
                        onChange={handleInputChange}
                        required
                    />
                    {errors.phone_number && <div className="invalid-feedback">{errors.phone_number}</div>}
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
                        required
                    />
                    {errors.email && <div className="invalid-feedback">{errors.email}</div>}
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
                        className={`w-100 ${errors.country ? 'p-invalid' : ''}`}
                    />
                    {errors.country && <div className="invalid-feedback d-block">{errors.country}</div>}
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
                        className={`w-100 ${errors.state ? 'p-invalid' : ''}`}
                        disabled={!formData.country}
                    />
                    {errors.state && <div className="invalid-feedback d-block">{errors.state}</div>}
                </div>
            </div>

            {/* City - PrimeReact Dropdown */}
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">City <span className="text-danger">*</span></label>
                    <Dropdown
                        value={formData.city}
                        options={cities}
                        onChange={(e) => handleInputChange({ target: { name: 'city', value: e.value } })}
                        optionLabel="label"
                        placeholder="Select City"
                        filter
                        className={`w-100 ${errors.city ? 'p-invalid' : ''}`}
                        disabled={!formData.state}
                    />
                    {errors.city && <div className="invalid-feedback d-block">{errors.city}</div>}
                </div>
            </div>

            {/* Zip Code */}
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Zip Code</label>
                    <input type="text" className="form-control" name="postal_code" placeholder="Enter zip code" value={formData.postal_code} onChange={handleInputChange} />
                </div>
            </div>

            {/* Address */}
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Address</label>
                    <input type="text" className="form-control" name="address" placeholder="Enter address" value={formData.address} onChange={handleInputChange} />
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
                    <input type="text" className="form-control" name="contact_person_phone_number" placeholder="Enter phone" value={formData.contact_person_phone_number} onChange={handleInputChange} />
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
