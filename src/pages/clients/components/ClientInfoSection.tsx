import React from 'react';
import { Dropdown } from 'primereact/dropdown';
import Flatpickr from 'react-flatpickr';
import { formatPhoneNumber } from '../../../utils/formatters';
import type { Client } from '../../../modules/client/types';

const entityTypeOptions = [
    { label: 'Corporation (C-Corp)', value: 'Corporation (C-Corp)' },
    { label: 'Corporation (S-Corp)', value: 'Corporation (S-Corp)' },
    { label: 'Franchise', value: 'Franchise' },
    { label: 'Limited Liability Company (LLC)', value: 'Limited Liability Company (LLC)' }
];

const industryTypeOptions = [
    { label: 'Accounting & Financial Services', value: 'Accounting & Financial Services' },
    { label: 'Automotive Services & Dealerships', value: 'Automotive Services & Dealerships' }
];

interface ClientInfoSectionProps {
    formData: Client;
    errors: Record<string, string>;
    handleInputChange: (e: any) => void;
    countries: { label: string; value: string }[];
    states: { label: string; value: string }[];
    cities: { label: string; value: string }[];
    isLoading?: boolean;
}

export default function ClientInfoSection({
    formData,
    errors,
    handleInputChange,
    countries,
    states,
    cities,
    isLoading = false
}: ClientInfoSectionProps) {
    if (isLoading) {
        return (
            <div className="row">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div className="col-lg-6 mb-3" key={i}>
                        <div className="placeholder-glow">
                            <span className="placeholder col-4 mb-2"></span>
                            <span className="placeholder col-12 p-3"></span>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <form>
            <div className="row">
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="first_name" className="form-label">First Name <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className={`form-control ${errors.first_name ? 'is-invalid' : ''}`}
                            id="first_name"
                            name="first_name"
                            placeholder="Enter first name"
                            value={formData.first_name || ''}
                            onChange={handleInputChange}
                        />
                        {errors.first_name && <div className="invalid-feedback">{errors.first_name}</div>}
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="last_name" className="form-label">Last Name <span className="text-danger">*</span></label>
                        <input
                            type="text"
                            className={`form-control ${errors.last_name ? 'is-invalid' : ''}`}
                            id="last_name"
                            name="last_name"
                            placeholder="Enter last name"
                            value={formData.last_name || ''}
                            onChange={handleInputChange}
                        />
                        {errors.last_name && <div className="invalid-feedback">{errors.last_name}</div>}
                    </div>
                </div>

                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="phone_number" className="form-label">Phone Number <span className="text-danger">*</span></label>
                        <div className="input-group">
                            {(formData.country === 'USA' || formData.country === 'Canada') && (
                                <span className="input-group-text bg-light border">
                                    <span className="me-1">{formData.country === 'USA' ? 'USA' : 'CAN'}</span>
                                    <span className="text-muted">+1</span>
                                </span>
                            )}
                            <input
                                type="text"
                                className={`form-control ${errors.phone_number ? 'is-invalid' : ''}`}
                                id="phone_number"
                                name="phone_number"
                                placeholder="(555) 555-5555"
                                value={formData.phone_number || ''}
                                onChange={(e) => {
                                    const formatted = formatPhoneNumber(e.target.value);
                                    handleInputChange({ target: { name: 'phone_number', value: formatted } });
                                }}
                            />
                            {errors.phone_number && <div className="invalid-feedback">{errors.phone_number}</div>}
                        </div>
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="email" className="form-label">Email Address <span className="text-danger">*</span></label>
                        <input
                            type="email"
                            className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                            id="email"
                            name="email"
                            placeholder="Enter email"
                            value={formData.email || ''}
                            onChange={handleInputChange}
                        />
                        {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                    </div>
                </div>
                {/* <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="signup_id" className="form-label">Signup ID </label>
                        <input
                            type="text"
                            className={`form-control ${errors.signup_id ? 'is-invalid' : ''}`}
                            id="signup_id"
                            name="signup_id"
                            placeholder="Enter signup ID"
                            value={formData.signup_id || ''}
                            onChange={handleInputChange}
                        />
                        {errors.signup_id && <div className="invalid-feedback">{errors.signup_id}</div>}
                    </div>
                </div> */}
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="website" className="form-label">Website</label>
                        <input
                            type="text"
                            className={`form-control ${errors.website ? 'is-invalid' : ''}`}
                            id="website"
                            name="website"
                            placeholder="www.example.com"
                            value={formData.website || ''}
                            onChange={handleInputChange}
                        />
                        {errors.website && <div className="invalid-feedback">{errors.website}</div>}
                    </div>
                </div>

                {/* Business Information */}
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="legal_business_name" className="form-label">Legal Business Name</label>
                        <input
                            type="text"
                            className={`form-control ${errors.legal_business_name ? 'is-invalid' : ''}`}
                            id="legal_business_name"
                            name="legal_business_name"
                            placeholder="Enter legal business name"
                            value={formData.legal_business_name || ''}
                            onChange={handleInputChange}
                        />
                        {errors.legal_business_name && <div className="invalid-feedback">{errors.legal_business_name}</div>}
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="business_ein" className="form-label">Business EIN</label>
                        <input
                            type="text"
                            className={`form-control ${errors.business_ein ? 'is-invalid' : ''}`}
                            id="business_ein"
                            name="business_ein"
                            placeholder="Enter 9-digit EIN"
                            maxLength={9}
                            value={formData.business_ein || ''}
                            onChange={handleInputChange}
                        />
                        {errors.business_ein && <div className="invalid-feedback">{errors.business_ein}</div>}
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="state_file_number" className="form-label">State File Number</label>
                        <input
                            type="text"
                            className={`form-control ${errors.state_file_number ? 'is-invalid' : ''}`}
                            id="state_file_number"
                            name="state_file_number"
                            placeholder="Enter state file number"
                            value={formData.state_file_number || ''}
                            onChange={handleInputChange}
                        />
                        {errors.state_file_number && <div className="invalid-feedback">{errors.state_file_number}</div>}
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="duns_number" className="form-label">D-U-N-S Number</label>
                        <input
                            type="text"
                            className={`form-control ${errors.duns_number ? 'is-invalid' : ''}`}
                            id="duns_number"
                            name="duns_number"
                            placeholder="Enter 9-digit D-U-N-S"
                            maxLength={9}
                            value={formData.duns_number || ''}
                            onChange={handleInputChange}
                        />
                        {errors.duns_number && <div className="invalid-feedback">{errors.duns_number}</div>}
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="business_address" className="form-label">Business Address</label>
                        <input
                            type="text"
                            className={`form-control ${errors.business_address ? 'is-invalid' : ''}`}
                            id="business_address"
                            name="business_address"
                            placeholder="Enter business address"
                            value={formData.business_address || ''}
                            onChange={handleInputChange}
                        />
                        {errors.business_address && <div className="invalid-feedback">{errors.business_address}</div>}
                    </div>
                </div>

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
                        {errors.country && <small className="p-error">{errors.country}</small>}
                    </div>
                </div>

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
                        {errors.state && <small className="p-error">{errors.state}</small>}
                    </div>
                </div>

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
                            className={`w-100 ${errors.city ? 'p-invalid' : ''}`}
                            disabled={!formData.state}
                        />
                        {errors.city && <small className="p-error">{errors.city}</small>}
                    </div>
                </div>

                {formData.city === 'Others' && (
                    <div className="col-lg-6">
                        <div className="mb-3">
                            <label htmlFor="other_city" className="form-label">Other City <span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className={`form-control ${errors.other_city ? 'is-invalid' : ''}`}
                                id="city"
                                name="other_city"
                                placeholder="Enter city name"
                                value={formData.other_city || ''}
                                onChange={handleInputChange}
                            />
                            {errors.other_city && <div className="invalid-feedback">{errors.other_city}</div>}
                        </div>
                    </div>
                )}

                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="business_zip" className="form-label">Zip Code</label>
                        <input
                            type="text"
                            className={`form-control ${errors.business_zip ? 'is-invalid' : ''}`}
                            id="business_zip"
                            name="business_zip"
                            placeholder="Enter zipcode"
                            value={formData.business_zip || ''}
                            onChange={handleInputChange}
                        />
                        {errors.business_zip && <div className="invalid-feedback">{errors.business_zip}</div>}
                    </div>
                </div>

                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="business_phone" className="form-label">Business Phone </label>
                        <div className="input-group">
                            {(formData.country === 'USA' || formData.country === 'Canada') && (
                                <span className="input-group-text bg-light border">
                                    <span className="me-1">{formData.country === 'USA' ? 'USA' : 'CAN'}</span>
                                    <span className="text-muted">+1</span>
                                </span>
                            )}
                            <input
                                type="text"
                                className={`form-control ${errors.business_phone ? 'is-invalid' : ''}`}
                                id="business_phone"
                                name="business_phone"
                                placeholder="(555) 555-5555"
                                value={formData.business_phone || ''}
                                onChange={(e) => {
                                    const formatted = formatPhoneNumber(e.target.value);
                                    handleInputChange({ target: { name: 'business_phone', value: formatted } });
                                }}
                            />
                            {errors.business_phone && <div className="invalid-feedback">{errors.business_phone}</div>}
                        </div>
                    </div>
                </div>

                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="entity_type" className="form-label">Entity Type</label>
                        <Dropdown
                            value={formData.entity_type}
                            options={entityTypeOptions}
                            onChange={(e) => handleInputChange({ target: { name: 'entity_type', value: e.value } })}
                            optionLabel="label"
                            placeholder="Select entity type"
                            className={`w-100 ${errors.entity_type ? 'p-invalid' : ''}`}
                        />
                        {errors.entity_type && <small className="p-error">{errors.entity_type}</small>}
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="industry_type" className="form-label">Industry Type</label>
                        <Dropdown
                            value={formData.industry_type}
                            options={industryTypeOptions}
                            onChange={(e) => handleInputChange({ target: { name: 'industry_type', value: e.value } })}
                            optionLabel="label"
                            placeholder="Select industry type"
                            className={`w-100 ${errors.industry_type ? 'p-invalid' : ''}`}
                        />
                        {errors.industry_type && <small className="p-error">{errors.industry_type}</small>}
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="business_start_date" className="form-label">Business Start Date</label>
                        <Flatpickr
                            options={{ dateFormat: "d M, Y" }}
                            value={formData.business_start_date ? new Date(formData.business_start_date) : undefined}
                            onChange={(dates) => {
                                const date = dates[0];
                                const dateString = date
                                    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                    : "";
                                handleInputChange({ target: { name: "business_start_date", value: dateString } });
                            }}
                            className={`form-control ${errors.business_start_date ? 'is-invalid' : ''}`}
                            placeholder="Select date"
                        />
                        {errors.business_start_date && <div className="invalid-feedback">{errors.business_start_date}</div>}
                    </div>
                </div>
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label htmlFor="ssn_last_4" className="form-label">SSN Last 4</label>
                        <input
                            type="text"
                            className={`form-control ${errors.ssn_last_4 ? 'is-invalid' : ''}`}
                            id="ssn_last_4"
                            name="ssn_last_4"
                            placeholder="Enter last 4 digits of SSN"
                            maxLength={4}
                            value={formData.ssn_last_4 || ''}
                            onChange={handleInputChange}
                        />
                        {errors.ssn_last_4 && <div className="invalid-feedback">{errors.ssn_last_4}</div>}
                    </div>
                </div>

                <div className="col-lg-12">
                    <div className="mb-3 pb-2">
                        <label htmlFor="notes" className="form-label">Notes</label>
                        <textarea
                            className={`form-control ${errors.notes ? 'is-invalid' : ''}`}
                            id="notes"
                            name="notes"
                            placeholder="Enter description"
                            rows={3}
                            value={formData.notes || ''}
                            onChange={handleInputChange}
                        />
                        {errors.notes && <div className="invalid-feedback">{errors.notes}</div>}
                    </div>
                </div>
            </div>
        </form>
    );
}
