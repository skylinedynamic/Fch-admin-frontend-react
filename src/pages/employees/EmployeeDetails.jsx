import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom';
import { usePermissions } from '../../lib/auth/usePermissions';
import { toast } from 'react-toastify';
import '../../../assets/css/datepicker.css';

import {
  createEmployee,
  updateEmployee,
  fetchEmployeeById,
  fetchDepartments,
  getNextEmployeeId
} from '../../modules/employee';
import { fetchRoles, getUserCount, purchaseUserSeats } from '../../modules/user/services';
import { getUserDetails } from '../../lib/auth/authApi';
import UserLimitModal from '../users/components/UserLimitModal';
import UserPaymentModal from '../users/components/UserPaymentModal';
import { useAuthStore } from '../../store/auth/authStore';
import { locationData } from '../../config';
import { validateRequired, validateEmail, validatePhone } from '../../components/errors/validation';

import EmployeeForm from './components/EmployeeForm';
import DepartmentModal from './components/DepartmentModal';
import EmailComposeModal from '../../components/Common/Modals/EmailComposeModal';
import ActivityCreateModal from '../../components/Common/Modals/ActivityCreateModal';
import FormLoader from '../../components/Loader/FormLoader';
import avatarDefault from '../../../assets/images/users/avatar-1.jpg';
import { FileManagerModal } from '../../components/FileManagerModal/FileManagerModal';

export default function EmployeeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  // Permission checks
  const canCreate = hasPermission('create employees');
  const canUpdate = hasPermission('update employees');

  // Access control: redirect to access-denied if lacks required permission
  if (id && !canUpdate) {
    return <Navigate to="/access-denied" replace />;
  }
  if (!id && !canCreate) {
    return <Navigate to="/access-denied" replace />;
  }

  // State
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);

  // User Limit States
  const [loadingLimitCheck, setLoadingLimitCheck] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [limitData, setLimitData] = useState({ count: 0, price: '0', limit: 0, quantity: 1, totalPrice: 0 });

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
    image: ''
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

          // Set profile image matches partner pattern
          if (data.image) {
            setProfileImage(data.image);
          }
        })
        .catch((err) => console.error('Failed to fetch employee', err))
        .finally(() => setLoading(false));
    }
  }, [id]);

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
          const performLimitCheck = async () => {
             try {
               setLoadingLimitCheck(true);
               
               // Fetch fresh user details to get latest total_free_users/total_paid_users
               const detailsRes = await getUserDetails();
               const freshUser = detailsRes?.data?.user;
               
               const data = await getUserCount();
               const currentCount = data?.data?.count || 0;
               const freeLimit = freshUser?.total_free_users || 0;
               const paidLimit = freshUser?.total_paid_users || 0;
               const totalAllowed = freeLimit + paidLimit;

               if (currentCount >= totalAllowed) {
                  // Limit reached! Show modal and don't check the box yet
                  setLimitData({
                      count: currentCount,
                      price: data?.data?.per_user_price || '0',
                      limit: totalAllowed,
                      quantity: 1,
                      totalPrice: parseFloat(data?.data?.per_user_price || 0)
                  });
                  setShowLimitModal(true);
                  // Checkbox stays unchecked
                  return;
               }
               
               // All good, set the checkbox
               setEmployee((prev) => ({
                 ...prev,
                 create_account: true,
                 role_id: prev.role_id,
                 user: !id ? prev.user : (prev.user || {})
               }));

             } catch (error) {
               console.error("Failed to check user limit:", error);
               toast.error("Failed to check user limit");
             } finally {
               setLoadingLimitCheck(false);
             }
          };
          performLimitCheck();
          return; // Exit early as we handle state inside async block
        }
      }

      // Default behavior for unchecking or if account already exists
      if (!id) {
        setEmployee((prev) => ({
          ...prev,
          create_account: checked,
          role_id: checked ? prev.role_id : ''
        }));
      } else {
        setEmployee((prev) => ({
          ...prev,
          create_account: checked,
          user: checked ? prev.user || {} : null,
          role_id: checked ? prev.role_id : ''
        }));
      }
      // Clear role_id error when unchecking create_account
      if (!checked) {
        setErrors((prev) => ({ ...prev, role_id: null }));
      }
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

  const handleLimitProceed = (quantity, totalPrice) => {
    setLimitData(prev => ({ ...prev, quantity, totalPrice }));
    setShowLimitModal(false);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    // Reload window to refresh all limits and UI state from server
    window.location.reload();
  };

  const handleSave = async () => {
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
      Object.entries(employee).forEach(([key, value]) => {
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

      if (id) {
        await updateEmployee(id, formData);
        toast.success('Employee updated successfully');
      } else {
        await createEmployee(formData);
        toast.success('Employee created successfully');
      }

      setTimeout(() => navigate('/employees'), 800);
    } catch (error) {
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

        // No toast notifications for validation errors - errors shown inline only
        // toast.error for validation errors removed as per requirement
      } else if (error.response?.data?.message) {
        // Only show general error message in toast (not field-specific)
        toast.error(error.response.data.message);
      } else {
        toast.error(id ? 'Failed to update employee' : 'Failed to save employee');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page-content">
      <div className="container-fluid">
        {/* Header */}
        <div className="row mb-3 pb-1 page-subheader-sticky bg-body">
          <div className="col-12">
            <div className="d-flex align-items-center justify-content-between flex-row">
              <div className="flex-grow-1">
                <h4 className="fs-20 mb-1">Employee Details</h4>
                <nav aria-label="breadcrumb" className="d-none d-sm-block">
                  <ol className="breadcrumb m-0">
                    <li className="breadcrumb-item">
                      <a href="index.html">Dashboard</a>
                    </li>
                    <li className="breadcrumb-item">
                      <a href="employees.html">Employees</a>
                    </li>
                    <li className="breadcrumb-item active" aria-current="page">
                      Employee Details
                    </li>
                  </ol>
                </nav>
              </div>
              <div className="page-actions d-flex align-items-center gap-2 mt-0">
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
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="row">
          <div className="col-xxl-12">
            <div className="card">
              <div className="card-header">
                <ul className="nav nav-tabs-custom rounded card-header-tabs border-bottom-0" role="tablist">
                  <li className="nav-item" role="presentation">
                    <a
                      className="nav-link active"
                      data-bs-toggle="tab"
                      href="#personalDetails"
                      role="tab"
                      aria-selected="true"
                    >
                      <i className="fas fa-home"></i> Personal information
                    </a>
                  </li>
                </ul>
              </div>

              <div className="card-body p-4">
                <div className="tab-content">
                  <div className="tab-pane active show" id="personalDetails" role="tabpanel">
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
                      />
                    )}
                  </div>
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

        <UserPaymentModal
          show={showPaymentModal}
          onHide={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
          amount={limitData.totalPrice}
          quantity={limitData.quantity}
        />

        <EmailComposeModal />

        <ActivityCreateModal />
      </div>
    </div>
  );
}
