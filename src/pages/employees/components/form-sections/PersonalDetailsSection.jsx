import React from 'react';
import Flatpickr from 'react-flatpickr';

export default function PersonalDetailsSection({ employee, onChange }) {
    return (
        <>
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Date of Birth</label>
                    <Flatpickr
                        options={{ dateFormat: "d M, Y" }}
                        value={employee.date_of_birth ? new Date(employee.date_of_birth) : null}
                        onChange={(dates) => {
                            const date = dates[0];
                            const dateString = date
                                ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                : "";
                            onChange({ target: { name: "date_of_birth", value: dateString } });
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
