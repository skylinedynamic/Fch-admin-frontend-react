import React, { useMemo } from 'react';
import { Calendar } from 'primereact/calendar';

import { parseDate } from '../../../../utils/formatters';
import { dateOfBirthError, latestDateOfBirth } from '../../../../utils/dateOfBirth';

export default function PersonalDetailsSection({ employee, onChange, errors }) {
    // An empty Date of Birth calendar opens 18 years back; worked out once so
    // the calendar is not sent back there on every re-render.
    const dateOfBirthOpensOn = useMemo(() => latestDateOfBirth(), []);
    // The API's message for this field when there is one, else the same check here.
    const dateOfBirthMessage = errors?.date_of_birth || dateOfBirthError(employee.date_of_birth);

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
                            viewDate={employee.date_of_birth ? undefined : dateOfBirthOpensOn}
                            placeholder="Select date"
                            showIcon
                            className={`w-100 ${dateOfBirthMessage ? 'is-invalid' : ''}`}
                            appendTo="self"
                            readOnlyInput
                        />
                    </div>
                    {dateOfBirthMessage && <div className="invalid-feedback d-block">{dateOfBirthMessage}</div>}
                </div>
            </div>
        </>
    );
}
