import React from 'react';
import { Dropdown } from 'primereact/dropdown';
import Flatpickr from 'react-flatpickr';

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
        if (employee.image && typeof employee.image === 'string' && employee.image.trim() !== '') {
            return `${BASE_URL}/storage/${employee.image}`;
        }
        return '/assets/images/users/avatar-1.jpg';
    };

    return (
        <>
            <div className="col-lg-12">
                <div className="card">
                    <div className="profile-user position-relative d-inline-block mx-auto mb-4">
                        <img
                            src={getImageSrc()}
                            className="rounded-circle avatar-xl img-thumbnail user-profile-image material-shadow"
                            alt="user-profile"
                        />
                        <div className="avatar-xs p-0 rounded-circle profile-photo-edit">
                            <input
                                id="profile-img-file-input"
                                type="file"
                                className="profile-img-file-input"
                                name="image"
                                accept="image/*"
                                onChange={onChange}
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

            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Name</label>
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
                    <label className="form-label">Position</label>
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
                        Department
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
                    <label className="form-label">Phone Number</label>
                    <div className="input-group">
                        <select
                            className="form-select"
                            style={{ maxWidth: '140px' }}
                            value={phonePrefix.phone_number_1}
                            onChange={(e) => onPhonePrefixChange({ ...phonePrefix, phone_number_1: e.target.value })}
                        >
                            {countryCodeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <input
                            type="text"
                            className={`form-control ${errors.phone_number_1 ? 'is-invalid' : ''}`}
                            name="phone_number_1"
                            value={employee.phone_number_1}
                            onChange={onChange}
                            placeholder="Enter phone number"
                        />
                        {errors.phone_number_1 && <div className="invalid-feedback">{errors.phone_number_1}</div>}
                    </div>
                </div>
            </div>

            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Alternate Mobile</label>
                    <div className="input-group">
                        <select
                            className="form-select"
                            style={{ maxWidth: '140px' }}
                            value={phonePrefix.phone_number_2}
                            onChange={(e) => onPhonePrefixChange({ ...phonePrefix, phone_number_2: e.target.value })}
                        >
                            {countryCodeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <input
                            type="text"
                            className="form-control"
                            name="phone_number_2"
                            value={employee.phone_number_2}
                            onChange={onChange}
                            placeholder="Enter mobile number"
                        />
                    </div>
                </div>
            </div>

            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Email</label>
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
