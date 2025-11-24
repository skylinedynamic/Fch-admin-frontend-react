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
                    <label className="form-label">Country</label>
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
                    <label className="form-label">State</label>
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
                    <label className="form-label">City</label>
                    <Dropdown
                        value={employee.city}
                        options={cities}
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

            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Address</label>
                    <input
                        type="text"
                        className="form-control"
                        name="address"
                        value={employee.address}
                        onChange={onChange}
                        placeholder="Enter address"
                    />
                </div>
            </div>
        </>
    );
}
