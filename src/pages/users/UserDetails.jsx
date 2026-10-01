import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Dropdown } from 'primereact/dropdown';
import { toast } from 'react-toastify';

import PageHeader from '../common/PageHeader';
import { usePermissions } from '../../lib/auth/usePermissions';
import { useIsHostPartner } from '../../lib/auth/useIsHostPartner';
import { fetchUserById, fetchRoles, updateUser } from '../../modules/user/services';
import {
  fetchUserCompensation,
  saveUserCompensation,
  buildCompensationRows,
  compensationRowsToFields
} from '../../modules/compensation';
import CommissionsSection from '../../components/Compensation/CommissionsSection';
import PendingEmailNotice from '../../components/Account/PendingEmailNotice';
import FormLoader from '../../components/Loader/FormLoader';
import { formatPhoneNumber } from '../../utils/formatters';
import { USER_STATUS } from '../../config/statusOptions';
import { PAID_BY_NONE } from '../../config';
import { scrollToFirstError } from '../../utils/formUtils';

const TAB_ACCOUNT = 'accountDetails';
const TAB_COMMISSIONS = 'commissions';

export default function UserDetails() {
  const { id } = useParams();
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('update users');
  // Commission setup is only offered to the host partner.
  const canManageCommission = useIsHostPartner();

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [roles, setRoles] = useState([]);
  const [activeTab, setActiveTab] = useState(TAB_ACCOUNT);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [pendingEmail, setPendingEmail] = useState(null);

  const [values, setValues] = useState({
    name: '',
    email: '',
    phone_number: '',
    role_id: '',
    status: '',
    new_password: '',
    confirm_password: '',
    paid_by: '',
    hourly_rate: '',
    annual_salary: '',
    per_deal_applicable_services: [],
    per_deal_payout_type: '',
    per_deal_percentage: '',
    per_deal_flat_amount: ''
  });

  useEffect(() => {
    fetchRoles()
      .then((data) => setRoles(data))
      .catch((err) => console.error('Failed to fetch roles', err));
  }, []);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    fetchUserById(id)
      .then((data) => {
        setValues((prev) => ({
          ...prev,
          name: data.name || '',
          email: data.email || '',
          phone_number: data.phone_number || '',
          role_id: data.role_id != null ? String(data.role_id) : '',
          status: data.status || ''
        }));
        setPendingEmail(data.pending_email || null);
      })
      .catch((err) => console.error('Failed to fetch user', err))
      .finally(() => setLoading(false));
  }, [id]);

  // Compensation lives in its own table behind its own endpoint, so the
  // Commissions tab is loaded separately from the user record.
  useEffect(() => {
    if (!id || !canManageCommission) return;

    fetchUserCompensation(id)
      .then((data) => {
        setValues((prev) => ({ ...prev, ...compensationRowsToFields(data?.paid_by, data?.compensations) }));
      })
      .catch((err) => console.error('Failed to fetch compensation', err));
  }, [id, canManageCommission]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setValues((prev) => ({
      ...prev,
      [name]: name === 'phone_number' ? formatPhoneNumber(value) : value
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const applySaveError = (error, fallbackMessage, { toastValidationErrors = false } = {}) => {
    console.error('Save error:', error);

    if (error.response?.data?.errors) {
      const backendErrors = error.response.data.errors;
      const mapped = {};

      Object.keys(backendErrors).forEach((key) => {
        mapped[key] = Array.isArray(backendErrors[key]) ? backendErrors[key][0] : backendErrors[key];
      });

      setErrors(mapped);
      scrollToFirstError(mapped);

      // Compensation errors are keyed by row (compensations.0.amount), which has
      // no matching input on the form, so they'd otherwise fail silently.
      if (toastValidationErrors) {
        toast.error(Object.values(mapped)[0] || fallbackMessage);
      }
    } else if (error.response?.data?.message) {
      // No toast - handled by the global interceptor.
    } else if (error.response?.status !== 403) {
      toast.error(fallbackMessage);
    }
  };

  const validateAccount = () => {
    const next = {};

    if (!values.name) next.name = 'Name is required';
    if (!values.email) next.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(values.email)) next.email = 'Email is invalid';
    if (!values.phone_number) next.phone_number = 'Phone number is required';
    if (!values.role_id) next.role_id = 'Role is required';
    if (!values.status) next.status = 'Status is required';

    if (showPasswordFields) {
      if (!values.new_password) next.new_password = 'New password is required';
      if (!values.confirm_password) next.confirm_password = 'Confirm password is required';
      if (values.new_password && values.confirm_password && values.new_password !== values.confirm_password) {
        next.confirm_password = 'Passwords do not match';
      }
    }

    setErrors(next);
    if (Object.keys(next).length > 0) {
      scrollToFirstError(next);
      return false;
    }
    return true;
  };

  const handleSaveAccount = async () => {
    if (!validateAccount()) return;

    setIsSaving(true);
    try {
      const updated = await updateUser(id, {
        name: values.name,
        email: values.email,
        phone_number: values.phone_number,
        role_id: values.role_id ? Number(values.role_id) : null,
        status: values.status,
        change_password: !!(showPasswordFields && values.new_password),
        ...(showPasswordFields && values.new_password
          ? { new_password: values.new_password, confirm_password: values.confirm_password }
          : {})
      });

      toast.success('User updated successfully');
      setShowPasswordFields(false);
      // A new email isn't applied until it's confirmed, so show the one that
      // is still in effect alongside the pending one.
      setValues((prev) => ({ ...prev, email: updated?.email ?? prev.email, new_password: '', confirm_password: '' }));
      setPendingEmail(updated?.pending_email || null);
    } catch (error) {
      applySaveError(error, 'Failed to update user');
    } finally {
      setIsSaving(false);
    }
  };

  // The Commissions tab saves through its own endpoint, so updating it leaves
  // the user record untouched.
  const handleSaveCompensation = async () => {
    setErrors({});
    setIsSaving(true);

    try {
      await saveUserCompensation(id, {
        paid_by: values.paid_by || PAID_BY_NONE,
        compensations: buildCompensationRows(values)
      });
      toast.success('Commission updated successfully');
    } catch (error) {
      applySaveError(error, 'Failed to update commission', { toastValidationErrors: true });
    } finally {
      setIsSaving(false);
    }
  };

  // Each tab saves only what it shows.
  const handleSave = () => (
    canManageCommission && activeTab === TAB_COMMISSIONS ? handleSaveCompensation() : handleSaveAccount()
  );

  const roleOptions = roles.map((role) => ({ label: role.name, value: String(role.id) }));

  return (
    <div className="page-content">
      <div className="container-fluid">
        <PageHeader
          title="User Details"
          breadcrumbs={[
            { label: 'Users', path: '/users' },
            { label: 'User Details' }
          ]}
        >
          <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
            <Link to="/users" className="btn btn-outline-secondary w-lg waves-effect">
              <i className="ri-arrow-left-line align-middle me-1"></i> Back
            </Link>
            {canUpdate && (
              <button
                type="button"
                onClick={handleSave}
                className="btn btn-primary w-lg waves-effect"
                disabled={isSaving || loading}
              >
                {isSaving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="ri-save-3-line align-middle me-1"></i>
                    Update
                  </>
                )}
              </button>
            )}
          </div>
        </PageHeader>

        <div className="row">
          <div className="col-xxl-12">
            <div className="card">
              <div className="card-header">
                <ul className="nav nav-tabs-custom rounded card-header-tabs border-bottom-0" role="tablist">
                  <li className="nav-item" role="presentation">
                    <button
                      type="button"
                      className={`nav-link ${activeTab === TAB_ACCOUNT ? 'active' : ''}`}
                      onClick={() => setActiveTab(TAB_ACCOUNT)}
                      role="tab"
                      aria-selected={activeTab === TAB_ACCOUNT}
                    >
                      <i className="ri-user-settings-line"></i> User information
                    </button>
                  </li>
                  {canManageCommission && (
                    <li className="nav-item" role="presentation">
                      <button
                        type="button"
                        className={`nav-link ${activeTab === TAB_COMMISSIONS ? 'active' : ''}`}
                        onClick={() => setActiveTab(TAB_COMMISSIONS)}
                        role="tab"
                        aria-selected={activeTab === TAB_COMMISSIONS}
                      >
                        <i className="ri-percent-line"></i> Commissions
                      </button>
                    </li>
                  )}
                </ul>
              </div>

              <div className="card-body p-4">
                <div className="tab-content">
                  <div className={`tab-pane ${activeTab === TAB_ACCOUNT ? 'active show' : ''}`} role="tabpanel">
                    {loading ? (
                      <FormLoader count={6} />
                    ) : (
                      <form onSubmit={(e) => e.preventDefault()}>
                        <div className="row">
                          <div className="col-lg-6">
                            <div className="mb-3">
                              <label className="form-label">Name <span className="text-danger">*</span></label>
                              <input
                                type="text"
                                name="name"
                                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                                value={values.name}
                                onChange={handleChange}
                                placeholder="Enter full name"
                              />
                              {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                            </div>
                          </div>

                          <div className="col-lg-6">
                            <div className="mb-3">
                              <label className="form-label">Email Address <span className="text-danger">*</span></label>
                              <PendingEmailNotice
                                userId={id}
                                pendingEmail={pendingEmail}
                                onChange={setPendingEmail}
                                canManage={canUpdate}
                              />
                              <input
                                type="email"
                                name="email"
                                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                                value={values.email}
                                onChange={handleChange}
                                placeholder="Enter email address"
                              />
                              {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                            </div>
                          </div>

                          <div className="col-lg-6">
                            <div className="mb-3">
                              <label className="form-label">Phone Number <span className="text-danger">*</span></label>
                              <input
                                type="text"
                                name="phone_number"
                                className={`form-control ${errors.phone_number ? 'is-invalid' : ''}`}
                                value={values.phone_number}
                                onChange={handleChange}
                                placeholder="(xxx) xxx-xxxx"
                              />
                              {errors.phone_number && <div className="invalid-feedback">{errors.phone_number}</div>}
                            </div>
                          </div>

                          <div className="col-lg-6">
                            <div className="mb-3">
                              <label className="form-label">User Role <span className="text-danger">*</span></label>
                              <Dropdown
                                inputId="role_id"
                                value={String(values.role_id || '')}
                                options={roleOptions}
                                onChange={(e) => handleChange({ target: { name: 'role_id', value: e.value } })}
                                placeholder="Select Role"
                                className={`w-100 ${errors.role_id ? 'p-invalid' : ''}`}
                              />
                              {errors.role_id && <div className="invalid-feedback d-block">{errors.role_id}</div>}
                            </div>
                          </div>

                          <div className="col-lg-6">
                            <div className="mb-3">
                              <label className="form-label">Account Status <span className="text-danger">*</span></label>
                              <Dropdown
                                inputId="status"
                                value={values.status}
                                options={USER_STATUS}
                                optionLabel="label"
                                optionValue="value"
                                onChange={(e) => handleChange({ target: { name: 'status', value: e.value } })}
                                placeholder="Select Status"
                                className={`w-100 ${errors.status ? 'p-invalid' : ''}`}
                              />
                              {errors.status && <div className="invalid-feedback d-block">{errors.status}</div>}
                            </div>
                          </div>

                          <div className="col-12">
                            <div className="form-check mb-3">
                              <input
                                type="checkbox"
                                className="form-check-input cursor-pointer"
                                id="changePasswordCheck"
                                checked={showPasswordFields}
                                onChange={(e) => setShowPasswordFields(e.target.checked)}
                              />
                              <label className="form-check-label cursor-pointer" htmlFor="changePasswordCheck">
                                Change Account Password
                              </label>
                            </div>
                          </div>

                          {showPasswordFields && (
                            <>
                              <div className="col-lg-6">
                                <div className="mb-3">
                                  <label className="form-label">New Password <span className="text-danger">*</span></label>
                                  <input
                                    type="password"
                                    name="new_password"
                                    className={`form-control ${errors.new_password ? 'is-invalid' : ''}`}
                                    value={values.new_password}
                                    onChange={handleChange}
                                    placeholder="Enter new password"
                                  />
                                  {errors.new_password && <div className="invalid-feedback">{errors.new_password}</div>}
                                </div>
                              </div>

                              <div className="col-lg-6">
                                <div className="mb-3">
                                  <label className="form-label">Confirm Password <span className="text-danger">*</span></label>
                                  <input
                                    type="password"
                                    name="confirm_password"
                                    className={`form-control ${errors.confirm_password ? 'is-invalid' : ''}`}
                                    value={values.confirm_password}
                                    onChange={handleChange}
                                    placeholder="Re-enter new password"
                                  />
                                  {errors.confirm_password && <div className="invalid-feedback">{errors.confirm_password}</div>}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </form>
                    )}
                  </div>

                  {canManageCommission && (
                    <div className={`tab-pane ${activeTab === TAB_COMMISSIONS ? 'active show' : ''}`} role="tabpanel">
                      {loading ? (
                        <FormLoader count={4} />
                      ) : (
                        <CommissionsSection
                          values={values}
                          errors={errors}
                          onChange={handleChange}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
