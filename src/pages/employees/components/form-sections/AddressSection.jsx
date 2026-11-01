import React from 'react';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';

import { parseDate } from '../../../../utils/formatters';
import { formatPhoneNumber, formatZipCode } from '../../../../utils/formatters';

export default function AddressSection({
    employee,
    errors,
    onChange,
    countries,
    states,
    cities
}) {
    // A zip code is five digits. Cleaning the value here rather than in
    // the parent's shared handler keeps the constraint next to the field
    // it applies to, and catches a paste as well as typing.
    const handleZipChange = (e) => {
        e.target.value = formatZipCode(e.target.value);
        onChange(e);
    };

    return (
        <>
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Address</label>
                    <input
                        type="text"
                        className={`form-control ${errors.address ? 'is-invalid' : ''}`}
                        name="address"
                        value={employee.address}
                        onChange={onChange}
                        placeholder="Enter address"
                    />
                    {errors.address && <div className="invalid-feedback">{errors.address}</div>}
                </div>
            </div>

            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Country <span className="text-danger">*</span></label>
                    <Dropdown
                        inputId="country"
                        value={employee.country}
                        options={countries}
                        onChange={(e) => onChange({ target: { name: 'country', value: e.value } })}
                        optionLabel="label"
                        placeholder="Select Country"
                        filter
                        className={`w-100 ${errors.country ? 'p-invalid' : ''}`}
                    />
                    {errors.country && <div className="invalid-feedback d-block">{errors.country}</div>}
                </div>
            </div>

            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">State</label>
                    <Dropdown
                        inputId="state"
                        value={employee.state}
                        options={states}
                        onChange={(e) => onChange({ target: { name: 'state', value: e.value } })}
                        optionLabel="label"
                        placeholder="Select State"
                        filter
                        className={`w-100 ${errors.state ? 'p-invalid' : ''}`}
                        disabled={!employee.country}
                    />
                    {errors.state && <div className="invalid-feedback d-block">{errors.state}</div>}
                </div>
            </div>

            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">City</label>
                    <Dropdown
                        inputId="city"
                        value={employee.city}
                        options={[...cities, { label: 'Others', value: 'Others' }]}
                        onChange={(e) => onChange({ target: { name: 'city', value: e.value } })}
                        optionLabel="label"
                        placeholder="Select City"
                        filter
                        className={`w-100 ${errors.city ? 'p-invalid' : ''}`}
                        disabled={!employee.state}
                    />
                    {errors.city && <div className="invalid-feedback d-block">{errors.city}</div>}
                </div>
            </div>
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Joining Date</label>
                    <div className="custom-datepicker">
                        <Calendar
                            value={parseDate(employee.joining_date)}
                            onChange={(e) => {
                                const date = e.value;
                                const dateString = date
                                    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                    : "";
                                onChange({ target: { name: "joining_date", value: dateString } });
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

            {/* Other City Input - Shown when "Others" is selected */}
            {employee.city === 'Others' && (
                <>
                    <div className="col-lg-6">
                        <div className="mb-3">
                            <label className="form-label">Other City <span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className={`form-control ${errors.other_city ? 'is-invalid' : ''}`}
                                name="other_city"
                                placeholder="Enter city name"
                                value={employee.other_city || ''}
                                onChange={onChange}
                                required
                            />
                            {errors.other_city && <div className="invalid-feedback">{errors.other_city}</div>}
                        </div>
                    </div>

                    <div className="col-lg-6">
                        <div className="mb-3">
                            <label className="form-label">Zip Code</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={5}
                                className={`form-control ${errors.postal_code ? 'is-invalid' : ''}`}
                                name="postal_code"
                                value={employee.postal_code}
                                onChange={handleZipChange}
                                placeholder="Enter zip code"
                            />
                            {errors.postal_code && <div className="invalid-feedback">{errors.postal_code}</div>}
                        </div>
                    </div>
                </>
            )}

            {/* Zip Code - Shown when "Others" is NOT selected */}
            {employee.city !== 'Others' && (
                <div className="col-lg-6">
                    <div className="mb-3">
                        <label className="form-label">Zip Code</label>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={5}
                            className={`form-control ${errors.postal_code ? 'is-invalid' : ''}`}
                            name="postal_code"
                            value={employee.postal_code}
                            onChange={handleZipChange}
                            placeholder="Enter zip code"
                        />
                        {errors.postal_code && <div className="invalid-feedback">{errors.postal_code}</div>}
                    </div>
                </div>
            )}

            {/* Alternate Mobile - After Zip Code */}
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Alternate Mobile</label>
                    <div className="input-group">
                        {/* Country Code Display */}
                        {(employee.country === 'USA' || employee.country === 'Canada') && (
                            <span className="input-group-text bg-light border">
                                <span className="me-1">{employee.country === 'USA' ? 'USA' : 'CAN'}</span>
                                <span className="text-muted">+1</span>
                            </span>
                        )}
                        <input
                            type="text"
                            className={`form-control ${errors.phone_number_2 ? 'is-invalid' : ''}`}
                            name="phone_number_2"
                            value={employee.phone_number_2}
                            onChange={(e) => {
                                const formatted = formatPhoneNumber(e.target.value);
                                onChange({ target: { name: 'phone_number_2', value: formatted } });
                            }}
                            placeholder="(555) 555-5555"
                        />
                        {errors.phone_number_2 && <div className="invalid-feedback">{errors.phone_number_2}</div>}
                    </div>
                </div>
            </div>
        </>
    );
}
