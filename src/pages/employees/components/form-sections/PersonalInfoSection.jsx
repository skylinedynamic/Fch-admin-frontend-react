import React from 'react';
import { Dropdown } from 'primereact/dropdown';
import Flatpickr from 'react-flatpickr';
import { formatPhoneNumber } from '../../../../utils/formatters';
import avatarDefault from '../../../../../assets/images/users/avatar-1.jpg';

const BASE_URL = import.meta.env.VITE_BASE_URL;

export default function PersonalInfoSection({
    employee,
    errors,
    onChange,
    departments,
    onAddDepartment,
    countryCodeOptions,
    phonePrefix,
    onPhonePrefixChange
}) {
    // Helper function to get image source
    const getImageSrc = () => {
        if (employee.image instanceof File) {
            return URL.createObjectURL(employee.image);
        }

        if (typeof employee.image === 'string' && employee.image.trim() !== '') {
            return employee.image;
        }
        return avatarDefault;
    };

    return (
        <>
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
                                name="image"
                                accept=".jpg, .jpeg, .png"
                                onChange={onChange}
                            />
                            <label
                                htmlFor="profile-img-file-input"
                                className="profile-photo-edit avatar-xs"
                                title="Upload profile image"
                            >
                                <span className="avatar-title rounded-circle bg-light text-body material-shadow">
                                    <i className="ri-camera-fill"></i>
                                </span>
                            </label>
                        </div>
                    </div>
                    <div className="text-center mb-3">
                        <span className="badge bg-light text-muted border">
                            <i className="ri-information-line me-1"></i>
                            Allowed image types: JPG, JPEG, PNG (Maximum size: 1 MB).
                        </span>
                    </div>
                    {errors.image && (
                        <div className="alert alert-danger mt-2 text-center p-1">
                            <small>{errors.image}</small>
                        </div>
                    )}
                </div>
            </div>

            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Name <span className="text-danger">*</span></label>
                    <input
                        type="text"
                        className={`form-control ${errors.first_name ? 'is-invalid' : ''}`}
                        name="first_name"
                        value={employee.first_name}
                        onChange={onChange}
                        placeholder="Enter full name"
                    />
                    {errors.first_name && <div className="invalid-feedback">{errors.first_name}</div>}
                </div>
            </div>

            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Employee Code</label>
                    <input
                        type="text"
                        className="form-control"
                        name="employee_code"
                        value={employee.employee_code}
                        onChange={onChange}
                        placeholder="Enter code"
                    />
                </div>
            </div>

            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Position <span className="text-danger">*</span></label>
                    <input
                        type="text"
                        className={`form-control ${errors.designation ? 'is-invalid' : ''}`}
                        name="designation"
                        value={employee.designation}
                        onChange={onChange}
                        placeholder="Enter position"
                    />
                    {errors.designation && <div className="invalid-feedback">{errors.designation}</div>}
                </div>
            </div>

            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label d-flex justify-content-between align-items-center">
                        Department <span className="text-danger">*</span>
                        <button type="button" className="btn btn-sm btn-link p-0" onClick={onAddDepartment}>
                            <i className="ri-add-circle-line"></i> Add New
                        </button>
                    </label>
                    <Dropdown
                        value={employee.department}
                        options={departments}
                        onChange={(e) => onChange({ target: { name: 'department', value: e.value } })}
                        optionLabel="name"
                        optionValue="name"
                        placeholder="Select Department"
                        filter
                        className={`w-100 ${errors.department ? 'p-invalid' : ''}`}
                    />
                    {errors.department && <div className="invalid-feedback d-block">{errors.department}</div>}
                </div>
            </div>

            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Phone Number <span className="text-danger">*</span></label>
                    <div className="input-group">
                        {/* Country Code Display */}
                        {(employee.country === 'USA' || employee.country === 'Canada') && (
                            <span className="input-group-text bg-light border">
                                <span className="me-1">{employee.country === 'USA' ? 'US' : 'CA'}</span>
                                <span className="text-muted">+1</span>
                            </span>
                        )}
                        <input
                            type="text"
                            className={`form-control ${errors.phone_number_1 ? 'is-invalid' : ''}`}
                            name="phone_number_1"
                            value={employee.phone_number_1}
                            onChange={(e) => {
                                const formatted = formatPhoneNumber(e.target.value);
                                onChange({ target: { name: 'phone_number_1', value: formatted } });
                            }}
                            placeholder="(555) 555-5555"
                        />
                        {errors.phone_number_1 && <div className="invalid-feedback">{errors.phone_number_1}</div>}
                    </div>
                </div>
            </div>

            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Alternate Mobile</label>
                    <div className="input-group">
                        {/* Country Code Display */}
                        {(employee.country === 'USA' || employee.country === 'Canada') && (
                            <span className="input-group-text bg-light border">
                                <span className="me-1">{employee.country === 'USA' ? 'US' : 'CA'}</span>
                                <span className="text-muted">+1</span>
                            </span>
                        )}
                        <input
                            type="text"
                            className="form-control"
                            name="phone_number_2"
                            value={employee.phone_number_2}
                            onChange={(e) => {
                                const formatted = formatPhoneNumber(e.target.value);
                                onChange({ target: { name: 'phone_number_2', value: formatted } });
                            }}
                            placeholder="(555) 555-5555"
                        />
                    </div>
                </div>
            </div>

            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Email <span className="text-danger">*</span></label>
                    <input
                        type="email"
                        className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                        name="email"
                        value={employee.email}
                        onChange={onChange}
                        placeholder="Enter email"
                    />
                    {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                </div>
            </div>

            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Joining Date</label>
                    <Flatpickr
                        options={{ dateFormat: "d M, Y" }}
                        value={employee.joining_date ? new Date(employee.joining_date) : null}
                        onChange={(dates) => {
                            const date = dates[0];
                            const dateString = date
                                ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                : "";
                            onChange({ target: { name: "joining_date", value: dateString } });
                        }}
                        className="form-control"
                        placeholder="Select date"
                        readOnly
                    />
                </div>
            </div>
        </>
    );
}
