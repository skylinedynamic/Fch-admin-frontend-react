import React from 'react';
import { MARITAL_STATUS_OPTIONS } from '../../../../config/maritalStatusOptions';

export default function EmergencyContactSection({ employee, onChange }) {
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
                                className="form-control"
                                name="emergency_contact"
                                value={employee.emergency_contact}
                                onChange={onChange}
                                placeholder="Enter emergency contact name"
                            />
                        </div>
                    </div>
                    <div className="col-lg-6">
                        <div className="mb-3">
                            <label className="form-label">Phone</label>
                            <input
                                type="text"
                                className="form-control"
                                name="emergency_phone"
                                value={employee.emergency_phone}
                                onChange={onChange}
                                placeholder="Enter emergency phone number"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="col-lg-12 mt-3">
                <h5 className="border-bottom pb-2">Family Status</h5>
                <div className="row">
                    <div className="col-lg-6">
                        <div className="mb-3">
                            <label className="form-label">Marital Status</label>
                            <select
                                className="form-control"
                                data-choices
                                data-choices-search-false
                                name="marital_status"
                                value={employee.marital_status}
                                onChange={onChange}
                            >
                                <option value="">Select</option>
                                {MARITAL_STATUS_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="col-lg-6">
                        <div className="mb-3">
                            <label className="form-label">Number of Children</label>
                            <input
                                type="number"
                                className="form-control"
                                name="no_of_children"
                                value={employee.no_of_children}
                                onChange={onChange}
                                min="0"
                                placeholder="Enter number of children"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
