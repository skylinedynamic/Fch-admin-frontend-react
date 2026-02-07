import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { usePermissions } from '../../lib/auth/usePermissions'
import { Button } from 'primereact/button'
import { useAuthStore } from '../../store/auth/authStore';

export default function Dashboard() {
  const navigate = useNavigate();
  const { isRestricted } = usePermissions();
  const currentUser = useAuthStore((state) => state.user);
  const isHost = currentUser?.is_host === 1;

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

          {isRestricted && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="card bg-danger-subtle border-0 shadow-sm border-start border-danger border-3">
                  <div className="card-body p-4">
                    <div className="d-flex align-items-center">
                      <div className="flex-shrink-0 me-3">
                        <div className="avatar-sm">
                          <div className="avatar-title bg-danger text-white rounded-circle fs-20">
                            <i className="ri-error-warning-fill"></i>
                          </div>
                        </div>
                      </div>
                      <div className="flex-grow-1">
                        <h5 className="fs-16 fw-bold text-danger mb-1">Currently you have pending invoice</h5>
                        <p className="text-muted mb-0 fs-14">Please pay your invoice. Click here to go to the invoice and complete the payment.</p>
                      </div>
                      <div className="flex-shrink-0 ms-3">
                        <Button
                          label="View & Pay Invoices"
                          icon="ri-bill-line"
                          className="p-button-danger rounded-3"
                          onClick={() => navigate('/invoices')}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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

            {/* Latest Invoices */}
            <div className="col-xxl-6 col-lg-6">
              <div className="card">
                <div className="card-header align-items-center d-flex">
                  <h4 className="card-title mb-0 flex-grow-1">
                    <i className="ri-bill-line align-middle me-1 text-primary"></i> Latest Invoices
                  </h4>
                  <div className="flex-shrink-0">
                    <Link to="/invoices" className="text-decoration-underline text-muted">View All</Link>
                  </div>
                </div>
                <div className="card-body">
                  <div className="table-responsive table-card">
                    <table className="table table-borderless table-hover table-nowrap align-middle mb-0">
                      <thead className="table-light">
                        <tr className="text-muted">
                          <th scope="col">Invoice #</th>
                          <th scope="col">Client</th>
                          <th scope="col">Amount</th>
                          <th scope="col">Date</th>
                          <th scope="col">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="fw-medium">#INV-1024</td>
                          <td>Vertex Tech Solutions</td>
                          <td>$1,250.00</td>
                          <td>Oct 10, 2025</td>
                          <td><span className="badge bg-success-subtle text-success p-2">Paid</span></td>
                        </tr>
                        <tr>
                          <td className="fw-medium">#INV-1025</td>
                          <td>Evergreen E‑Commerce</td>
                          <td>$800.00</td>
                          <td>Oct 12, 2025</td>
                          <td><span className="badge bg-warning-subtle text-warning p-2">Pending</span></td>
                        </tr>
                        <tr>
                          <td className="fw-medium">#INV-1026</td>
                          <td>Aurora Logistics Ltd.</td>
                          <td>$3,450.00</td>
                          <td>Oct 15, 2025</td>
                          <td><span className="badge bg-danger-subtle text-danger p-2">Overdue</span></td>
                        </tr>
                        <tr>
                          <td className="fw-medium">#INV-1027</td>
                          <td>Blue Ridge Construction</td>
                          <td>$2,100.00</td>
                          <td>Oct 17, 2025</td>
                          <td><span className="badge bg-success-subtle text-success p-2">Paid</span></td>
                        </tr>
                        <tr>
                          <td className="fw-medium">#INV-1028</td>
                          <td>Atlas Bakery Co.</td>
                          <td>$450.00</td>
                          <td>Oct 19, 2025</td>
                          <td><span className="badge bg-warning-subtle text-warning p-2">Pending</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Latest Verification Requests & Prequalification */}
          <div className="row">
            <div className="col-xxl-6 col-lg-6">
              <div className="card">
                <div className="card-header align-items-center d-flex">
                  <h4 className="card-title mb-0 flex-grow-1">
                    <i className="ri-shield-check-line align-middle me-1 text-info"></i> Verification Requests
                  </h4>
                  <div className="flex-shrink-0">
                    <Link to="/verification-center" className="text-decoration-underline text-muted">View All</Link>
                  </div>
                </div>
                <div className="card-body">
                  <div className="table-responsive table-card">
                    <table className="table table-borderless table-hover table-nowrap align-middle mb-0">
                      <thead className="table-light">
                        <tr className="text-muted">
                          <th scope="col">Borrower</th>
                          <th scope="col">Tier</th>
                          <th scope="col">Pending</th>
                          <th scope="col">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="fw-medium">John Doe</td>
                          <td><span className="badge bg-primary-subtle text-primary">Silver Tier</span></td>
                          <td><span className="text-danger fw-bold">3 Docs</span></td>
                          <td>Oct 20, 2025</td>
                        </tr>
                        <tr>
                          <td className="fw-medium">Jane Smith</td>
                          <td><span className="badge bg-warning-subtle text-warning">Gold Tier</span></td>
                          <td><span className="text-warning fw-bold">1 Doc</span></td>
                          <td>Oct 22, 2025</td>
                        </tr>
                        <tr>
                          <td className="fw-medium">Mike Johnson</td>
                          <td><span className="badge bg-info-subtle text-info">Platinum Tier</span></td>
                          <td><span className="text-success fw-bold">0 Pending</span></td>
                          <td>Oct 24, 2025</td>
                        </tr>
                        <tr>
                          <td className="fw-medium">Sarah Wilson</td>
                          <td><span className="badge bg-secondary-subtle text-secondary">Basic Tier</span></td>
                          <td><span className="text-danger fw-bold">5 Docs</span></td>
                          <td>Oct 25, 2025</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-xxl-6 col-lg-6">
              <div className="card">
                <div className="card-header align-items-center d-flex">
                  <h4 className="card-title mb-0 flex-grow-1">
                    <i className="ri-task-line align-middle me-1 text-warning"></i> Latest Prequalifications
                  </h4>
                  <div className="flex-shrink-0">
                    <a href="#" className="text-decoration-underline text-muted">View All</a>
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


    </>
  )
}