import React from 'react';
import { Dropdown } from 'primereact/dropdown';

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
        </>
    );
}
