import React from 'react';
import { Dropdown } from 'primereact/dropdown';
import Flatpickr from 'react-flatpickr';
import { GENDER_OPTIONS } from '../../../../config/genderOptions';

export default function PersonalDetailsSection({ employee, onChange }) {
    // Add empty option to gender options
    const genderOptions = [
        { label: 'Select', value: '' },
        ...GENDER_OPTIONS
    ];

    return (
        <>
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Gender</label>
                    <Dropdown
                        value={employee.gender}
                        options={genderOptions}
                        onChange={(e) => onChange({ target: { name: 'gender', value: e.value } })}
                        placeholder="Select Gender"
                        className="w-100"
                    />
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
