import React from 'react';
import { Dropdown } from 'primereact/dropdown';
import { STATUS } from '../../../../config';

// Transform status options to include empty option
const jobStatusOptions = [
    { label: 'Select', value: '' },
    ...STATUS
];

export default function AccountSection({ employee, roles, onChange, isEditMode, errors = {} }) {
    // Transform roles to dropdown options
    const roleOptions = [
        { label: 'Select role', value: '' },
        ...roles.map(role => ({
            label: role.name,
            value: role.id
        }))
    ];

    return (
        <>
            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Job Status</label>
                    <Dropdown
                        inputId="job_status"
                        value={employee.job_status}
                        options={jobStatusOptions}
                        onChange={(e) => onChange({ target: { name: 'job_status', value: e.value } })}
                        placeholder="Select Job Status"
                        className="w-100"
                    />
                </div>
            </div>



            <div className="w-100"></div>

            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label d-block">&nbsp;</label>
                    <div className="form-check">
                        <input
                            id="createAccountCheckbox"
                            type="checkbox"
                            className="form-check-input"
                            name="create_account"
                            checked={!!employee.create_account}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                onChange({
                                    target: {
                                        name: 'create_account',
                                        type: 'checkbox',
                                        checked,
                                        isEditMode
                                    }
                                });
                            }}
                        />
                        <label className="form-check-label" htmlFor="createAccountCheckbox">
                            Create account
                        </label>
                    </div>
                </div>
            </div>

            <div className="col-lg-6">
                {((isEditMode && employee.user) || (!isEditMode && employee.create_account)) && (
                    <div className="mb-3">
                        <label htmlFor="roleSelect" className="form-label">
                            Assign role <span className="text-danger">*</span>
                        </label>
                        <Dropdown
                            inputId="role_id"
                            value={employee.role_id ?? ''}
                            options={roleOptions}
                            onChange={(e) => onChange({ target: { name: 'role_id', value: e.value } })}
                            placeholder="Select role"
                            className={`w-100 ${errors.role_id ? 'p-invalid' : ''}`}
                        />
                        {errors.role_id && <div className="invalid-feedback d-block">{errors.role_id}</div>}
                    </div>
                )}
            </div>
        </>
    );
}
