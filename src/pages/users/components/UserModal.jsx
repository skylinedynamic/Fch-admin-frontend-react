import React from "react";
import Modal from "bootstrap/js/dist/modal";
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
  isPurchaseFlow = false,
  purchaseMonths = 1,
  purchasePrice = 0,
}) => {
  const { hasPermission } = usePermissions();
  const [errors, setErrors] = React.useState({});
  const modalRef = React.useRef(null);
  const modalInstanceRef = React.useRef(null);

  // Initialize Bootstrap Modal
  React.useEffect(() => {
    if (!modalRef.current) return;
    if (!modalInstanceRef.current) {
      modalInstanceRef.current = new Modal(modalRef.current, {
        backdrop: 'static',
        keyboard: false,
      });
    }
  }, []);

  // Control Modal Show / Hide with animation
  React.useEffect(() => {
    const modal = modalInstanceRef.current;
    if (!modal) return;
    if (show) {
      modal.show();
      setErrors({});
    } else {
      modal.hide();
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
        if (!user.new_password) {
          tempErrors.new_password = "New password is required";
          isValid = false;
        }
        if (!user.confirm_password) {
          tempErrors.confirm_password = "Confirm password is required";
          isValid = false;
        }
        if (
          user.new_password &&
          user.confirm_password &&
          user.new_password !== user.confirm_password
        ) {
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

  // Merge backend errors with frontend errors
  const allErrors = { ...errors, ...backendErrors };

  return (
    <div className="modal fade flip" ref={modalRef} tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg custom-user-modal">
            <div className="modal-header border-0 bg-light p-3 custom-user-modal-header">
              <div className="d-flex align-items-center gap-2">
                <div className="avatar-xs flex-shrink-0">
                  <div className="avatar-title bg-primary bg-opacity-10 text-primary rounded-circle custom-avatar-icon">
                    <i className={isEdit ? "ri-user-settings-line fs-18" : "ri-user-add-line fs-18"}></i>
                  </div>
                </div>
                <h5 className="modal-title fw-semibold text-dark fs-16">
                  {isEdit ? "Update User Account" : "Add User Account"}
                </h5>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={onHide}
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body p-4">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label text-muted small fw-semibold text-uppercase mb-1">
                    Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    className={`form-control form-control-lg fs-14 custom-modal-input ${allErrors.name ? "is-invalid" : ""}`}
                    value={user.name}
                    onChange={onChange}
                    placeholder="Enter full name"
                  />
                  {allErrors.name && (
                    <div className="invalid-feedback">{allErrors.name}</div>
                  )}
                </div>
                <div className="mb-3">
                  <label className="form-label text-muted small fw-semibold text-uppercase mb-1">
                    Email Address <span className="text-danger">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    className={`form-control form-control-lg fs-14 custom-modal-input ${allErrors.email ? "is-invalid" : ""}`}
                    value={user.email}
                    onChange={onChange}
                    placeholder="Enter email address"
                  />
                  {allErrors.email && (
                    <div className="invalid-feedback">{allErrors.email}</div>
                  )}
                </div>
                <div className="mb-3">
                  <label className="form-label text-muted small fw-semibold text-uppercase mb-1">
                    Phone Number <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    name="phone_number"
                    className={`form-control form-control-lg fs-14 custom-modal-input ${allErrors.phone_number ? "is-invalid" : ""}`}
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
                  <label className="form-label text-muted small fw-semibold text-uppercase mb-1">
                    User Role <span className="text-danger">*</span>
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
                    className={`w-100 fs-14 custom-modal-input ${allErrors.role_id ? "p-invalid" : ""}`}
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
                    <label className="form-label text-muted small fw-semibold text-uppercase mb-1">
                      Account Status <span className="text-danger">*</span>
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
                      className={`w-100 fs-14 custom-modal-input ${allErrors.status ? "p-invalid" : ""}`}
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
                  <div className="mb-4">
                    <label className="form-label text-muted small fw-semibold text-uppercase mb-1">
                      Password <span className="text-danger">*</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      className={`form-control form-control-lg fs-14 custom-modal-input ${allErrors.password ? "is-invalid" : ""}`}
                      value={user.password}
                      onChange={onChange}
                      placeholder="Enter password"
                    />
                    {allErrors.password && (
                      <div className="invalid-feedback">{allErrors.password}</div>
                    )}
                  </div>
                )}

                {/* EDIT MODE – Password Update Checkbox */}
                {isEdit && (
                  <div className="form-check form-check-flat mb-3">
                    <input
                      type="checkbox"
                      className="form-check-input cursor-pointer"
                      id="changePasswordCheck"
                      checked={showPasswordFields}
                      onChange={(e) => onPasswordFieldsToggle(e.target.checked)}
                    />
                    <label
                      className="form-check-label cursor-pointer text-muted fs-13"
                      htmlFor="changePasswordCheck"
                    >
                      Change Account Password
                    </label>
                  </div>
                )}

                {/* EDIT MODE – Show Inputs Only When Checkbox Checked */}
                {isEdit && showPasswordFields && (
                  <div className="border border-dashed custom-modal-change-password p-3 bg-light bg-opacity-50 mb-4 animate__animated animate__fadeIn">
                    <div className="mb-3">
                      <label className="form-label text-muted small fw-semibold text-uppercase mb-1">
                        New Password <span className="text-danger">*</span>
                      </label>
                      <input
                        type="password"
                        name="new_password"
                        className={`form-control form-control-lg fs-14 custom-modal-input ${allErrors.new_password ? "is-invalid" : ""}`}
                        value={user.new_password}
                        onChange={onChange}
                        placeholder="Enter new password"
                      />
                      {allErrors.new_password && (
                        <div className="invalid-feedback">
                          {allErrors.new_password}
                        </div>
                      )}
                    </div>

                    <div className="mb-0">
                      <label className="form-label text-muted small fw-semibold text-uppercase mb-1">
                        Confirm Password <span className="text-danger">*</span>
                      </label>
                      <input
                        type="password"
                        name="confirm_password"
                        className={`form-control form-control-lg fs-14 custom-modal-input ${allErrors.confirm_password ? "is-invalid" : ""}`}
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
                  </div>
                )}
                {isPurchaseFlow && (
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
                )}
                <div className="d-flex justify-content-end gap-2 border-top pt-3 mt-4">
                  <button
                    type="button"
                    className="btn btn-light btn-lg fs-14 px-4 custom-modal-btn fw-medium"
                    onClick={onHide}
                    disabled={loadingSave}
                  >
                    Cancel
                  </button>
                  {((isEdit && hasPermission("update users")) ||
                    (!isEdit && hasPermission("create users"))) && (
                      <button
                        type="submit"
                        className="btn btn-primary btn-lg fs-14 px-4 custom-modal-btn fw-medium"
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
                          className={`me-1 align-bottom ${isEdit ? "ri-edit-2-fill" : "ri-save-3-fill"}`}
                        ></i>

                        {/* Dynamic Text */}
                        {isEdit ? "Update Account" : "Save Account"}
                      </button>
                    )}
                </div>
              </form>
            </div>
          </div>
      </div>
    </div>
  );
};

export default UserModal;
