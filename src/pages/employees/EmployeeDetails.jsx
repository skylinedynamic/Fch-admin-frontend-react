import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  createEmployee,
  updateEmployee,
  fetchEmployeeById,
} from "../../modules/employee";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function EmployeeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState({
    first_name: "",
    phone_number_1: "",
    phone_number_2: "",
    email: "",
    department: "",
    designation: "",
    job_status: "",
    address: "",
    company: "",
    assign_to: "",
    joining_date: "",
    country: "",
    state: "",
    zip_code: "",
    identification_no: "",
    ssn_no: "",
    passport_no: "",
    gender: "",
    blood_group: "",
    dob: "",
    birth_place: "",
    marital_status: "",
    number_of_children: "",
    emergency_contact: "",
    emergency_phone: "",
    employee_code: "",
    create_account: false,
    role_id: "",
  });

  useEffect(() => {
    if (id) {
      fetchEmployeeById(id)
        .then((data) => setEmployee((prev) => ({ ...prev, ...data })))
        .catch((err) => console.error("Failed to fetch employee", err));
    }
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEmployee((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async () => {
    try {
      if (id) {
        await updateEmployee(id, employee);
        toast.success(`Employee Created successfully`);
      } else {
        await createEmployee(employee);
        alert("Employee created successfully");
      }
      navigate("/employees");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save employee")
    }
  };

  return (
    <div className="page-content">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="container-fluid">
        {/* Breadcrumb Section */}
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
                    <li
                      className="breadcrumb-item active"
                      aria-current="page"
                    >
                      Employee Details
                    </li>
                  </ol>
                </nav>
              </div>
              <div className="page-actions d-flex align-items-center gap-2 mt-0">
                <a
                  href="employees.html"
                  className="btn btn-outline-secondary w-lg waves-effect"
                >
                  <i className="ri-arrow-left-line align-middle me-1"></i> Back
                </a>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSave();
                  }}
                >
                  <button
                    type="submit"
                    className="btn btn-primary w-lg waves-effect"
                  >
                    <i className="ri-save-3-line align-middle me-1"></i>
                    Save
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Main Form Section */}
        <div className="row">
          <div className="col-xxl-8">
            <div className="card">
              <div className="card-header">
                <ul
                  className="nav nav-tabs-custom rounded card-header-tabs border-bottom-0"
                  role="tablist"
                >
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
                  <div
                    className="tab-pane active show"
                    id="personalDetails"
                    role="tabpanel"
                  >
                    <form onSubmit={(e) => e.preventDefault()}>
                      <div className="row">
                        {/* Profile Image */}
                        <div className="col-lg-12">
                          <div className="card">
                            <div className="profile-user position-relative d-inline-block mx-auto mb-4">
                              <img
                                src="assets/images/users/avatar-1.jpg"
                                className="rounded-circle avatar-xl img-thumbnail user-profile-image material-shadow"
                                alt="user-profile"
                              />

                              <div className="avatar-xs p-0 rounded-circle profile-photo-edit">
                                <input
                                  id="profile-img-file-input"
                                  type="file"
                                  className="profile-img-file-input"
                                  name="profile_image"
                                  onChange={handleChange}
                                />
                                <label
                                  htmlFor="profile-img-file-input"
                                  className="profile-photo-edit avatar-xs"
                                >
                                  <span className="avatar-title rounded-circle bg-light text-body material-shadow">
                                    <i className="ri-camera-fill"></i>
                                  </span>
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Name */}
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Name</label>
                            <input
                              type="text"
                              className="form-control"
                              name="first_name"
                              value={employee.first_name}
                              onChange={handleChange}
                              placeholder="Enter full name"
                            />
                          </div>
                        </div>

                        {/* Employee Code */}
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Employee Code</label>
                            <input
                              type="text"
                              className="form-control"
                              name="employee_code"
                              value={employee.employee_code}
                              onChange={handleChange}
                              placeholder="Enter code"
                            />
                          </div>
                        </div>

                        {/* Position / Designation */}
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Position</label>
                            <input
                              type="text"
                              className="form-control"
                              name="designation"
                              value={employee.designation}
                              onChange={handleChange}
                              placeholder="Enter position"
                            />
                          </div>
                        </div>

                        {/* Department */}
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Department</label>
                            <input
                              type="text"
                              className="form-control"
                              name="department"
                              value={employee.department}
                              onChange={handleChange}
                              placeholder="Enter department"
                            />
                          </div>
                        </div>

                        {/* Work Phone */}
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Work Phone</label>
                            <input
                              type="text"
                              className="form-control"
                              name="phone_number_1"
                              value={employee.phone_number_1}
                              onChange={handleChange}
                              placeholder="Enter phone number"
                            />
                          </div>
                        </div>

                        {/* Work Mobile */}
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Work Mobile</label>
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

                        {/* Work Email */}
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Work Email</label>
                            <input
                              type="email"
                              className="form-control"
                              name="email"
                              value={employee.email}
                              onChange={handleChange}
                              placeholder="Enter email"
                            />
                          </div>
                        </div>

                        {/* Company */}
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Company</label>
                            <input
                              type="text"
                              className="form-control"
                              name="company"
                              value={employee.company}
                              onChange={handleChange}
                              placeholder="Enter company name"
                            />
                          </div>
                        </div>

                        {/* Manager */}
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Assign To</label>
                            <select className="form-select"
                              name="assign_to"
                              value={employee.assign_to}
                              onChange={handleChange}>
                                  <option value="">Select User</option>
                                  <option value="13">Demo User 3</option>
                                  <option value="12">Demo User 2</option>
                                  <option value="9">David Thompson</option>
                              </select>
                          </div>
                        </div>

                        {/* Joining Date */}
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Joining Date</label>
                            <input
                              type="date"
                              className="form-control"
                              name="joining_date"
                              value={employee.joining_date}
                              onChange={handleChange}
                            />
                          </div>
                        </div>

                        {/* Country */}
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Country</label>
                            <select
                              className="form-select"
                              name="country"
                              value={employee.country}
                              onChange={handleChange}
                            >
                              <option value="">Select</option>
                              <option value="USA">United States</option>
                              <option value="Canada">Canada</option>
                              <option value="UK">United Kingdom</option>
                              <option value="Australia">Australia</option>
                              <option value="India">India</option>
                            </select>
                          </div>
                        </div>

                        {/* State */}
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">State</label>
                            <input
                              type="text"
                              className="form-control"
                              name="state"
                              value={employee.state}
                              onChange={handleChange}
                            />
                          </div>
                        </div>

                        {/* Zip Code */}
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Zip Code</label>
                            <input
                              type="text"
                              className="form-control"
                              name="zip_code"
                              value={employee.zip_code}
                              onChange={handleChange}
                            />
                          </div>
                        </div>

                        {/* ID No */}
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">
                              Identification No
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              name="identification_no"
                              value={employee.identification_no}
                              onChange={handleChange}
                            />
                          </div>
                        </div>

                        {/* SSN */}
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">SSN No</label>
                            <input
                              type="text"
                              className="form-control"
                              name="ssn_no"
                              value={employee.ssn_no}
                              onChange={handleChange}
                            />
                          </div>
                        </div>

                        {/* Passport */}
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Passport No</label>
                            <input
                              type="text"
                              className="form-control"
                              name="passport_no"
                              value={employee.passport_no}
                              onChange={handleChange}
                            />
                          </div>
                        </div>

                        {/* Gender */}
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Gender</label>
                            <select
                              className="form-select"
                              name="gender"
                              value={employee.gender}
                              onChange={handleChange}
                            >
                              <option value="">Select</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                        </div>

                        {/* Blood Group */}
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Blood Group</label>
                            <input
                              type="text"
                              className="form-control"
                              name="blood_group"
                              value={employee.blood_group}
                              onChange={handleChange}
                              placeholder="Enter Blood Group"
                            />
                          </div>
                        </div>

                        {/* DOB */}
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Date of Birth</label>
                            <input
                              type="date"
                              className="form-control"
                              name="dob"
                              value={employee.dob}
                              onChange={handleChange}
                            />
                          </div>
                        </div>

                        {/* Birth Place */}
                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">
                              Place of Birth
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              name="birth_place"
                              value={employee.birth_place}
                              onChange={handleChange}
                            />
                          </div>
                        </div>

                        {/* Create Account */}
                        <div className="col-lg-6">
                          <div className="form-check mt-4">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              name="create_account"
                              checked={employee.create_account}
                              onChange={handleChange}
                            />
                            <label className="form-check-label">
                              Create account
                            </label>
                          </div>
                        </div>
                        <div className="col-lg-6">
                          {employee.create_account && (
                            <div className="mb-3">
                               <label htmlFor="roleSelect"  className="form-label">Assign role</label>
                                <select name="role_id"
                              value={employee.role_id}
                              onChange={handleChange}>
                                  <option value="">Select role</option>
                                  <option value="4">Admin</option>
                                  <option value="5">Manager</option>
                                  <option value="6">Staff</option>
                                </select>
                            </div>
                          )}
                        </div>

                        {/* Job Status */}
                        

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label">Job Status</label>
                            <select
                              className="form-select"
                              name="job_status"
                              value={employee.job_status}
                              onChange={handleChange}
                            >
                              <option value="">Select</option>
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                            </select>
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label className="form-label"> Address </label>
                            <input
                              type="text"
                              className="form-control"
                              name="address"
                              checked={employee.address}
                              onChange={handleChange}
                            />
                          </div>
                        </div>


                        

                        {/* Emergency Contact */}
                        <div className="col-lg-12 mt-3">
                          <h5 className="border-bottom pb-2">Emergency Contact</h5>
                          <div className="row">
                            <div className="col-lg-6">
                              <div className="mb-3">
                                <label className="form-label">Name</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  name="emergency_contact"
                                  value={employee.emergency_contact}
                                  onChange={handleChange}
                                />
                              </div>
                            </div>

                            <div className="col-lg-6">
                              <div className="mb-3">
                                <label className="form-label">Phone</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  name="emergency_phone"
                                  value={employee.emergency_phone}
                                  onChange={handleChange}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Family Status */}
                        <div className="col-lg-12 mt-3">
                          <h5 className="border-bottom pb-2">Family Status</h5>
                          <div className="row">
                            <div className="col-lg-6">
                              <div className="mb-3">
                                <label className="form-label">
                                  Marital Status
                                </label>
                                <select
                                  className="form-select"
                                  name="marital_status"
                                  value={employee.marital_status}
                                  onChange={handleChange}
                                >
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
                                <label className="form-label">
                                  Number of Children
                                </label>
                                <input
                                  type="number"
                                  className="form-control"
                                  name="number_of_children"
                                  value={employee.number_of_children}
                                  onChange={handleChange}
                                  min="0"
                                />
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

          {/* Activity Sidebar */}
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
      </div>
    </div>
  );
}
