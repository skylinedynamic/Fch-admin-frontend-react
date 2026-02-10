import React from "react";
import { Dropdown } from "primereact/dropdown";
import { usePermissions } from "../../../lib/auth/usePermissions";

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
  onPasswordFieldsToggle,
  backendErrors = {},
}) => {
  const { hasPermission } = usePermissions();
  const [errors, setErrors] = React.useState({});

  // Merge backend errors with frontend errors
  const allErrors = { ...errors, ...backendErrors };

  // Reset errors when modal opens/closes
  React.useEffect(() => {
    if (show) {
      setErrors({});
    }
  }, [show]);

  const validate = () => {
    let tempErrors = {};
    let isValid = true;

    if (!user.name) {
      tempErrors.name = "Name is required";
      isValid = false;
    }

    if (!user.email) {
      tempErrors.email = "Email is required";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(user.email)) {
      tempErrors.email = "Email is invalid";
      isValid = false;
    }

    if (!user.phone_number) {
      tempErrors.phone_number = "Phone number is required";
      isValid = false;
    }

    if (!user.role_id) {
      tempErrors.role_id = "Role is required";
      isValid = false;
    }

    if (isEdit) {
      if (!user.status) {
        tempErrors.status = "Status is required";
        isValid = false;
      }
      if (showPasswordFields) {
        if (user.new_password && user.new_password !== user.confirm_password) {
          tempErrors.confirm_password = "Passwords do not match";
          isValid = false;
        }
      }
    } else {
      if (!user.password) {
        tempErrors.password = "Password is required";
        isValid = false;
      }
    }

    setErrors(tempErrors);
    return isValid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(e);
    }
  };

  if (!show) return null;

  return (
    <>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {isEdit ? "Update User" : "Add User"}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onHide}
              ></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">
                    Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    className={`form-control ${allErrors.name ? "is-invalid" : ""}`}
                    value={user.name}
                    onChange={onChange}
                  />
                  {allErrors.name && (
                    <div className="invalid-feedback">{allErrors.name}</div>
                  )}
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    Email <span className="text-danger">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    className={`form-control ${allErrors.email ? "is-invalid" : ""}`}
                    value={user.email}
                    onChange={onChange}
                  />
                  {allErrors.email && (
                    <div className="invalid-feedback">{allErrors.email}</div>
                  )}
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    Phone <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="phone_number"
                    className={`form-control ${allErrors.phone_number ? "is-invalid" : ""}`}
                    value={user.phone_number}
                    onChange={onChange}
                    placeholder="Enter phone number"
                  />
                  {allErrors.phone_number && (
                    <div className="invalid-feedback">
                      {allErrors.phone_number}
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    Role <span className="text-danger">*</span>
                  </label>
                  <Dropdown
                    value={String(user.role_id || "")}
                    onChange={(e) =>
                      onChange({ target: { name: "role_id", value: e.value } })
                    }
                    options={roles.map((role) => ({
                      label: role.name,
                      value: String(role.id),
                    }))}
                    placeholder="Select Role"
                    className={`w-100 ${allErrors.role_id ? "p-invalid" : ""}`}
                    appendTo="self"
                  />
                  {allErrors.role_id && (
                    <div className="invalid-feedback d-block">
                      {allErrors.role_id}
                    </div>
                  )}
                </div>
                {isEdit && (
                  <div className="mb-3">
                    <label className="form-label">
                      {" "}
                      Status <span className="text-danger">*</span>
                    </label>
                    <Dropdown
                      value={user.status}
                      onChange={(e) =>
                        onChange({ target: { name: "status", value: e.value } })
                      }
                      options={[
                        { label: "Active", value: "active" },
                        { label: "Inactive", value: "inactive" },
                      ]}
                      optionLabel="label"
                      optionValue="value"
                      className={`w-100 ${allErrors.status ? "p-invalid" : ""}`}
                      appendTo="self"
                    />
                    {allErrors.status && (
                      <div className="invalid-feedback d-block">
                        {allErrors.status}
                      </div>
                    )}
                  </div>
                )}
                {/* ADD MODE – Password Required */}
                {!isEdit && (
                  <div className="mb-3">
                    <label className="form-label">
                      Password <span className="text-danger">*</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      className={`form-control ${allErrors.password ? "is-invalid" : ""}`}
                      value={user.password}
                      onChange={onChange}
                    />
                    {allErrors.password && (
                      <div className="invalid-feedback">{allErrors.password}</div>
                    )}
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
                    <label
                      className="form-check-label"
                      htmlFor="changePasswordCheck"
                    >
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
                        className={`form-control ${allErrors.confirm_password ? "is-invalid" : ""}`}
                        value={user.confirm_password}
                        onChange={onChange}
                        placeholder="Re-enter new password"
                      />
                      {allErrors.confirm_password && (
                        <div className="invalid-feedback">
                          {allErrors.confirm_password}
                        </div>
                      )}
                    </div>
                  </>
                )}
                <div className="d-flex justify-content-end">
                  <button
                    type="button"
                    className="btn btn-light me-2"
                    onClick={onHide}
                  >
                    Cancel
                  </button>
                  {((isEdit && hasPermission("update users")) ||
                    (!isEdit && hasPermission("create users"))) && (
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
                        className={`me-1 align-bottom ${
                          isEdit ? "ri-edit-2-fill" : "ri-save-3-fill"
                        }`}
                      ></i>

                      {/* Dynamic Text */}
                      {isEdit ? "Update" : "Submit"}
                    </button>
                  )}
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
