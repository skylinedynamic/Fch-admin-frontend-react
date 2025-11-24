import React from 'react';

import Flatpickr from 'react-flatpickr';
import { bloodGroups } from '../../../../config/bloodGroups';

export default function PersonalDetailsSection({ employee, onChange }) {
    return (
        <>
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Gender</label>
                    <select
                        className="form-select"
                        data-choices
                        data-choices-search-false
                        name="gender"
                        value={employee.gender}
                        onChange={onChange}
                    >
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                    </select>
                </div>
            </div>

            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Blood Group</label>
                    <select
                        className="form-select"
                        data-choices
                        data-choices-search-false
                        name="blood_group"
                        value={employee.blood_group}
                        onChange={onChange}
                    >
                        <option value="">Select Blood Group</option>
                        {bloodGroups.map((group) => (
                            <option key={group.value} value={group.value}>
                                {group.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

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

            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Place of Birth</label>
                    <input
                        type="text"
                        className="form-control"
                        name="place_of_birth"
                        value={employee.place_of_birth}
                        onChange={onChange}
                        placeholder="Enter place of birth"
                    />
                </div>
            </div>
        </>
    );
}
