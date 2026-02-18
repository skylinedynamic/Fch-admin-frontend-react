import React from 'react';
import { Dropdown } from 'primereact/dropdown';
import Flatpickr from 'react-flatpickr';
import { parseDate } from '../../../../utils/formatters';
import { formatPhoneNumber } from '../../../../utils/formatters';

export default function AddressSection({
    employee,
    errors,
    onChange,
    countries,
    states,
    cities
}) {
    return (
        <>
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Address <span className="text-danger">*</span></label>
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
                    <label className="form-label">State <span className="text-danger">*</span></label>
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
                    <label className="form-label">City <span className="text-danger">*</span></label>
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
                    <Flatpickr
                        options={{ dateFormat: "d M, Y" }}
                        value={parseDate(employee.joining_date)}
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
                                className="form-control"
                                name="postal_code"
                                value={employee.postal_code}
                                onChange={onChange}
                                placeholder="Enter zip code"
                            />
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
                            className="form-control"
                            name="postal_code"
                            value={employee.postal_code}
                            onChange={onChange}
                            placeholder="Enter zip code"
                        />
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
        </>
    );
}
