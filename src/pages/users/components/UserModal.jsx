import React from 'react';

const UserModal = ({
    show,
    onHide,
    onSubmit,
    user,
    onChange,
    roles,
    isEdit,
    loadingSave,
    showPasswordFields,
    onPasswordFieldsToggle
}) => {
    if (!show) return null;

    return (
        <>
            <div className="modal fade show d-block" tabIndex="-1" role="dialog">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title">{isEdit ? 'Update User' : 'Add User'}</h5>
                            <button type="button" className="btn-close" onClick={onHide}></button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={onSubmit}>
                                <div className="mb-3">
                                    <label className="form-label">Name </label>
                                    <input type="text" name="name" className="form-control" value={user.name} onChange={onChange} required />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Email</label>
                                    <input type="email" name="email" className="form-control" value={user.email} onChange={onChange} required />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Phone</label>
                                    <input type="text" name="phone_number" className="form-control" value={user.phone_number} onChange={onChange} required />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label">Role</label>
                                    <select
                                        name="role_id"
                                        className="form-control"
                                        value={user.role_id || ''}
                                        onChange={onChange}
                                        required
                                    >
                                        <option value="">Select Role</option>
                                        {roles.map((role) => (
                                            <option key={role.id} value={String(role.id)}>
                                                {role.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {isEdit && (
                                    <div className="mb-3">
                                        <label className="form-label"> Status </label>
                                        <select
                                            name="status"
                                            className="form-control"
                                            value={user.status}
                                            onChange={onChange}
                                            required
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                )}
                                {/* ADD MODE – Password Required */}
                                {!isEdit && (
                                    <div className="mb-3">
                                        <label className="form-label">Password</label>
                                        <input
                                            type="password"
                                            name="password"
                                            className="form-control"
                                            value={user.password}
                                            onChange={onChange}
                                            required
                                        />
                                    </div>
                                )}

                                {/* EDIT MODE – Password Update Checkbox */}
                                {isEdit && (
                                    <div className="form-check mb-3">
                                        <input
                                            type="checkbox"
                                            className="form-check-input"
                                            id="changePasswordCheck"
                                            checked={showPasswordFields}
                                            onChange={(e) => onPasswordFieldsToggle(e.target.checked)}
                                        />
                                        <label className="form-check-label" htmlFor="changePasswordCheck">
                                            Change Password
                                        </label>
                                    </div>
                                )}

                                {/* EDIT MODE – Show Inputs Only When Checkbox Checked */}
                                {isEdit && showPasswordFields && (
                                    <>
                                        <div className="mb-3">
                                            <label className="form-label">New Password</label>
                                            <input
                                                type="password"
                                                name="new_password"
                                                className="form-control"
                                                value={user.new_password}
                                                onChange={onChange}
                                                placeholder="Enter new password"
                                            />
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label">Confirm Password</label>
                                            <input
                                                type="password"
                                                name="confirm_password"
                                                className="form-control"
                                                value={user.confirm_password}
                                                onChange={onChange}
                                                placeholder="Re-enter new password"
                                            />
                                        </div>
                                    </>
                                )}
                                <div className="d-flex justify-content-end">
                                    <button type="button" className="btn btn-secondary me-2" onClick={onHide}>Cancel</button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={loadingSave}
                                    >
                                        {/* Loading Spinner */}
                                        {loadingSave && (
                                            <span
                                                className="spinner-border spinner-border-sm me-1"
                                                role="status"
                                                aria-hidden="true"
                                            ></span>
                                        )}

                                        {/* Dynamic Icon */}
                                        <i
                                            className={`me-1 align-bottom ${isEdit ? 'ri-edit-2-fill' : 'ri-save-3-fill'
                                                }`}
                                        ></i>

                                        {/* Dynamic Text */}
                                        {isEdit ? 'Update' : 'Submit'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show"></div>
        </>
    );
};

export default UserModal;
