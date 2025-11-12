import React from 'react'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  return (
    <>
    <div className="page-content">
      <div className="container-fluid">
        {/* Welcome header */}
        <div className="row mb-3 pb-1">
          <div className="col-12">
            <div className="d-flex align-items-lg-center flex-lg-row flex-column">
              <div className="flex-grow-1">
                <h4 className="fs-16 mb-1">Welcome, Craig!</h4>
                <p className="text-muted mb-0">Here's what's happening with your business.</p>
              </div>
              <div className="mt-3 mt-lg-0">
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className="row g-3 mb-0 align-items-center">
                    {/* Intentionally left blank to mirror template spacing */}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="row">
          <div className="col-xl-3 col-md-6">
            <div className="card card-animate">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1 overflow-hidden">
                    <p className="text-uppercase fw-medium text-muted text-truncate mb-0">Total Partners</p>
                  </div>
                  <div className="flex-shrink-0">
                    <h5 className="text-success fs-14 mb-0">
                      <i className="ri-arrow-right-up-line fs-13 align-middle"></i> +16.24 %
                    </h5>
                  </div>
                </div>
                <div className="d-flex align-items-end justify-content-between mt-4">
                  <div>
                    <h4 className="fs-22 fw-semibold ff-secondary mb-4"><span className="counter-value" data-target="559">559</span></h4>
                    <Link to="/partners" className="text-decoration-underline">View all partners</Link>
                  </div>
                  <div className="avatar-sm flex-shrink-0">
                    <span className="avatar-title bg-success-subtle rounded fs-3">
                      <i className="las la-handshake text-success"></i>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-md-6">
            <div className="card card-animate">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1 overflow-hidden">
                    <p className="text-uppercase fw-medium text-muted text-truncate mb-0">Total Clients</p>
                  </div>
                  <div className="flex-shrink-0">
                    <h5 className="text-danger fs-14 mb-0">
                      <i className="ri-arrow-right-down-line fs-13 align-middle"></i> -3.57 %
                    </h5>
                  </div>
                </div>
                <div className="d-flex align-items-end justify-content-between mt-4">
                  <div>
                    <h4 className="fs-22 fw-semibold ff-secondary mb-4"><span className="counter-value" data-target="894">894</span></h4>
                    <a href="#" className="text-decoration-underline">View all clients</a>
                  </div>
                  <div className="avatar-sm flex-shrink-0">
                    <span className="avatar-title bg-info-subtle rounded fs-3">
                      <i className="las la-user-friends text-info"></i>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-md-6">
            <div className="card card-animate">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1 overflow-hidden">
                    <p className="text-uppercase fw-medium text-muted text-truncate mb-0">Total Leads</p>
                  </div>
                  <div className="flex-shrink-0">
                    <h5 className="text-success fs-14 mb-0">
                      <i className="ri-arrow-right-up-line fs-13 align-middle"></i> +29.08 %
                    </h5>
                  </div>
                </div>
                <div className="d-flex align-items-end justify-content-between mt-4">
                  <div>
                    <h4 className="fs-22 fw-semibold ff-secondary mb-4"><span className="counter-value" data-target="183">183</span></h4>
                    <a href="#" className="text-decoration-underline">View all Leads</a>
                  </div>
                  <div className="avatar-sm flex-shrink-0">
                    <span className="avatar-title bg-warning-subtle rounded fs-3">
                      <i className="las la-chart-pie text-warning"></i>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-md-6">
            <div className="card card-animate">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1 overflow-hidden">
                    <p className="text-uppercase fw-medium text-muted text-truncate mb-0"> My Commission</p>
                  </div>
                  <div className="flex-shrink-0">
                    <h5 className="text-muted fs-14 mb-0">+0.00 %</h5>
                  </div>
                </div>
                <div className="d-flex align-items-end justify-content-between mt-4">
                  <div>
                    <h4 className="fs-22 fw-semibold ff-secondary mb-4">$<span className="counter-value" data-target="165.89">165.89</span>k</h4>
                    <a href="#" className="text-decoration-underline">Withdraw money</a>
                  </div>
                  <div className="avatar-sm flex-shrink-0">
                    <span className="avatar-title bg-primary-subtle rounded fs-3">
                      <i className="bx bx-wallet text-primary"></i>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="row">
          <div className="col-xl-12">
            <div className="card">
              <div className="card-header border-0 align-items-center d-flex">
                <h4 className="card-title mb-0 flex-grow-1">Quick Links</h4>
              </div>
              <div className="card-header p-0 border-0 bg-light-subtle">
                <div className="row g-0 text-center">
                  <div className="col-6 col-sm-3">
                    <div className="p-3 border border-dashed border-start-0">
                      <button type="button" className="btn btn-soft-primary w-100 mb-2" data-bs-toggle="modal" data-bs-target="#addnewpartner"><i className="ri-add-fill me-1 align-bottom"></i>Create Partner</button>
                      <p className="text-muted mb-0">Register a new partner</p>
                    </div>
                  </div>
                  <div className="col-6 col-sm-3">
                    <div className="p-3 border border-dashed border-start-0">
                      <button type="button" className="btn btn-soft-primary w-100 mb-2" data-bs-toggle="modal" data-bs-target="#addnewClient"><i className="ri-add-fill me-1 align-bottom"></i>Create Client</button>
                      <p className="text-muted mb-0">Register a new Client</p>
                    </div>
                  </div>
                  <div className="col-6 col-sm-3">
                    <div className="p-3 border border-dashed border-start-0">
                      <a href="#" className="btn btn-soft-primary w-100 mb-2"><i className="ri-add-fill me-1 align-bottom"></i>Create Lead</a>
                      <p className="text-muted mb-0">Add new sales opportunity</p>
                    </div>
                  </div>
                  <div className="col-6 col-sm-3">
                    <div className="p-3 border border-dashed border-start-0 border-end-0">
                      <a href="#" className="btn btn-soft-primary w-100 mb-2"><i className="ri-add-fill me-1 align-bottom"></i>Create Invoice</a>
                      <p className="text-muted mb-0">Generate a new bill</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Meetings */}
        <div className="row">
          <div className="col-xl-6">
            <div className="card">
              <div className="card-header align-items-center d-flex">
                <h4 className="card-title mb-0 flex-grow-1">Upcoming Meetings</h4>
              </div>
              <div className="card-body pt-0">
                <ul className="list-group list-group-flush border-dashed">
                  <li className="list-group-item ps-0">
                    <div className="row align-items-center g-3">
                      <div className="col-auto">
                        <div className="avatar-sm p-1 py-2 h-auto bg-light rounded-3 material-shadow">
                          <div className="text-center">
                            <h5 className="mb-0">25</h5>
                            <div className="text-muted">Tue</div>
                          </div>
                        </div>
                      </div>
                      <div className="col">
                        <h5 className="text-muted mt-0 mb-1 fs-13">12:00am - 03:30pm</h5>
                        <a href="#" className="text-reset fs-14 mb-0">Meeting for campaign with sales team</a>
                      </div>
                    </div>
                  </li>
                  <li className="list-group-item ps-0">
                    <div className="row align-items-center g-3">
                      <div className="col-auto">
                        <div className="avatar-sm p-1 py-2 h-auto bg-light rounded-3 material-shadow">
                          <div className="text-center">
                            <h5 className="mb-0">20</h5>
                            <div className="text-muted">Wed</div>
                          </div>
                        </div>
                      </div>
                      <div className="col">
                        <h5 className="text-muted mt-0 mb-1 fs-13">02:00pm - 03:45pm</h5>
                        <a href="#" className="text-reset fs-14 mb-0">Adding a new event with attachments</a>
                      </div>
                    </div>
                  </li>
                  <li className="list-group-item ps-0">
                    <div className="row align-items-center g-3">
                      <div className="col-auto">
                        <div className="avatar-sm p-1 py-2 h-auto bg-light rounded-3 material-shadow">
                          <div className="text-center">
                            <h5 className="mb-0">17</h5>
                            <div className="text-muted">Wed</div>
                          </div>
                        </div>
                      </div>
                      <div className="col">
                        <h5 className="text-muted mt-0 mb-1 fs-13">04:30pm - 07:15pm</h5>
                        <a href="#" className="text-reset fs-14 mb-0">Create new project Bundling Product</a>
                      </div>
                    </div>
                  </li>
                  <li className="list-group-item ps-0">
                    <div className="row align-items-center g-3">
                      <div className="col-auto">
                        <div className="avatar-sm p-1 py-2 h-auto bg-light rounded-3 material-shadow">
                          <div className="text-center">
                            <h5 className="mb-0">12</h5>
                            <div className="text-muted">Tue</div>
                          </div>
                        </div>
                      </div>
                      <div className="col">
                        <h5 className="text-muted mt-0 mb-1 fs-13">10:30am - 01:15pm</h5>
                        <a href="#" className="text-reset fs-14 mb-0">Weekly closed sales won checking with sales team</a>
                      </div>
                    </div>
                  </li>
                </ul>
                <div className="align-items-center mt-2 row g-3 text-center text-sm-start">
                  <div className="col-sm">
                    <div className="text-muted">Showing <span className="fw-semibold">4</span> of <span className="fw-semibold">125</span> Results</div>
                  </div>
                  <div className="col-sm-auto">
                    <ul className="pagination pagination-separated pagination-sm justify-content-center justify-content-sm-start mb-0">
                      <li className="page-item disabled"><a href="#" className="page-link">←</a></li>
                      <li className="page-item"><a href="#" className="page-link">1</a></li>
                      <li className="page-item active"><a href="#" className="page-link">2</a></li>
                      <li className="page-item"><a href="#" className="page-link">3</a></li>
                      <li className="page-item"><a href="#" className="page-link">→</a></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Latest Funding Applications */}
          <div className="col-xxl-6 col-lg-6">
            <div className="card">
              <div className="card-header align-items-center d-flex">
                <h4 className="card-title mb-0 flex-grow-1">Latest Funding Applications</h4>
                <div className="mt-3 mt-lg-0">
                  <form onSubmit={(e) => e.preventDefault()}>
                    <div className="row g-3 mb-0 align-items-center">
                      <div className="col-sm-auto">
                        <div>
                          <a href="#" className="text-decoration-underline">View All</a>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
              <div className="card-body">
                <div className="table-responsive table-card">
                  <table className="table table-borderless table-hover table-nowrap align-middle mb-0">
                    <thead className="table-light">
                      <tr className="text-muted">
                        <th scope="col">Client Name</th>
                        <th scope="col">Request Amount</th>
                        <th scope="col">Submission Date</th>
                        <th scope="col">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Vertex Tech Solutions</td>
                        <td>$250,000</td>
                        <td>Oct 10, 2025</td>
                        <td><span className="badge bg-warning-subtle text-warning p-2">Processing</span></td>
                      </tr>
                      <tr>
                        <td>Evergreen E‑Commerce</td>
                        <td>$120,000</td>
                        <td>Oct 12, 2025</td>
                        <td><span className="badge bg-warning-subtle text-warning p-2">Processing</span></td>
                      </tr>
                      <tr>
                        <td>Aurora Logistics Ltd.</td>
                        <td>$375,000</td>
                        <td>Oct 15, 2025</td>
                        <td><span className="badge bg-warning-subtle text-warning p-2">Processing</span></td>
                      </tr>
                      <tr>
                        <td>Aurora Logistics Ltd.</td>
                        <td>$375,000</td>
                        <td>Oct 15, 2025</td>
                        <td><span className="badge bg-warning-subtle text-warning p-2">Processing</span></td>
                      </tr>
                      <tr>
                        <td>Aurora Logistics Ltd.</td>
                        <td>$375,000</td>
                        <td>Oct 15, 2025</td>
                        <td><span className="badge bg-warning-subtle text-warning p-2">Processing</span></td>
                      </tr>
                      <tr>
                        <td>Blue Ridge Construction</td>
                        <td>$200,000</td>
                        <td>Oct 17, 2025</td>
                        <td><span className="badge bg-success-subtle text-success p-2">Funded</span></td>
                      </tr>
                      <tr>
                        <td>Atlas Bakery Co.</td>
                        <td>$80,000</td>
                        <td>Oct 19, 2025</td>
                        <td><span className="badge bg-warning-subtle text-warning p-2">Processing</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Latest Prequalification Requests */}
        <div className="row">
          <div className="col-xl-12">
            <div className="card">
              <div className="card-header align-items-center d-flex">
                <h4 className="card-title mb-0 flex-grow-1">Latest Prequalification Requests</h4>
                <div className="mt-3 mt-lg-0">
                  <form onSubmit={(e) => e.preventDefault()}>
                    <div className="row g-3 mb-0 align-items-center">
                      <div className="col-sm-auto">
                        <div>
                          <a href="#" className="text-decoration-underline">View All</a>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
              <div className="card-body">
                <div className="table-responsive table-card">
                  <table className="table table-borderless table-hover table-nowrap align-middle mb-0">
                    <thead className="table-light">
                      <tr className="text-muted">
                        <th scope="col">Client Name</th>
                        <th scope="col">Request Amount</th>
                        <th scope="col">Submission Date</th>
                        <th scope="col">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Vertex Tech Solutions</td>
                        <td>$250,000</td>
                        <td>Oct 10, 2025</td>
                        <td><span className="badge bg-warning-subtle text-warning p-2">New</span></td>
                      </tr>
                      <tr>
                        <td>Evergreen E‑Commerce</td>
                        <td>$120,000</td>
                        <td>Oct 12, 2025</td>
                        <td><span className="badge bg-warning-subtle text-warning p-2">New</span></td>
                      </tr>
                      <tr>
                        <td>Aurora Logistics Ltd.</td>
                        <td>$375,000</td>
                        <td>Oct 15, 2025</td>
                        <td><span className="badge bg-warning-subtle text-warning p-2">New</span></td>
                      </tr>
                      <tr>
                        <td>Blue Ridge Construction</td>
                        <td>$200,000</td>
                        <td>Oct 17, 2025</td>
                        <td><span className="badge bg-success-subtle text-success p-2">Qualified</span></td>
                      </tr>
                      <tr>
                        <td>Atlas Bakery Co.</td>
                        <td>$80,000</td>
                        <td>Oct 19, 2025</td>
                        <td><span className="badge bg-warning-subtle text-warning p-2">New</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Modals from template: Add Partner */}
    <div className="modal fade" id="addnewpartner" tabIndex="-1" aria-labelledby="addnewpartnerLabel" aria-modal="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="addnewpartnerLabel">Add Partner</h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="row g-3">
                <div className="col-12">
                  <div>
                    <label htmlFor="partnerName" className="form-label">Partner Name <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" id="partnerName" placeholder="Enter partner name" required />
                  </div>
                </div>
                <div className="col-12">
                  <div>
                    <label htmlFor="companyName" className="form-label">Company Name <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" id="companyName" placeholder="Enter company name" required />
                  </div>
                </div>
                <div className="col-12">
                  <div>
                    <label htmlFor="partnerEmail" className="form-label">Email Address <span className="text-danger">*</span></label>
                    <input type="email" className="form-control" id="partnerEmail" placeholder="name@company.com" required />
                  </div>
                </div>
                <div className="col-12">
                  <div>
                    <label htmlFor="partnerPhone" className="form-label">Phone Number <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" id="partnerPhone" placeholder="+(1) 234 567 8000" required />
                  </div>
                </div>
                <div className="col-lg-12">
                  <div className="hstack gap-2 justify-content-between">
                    <Link to="#" className="text-decoration-underline">View full form</Link>
                    <button type="submit" data-bs-dismiss="modal" data-toast data-toast-text="Successfyll added Partner" data-toast-gravity="bottom" data-toast-position="right" data-toast-duration="3000" data-toast-close="close" className="btn btn-primary">Submit</button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    {/* Modals from template: Add Client */}
    <div className="modal fade" id="addnewClient" tabIndex="-1" aria-labelledby="addnewClientLabel" aria-modal="true">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="addnewClientLabel">Add Client</h5>
            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div className="modal-body">
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="row g-3">
                <div className="col-12">
                  <div>
                    <label htmlFor="partnerName" className="form-label">Name <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" id="partnerName" placeholder="Enter partner name" required />
                  </div>
                </div>
                <div className="col-12">
                  <div>
                    <label htmlFor="partnerEmail" className="form-label">Email Address <span className="text-danger">*</span></label>
                    <input type="email" className="form-control" id="partnerEmail" placeholder="name@company.com" required />
                  </div>
                </div>
                <div className="col-12">
                  <div>
                    <label htmlFor="partnerPhone" className="form-label">Phone Number <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" id="partnerPhone" placeholder="+(1) 234 567 8000" required />
                  </div>
                </div>
                <div className="col-12">
                  <div>
                    <label htmlFor="companyName" className="form-label">Company Name <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" id="companyName" placeholder="Enter company name" required />
                  </div>
                </div>
                <div className="col-lg-12">
                  <div className="hstack gap-2 justify-content-between">
                    <Link to="#" className="text-decoration-underline">View full form</Link>
                    <button type="submit" data-bs-dismiss="modal" data-toast data-toast-text="Successfyll added Partner" data-toast-gravity="bottom" data-toast-position="right" data-toast-duration="3000" data-toast-close="close" className="btn btn-primary">Submit</button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}