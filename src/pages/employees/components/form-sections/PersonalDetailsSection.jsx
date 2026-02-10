import React from 'react';
import Flatpickr from 'react-flatpickr';
import { parseDate } from '../../../../utils/formatters';

export default function PersonalDetailsSection({ employee, onChange, errors }) {
    return (
        <>
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Date of Birth</label>
                    <Flatpickr
                        options={{
                            dateFormat: "d M, Y",
                            maxDate: "today"
                        }}
                        value={parseDate(employee.date_of_birth)}
                        onChange={(dates) => {
                            const date = dates[0];
                            const dateString = date
                                ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                : "";
                            onChange({ target: { name: "date_of_birth", value: dateString } });
                        }}
                        className={`form-control ${errors?.date_of_birth ? 'is-invalid' : ''}`}
                        placeholder="Select date"
                        readOnly
                    />
                    {errors?.date_of_birth && <div className="invalid-feedback">{errors.date_of_birth}</div>}
                </div>
            </div>
        </>
    );
}
