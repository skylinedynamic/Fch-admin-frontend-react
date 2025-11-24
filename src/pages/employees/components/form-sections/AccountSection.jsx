import React from 'react';
import { STATUS } from '../../../../config/statusOptions';

export default function AccountSection({ employee, roles, onChange, isEditMode }) {
    return (
        <>
            <div className="col-lg-6">
                <div className="mb-3 pt-3">
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
                    <div className="mb-3 pt-3">
                        <label htmlFor="roleSelect" className="form-label">
                            Assign role
                        </label>
                        <select
                            name="role_id"
                            value={employee.role_id ?? ''}
                            className="form-control"
                            onChange={onChange}
                        >
                            <option value="">Select role</option>
                            {roles.map((role) => (
                                <option key={role.id} value={role.id}>
                                    {role.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="col-lg-6">
                <div className="mb-3">
                    <label className="form-label">Job Status</label>
                    <select
                        className="form-control"
                        data-choices
                        data-choices-search-false
                        name="job_status"
                        value={employee.job_status}
                        onChange={onChange}
                    >
                        <option value="">Select</option>
                        {STATUS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </>
    );
}
