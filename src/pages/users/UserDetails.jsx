import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { Dropdown } from 'primereact/dropdown';
import { toast } from 'react-toastify';

import PageHeader from '../common/PageHeader';
import { usePermissions } from '../../lib/auth/usePermissions';
import { fetchUserById, fetchRoles, updateUser } from '../../modules/user/services';
import { useCreateUser } from '../../modules/user';
import { useAvailableEmployeesForUser } from '../../modules/employee';
import { fetchInvoiceDetails } from '../../modules/invoice/services';
import InvoicePaymentModal from '../invoices/components/InvoicePaymentModal';
import EmployeePicker from './components/EmployeePicker';
import PendingEmailNotice from '../../components/Account/PendingEmailNotice';
import FormLoader from '../../components/Loader/FormLoader';
import { formatPhoneNumber } from '../../utils/formatters';
import { USER_STATUS } from '../../config/statusOptions';
import { scrollToFirstError } from '../../utils/formUtils';

/**
 * Adding a user (/users/create) and viewing/editing one (/user-details/:id).
 *
 * A new user is always the login of one of the partner's employees, picked
 * from those without a user yet; picking one fills in the account details.
 * When the partner is over its seat limit the Users list sends
 * `state.purchase` ({ months, totalPrice }) and the user is created as a paid
 * seat, followed by paying its invoice.
 */
