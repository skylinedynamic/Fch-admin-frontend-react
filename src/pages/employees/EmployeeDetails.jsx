import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { bloodGroups } from "../../config/bloodGroups";
import Flatpickr from "react-flatpickr";
import { Link } from 'react-router-dom'
import {
  createEmployee,
  updateEmployee,
  fetchEmployeeById,
  fetchDepartments,
  saveDepartment
} from "../../modules/employee";
import { fetchRoles } from "../../modules/user/services";
import { locationData } from "../../config/locations";
import { Dropdown } from 'primereact/dropdown';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../../assets/css/datepicker.css";
import { validateRequired, validateEmail, validatePhone, validateDate, validateSSN } from "../../components/errors/validation";

export default function EmployeeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [errors, setErrors] = useState({});
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");

  // Location states
  const [countries] = useState(Object.keys(locationData).map(key => ({ label: locationData[key].name, value: key })));
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [phonePrefix, setPhonePrefix] = useState({
    phone_number_1: "US",
    phone_number_2: "US",
    emergency_phone: "US"
  });

  const countryCodeOptions = [
    { label: "USA (+1)", value: "US", phoneCode: "+1" },
    { label: "Canada (+1)", value: "CA", phoneCode: "+1" }
  ];
  const [employee, setEmployee] = useState({
    first_name: "",
    phone_number_1: "",
    phone_number_2: "",
    email: "",
    department: "",
    designation: "",
    job_status: "",
    address: "",
    joining_date: "",
    country: "",
    state: "",
    city: "",
    postal_code: "",
    identification_number: "",
    ssn: "",
    passport_number: "",
    gender: "",
    blood_group: "",
    date_of_birth: "",
    place_of_birth: "",
    marital_status: "",
    no_of_children: "",
    emergency_contact: "",
    emergency_phone: "",
    employee_code: "",
    create_account: false,
    role_id: "",
    image: "",
  });

  useEffect(() => {
    fetchRoles().then(data => setRoles(data)).catch(err => console.error("Failed to fetch roles", err));
    fetchDepartments().then(data => setDepartments(data)).catch(err => console.error("Failed to fetch departments", err));
  }, []);

  useEffect(() => {
    if (id) {
      fetchEmployeeById(id)
        .then((data) => {
          // Convert string booleans to actual booleans
          const normalizedData = {
            ...data,
            create_account: data.create_account === true || data.create_account === "true" || data.create_account === 1,
            role_id: data.user?.role_id ?? "",
            image: data.image || null,
          };
          setEmployee((prev) => ({ ...prev, ...normalizedData }));
          // Initialize states and cities if country/state exists
          if (data.country && locationData[data.country]) {
            const stateOptions = Object.keys(locationData[data.country].states).map(key => ({
              label: locationData[data.country].states[key].name,
              value: key
            }));
            setStates(stateOptions);

            if (data.state && locationData[data.country].states[data.state]) {
              const cityList = locationData[data.country].states[data.state].cities;
              const cityOptions = cityList.map(city => ({ label: city, value: city }));
              setCities(cityOptions);
            }
          }
        })
        .catch((err) => console.error("Failed to fetch employee", err));
    }
  }, [id]);

  const validateField = (name, value) => {
    let error = null;
    switch (name) {
      case 'first_name':
      case 'department':
      case 'designation':
      case 'country':
      case 'state':
      case 'city':
        error = validateRequired(value, name.replace('_', ' '));
        break;
      case 'email':
        // Email is required, so validate both required and format
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          error = 'Email is required.';
        } else {
          error = validateEmail(value);
        }
        break;
      case 'phone_number_1':
        // Phone number 1 is required
        error = validatePhone(value);
        break;
      default:
        break;
    }
    setErrors((prev) => ({ ...prev, [name]: error }));
    return error;
  };

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    let newValue;
    if (type === "checkbox") {
      newValue = checked;
    } else if (type === "file") {
      // handle single file upload
      newValue = files[0]; // this is a File object
    } else {
      newValue = value;
    }

    if (name === "create_account") {
      setEmployee(prev => ({
        ...prev,
        create_account: checked
      }));
      return; // skip the rest of handleChange
    } else if (type === "checkbox") {
      newValue = checked;
    }

    if (name === 'country') {
      setEmployee(prev => ({ ...prev, country: newValue, state: '', city: '' }));
      if (locationData[newValue]) {
        const stateOptions = Object.keys(locationData[newValue].states).map(key => ({
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
      setEmployee(prev => ({ ...prev, state: newValue, city: '' }));
      const countryCode = employee.country;
      if (countryCode && locationData[countryCode] && locationData[countryCode].states[newValue]) {
        const cityList = locationData[countryCode].states[newValue].cities;
        const cityOptions = cityList.map(city => ({ label: city, value: city }));
        setCities(cityOptions);
      } else {
        setCities([]);
      }
    } else {
      setEmployee((prev) => ({
        ...prev,
        [name]: newValue,
      }));
    }

    validateField(name, newValue);
  };

  const handleSaveDepartment = async () => {
    if (!newDepartmentName.trim()) {
      toast.error("Department name is required");
      return;
    }
    try {
      await saveDepartment({ name: newDepartmentName });
      toast.success("Department added successfully");
      setShowDepartmentModal(false);
      setNewDepartmentName("");
      const data = await fetchDepartments();
      setDepartments(data);
    } catch (error) {
      console.error("Failed to save department", error);
      toast.error("Failed to save department");
    }
  };

  const handleSave = async () => {
    const newErrors = {};
    let isValid = true;

    Object.keys(employee).forEach(field => {
      const error = validateField(field, employee[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    if (!isValid) {
      setErrors(newErrors);
      // toast.error("Please fill up the required fields");
      return;
    }




    try {
      const formData = new FormData();
      Object.entries(employee).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (key === 'image') {
            if (value instanceof File) {
              formData.append(key, value); // new file
            } else if (typeof value === 'string' && value.startsWith('http')) {
              // optional: skip appending if not changed
            }
          } else if (key === 'create_account') {
            formData.append(key, value ? '1' : '0');
          } else {
            formData.append(key, value);
          }
        }
      });

      if (id) {
        await updateEmployee(id, formData);
        toast.success("Employee updated successfully");
      } else {
        await createEmployee(formData);
        toast.success("Employee created successfully");
      }

      setTimeout(() => navigate("/employees"), 800);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save employee");
    }
  };

  return (
    <div className="page-content">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="container-fluid">
        <div className="row mb-3 pb-1 page-subheader-sticky bg-body">
          <div className="col-12">
            <div className="d-flex align-items-center justify-content-between flex-row">
              <div className="flex-grow-1">
                <h4 className="fs-20 mb-1">Employee Details</h4>
                <nav aria-label="breadcrumb" className="d-none d-sm-block">
                  <ol className="breadcrumb m-0">
                    <li className="breadcrumb-item"><a href="index.html">Dashboard</a></li>
                    <li className="breadcrumb-item"><a href="employees.html">Employees</a></li>
                    <li className="breadcrumb-item active" aria-current="page">Employee Details</li>
                  </ol>
                </nav>
              </div>
              <div className="page-actions d-flex align-items-center gap-2 mt-0">
                <Link to="/employees" className="btn btn-outline-secondary w-lg waves-effect">
                  <i className="ri-arrow-left-line align-middle me-1"></i> Back
                </Link>
                <button type="button" onClick={handleSave} className="btn btn-primary w-lg waves-effect">
                  <i className="ri-save-3-line align-middle me-1"></i>
                  {id ? "Update" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-xxl-8">
            <div className="card">
              <div className="card-header">
                <ul className="nav nav-tabs-custom rounded card-header-tabs border-bottom-0" role="tablist">
                  <li className="nav-item" role="presentation">
                    <a className="nav-link active" data-bs-toggle="tab" href="#personalDetails" role="tab" aria-selected="true">
                      <i className="fas fa-home"></i> Personal information
                    </a>
                  </li>
                </ul>
              </div>

              <div className="card-body p-4">
                <div className="tab-content">
                  <div className="tab-pane active show" id="personalDetails" role="tabpanel">
                    <form onSubmit={(e) => e.preventDefault()}>
                      <div className="row">
                        <div className="col-lg-12">
                          <div className="card">
                            <div className="profile-user position-relative d-inline-block mx-auto mb-4">
                              <img
                                src={employee.image instanceof File ? URL.createObjectURL(employee.image) : employee.image || "assets/images/users/avatar-1.jpg"}
                                className="rounded-circle avatar-xl img-thumbnail user-profile-image material-shadow"
                                alt="user-profile"
                              />
                              <div className="avatar-xs p-0 rounded-circle profile-photo-edit">
                                <input id="profile-img-file-input" type="file" className="profile-img-file-input" name="image" onChange={handleChange} />
                                <label htmlFor="profile-img-file-input" className="profile-photo-edit avatar-xs">
                                  <span className="avatar-title rounded-circle bg-light text-body material-shadow">
                                    <i className="ri-camera-fill"></i>
                                  </span>
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Name</label>
                            <input type="text" className={`form-control ${errors.first_name ? 'is-invalid' : ''}`} name="first_name" value={employee.first_name} onChange={handleChange} placeholder="Enter full name" />
                            {errors.first_name && <div className="invalid-feedback">{errors.first_name}</div>}
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Employee Code</label>
                            <input type="text" className="form-control" name="employee_code" value={employee.employee_code} onChange={handleChange} placeholder="Enter code" />
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Position</label>
                            <input type="text" className={`form-control ${errors.designation ? 'is-invalid' : ''}`} name="designation" value={employee.designation} onChange={handleChange} placeholder="Enter position" />
                            {errors.designation && <div className="invalid-feedback">{errors.designation}</div>}
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label d-flex justify-content-between align-items-center">
                              Department
                              <button type="button" className="btn btn-sm btn-link p-0" onClick={() => setShowDepartmentModal(true)}>
                                <i className="ri-add-circle-line"></i> Add New
                              </button>
                            </label>
                            <Dropdown
                              value={employee.department}
                              options={departments}
                              onChange={(e) => handleChange({ target: { name: 'department', value: e.value } })}
                              optionLabel="name"
                              optionValue="name"
                              placeholder="Select Department"
                              filter
                              className={`w-100 ${errors.department ? 'p-invalid' : ''}`}
                            />
                            {errors.department && <div className="invalid-feedback d-block">{errors.department}</div>}
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Phone Number</label>
                            <div className="input-group">
                              <select
                                className="form-select"
                                style={{ maxWidth: '140px' }}
                                value={phonePrefix.phone_number_1}
                                onChange={(e) => setPhonePrefix(prev => ({ ...prev, phone_number_1: e.target.value }))}
                              >
                                {countryCodeOptions.map(option => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>

                              <input
                                type="text"
                                className={`form-control ${errors.phone_number_1 ? 'is-invalid' : ''}`}
                                name="phone_number_1"
                                value={employee.phone_number_1}
                                onChange={handleChange}
                                placeholder="Enter phone number"
                              />
                              {errors.phone_number_1 && <div className="invalid-feedback">{errors.phone_number_1}</div>}
                            </div>
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Alternate Mobile</label>
                            <div className="input-group">
                              <select
                                className="form-select"
                                style={{ maxWidth: '140px' }}
                                value={phonePrefix.phone_number_2}
                                onChange={(e) => setPhonePrefix(prev => ({ ...prev, phone_number_2: e.target.value }))}
                              >
                                {countryCodeOptions.map(option => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>

                              <input
                                type="text"
                                className="form-control"
                                name="phone_number_2"
                                value={employee.phone_number_2}
                                onChange={handleChange}
                                placeholder="Enter mobile number"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Email</label>
                            <input type="email" className={`form-control ${errors.email ? 'is-invalid' : ''}`} name="email" value={employee.email} onChange={handleChange} placeholder="Enter email" />
                            {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Joining Date</label>
                            <Flatpickr
                              options={{ dateFormat: "d M, Y" }}
                              value={employee.joining_date ? new Date(employee.joining_date) : null}
                              onChange={(dates) => {
                                const date = dates[0];
                                const dateString = date
                                  ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                  : "";
                                handleChange({ target: { name: "joining_date", value: dateString } });
                              }}
                              className="form-control"
                              placeholder="Select date"
                              readOnly
                            />
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Country</label>
                            <Dropdown
                              value={employee.country}
                              options={countries}
                              onChange={(e) => handleChange({ target: { name: 'country', value: e.value } })}
                              optionLabel="label"
                              placeholder="Select Country"
                              filter
                              className={`w-100 ${errors.country ? 'p-invalid' : ''}`}
                            />
                            {errors.country && <div className="invalid-feedback d-block">{errors.country}</div>}
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">State</label>
                            <Dropdown
                              value={employee.state}
                              options={states}
                              onChange={(e) => handleChange({ target: { name: 'state', value: e.value } })}
                              optionLabel="label"
                              placeholder="Select State"
                              filter
                              className={`w-100 ${errors.state ? 'p-invalid' : ''}`}
                              disabled={!employee.country}
                            />
                            {errors.state && <div className="invalid-feedback d-block">{errors.state}</div>}
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">City</label>
                            <Dropdown
                              value={employee.city}
                              options={cities}
                              onChange={(e) => handleChange({ target: { name: 'city', value: e.value } })}
                              optionLabel="label"
                              placeholder="Select City"
                              filter
                              className={`w-100 ${errors.city ? 'p-invalid' : ''}`}
                              disabled={!employee.state}
                            />
                            {errors.city && <div className="invalid-feedback d-block">{errors.city}</div>}
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Zip Code</label>
                            <input type="text" className="form-control" name="postal_code" value={employee.postal_code} onChange={handleChange} placeholder="Enter zip code" />
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Identification No</label>
                            <input type="text" className="form-control" name="identification_number" value={employee.identification_number} onChange={handleChange} placeholder="Enter identification number" />
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">SSN No</label>
                            <input type="text" className="form-control" name="ssn" value={employee.ssn} onChange={handleChange} placeholder="Enter SSN" />
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Passport No</label>
                            <input type="text" className="form-control" name="passport_number" value={employee.passport_number} onChange={handleChange} placeholder="Enter passport number" />
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Gender</label>
                            <select className="form-select" name="gender" value={employee.gender} onChange={handleChange}>
                              <option value="">Select</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Blood Group</label>
                            <Dropdown
                              value={employee.blood_group}
                              options={bloodGroups}
                              onChange={(e) => handleChange({ target: { name: 'blood_group', value: e.value } })}
                              placeholder="Select Blood Group"
                              className="w-100"
                              filter
                            />
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Date of Birth</label>
                            <Flatpickr
                              options={{ dateFormat: "d M, Y" }}
                              value={employee.date_of_birth ? new Date(employee.date_of_birth) : null}
                              onChange={(dates) => {
                                const date = dates[0];
                                const dateString = date
                                  ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
                                  : "";
                                handleChange({ target: { name: "date_of_birth", value: dateString } });
                              }}
                              className="form-control"
                              placeholder="Select date"
                              readOnly
                            />
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Place of Birth</label>
                            <input type="text" className="form-control" name="place_of_birth" value={employee.place_of_birth} onChange={handleChange} placeholder="Enter place of birth" />
                          </div>
                        </div>
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Address</label>
                            <input type="text" className="form-control" name="address" value={employee.address} onChange={handleChange} placeholder="Enter address" />
                          </div>
                        </div>

                        {/* ===== Create Account Checkbox (Works for both Create & Edit) ===== */}
                        <div className="col-lg-6">
                          <div className="mb-3 pt-3">
                            <div className="form-check">
                              <input
                                id="createAccountCheckbox"
                                type="checkbox"
                                className="form-check-input"
                                name="create_account"
                                checked={id ? !!employee.user : employee.create_account}
                                onChange={(e) => {
                                  const checked = e.target.checked;

                                  if (!id) {
                                    // For new employees, toggle create_account state
                                    setEmployee((prev) => ({
                                      ...prev,
                                      create_account: checked,
                                      role_id: checked ? prev.role_id : "" // Clear role if unchecked
                                    }));
                                  } else {
                                    // For existing employees, toggle user object
                                    setEmployee((prev) => ({
                                      ...prev,
                                      user: checked ? (prev.user || {}) : null,
                                      role_id: checked ? prev.role_id : "" // Clear role if unchecked
                                    }));
                                  }
                                }}
                              />
                              <label className="form-check-label" htmlFor="createAccountCheckbox">
                                Create account
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* ===== Role Dropdown Logic ===== */}
                        <div className="col-lg-6">
                          {((id && employee.user) || (!id && employee.create_account)) && (
                            <div className="mb-3 pt-3">
                              <label htmlFor="roleSelect" className="form-label">Assign role</label>
                              <select
                                name="role_id"
                                value={employee.role_id ?? ""}
                                className="form-control"
                                onChange={handleChange}
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
                            <select className="form-select" name="job_status" value={employee.job_status} onChange={handleChange}>
                              <option value="">Select</option>
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                            </select>
                          </div>
                        </div>



                        <div className="col-lg-12 mt-3">
                          <h5 className="border-bottom pb-2">Emergency Contact</h5>
                          <div className="row">
                            <div className="col-lg-6">
                              <div className="mb-3">
                                <label className="form-label">Name</label>
                                <input type="text" className="form-control" name="emergency_contact" value={employee.emergency_contact} onChange={handleChange} placeholder="Enter emergency contact name" />
                              </div>
                            </div>
                            <div className="col-lg-6">
                              <div className="mb-3">
                                <label className="form-label">Phone</label>
                                <input type="text" className="form-control" name="emergency_phone" value={employee.emergency_phone} onChange={handleChange} placeholder="Enter emergency phone number" />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="col-lg-12 mt-3">
                          <h5 className="border-bottom pb-2">Family Status</h5>
                          <div className="row">
                            <div className="col-lg-6">
                              <div className="mb-3">
                                <label className="form-label">Marital Status</label>
                                <select className="form-select" name="marital_status" value={employee.marital_status} onChange={handleChange}>
                                  <option value="">Select</option>
                                  <option value="single">Single</option>
                                  <option value="married">Married</option>
                                  <option value="divorced">Divorced</option>
                                  <option value="widowed">Widowed</option>
                                </select>
                              </div>
                            </div>
                            <div className="col-lg-6">
                              <div className="mb-3">
                                <label className="form-label">Number of Children</label>
                                <input type="number" className="form-control" name="no_of_children" value={employee.no_of_children} onChange={handleChange} min="0" placeholder="Enter number of children" />
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xxl-4">
            <div className="card">
              <div className="card-header px-2 py-2">
                <h4 className="card-title mb-0"><i className="ri-history-line me-2"></i>Activity</h4>
              </div>
              <div className="card-body">
                <p className="text-muted">Activity Logs Here...</p>
              </div>
            </div>
          </div>
        </div>

        <Dialog header="Add New Department" visible={showDepartmentModal} style={{ width: '30vw' }} onHide={() => setShowDepartmentModal(false)}>
          <div className="p-fluid">
            <div className="field">
              <label htmlFor="deptName">Department Name</label>
              <InputText id="deptName" value={newDepartmentName} onChange={(e) => setNewDepartmentName(e.target.value)} autoFocus />
            </div>
            <div className="d-flex justify-content-end mt-3 gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setShowDepartmentModal(false)}>
                <i className="ri-close-line me-1 align-bottom"></i> Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveDepartment}>
                <i className="ri-save-3-fill me-1 align-bottom"></i> Submit
              </button>
            </div>
          </div>
        </Dialog>
      </div >
    </div >
  );
}
