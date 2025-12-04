import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../../assets/css/datepicker.css';

import {
  createEmployee,
  updateEmployee,
  fetchEmployeeById,
  fetchDepartments
} from '../../modules/employee';
import { fetchRoles } from '../../modules/user/services';
import { locationData } from '../../config/locations';
import { validateRequired, validateEmail, validatePhone } from '../../components/errors/validation';

import EmployeeForm from './components/EmployeeForm';
import DepartmentModal from './components/DepartmentModal';

export default function EmployeeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  // State
  const [errors, setErrors] = useState({});
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);

  // Location states
  const [countries] = useState(
    Object.keys(locationData).map((key) => ({
      label: locationData[key].name,
      value: key
    }))
  );
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [phonePrefix, setPhonePrefix] = useState({
    phone_number_1: 'US',
    phone_number_2: 'US',
    emergency_phone: 'US'
  });

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
    country: 'USA',
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

  // Initialize states for default country (USA) on new employee creation
  useEffect(() => {
    if (!id && employee.country === 'USA') {
      const stateOptions = Object.keys(locationData['USA'].states).map((key) => ({
        label: locationData['USA'].states[key].name,
        value: key
      }));
      setStates(stateOptions);
    }
  }, [id]);

  // Fetch employee data if editing
  useEffect(() => {
    if (id) {
      fetchEmployeeById(id)
        .then((data) => {
          // Handle location cascading first to ensure options are available
          let cityOptions = [];
          if (data.country && locationData[data.country]) {
            const stateOptions = Object.keys(locationData[data.country].states).map((key) => ({
              label: locationData[data.country].states[key].name,
              value: key
            }));
            setStates(stateOptions);

            if (data.state && locationData[data.country].states[data.state]) {
              const cityList = locationData[data.country].states[data.state].cities;
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
            city: cityValue,
            other_city: otherCityValue,
            country_code: data.country_code || ((data.country === 'USA' || data.country === 'Canada') ? '+1' : ''),
            create_account:
              data.create_account === true ||
              data.create_account === 'true' ||
              data.create_account === 1 ||
              !!(data.user && Object.keys(data.user).length > 0),
            role_id: data.user?.role_id ?? '',
            image: data.image || null
          };
          setEmployee((prev) => ({ ...prev, ...normalizedData }));
        })
        .catch((err) => console.error('Failed to fetch employee', err));
    }
  }, [id]);

  // Validation
  const validateField = (name, value) => {
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
      if (newValue === 'USA' || newValue === 'Canada') {
        countryCode = '+1';
      }
      setEmployee((prev) => ({ ...prev, country: newValue, country_code: countryCode, state: '', city: '', other_city: '' }));
      validateField('country', newValue);
      if (locationData[newValue]) {
        const stateOptions = Object.keys(locationData[newValue].states).map((key) => ({
          label: locationData[newValue].states[key].name,
          value: key
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
      const countryCode = employee.country;
      if (countryCode && locationData[countryCode] && locationData[countryCode].states[newValue]) {
        const cityList = locationData[countryCode].states[newValue].cities;
        const cityOptions = cityList.map((city) => ({ label: city, value: city }));
        setCities(cityOptions);
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

  // Handle department modal success
  const handleDepartmentSuccess = async () => {
    const data = await fetchDepartments();
    setDepartments(data);
  };

  // Handle save
  const handleSave = async () => {
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

    try {
      const formData = new FormData();
      Object.entries(employee).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (key === 'image') {
            if (value instanceof File) {
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
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        Object.entries(errors).forEach(([field, errorMsg]) => {
          toast.error(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg);
        });
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error(id ? 'Failed to update employee' : 'Failed to save employee');
      }
    }
  };

  return (
    <div className="page-content">
      <ToastContainer position="top-right" autoClose={3000} />
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
                >
                  <i className="ri-save-3-line align-middle me-1"></i>
                  {id ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="row">
          <div className="col-xxl-8">
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
                    <EmployeeForm
                      employee={employee}
                      errors={errors}
                      onChange={handleChange}
                      departments={departments}
                      roles={roles}
                      countries={countries}
                      states={states}
                      cities={cities}
                      countryCodeOptions={countryCodeOptions}
                      phonePrefix={phonePrefix}
                      onPhonePrefixChange={setPhonePrefix}
                      onAddDepartment={() => setShowDepartmentModal(true)}
                      isEditMode={!!id}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xxl-4">
            <div className="card">
              <div className="card-header px-2 py-2">
                <h4 className="card-title mb-0">
                  <i className="ri-history-line me-2"></i>Activity
                </h4>
              </div>
              <div className="card-body">
                <p className="text-muted">Activity Logs Here...</p>
              </div>
            </div>
          </div>
        </div>

        {/* Department Modal */}
        <DepartmentModal
          visible={showDepartmentModal}
          onHide={() => setShowDepartmentModal(false)}
          onSuccess={handleDepartmentSuccess}
          departments={departments}
        />
      </div>
    </div>
  );
}
