import React from 'react';
import { Dropdown } from 'primereact/dropdown';
import { formatPhoneNumber } from '../../../../utils/formatters';


export default function EmergencyContactSection({ employee, onChange, errors }) {
    return (
        <>
            <div className="col-lg-12 mt-3">
                <h5 className="border-bottom pb-2">Emergency Contact</h5>
                <div className="row">
                    <div className="col-lg-6">
                        <div className="mb-3">
                            <label className="form-label">Name</label>
                            <input
                                type="text"
                                className={`form-control ${errors?.emergency_contact ? 'is-invalid' : ''}`}
                                name="emergency_contact"
                                value={employee.emergency_contact}
                                onChange={onChange}
                                placeholder="Enter emergency contact name"
                            />
                            {errors?.emergency_contact && <div className="invalid-feedback">{errors.emergency_contact}</div>}
                        </div>
                    </div>
                    <div className="col-lg-6">
                        <div className="mb-3">
                            <label className="form-label">Phone</label>
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
                                    className={`form-control ${errors?.emergency_phone ? 'is-invalid' : ''}`}
                                    name="emergency_phone"
                                    value={employee.emergency_phone}
                                    onChange={(e) => {
                                        const formatted = formatPhoneNumber(e.target.value);
                                        onChange({ target: { name: 'emergency_phone', value: formatted } });
                                    }}
                                    placeholder="(555) 555-5555"
                                />
                                {errors?.emergency_phone && <div className="invalid-feedback">{errors.emergency_phone}</div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>


        </>
    );
}
