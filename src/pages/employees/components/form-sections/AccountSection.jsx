import React from 'react';
import { Dropdown } from 'primereact/dropdown';
import { STATUS } from '../../../../config';

// Transform status options to include empty option
const jobStatusOptions = [
    { label: 'Select', value: '' },
    ...STATUS
];

export default function AccountSection({
    employee,
    roles,
    onChange,
    isEditMode,
    errors = {},
    loadingLimitCheck,
    isPurchaseFlow = false,
    purchaseMonths = 1,
    purchasePrice = 0
}) {
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
                            disabled={loadingLimitCheck}
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
                        <label className="form-check-label d-flex align-items-center" htmlFor="createAccountCheckbox">
                            Create account
                            {loadingLimitCheck && (
                                <span className="spinner-border spinner-border-sm ms-2" role="status" aria-hidden="true"></span>
                            )}
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

            {isPurchaseFlow && employee.create_account && (
                <div className="col-12">
                    <div className="p-3 bg-success bg-opacity-10 text-success mb-4 custom-payment-details animate__animated animate__fadeIn">
                        <div className="d-flex align-items-center gap-2 mb-2 pb-2 border-bottom border-success border-opacity-10">
                            <i className="ri-checkbox-circle-fill fs-18"></i>
                            <h6 className="mb-0 fw-semibold text-success fs-14">Seat Purchase Pending Activation</h6>
                        </div>
                        <div className="row g-2 fs-13">
                            <div className="col-6 text-success opacity-75">Additional Seat Quantity:</div>
                            <div className="col-6 text-end fw-semibold text-success">1 Seat</div>
                            
                            <div className="col-6 text-success opacity-75">Subscription Duration:</div>
                            <div className="col-6 text-end fw-semibold text-success">{purchaseMonths} Month{purchaseMonths > 1 ? 's' : ''}</div>
                            
                            <div className="col-6 text-success fw-bold">Total Amount Due:</div>
                            <div className="col-6 text-end fw-bold text-success fs-15">${parseFloat(purchasePrice || 0).toFixed(2)}</div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
