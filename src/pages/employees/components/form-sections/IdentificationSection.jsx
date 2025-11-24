import React from 'react';

export default function IdentificationSection({ employee, onChange }) {
    return (
        <>
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Identification No</label>
                    <input
                        type="text"
                        className="form-control"
                        name="identification_number"
                        value={employee.identification_number}
                        onChange={onChange}
                        placeholder="Enter identification number"
                    />
                </div>
            </div>

            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">SSN No</label>
                    <input
                        type="text"
                        className="form-control"
                        name="ssn"
                        value={employee.ssn}
                        onChange={onChange}
                        placeholder="Enter SSN"
                    />
                </div>
            </div>

            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Passport No</label>
                    <input
                        type="text"
                        className="form-control"
                        name="passport_number"
                        value={employee.passport_number}
                        onChange={onChange}
                        placeholder="Enter passport number"
                    />
                </div>
            </div>
        </>
    );
}
