import React from 'react';
import { Calendar } from 'primereact/calendar';

import { parseDate } from '../../../../utils/formatters';

export default function PersonalDetailsSection({ employee, onChange, errors }) {
    return (
        <>
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Date of Birth</label>
                    <div className="custom-datepicker">
                        <Calendar
                            value={parseDate(employee.date_of_birth)}
                            onChange={(e) => {
                                const date = e.value;
                                const dateString = date
                                    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                    : "";
                                onChange({ target: { name: "date_of_birth", value: dateString } });
                            }}
                            dateFormat="dd M, yy"
                            maxDate={new Date()}
                            placeholder="Select date"
                            showIcon
                            className="w-100"
                            appendTo="self"
                            readOnlyInput
                        />
                    </div>
                    {errors?.date_of_birth && <div className="invalid-feedback">{errors.date_of_birth}</div>}
                </div>
            </div>
        </>
    );
}
