import React, { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import PageHeader from '../common/PageHeader';
import { usePermissions } from '../../lib/auth/usePermissions';
import { useIsHostPartner } from '../../lib/auth/useIsHostPartner';
import { toast } from 'react-toastify';

import {
  createEmployee,
  updateEmployee,
  fetchEmployeeById,
  fetchDepartments,
  getNextEmployeeId
} from '../../modules/employee';
import { fetchRoles, getUserCount, purchaseUserSeats } from '../../modules/user/services';
import { fetchInvoiceDetails } from '../../modules/invoice/services';
import { getUserDetails } from '../../lib/auth/authApi';
import UserLimitModal from '../users/components/UserLimitModal';
import InvoicePaymentModal from '../invoices/components/InvoicePaymentModal';
import { useAuthStore } from '../../store/auth/authStore';
import { locationData, PAID_BY_NONE } from '../../config';
import { fetchEmployeeCompensation, saveEmployeeCompensation, buildCompensationRows, compensationRowsToFields } from '../../modules/compensation';
import { validateRequired, validateEmail, validatePhone } from '../../components/errors/validation';

import EmployeeForm from './components/EmployeeForm';
import CommissionsSection from '../../components/Compensation/CommissionsSection';
import PendingEmailNotice from '../../components/Account/PendingEmailNotice';
import DepartmentModal from './components/DepartmentModal';
import EmailComposeModal from '../../components/Common/Modals/EmailComposeModal';
import ActivityCreateModal from '../../components/Common/Modals/ActivityCreateModal';
import FormLoader from '../../components/Loader/FormLoader';
import avatarDefault from "../../../assets/images/users/avatar-1.jpg";
import { FileManagerModal } from '../../components/FileManagerModal/FileManagerModal';
import { scrollToFirstError } from '../../utils/formUtils';

const TAB_PERSONAL = 'personalDetails';
const TAB_COMMISSIONS = 'commissions';

export default function EmployeeDetails() {
  const { id } = useParams();
  const { hasPermission } = usePermissions();

  // Permission checks
  const canCreate = hasPermission('create employees');
  const canUpdate = hasPermission('update employees');
  // Commission setup is only offered to the host partner.
  const canManageCommission = useIsHostPartner();

  // State
  const user = useAuthStore((state) => state.user);
  const userSubscription = useAuthStore((state) => state.userSubscription);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [activeTab, setActiveTab] = useState(TAB_PERSONAL);
  const [pendingEmail, setPendingEmail] = useState(null);

  // User Limit States
  const [loadingLimitCheck, setLoadingLimitCheck] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [limitData, setLimitData] = useState({ count: 0, price: '0', limit: 0, quantity: 1, months: 1, totalPrice: 0, invoiceId: null, userId: null, entityId: null, entityType: null });
  const [isPurchaseFlow, setIsPurchaseFlow] = useState(false);

  // Location states
  const [countries] = useState(
    Object.keys(locationData).map((key) => ({
      label: locationData[key].name,
      value: locationData[key].name
    }))
  );
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [phonePrefix, setPhonePrefix] = useState({
    phone_number_1: 'US',
    phone_number_2: 'US',
    emergency_phone: 'US'
  });
  const [profileImage, setProfileImage] = useState(avatarDefault);

  const countryCodeOptions = [
    { label: 'USA (+1)', value: 'US', phoneCode: '+1' },
    { label: 'Canada (+1)', value: 'CA', phoneCode: '+1' }
  ];

  const [employee, setEmployee] = useState({
    first_name: '',
    phone_number_1: '',
    phone_number_2: '',
    email: '',
    department: '',
    designation: '',
    job_status: '',
    address: '',
    joining_date: '',
    country: 'United States',
    country_code: '+1',
    state: '',
    city: '',
    other_city: '',
    postal_code: '',
    date_of_birth: '',
    emergency_contact: '',
    emergency_phone: '',
    employee_code: '',
    create_account: false,
    role_id: '',
    password: '',
    confirm_password: '',
    image: '',
    paid_by: '',
    hourly_rate: '',
    annual_salary: '',
    per_deal_applicable_services: [],
    per_deal_payout_type: '',
    per_deal_percentage: '',
    per_deal_flat_amount: ''
  });

  // Fetch roles and departments on mount
  useEffect(() => {
    fetchRoles()
      .then((data) => setRoles(data))
      .catch((err) => console.error('Failed to fetch roles', err));
    fetchDepartments()
      .then((data) => setDepartments(data))
      .catch((err) => console.error('Failed to fetch departments', err));
  }, []);

  // Initialize states for default country (United States) on new employee creation
  useEffect(() => {
    if (!id && employee.country === 'United States') {
      const countryEntry = Object.entries(locationData).find(([key, val]) => val.name === 'United States');
      const countryCode = countryEntry ? countryEntry[0] : 'USA';

      if (countryCode && locationData[countryCode]) {
        const stateOptions = Object.keys(locationData[countryCode].states).map((key) => ({
          label: locationData[countryCode].states[key].name,
          value: locationData[countryCode].states[key].name
        }));
        setStates(stateOptions);
      }
    }
  }, [id]);

  // Fetch next employee ID for new employees
  useEffect(() => {
    const fetchNextId = async () => {
      if (!id) {
        try {
          const response = await getNextEmployeeId();
          const nextId = response.next_id || response.data?.next_id;
          if (nextId) {
            setEmployee(prev => ({
              ...prev,
              employee_code: nextId // Mapping next_id to employee_code
            }));
          }
        } catch (error) {
          console.error('Failed to fetch next employee ID', error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchNextId();
  }, [id]);

  // Fetch employee data if editing
  useEffect(() => {
    if (id) {
      setLoading(true);
      fetchEmployeeById(id)
        .then((data) => {
          // Normalize Country: If it matches a key in locationData, convert to Name
          let finalCountry = data.country;
          if (locationData[finalCountry]) {
            finalCountry = locationData[finalCountry].name;
          }

          // Find country code based on Name
          const countryEntry = Object.entries(locationData).find(([key, val]) => val.name === finalCountry);
          const countryCode = countryEntry ? countryEntry[0] : null;

          // Normalize State
          let finalState = data.state;
          if (countryCode && locationData[countryCode] && locationData[countryCode].states[finalState]) {
            finalState = locationData[countryCode].states[finalState].name;
          }

          // Handle location cascading first to ensure options are available
          let cityOptions = [];
          if (countryCode && locationData[countryCode]) {
            const stateOptions = Object.keys(locationData[countryCode].states).map((key) => ({
              label: locationData[countryCode].states[key].name,
              value: locationData[countryCode].states[key].name
            }));
            setStates(stateOptions);

            // Find State Code
            let stateCode = null;
            const sEntry = Object.entries(locationData[countryCode].states).find(([key, val]) => val.name === finalState);
            stateCode = sEntry ? sEntry[0] : finalState;

            if (stateCode && locationData[countryCode].states[stateCode]) {
              const cityList = locationData[countryCode].states[stateCode].cities;
              cityOptions = cityList.map((city) => ({ label: city, value: city }));
              setCities(cityOptions);
            }
          }

          // Check if the city exists in the dropdown
          const cityExists = cityOptions.some(cityOption => cityOption.value === data.city);

          // If city doesn't exist in dropdown and city has a value, it's a custom city
          let cityValue = data.city || '';
          let otherCityValue = '';

          if (data.city && !cityExists) {
            // City is not in dropdown, set to "Others" and populate other_city
            otherCityValue = data.city;
            cityValue = 'Others';
          }

          const normalizedData = {
            ...data,
            country: finalCountry,
            state: finalState,
            city: cityValue,
            other_city: otherCityValue,
            country_code: data.country_code || ((finalCountry === 'United States' || finalCountry === 'Canada') ? '+1' : ''),
            create_account:
              data.create_account === true ||
              data.create_account === 'true' ||
              data.create_account === 1 ||
              !!(data.user && Object.keys(data.user).length > 0),
            role_id: data.user?.role_id ?? '',
            image: data.image || null
          };
          setEmployee((prev) => ({ ...prev, ...normalizedData }));
          setPendingEmail(data.user?.pending_email || null);

          // Set profile image matches partner pattern
          if (data.image) {
            setProfileImage(data.image);
          }
        })
        .catch((err) => console.error('Failed to fetch employee', err))
        .finally(() => setLoading(false));
    }
  }, [id]);

  // Compensation lives in its own table behind its own endpoint, so the
  // Commissions tab is loaded separately from the employee record.
  useEffect(() => {
    if (!id || !canManageCommission) return;

    fetchEmployeeCompensation(id)
      .then((data) => {
        setEmployee((prev) => ({ ...prev, ...compensationRowsToFields(data?.paid_by, data?.compensations) }));
      })
      .catch((err) => console.error('Failed to fetch compensation', err));
  }, [id, canManageCommission]);

  // Validation (Disabled - Relying on backend validation)
  const validateField = (name, value) => {
    // Client-side validation disabled - backend handles all validation
    // Clear error for field being edited
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    return null;

    /* COMMENTED OUT - CLIENT-SIDE VALIDATION DISABLED
    let error = null;
    switch (name) {
      case 'first_name':
      case 'department':
      case 'designation':
      case 'country':
      case 'state':
        error = validateRequired(value, name.replace('_', ' '));
        break;
      case 'city':
        error = validateRequired(value, 'city');
        break;
      case 'other_city':
        // Only validate other_city if city is set to "Others"
        if (employee.city === 'Others') {
          error = validateRequired(value, 'Other City');
        }
        break;
      case 'email':
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          error = 'Email is required.';
        } else {
          error = validateEmail(value);
        }
        break;
      case 'phone_number_1':
        error = validatePhone(value);
        break;
      case 'role_id':
        // Only validate role_id if create_account is checked
        if (employee.create_account) {
          error = validateRequired(value, 'Role');
        }
        break;
      default:
        break;
    }
    setErrors((prev) => ({ ...prev, [name]: error }));
    return error;
    */
  };

  // Handle form changes
  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    let newValue;
    if (type === 'checkbox') {
      newValue = checked;
    } else if (type === 'file') {
      newValue = files[0];
    } else {
      newValue = value;
    }

    // Special handling for create_account checkbox
    if (name === 'create_account') {
      if (checked) {
        // Only perform check if it's a new employee OR if existing employee doesn't have a user account yet
        const hasExistingAccount = id && employee.user && Object.keys(employee.user).length > 0;

        if (!hasExistingAccount) {
          // Immediately check the checkbox for better UX
          setEmployee((prev) => ({
            ...prev,
            create_account: true,
            role_id: prev.role_id,
            user: !id ? prev.user : (prev.user || {})
          }));

          const performLimitCheck = async () => {
            // Skip limit check for host users (superadmins)
            if (user?.is_host == 1) {
              return;
            }

            try {
              setLoadingLimitCheck(true);

              const data = await getUserCount();
              const currentCount = parseInt(data?.data?.count || 0);
              const totalAllowed = parseInt(data?.data?.seat_limit || data?.data?.user_seats || userSubscription?.user_seats || 3);

              if (currentCount >= totalAllowed) {
                // Limit reached! Uncheck the box and show modal
                setEmployee((prev) => ({
                  ...prev,
                  create_account: false,
                  role_id: '',
                  user: {}
                }));

                setLimitData({
                  count: currentCount,
                  price: data?.data?.per_user_price || '0',
                  limit: totalAllowed,
                  quantity: 1,
                  months: 1,
                  totalPrice: parseFloat(data?.data?.per_user_price || 0)
                });
                setShowLimitModal(true);
                return;
              }

              // Limit OK - checkbox already checked above

            } catch (error) {
              console.error("Failed to check user limit:", error);
              toast.error("Failed to check user limit");
              // Revert checkbox on error
              setEmployee((prev) => ({
                ...prev,
                create_account: false,
                role_id: '',
                user: {}
              }));
            } finally {
              setLoadingLimitCheck(false);
            }
          };
          performLimitCheck();
          return; // Exit early as we handle state inside async block
        }
      }

      // Default behavior for unchecking or if account already exists
      setEmployee((prev) => ({
        ...prev,
        create_account: checked,
        role_id: checked ? prev.role_id : '',
        user: checked ? (prev.user || {}) : {}
      }));
      return;
    }

    // Handle country/state/city cascading
    if (name === 'country') {
      let countryCode = '';
      if (newValue === 'United States' || newValue === 'Canada') {
        countryCode = '+1';
      }
      setEmployee((prev) => ({ ...prev, country: newValue, country_code: countryCode, state: '', city: '', other_city: '' }));
      validateField('country', newValue);

      // Find code based on Name
      const countryEntry = Object.entries(locationData).find(([key, val]) => val.name === newValue);
      const code = countryEntry ? countryEntry[0] : null;

      if (code && locationData[code]) {
        const stateOptions = Object.keys(locationData[code].states).map((key) => ({
          label: locationData[code].states[key].name,
          value: locationData[code].states[key].name
        }));
        setStates(stateOptions);
        setCities([]);
      } else {
        setStates([]);
        setCities([]);
      }
    } else if (name === 'state') {
      setEmployee((prev) => ({ ...prev, state: newValue, city: '', other_city: '' }));
      validateField('state', newValue);

      const countryName = employee.country;
      const countryEntry = Object.entries(locationData).find(([key, val]) => val.name === countryName);
      const countryCode = countryEntry ? countryEntry[0] : null;

      if (countryCode && locationData[countryCode]) {
        const sEntry = Object.entries(locationData[countryCode].states).find(([key, val]) => val.name === newValue);
        const stateCode = sEntry ? sEntry[0] : null;

        if (stateCode) {
          const cityList = locationData[countryCode].states[stateCode].cities;
          const cityOptions = cityList.map((city) => ({ label: city, value: city }));
          setCities(cityOptions);
        } else {
          setCities([]);
        }
      } else {
        setCities([]);
      }
    } else if (name === 'city') {
      // If city is not "Others", clear other_city
      if (newValue !== 'Others') {
        setEmployee((prev) => ({ ...prev, city: newValue, other_city: '' }));
      } else {
        setEmployee((prev) => ({ ...prev, city: newValue }));
      }
      validateField('city', newValue);
    } else if (name === 'image' && type === 'file') {
      // Image file validation
      const file = newValue;
      if (file) {
        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!validTypes.includes(file.type)) {
          setErrors(prev => ({ ...prev, image: 'Only JPG, JPEG, and PNG image formats are allowed.' }));
          return;
        }

        // Validate file size (1MB)
        const maxSize = 1 * 1024 * 1024; // 1MB
        if (file.size > maxSize) {
          setErrors(prev => ({ ...prev, image: 'Image size must be less than 1 MB.' }));
          return;
        }

        // Clear any previous errors
        setErrors(prev => ({ ...prev, image: null }));
        setEmployee((prev) => ({ ...prev, image: file }));

        // Matches partner pattern for immediate preview
        const reader = new FileReader();
        reader.onloadend = () => {
          setProfileImage(reader.result);
        };
        reader.readAsDataURL(file);
      }
      return;
    } else {
      setEmployee((prev) => ({
        ...prev,
        [name]: newValue
      }));
    }

    validateField(name, newValue);
  };

  const handleDepartmentSuccess = async () => {
    const data = await fetchDepartments();
    setDepartments(data);
  };

  const handleLimitProceed = (months, totalPrice) => {
    setLimitData(prev => ({ ...prev, months, quantity: 1, totalPrice }));
    setShowLimitModal(false);
    setIsPurchaseFlow(true);
    setEmployee(prev => ({ ...prev, create_account: true }));
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    toast.success('Payment completed successfully!');
    // Delay reload to allow toast to be seen
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  const applySaveError = (error, fallbackMessage, { toastValidationErrors = false } = {}) => {
    console.error('Save error:', error);

    // Handle backend validation errors
    if (error.response?.data?.errors) {
      const backendErrors = error.response.data.errors;
      const mappedErrors = {};

      Object.keys(backendErrors).forEach(key => {
        mappedErrors[key] = Array.isArray(backendErrors[key])
          ? backendErrors[key][0]
          : backendErrors[key];
      });

      setErrors(mappedErrors);
      scrollToFirstError(mappedErrors);

      // Compensation errors are keyed by row (compensations.0.amount), which has
      // no matching input on the form, so they'd otherwise fail silently.
      if (toastValidationErrors) {
        toast.error(Object.values(mappedErrors)[0] || fallbackMessage);
      }
      // Otherwise no toast for validation errors - they're shown inline only.
    } else if (error.response?.data?.message) {
      // No toast here to avoid double messages (handled by global interceptor)
    } else if (error.response?.status !== 403) {
      toast.error(fallbackMessage);
    }
  };

  // The Commissions tab saves through its own endpoint, so updating it leaves
  // the employee record untouched.
  const handleSaveCompensation = async () => {
    setErrors({});
    setIsSaving(true);

    try {
      await saveEmployeeCompensation(id, {
        paid_by: employee.paid_by || PAID_BY_NONE,
        compensations: buildCompensationRows(employee)
      });
      toast.success('Commission updated successfully');
    } catch (error) {
      applySaveError(error, 'Failed to update commission', { toastValidationErrors: true });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    // Each tab saves only what it shows. A new employee is the exception:
    // compensation needs an employee id, so the first save writes both.
    if (id && canManageCommission && activeTab === TAB_COMMISSIONS) {
      return handleSaveCompensation();
    }

    setErrors({});
    setIsSaving(true);

    // Frontend validation disabled - rely on backend validation
    /* COMMENTED OUT - CLIENT-SIDE VALIDATION DISABLED
    const newErrors = {};
    let isValid = true;

    Object.keys(employee).forEach((field) => {
      const error = validateField(field, employee[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    if (!isValid) {
      setErrors(newErrors);
      return;
    }
    */

    try {
      const formData = new FormData();

      // The Commissions tab goes to the compensation endpoints, not to the
      // employee record, so its fields are kept out of this payload.
      const compensationFieldPattern = /^(paid_by|compensations|hourly_rate|annual_salary|per_deal_)/;

      Object.entries(employee).forEach(([key, value]) => {
        if (compensationFieldPattern.test(key)) {
          return;
        }
        if (value !== null && value !== undefined) {
          if (key === 'image') {
            if (value instanceof File) {
              formData.append(key, value);
            } else if (typeof value === 'string' && value.trim() !== '' && !value.startsWith('http')) {
              formData.append(key, value);
            }
          } else if (key === 'create_account') {
            formData.append(key, value ? '1' : '0');
          } else if (key === 'user') {
            // Skip user object
          } else if (key === 'city') {
            // If city is "Others", save the other_city value to city column
            if (value === 'Others' && employee.other_city) {
              formData.append('city', employee.other_city);
            } else if (value !== 'Others') {
              // Otherwise, save the selected city
              formData.append('city', value);
            }
          } else if (key === 'other_city') {
            // Don't send other_city as a separate field to backend
          } else if (key === 'country_code') {
            // Always send country_code if it exists
            if (value) {
              formData.append('country_code', value);
            }
          } else if (value !== '') {
            formData.append(key, value);
          }
        }
      });

      if (isPurchaseFlow) {
        formData.append('is_paid', 'true');
        formData.append('months', limitData.months);
      }

      // Only on create: compensation has its own endpoint and needs an employee
      // id, so whatever the Commissions tab holds is written right after the
      // employee exists. Editing saves the two tabs independently.
      const compensationPayload = {
        paid_by: employee.paid_by || PAID_BY_NONE,
        compensations: buildCompensationRows(employee)
      };

      if (id) {
        const res = await updateEmployee(id, formData);
        toast.success('Employee updated successfully');

        // With a login, a new email isn't applied until it's confirmed, so show
        // the one still in effect alongside the pending one.
        const savedEmail = res?.data?.employee?.email;
        const savedPending = res?.data?.user?.pending_email || null;
        if (savedEmail !== undefined) {
          setEmployee((prev) => ({ ...prev, email: savedEmail }));
        }
        setPendingEmail(savedPending);
      } else {
        const res = await createEmployee(formData);
        const newEmployeeId = res.data?.employee?.id;

        if (newEmployeeId && canManageCommission) {
          await saveEmployeeCompensation(newEmployeeId, compensationPayload);
        }

        toast.success('Employee created successfully');

        if (isPurchaseFlow) {
          const invoiceId = res.data?.invoice_id || res.data?.user?.invoice_id;
          const userId = res.data?.user_id || res.data?.user?.id || res.data?.id;
          const entityId = res.data?.user?.entity_id;
          const entityType = res.data?.user?.entity_type;
          setLimitData(prev => ({ ...prev, invoiceId, userId, entityId, entityType }));
          if (invoiceId) {
            try {
              const invoiceRes = await fetchInvoiceDetails(invoiceId);
              if (invoiceRes.status) {
                setLimitData(prev => ({ ...prev, invoice: invoiceRes.data }));
              }
            } catch (error) {
              console.error('Failed to fetch invoice details:', error);
            }
          }
          setIsSaving(false);
          setShowPaymentModal(true);
          return;
        }
      }

    } catch (error) {
      applySaveError(error, id ? 'Failed to update employee' : 'Failed to save employee');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-content">
      <div className="container-fluid">
        {/* Header */}
        <PageHeader 
          title="Employee Details" 
          breadcrumbs={[
            { label: 'Employees', path: '/employees' },
            { label: 'Employee Details' }
          ]} 
        >
          <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
            <Link to="/employees" className="btn btn-outline-secondary w-lg waves-effect">
              <i className="ri-arrow-left-line align-middle me-1"></i> Back
            </Link>
            <button
              type="button"
              onClick={handleSave}
              className="btn btn-primary w-lg waves-effect"
              disabled={isSaving || loading}
            >
              {isSaving ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                  {id ? 'Updating...' : 'Saving...'}
                </>
              ) : (
                <>
                  <i className="ri-save-3-line align-middle me-1"></i>
                  {id ? 'Update' : 'Save'}
                </>
              )}
            </button>
          </div>
        </PageHeader>

        {/* Main Content */}
        <div className="row">
          <div className="col-xxl-12">
            <div className="card">
              <div className="card-header">
                <ul className="nav nav-tabs-custom rounded card-header-tabs border-bottom-0" role="tablist">
                  {/* Controlled by React rather than Bootstrap's tab plugin, so
                      Save knows which tab's data to write. */}
                  <li className="nav-item" role="presentation">
                    <button
                      type="button"
                      className={`nav-link ${activeTab === TAB_PERSONAL ? 'active' : ''}`}
                      onClick={() => setActiveTab(TAB_PERSONAL)}
                      role="tab"
                      aria-selected={activeTab === TAB_PERSONAL}
                    >
                      <i className="fas fa-home"></i> Personal information
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
                  <div className={`tab-pane ${activeTab === TAB_PERSONAL ? 'active show' : ''}`} id="personalDetails" role="tabpanel">
                    {loading ? (
                      <FormLoader count={10} />
                    ) : (
                      <EmployeeForm
                        employee={employee}
                        errors={errors}
                        onChange={handleChange}
                        departments={departments}
                        roles={roles}
                        countries={countries}
                        states={states}
                        cities={cities}
                        phonePrefix={phonePrefix}
                        onPhonePrefixChange={setPhonePrefix}
                        onAddDepartment={() => setShowDepartmentModal(true)}
                        onOpenFileManager={() => { }} // Local modal now handled in component
                        profileImage={profileImage}
                        isEditMode={!!id}
                        employeeId={id || employee.employee_code}
                        loadingLimitCheck={loadingLimitCheck}
                        isPurchaseFlow={isPurchaseFlow}
                        purchaseMonths={limitData.months}
                        purchasePrice={limitData.totalPrice}
                        emailNotice={
                          <PendingEmailNotice
                            userId={employee.user?.id}
                            pendingEmail={pendingEmail}
                            onChange={setPendingEmail}
                            canManage={canUpdate}
                          />
                        }
                      />
                    )}
                  </div>
                  {canManageCommission && (
                    <div className={`tab-pane ${activeTab === TAB_COMMISSIONS ? 'active show' : ''}`} id="commissions" role="tabpanel">
                      {loading ? (
                        <FormLoader count={4} />
                      ) : (
                        <CommissionsSection
                          values={employee}
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

          {/* <div className="col-xxl-4">
            <div className="card">
              <div className="card-header">
                <div className="d-flex align-items-center mb-4">
                  <h5 className="flex-grow-1 mb-0">Activity Log</h5>
                  <div className="flex-shrink-0">
                    <button
                      type="button"
                      className="btn btn-soft-primary btn-sm"
                      data-bs-toggle="modal"
                      data-bs-target="#emailComposeModal"
                    >
                      New Email
                    </button>
                    <div
                      className="btn text-light bg-primary btn-sm ms-2"
                      data-bs-toggle="modal"
                      data-bs-target="#activityCreateModal"
                    >
                      New Event
                    </div>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="acitivity-timeline acitivity-main">
                  <div className="acitivity-item d-flex">
                    <div className="flex-shrink-0 avatar-xs acitivity-avatar">
                      <div className="avatar-title bg-soft-success text-success rounded-circle">
                        <i className="ri-shopping-cart-2-line"></i>
                      </div>
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <h6 className="mb-1">New ticket received <span className="badge bg-soft-danger text-danger align-middle">High</span></h6>
                      <p className="text-muted mb-2">User <span className="text-primary">Erica245</span> submitted a ticket</p>
                      <small className="mb-0 text-muted">26 Dec, 2024</small>
                    </div>
                  </div>
                  <div className="acitivity-item py-3 d-flex">
                    <div className="flex-shrink-0 avatar-xs acitivity-avatar">
                      <div className="avatar-title bg-soft-danger text-danger rounded-circle">
                        <i className="ri-user-3-line"></i>
                      </div>
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <h6 className="mb-1">Employee Created <span className="badge bg-soft-primary text-primary align-middle">New</span></h6>
                      <p className="text-muted mb-2">Profile created by <span className="text-primary">Admin</span></p>
                      <small className="mb-0 text-muted">25 Dec, 2024</small>
                    </div>
                  </div>
                  <div className="acitivity-item py-3 d-flex">
                    <div className="flex-shrink-0">
                      <img src={avatarDefault} alt="" className="avatar-xs rounded-circle acitivity-avatar" />
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <h6 className="mb-1">Jacqueline Steve</h6>
                      <p className="text-muted mb-2">Lead status updated: moved to "Proposal" - 05:16 PM</p>
                      <small className="mb-0 text-muted">18 Dec, 2024</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div> */}
        </div>

        {/* Department Modal */}
        <DepartmentModal
          visible={showDepartmentModal}
          onHide={() => setShowDepartmentModal(false)}
          onSuccess={handleDepartmentSuccess}
          departments={departments}
        />

        <UserLimitModal
          show={showLimitModal}
          onHide={() => setShowLimitModal(false)}
          onProceed={handleLimitProceed}
          userCount={limitData.count}
          freeLimit={limitData.limit}
          perUserPrice={limitData.price}
        />

        <InvoicePaymentModal
          show={showPaymentModal}
          onHide={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
          invoice={limitData.invoice}
        />

        <EmailComposeModal />

        <ActivityCreateModal />
      </div>
    </div>
  );
}
