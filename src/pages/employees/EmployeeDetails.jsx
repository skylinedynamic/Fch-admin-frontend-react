import React from 'react'

export default function EmployeeDetails() {
  return (
    <div className="page-content">
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
                <a href="employees.html" className="btn btn-outline-secondary w-lg waves-effect">
                  <i className="ri-arrow-left-line align-middle me-1"></i> Back
                </a>
                <button type="submit" className="btn btn-primary w-lg waves-effect">
                  <i className="ri-save-3-line align-middle me-1"></i> Save
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
                  <li className="nav-item" role="presentation">
                    <a className="nav-link" data-bs-toggle="tab" href="#changePassword" role="tab" aria-selected="false" tabIndex={-1}>
                      <i className="far fa-user"></i> Change Password
                    </a>
                  </li>
                  <li className="nav-item" role="presentation">
                    <a className="nav-link" data-bs-toggle="tab" href="#privacy" role="tab" aria-selected="false" tabIndex={-1}>
                      <i className="far fa-envelope"></i> Settings
                    </a>
                  </li>
                </ul>
              </div>
              <div className="card-body p-4">
                <div className="tab-content">
                  <div className="tab-pane active show" id="personalDetails" role="tabpanel">
                    <form action="javascript:void(0);">
                      <div className="row">
                        <div className="col-lg-12">
                          <div className="card">
                            <div className="profile-user position-relative d-inline-block mx-auto  mb-4">
                              <img src="assets/images/users/avatar-1.jpg" className="rounded-circle avatar-xl img-thumbnail user-profile-image material-shadow" alt="user-profile" />
                              <div className="avatar-xs p-0 rounded-circle profile-photo-edit">
                                <input id="profile-img-file-input" type="file" className="profile-img-file-input" />
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
                            <label htmlFor="fullNameInput" className="form-label">Name</label>
                            <input type="text" className="form-control" id="fullNameInput" placeholder="Enter full name" defaultValue="Anna Adame" />
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label htmlFor="deptInput" className="form-label">Department</label>
                            <input type="text" className="form-control" id="deptInput" placeholder="Enter department" defaultValue="Sales" />
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label htmlFor="positionInput" className="form-label">Position</label>
                            <input type="text" className="form-control" id="positionInput" placeholder="Enter position" defaultValue="Sales Manager" />
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label htmlFor="jobStatusInput" className="form-label">Job Status</label>
                            <input type="text" className="form-control" id="jobStatusInput" placeholder="Enter job status" defaultValue="Full Time" />
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label htmlFor="workPhoneInput" className="form-label">Work Phone</label>
                            <input type="text" className="form-control" id="workPhoneInput" placeholder="Enter phone number" defaultValue="+(1) 987 6543" />
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label htmlFor="workMobileInput" className="form-label">Work Mobile</label>
                            <input type="text" className="form-control" id="workMobileInput" placeholder="Enter mobile number" defaultValue="+(1) 987 6543" />
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label htmlFor="workEmailInput" className="form-label">Work Email</label>
                            <input type="email" className="form-control" id="workEmailInput" placeholder="Enter email address" defaultValue="daveadame@proop.com" />
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label htmlFor="companyInput" className="form-label">Company</label>
                            <input type="text" className="form-control" id="companyInput" placeholder="Enter company name" defaultValue="Proop" />
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label htmlFor="managerSelect" className="form-label">Manger</label>
                            <select className="form-select mb-3" aria-label="Default select example" id="managerSelect">
                              <option defaultValue="">Select Manger </option>
                              <option value="1">David Run</option>
                              <option value="2">Craig Rice</option>
                              <option value="3">Washinto Sondor</option>
                            </select>
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label htmlFor="joiningDateInput" className="form-label">Joining Date</label>
                            <input type="text" className="form-control flatpickr-input" data-provider="flatpickr" id="joiningDateInput" data-date-format="d M, Y" placeholder="Select date" defaultValue="24 Nov 2021" readOnly />
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label htmlFor="nationalityInput" className="form-label">Country</label>
                            <select className="form-select" id="nationalityInput" name="nationality" data-choices>
                              <option value="">Select country</option>
                              <option value="United States">United States</option>
                              <option value="Canada">Canada</option>
                              <option value="United Kingdom">United Kingdom</option>
                              <option value="Australia">Australia</option>
                              <option value="India">India</option>
                            </select>
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label htmlFor="stateInput" className="form-label">State</label>
                            <input type="text" className="form-control" id="stateInput" name="state" placeholder="Enter state" />
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label htmlFor="zipCodeInput" className="form-label">Zip Code</label>
                            <input type="text" className="form-control" id="zipCodeInput" placeholder="Enter zip code" />
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label htmlFor="identificationInput" className="form-label">Identification No</label>
                            <input type="text" className="form-control" id="identificationInput" placeholder="Enter Identification No" />
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label htmlFor="ssnInput" className="form-label">SSN No</label>
                            <input type="text" className="form-control" id="ssnInput" placeholder="Enter SSN No" />
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label htmlFor="passportInput" className="form-label">Passport No</label>
                            <input type="text" className="form-control" id="passportInput" placeholder="Enter Passport No" />
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label htmlFor="genderInput" className="form-label">Gender</label>
                            <select className="form-select" id="genderInput" name="gender" data-choices>
                              <option value="">Select gender</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label htmlFor="bloodGroupInput" className="form-label">Blood Group</label>
                            <input type="text" className="form-control" id="bloodGroupInput" placeholder="Enter Blood Group" />
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label htmlFor="dobInput" className="form-label">Date of Birth</label>
                            <input type="text" className="form-control flatpickr-input" data-provider="flatpickr" id="dobInput" data-date-format="d M, Y" placeholder="Select date" defaultValue="24 Nov 2021" readOnly />
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3">
                            <label htmlFor="birthPlaceInput" className="form-label">Place of Birth</label>
                            <input type="text" className="form-control" id="birthPlaceInput" placeholder="Enter Place of Birth" />
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3 pt-3">
                            <div className="form-check">
                              <input className="form-check-input" type="checkbox" id="createAccountCheckbox" />
                              <label className="form-check-label" htmlFor="createAccountCheckbox">Create account</label>
                            </div>
                          </div>
                        </div>

                        <div className="col-lg-6">
                          <div className="mb-3 d-none" id="roleSelectContainer">
                            <label htmlFor="roleSelect" className="form-label">Assign role</label>
                            <select className="form-select" id="roleSelect" name="role" data-choices>
                              <option value="">Select role</option>
                              <option value="Admin">Admin</option>
                              <option value="Manager">Manager</option>
                              <option value="Staff">Staff</option>
                            </select>
                          </div>
                        </div>

                        <div className="col-lg-12">
                          <div className="mb-3 mt-3">
                            <h5 className="border-bottom pb-2 mb-3">Emergency Contact</h5>
                            <div className="row g-4">
                              <div className="col-lg-6">
                                <div className="mb-3">
                                  <label htmlFor="emergencyNameInput" className="form-label">Name</label>
                                  <input type="text" className="form-control" id="emergencyNameInput" placeholder="Enter name" />
                                </div>
                              </div>
                              <div className="col-lg-6">
                                <div className="mb-3">
                                  <label htmlFor="emergencyPhoneInput" className="form-label">Phone</label>
                                  <input type="text" className="form-control" id="emergencyPhoneInput" placeholder="Enter phone number" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="col-lg-12">
                          <div className="mb-3 mt-3">
                            <h5 className="border-bottom pb-2 mb-3">Family Status</h5>
                            <div className="row g-4">
                              <div className="col-lg-6">
                                <div className="mb-3">
                                  <label htmlFor="maritalStatusInput" className="form-label">Marital Status</label>
                                  <select className="form-select" id="maritalStatusInput" name="maritalStatus" data-choices>
                                    <option value="">Select marital status</option>
                                    <option value="single">Single</option>
                                    <option value="married">Married</option>
                                    <option value="divorced">Divorced</option>
                                    <option value="widowed">Widowed</option>
                                  </select>
                                </div>
                              </div>
                              <div className="col-lg-6">
                                <div className="mb-3">
                                  <label htmlFor="numberOfChildrenInput" className="form-label">Number of Children</label>
                                  <input type="text" className="form-control" id="numberOfChildrenInput" placeholder="Enter number of children" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>

                  <div className="tab-pane" id="changePassword" role="tabpanel">
                    <form action="javascript:void(0);">
                      <div className="row g-2">
                        <div className="col-lg-4">
                          <div>
                            <label htmlFor="oldpasswordInput" className="form-label">Old Password*</label>
                            <input type="password" className="form-control" id="oldpasswordInput" placeholder="Enter current password" />
                          </div>
                        </div>
                        <div className="col-lg-4">
                          <div>
                            <label htmlFor="newpasswordInput" className="form-label">New Password*</label>
                            <input type="password" className="form-control" id="newpasswordInput" placeholder="Enter new password" />
                          </div>
                        </div>
                        <div className="col-lg-4">
                          <div>
                            <label htmlFor="confirmpasswordInput" className="form-label">Confirm Password*</label>
                            <input type="password" className="form-control" id="confirmpasswordInput" placeholder="Confirm password" />
                          </div>
                        </div>
                      </div>
                    </form>
                  </div>

                  <div className="tab-pane" id="privacy" role="tabpanel">
                    <div className="mb-4 pb-2">
                      <div className="d-flex flex-column flex-sm-row mb-4 mb-sm-0">
                        <div className="flex-grow-1">
                          <h6 className="fs-14 mb-1">Two-factor Authentication</h6>
                          <p className="text-muted">Two-factor authentication is an enhanced security meansur. Once enabled, you'll be required to give two types of identification when you log into Google Authentication and SMS are Supported.</p>
                        </div>
                        <div className="flex-shrink-0 ms-sm-3">
                          <a href="javascript:void(0);" className="btn btn-sm btn-primary">Enable Two-facor Authentication</a>
                        </div>
                      </div>
                    </div>
                    <div className="mb-3">
                      <ul className="list-unstyled mb-0">
                        <li className="d-flex">
                          <div className="flex-grow-1">
                            <label htmlFor="directMessage" className="form-check-label fs-14">Direct messages</label>
                            <p className="text-muted">Messages from people you follow</p>
                          </div>
                          <div className="flex-shrink-0">
                            <div className="form-check form-switch">
                              <input className="form-check-input" type="checkbox" role="switch" id="directMessage" defaultChecked />
                            </div>
                          </div>
                        </li>
                        <li className="d-flex mt-2">
                          <div className="flex-grow-1">
                            <label className="form-check-label fs-14" htmlFor="desktopNotification">Show desktop notifications</label>
                            <p className="text-muted">Choose the option you want as your default setting. Block a site: Next to "Not allowed to send notifications," click Add.</p>
                          </div>
                          <div className="flex-shrink-0">
                            <div className="form-check form-switch">
                              <input className="form-check-input" type="checkbox" role="switch" id="desktopNotification" defaultChecked />
                            </div>
                          </div>
                        </li>
                        <li className="d-flex mt-2">
                          <div className="flex-grow-1">
                            <label className="form-check-label fs-14" htmlFor="emailNotification">Show email notifications</label>
                            <p className="text-muted"> Under Settings, choose Notifications. Under Select an account, choose the account to enable notifications for. </p>
                          </div>
                          <div className="flex-shrink-0">
                            <div className="form-check form-switch">
                              <input className="form-check-input" type="checkbox" role="switch" id="emailNotification" />
                            </div>
                          </div>
                        </li>
                        <li className="d-flex mt-2">
                          <div className="flex-grow-1">
                            <label className="form-check-label fs-14" htmlFor="chatNotification">Show chat notifications</label>
                            <p className="text-muted">To prevent duplicate mobile notifications from the Gmail and Chat apps, in settings, turn off Chat notifications.</p>
                          </div>
                          <div className="flex-shrink-0">
                            <div className="form-check form-switch">
                              <input className="form-check-input" type="checkbox" role="switch" id="chatNotification" />
                            </div>
                          </div>
                        </li>
                        <li className="d-flex mt-2">
                          <div className="flex-grow-1">
                            <label className="form-check-label fs-14" htmlFor="purchaesNotification">Show purchase notifications</label>
                            <p className="text-muted">Get real-time purchase alerts to protect yourself from fraudulent charges.</p>
                          </div>
                          <div className="flex-shrink-0">
                            <div className="form-check form-switch">
                              <input className="form-check-input" type="checkbox" role="switch" id="purchaesNotification" />
                            </div>
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xxl-4">
            <div className="card">
              <div className="card-header px-2 py-2 align-items-center justify-content-between d-flex">
                <h4 style={{ padding: '8px 0px' }} className="card-title mb-0 me-2"><i className="ri-history-line align-middle me-2"></i>Activity</h4>
                <div className="d-flex flex-wrap gap-2 chip-actions">
                  <button type="button" className="btn btn-light btn-sm" data-bs-toggle="modal" data-bs-target="#emailComposeModal"><i className="ri-mail-line align-middle me-1"></i>New Email</button>
                  <button type="button" className="btn btn-light btn-sm" data-bs-toggle="modal" data-bs-target="#activityCreateModal"><i className="ri-calendar-line align-middle me-1"></i>New Event</button>
                </div>
              </div>
              <div className="card-body">
                <div className="tab-content text-muted">
                  <div className="tab-pane active show" id="today" role="tabpanel">
                    <div className="profile-timeline">
                      <div className="accordion accordion-flush" id="todayExample">
                        <div className="accordion-item border-0">
                          <div className="accordion-header" id="headingOne">
                            <a className="accordion-button p-2 shadow-none" data-bs-toggle="collapse" href="#collapseOne" aria-expanded="true">
                              <div className="d-flex">
                                <div className="flex-shrink-0">
                                  <img src="assets/images/users/avatar-2.jpg" alt="" className="avatar-xs rounded-circle material-shadow" />
                                </div>
                                <div className="flex-grow-1 ms-3">
                                  <h6 className="fs-14 mb-1">Jacqueline Steve</h6>
                                  <small className="text-muted">Lead status updated: moved to “Proposal” — 05:16 PM</small>
                                </div>
                              </div>
                            </a>
                          </div>
                          <div id="collapseOne" className="accordion-collapse collapse show" aria-labelledby="headingOne" data-bs-parent="#accordionExample">
                            <div className="accordion-body ms-2 ps-5">
                              <p className="text-muted mb-0">Lead update: changed stage from “Qualified” to “Proposal”. Next: follow-up call scheduled.</p>
                            </div>
                          </div>
                        </div>
                        <div className="accordion-item border-0">
                          <div className="accordion-header" id="headingTwo">
                            <a className="accordion-button p-2 shadow-none" data-bs-toggle="collapse" href="#collapseTwo" aria-expanded="false">
                              <div className="d-flex">
                                <div className="flex-shrink-0 avatar-xs">
                                  <div className="avatar-title bg-light text-success rounded-circle material-shadow">M</div>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                  <h6 className="fs-14 mb-1">Megan Elmore</h6>
                                  <small className="text-muted">Adding a new event with attachments - 04:45PM</small>
                                </div>
                              </div>
                            </a>
                          </div>
                          <div id="collapseTwo" className="accordion-collapse collapse show" aria-labelledby="headingTwo" data-bs-parent="#accordionExample">
                            <div className="accordion-body ms-2 ps-5">
                              <div className="row g-2">
                                <div className="col-auto">
                                  <div className="d-flex border border-dashed p-2 rounded position-relative">
                                    <div className="flex-shrink-0"><i className="ri-image-2-line fs-17 text-danger"></i></div>
                                    <div className="flex-grow-1 ms-2">
                                      <h6><a href="javascript:void(0);" className="stretched-link">Business Template - UI/UX design</a></h6>
                                      <small>685 KB</small>
                                    </div>
                                  </div>
                                </div>
                                <div className="col-auto">
                                  <div className="d-flex border border-dashed p-2 rounded position-relative">
                                    <div className="flex-shrink-0"><i className="ri-file-zip-line fs-17 text-info"></i></div>
                                    <div className="flex-grow-1 ms-2">
                                      <h6 className="mb-0"><a href="javascript:void(0);" className="stretched-link">Bank Management System - PSD</a></h6>
                                      <small>8.78 MB</small>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="accordion-item border-0">
                          <div className="accordion-header" id="headingEmail">
                            <a className="accordion-button p-2 shadow-none" data-bs-toggle="collapse" href="#collapseEmail" aria-expanded="false">
                              <div className="d-flex">
                                <div className="flex-shrink-0 avatar-xs">
                                  <div className="avatar-title bg-light text-primary rounded-circle material-shadow"><i className="ri-mail-send-line"></i></div>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                  <h6 className="fs-14 mb-1"> Email Sent </h6>
                                  <small className="text-muted">To: in@mail.com • Subject: Proposal Update • 04:50PM</small>
                                </div>
                              </div>
                            </a>
                          </div>
                          <div id="collapseEmail" className="accordion-collapse collapse" aria-labelledby="headingEmail" data-bs-parent="#accordionExample">
                            <div className="accordion-body ms-2 ps-5">
                              <p className="text-muted mb-2">Message preview: “Hi team, please find the updated proposal attached. Let me know your thoughts.”</p>
                            </div>
                          </div>
                        </div>

                        <div className="accordion-item border-0">
                          <div className="accordion-header" id="headingEvent">
                            <a className="accordion-button p-2 shadow-none" data-bs-toggle="collapse" href="#collapseEvent" aria-expanded="false">
                              <div className="d-flex">
                                <div className="flex-shrink-0 avatar-xs">
                                  <div className="avatar-title bg-light text-info rounded-circle material-shadow"><i className="ri-calendar-event-line"></i></div>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                  <h6 className="fs-14 mb-1"> Event Created </h6>
                                  <small className="text-muted">Demo with client • Tomorrow, 11:00 AM</small>
                                </div>
                              </div>
                            </a>
                          </div>
                          <div id="collapseEvent" className="accordion-collapse collapse" aria-labelledby="headingEvent" data-bs-parent="#accordionExample">
                            <div className="accordion-body ms-2 ps-5">
                              <div className="row g-2">
                                <div className="col-auto">
                                  <div className="d-flex border border-dashed p-2 rounded position-relative">
                                    <div className="flex-shrink-0"><i className="ri-image-2-line fs-17 text-danger"></i></div>
                                    <div className="flex-grow-1 ms-2">
                                      <h6><a href="javascript:void(0);" className="stretched-link">Business Template - UI/UX design</a></h6>
                                      <small>685 KB</small>
                                    </div>
                                  </div>
                                </div>
                                <div className="col-auto">
                                  <div className="d-flex border border-dashed p-2 rounded position-relative">
                                    <div className="flex-shrink-0"><i className="ri-file-zip-line fs-17 text-info"></i></div>
                                    <div className="flex-grow-1 ms-2">
                                      <h6 className="mb-0"><a href="javascript:void(0);" className="stretched-link">Bank Management System - PSD</a></h6>
                                      <small>8.78 MB</small>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Email Compose Modal */}
        <div className="modal fade" id="emailComposeModal" tabIndex={-1} aria-labelledby="emailComposeLabel" aria-hidden="true">
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content border-0">
              <div className="modal-header bg-primary">
                <h5 className="modal-title text-white d-flex align-items-center gap-2" id="emailComposeLabel"><i className="ri-mail-send-line fs-18"></i> New Email</h5>
                <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div className="modal-body p-4">
                <form>
                  <div className="mb-3">
                    <label className="form-label">To</label>
                    <select id="emailTo" className="form-select" data-choices data-choices-removeitems="true" multiple>
                      <option value="in@mail.com" defaultValue>in@mail.com</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Subject <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" placeholder="Subject" required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Message</label>
                    <textarea id="emailMessageEditor" className="form-control" rows={8}></textarea>
                  </div>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Select Attachments</label>
                      <div className="d-flex align-items-center gap-2">
                        <button type="button" id="emailAttachmentBtn" className="btn btn-light btn-sm">+ Add Attachment</button>
                        <input type="file" id="emailAttachmentInput" className="d-none" multiple />
                      </div>
                      <div id="emailAttachmentList" className="mt-2"></div>
                    </div>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-soft-secondary" data-bs-dismiss="modal"><i className="ri-close-line align-middle me-1"></i> Discard</button>
                <button type="button" className="btn btn-primary"><i className="ri-send-plane-line align-middle me-1"></i> Send</button>
              </div>
            </div>
          </div>
        </div>

        {/* New Activity Modal */}
        <div className="modal fade" id="activityCreateModal" tabIndex={-1} aria-labelledby="activityCreateLabel" aria-hidden="true">
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content border-0">
              <div className="modal-header p-3 ps-4 bg-primary">
                <h5 className="modal-title text-white" id="activityCreateLabel"><i className="ri-calendar-event-line align-middle me-2"></i>New Activity</h5>
                <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div className="modal-body p-4">
                <form>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Reference <span className="text-danger">*</span></label>
                      <select className="form-select" id="activityReference" required>
                        <option value="Event" defaultValue>Event</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Date <span className="text-danger">*</span></label>
                      <input type="datetime-local" className="form-control" id="activityDate" required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Category</label>
                      <select className="form-select" id="activityCategory">
                        <option value="Event" defaultValue>Event</option>
                        <option value="Meeting">Meeting</option>
                        <option value="Call">Call</option>
                        <option value="Sent/Received Email">Sent/Received Email</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Assigned To</label>
                      <input type="text" className="form-control" id="activityAssignedTo" placeholder="Assignee" />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Summary <span className="text-danger">*</span></label>
                      <input type="text" className="form-control" id="activitySummary" required />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Message</label>
                      <textarea id="activityMessageEditor" className="form-control" rows={10}></textarea>
                    </div>
                  </div>
                  <div className="row mt-3">
                    <div className="col-md-6">
                      <label className="form-label">Select Attachments</label>
                      <div className="d-flex align-items-center gap-2">
                        <button type="button" id="activityAttachmentBtn" className="btn btn-light btn-sm">+ Add Attachment</button>
                        <input type="file" id="activityAttachmentInput" className="d-none" multiple />
                      </div>
                      <div id="activityAttachmentList" className="mt-2"></div>
                    </div>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light" data-bs-dismiss="modal">Cancel</button>
                <button type="button" className="btn btn-primary"><i className="ri-check-line align-middle me-1"></i> Create</button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}