export default function UserDetails() {
  const { id } = useParams();
  const isCreate = !id;
  const navigate = useNavigate();
  const location = useLocation();
  const purchase = isCreate ? location.state?.purchase : null;
  const { hasPermission } = usePermissions();
  const canUpdate = hasPermission('update users');
  const canSave = isCreate ? hasPermission('create users') : canUpdate;

  const employeesQuery = useAvailableEmployeesForUser(isCreate);
  const createUser = useCreateUser();
  const [invoice, setInvoice] = useState(null);

  const [loading, setLoading] = useState(!isCreate);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [roles, setRoles] = useState([]);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [pendingEmail, setPendingEmail] = useState(null);

  const [values, setValues] = useState({
    employee_id: null,
    password: '',
    name: '',
    email: '',
    phone_number: '',
    role_id: '',
    status: '',
    new_password: '',
    confirm_password: ''
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

  // Picking the employee fills in the account details from them.
  const handleEmployeeChange = (employee) => {
    setValues((prev) => ({
      ...prev,
      employee_id: employee?.id ?? null,
      name: employee?.full_name ?? '',
      email: employee?.email ?? '',
      phone_number: formatPhoneNumber(employee?.phone_number_1 ?? '') ?? ''
    }));
    setErrors((prev) => {
      const next = { ...prev };
      ['employee_id', 'name', 'email', 'phone_number'].forEach((key) => delete next[key]);
      return next;
    });
  };

  const applySaveError = (error, fallbackMessage) => {
    console.error('Save error:', error);

    if (error.response?.data?.errors) {
      const backendErrors = error.response.data.errors;
      const mapped = {};

      Object.keys(backendErrors).forEach((key) => {
        mapped[key] = Array.isArray(backendErrors[key]) ? backendErrors[key][0] : backendErrors[key];
      });

      setErrors(mapped);
      scrollToFirstError(mapped);
    } else if (error.response?.data?.message) {
      // No toast - handled by the global interceptor.
    } else if (error.response?.status !== 403) {
      toast.error(fallbackMessage);
    }
  };

  const validateAccount = () => {
    const next = {};

    if (isCreate && !values.employee_id) next.employee_id = 'Please select an employee';
    if (!values.name) next.name = 'Name is required';
    if (!values.email) next.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(values.email)) next.email = 'Email is invalid';
    if (!values.role_id) next.role_id = 'Role is required';
    if (isCreate) {
      if (!values.password) next.password = 'Password is required';
    } else if (!values.status) {
      next.status = 'Status is required';
    }

    if (!isCreate && showPasswordFields) {
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

  const handleCreate = async () => {
    setIsSaving(true);
    try {
      const res = await createUser.mutateAsync({
        employee_id: values.employee_id,
        name: values.name,
        email: values.email,
        phone_number: values.phone_number,
        role_id: Number(values.role_id),
        password: values.password,
        ...(purchase ? { is_paid: true, months: purchase.months } : {})
      });
      toast.success('User created successfully');

      // A paid seat stays inactive until its invoice is paid.
      const invoiceId = res?.data?.invoice_id;
      if (purchase && invoiceId) {
        const invoiceRes = await fetchInvoiceDetails(invoiceId);
        if (invoiceRes?.status) {
          setInvoice(invoiceRes.data);
          return;
        }
      }
      navigate('/users');
    } catch (error) {
      const data = error?.response?.data;
      // e.g. "User limit reached" - a message with no field to show it under.
      if (!data?.errors && data?.message) toast.error(data.message);
      else applySaveError(error, 'Failed to create user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAccount = async () => {
    if (!validateAccount()) return;
    if (isCreate) return handleCreate();

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

  const roleOptions = roles.map((role) => ({ label: role.name, value: String(role.id) }));
  const pageTitle = isCreate ? 'Add User' : 'User Details';
  const formLoading = isCreate ? employeesQuery.isLoading : loading;

  return (
    <div className="page-content">
      <div className="container-fluid">
        <PageHeader
          title={pageTitle}
          breadcrumbs={[
            { label: 'Users', path: '/users' },
            { label: pageTitle }
          ]}
        >
          <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
            <Link to="/users" className="btn btn-outline-secondary w-lg waves-effect">
              <i className="ri-arrow-left-line align-middle me-1"></i> Back
            </Link>
            {canSave && (
              <button
                type="button"
                onClick={handleSaveAccount}
                className="btn btn-primary w-lg waves-effect"
                disabled={isSaving || formLoading}
              >
                {isSaving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                    {isCreate ? 'Saving...' : 'Updating...'}
                  </>
                ) : (
                  <>
                    <i className="ri-save-3-line align-middle me-1"></i>
                    {isCreate ? 'Save' : 'Update'}
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
                    <button type="button" className="nav-link active" role="tab" aria-selected="true">
                      <i className="ri-user-settings-line"></i> User information
                    </button>
                  </li>
                </ul>
              </div>

              <div className="card-body p-4">
                <div className="tab-content">
                  <div className="tab-pane active show" role="tabpanel">
                    {formLoading ? (
                      <FormLoader count={6} />
                    ) : (
                      <form onSubmit={(e) => e.preventDefault()}>
                        <div className="row">
                          {isCreate && (
                            <EmployeePicker
                              employees={employeesQuery.data ?? []}
                              value={values.employee_id}
                              error={errors.employee_id}
                              canCreateEmployee={hasPermission('create employees')}
                              onChange={handleEmployeeChange}
                            />
                          )}

                          <div className="col-lg-6">
                            <div className="mb-3">
                              <label htmlFor="name" className="form-label">Name <span className="text-danger">*</span></label>
                              <input
                                id="name"
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
                              <label htmlFor="email" className="form-label">Email Address <span className="text-danger">*</span></label>
                              {!isCreate && (
                                <PendingEmailNotice
                                  userId={id}
                                  pendingEmail={pendingEmail}
                                  onChange={setPendingEmail}
                                  canManage={canUpdate}
                                />
                              )}
                              <input
                                id="email"
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
                              <label htmlFor="phone_number" className="form-label">Phone Number</label>
                              <input
                                id="phone_number"
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
                              <label htmlFor="role_id" className="form-label">User Role <span className="text-danger">*</span></label>
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

                          {isCreate ? (
                            <>
                              <div className="col-lg-6">
                                <div className="mb-3">
                                  <label htmlFor="password" className="form-label">Password <span className="text-danger">*</span></label>
                                  <input
                                    id="password"
                                    type="password"
                                    name="password"
                                    autoComplete="new-password"
                                    className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                                    value={values.password}
                                    onChange={handleChange}
                                    placeholder="Enter password"
                                  />
                                  {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                                </div>
                              </div>

                              {purchase && (
                                <div className="col-12">
                                  <div className="p-3 bg-success bg-opacity-10 text-success mb-3">
                                    <h6 className="fw-semibold text-success fs-14 mb-2">
                                      <i className="ri-checkbox-circle-fill me-1"></i> Seat Purchase Pending Activation
                                    </h6>
                                    <div className="row g-2 fs-13">
                                      <div className="col-6">Additional Seat Quantity:</div>
                                      <div className="col-6 text-end fw-semibold">1 Seat</div>
                                      <div className="col-6">Subscription Duration:</div>
                                      <div className="col-6 text-end fw-semibold">
                                        {purchase.months} Month{purchase.months > 1 ? 's' : ''}
                                      </div>
                                      <div className="col-6 fw-bold">Total Amount Due:</div>
                                      <div className="col-6 text-end fw-bold">${Number(purchase.totalPrice || 0).toFixed(2)}</div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                          <>
                          <div className="col-lg-6">
                            <div className="mb-3">
                              <label htmlFor="status" className="form-label">Account Status <span className="text-danger">*</span></label>
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
                          </>
                          )}
                        </div>
                      </form>
                    )}
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>

        {isCreate && (
          <InvoicePaymentModal
            show={!!invoice}
            invoice={invoice}
            onHide={() => navigate('/users')}
            onSuccess={() => {
              toast.success('Payment completed successfully!');
              navigate('/users');
            }}
          />
        )}
      </div>
    </div>
  );
}
