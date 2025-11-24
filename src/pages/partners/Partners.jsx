import React from 'react';
import { Link } from 'react-router-dom';

// Placeholder data for partners - can be replaced with API calls later
const partnerData = [
    {
        id: 'P001',
        company: 'Nova Systems Inc.',
        owner: 'Alex Novak',
        contact: 'Jordan Kim',
        email: 'jordan.kim@novasystems.io',
        phone: '(415) 555-0123',
        agent: 'Sam Lee',
        level: 'Normal',
    },
    {
        id: 'P002',
        company: 'Pioneer Logistics',
        owner: 'Anil Reddy',
        contact: 'Priya Shah',
        email: 'priya@pioneerlogistics.com',
        phone: '(312) 555-0199',
        agent: 'Ava Morgan',
        level: 'White Level',
    },
    // Add more rows as needed
];

export default function Partners() {
    return (
        <div className="page-content">
            {/* Header */}
            <div className="container-fluid">
                <div className="row mb-3 pb-1 page-subheader-sticky bg-body">
                    <div className="col-12">
                        <div className="d-flex align-items-center justify-content-between flex-row">
                            <div className="flex-grow-1">
                                <h4 className="fs-20 mb-1">Partners</h4>
                                <nav aria-label="breadcrumb" className="d-none d-sm-block">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">Partners</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="page-actions d-flex align-items-center gap-2 mt-0">
                                <Link to="/partners/create" className="btn btn-primary w-lg waves-effect">
                                    <i className="ri-add-fill me-1 align-bottom"></i> Add Partner
                                </Link>
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
                                    <div className="avatar-sm flex-shrink-0">
                                        <span className="avatar-title bg-primary-subtle text-primary rounded-2 fs-2">
                                            <i className="ri-ticket-line text-primary" aria-hidden="true"></i>
                                        </span>
                                    </div>
                                    <div className="flex-grow-1 overflow-hidden ms-3">
                                        <p className="text-capitalize fw-medium text-muted text-truncate mb-1 kpi-title">Active Partners</p>
                                        <h4 className="fs-4 flex-grow-1 mb-0"><span className="counter-value" data-target="82">82</span></h4>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-xl-3 col-md-6">
                        <div className="card card-animate">
                            <div className="card-body">
                                <div className="d-flex align-items-center">
                                    <div className="avatar-sm flex-shrink-0">
                                        <span className="avatar-title bg-warning-subtle text-warning rounded-2 fs-2">
                                            <i className="ri-folder-open-line text-warning" aria-hidden="true"></i>
                                        </span>
                                    </div>
                                    <div className="flex-grow-1 ms-3">
                                        <p className="text-capitalize fw-medium text-muted text-truncate mb-1 kpi-title">New This Month</p>
                                        <h4 className="fs-4 flex-grow-1 mb-0"><span className="counter-value" data-target="22">22</span></h4>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-xl-3 col-md-6">
                        <div className="card card-animate">
                            <div className="card-body">
                                <div className="d-flex align-items-center">
                                    <div className="avatar-sm flex-shrink-0">
                                        <span className="avatar-title bg-info-subtle text-info rounded-2 fs-2">
                                            <i className="ri-time-line text-info" aria-hidden="true"></i>
                                        </span>
                                    </div>
                                    <div className="flex-grow-1 overflow-hidden ms-3">
                                        <p className="text-capitalize fw-medium text-muted text-truncate mb-1 kpi-title">Pending Requests</p>
                                        <h4 className="fs-4 flex-grow-1 mb-0"><span className="counter-value" data-target="68">68</span></h4>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-xl-3 col-md-6">
                        <div className="card card-animate">
                            <div className="card-body">
                                <div className="d-flex align-items-center">
                                    <div className="avatar-sm flex-shrink-0">
                                        <span className="avatar-title bg-success-subtle text-success rounded-2 fs-2">
                                            <i className="ri-star-line text-success" aria-hidden="true"></i>
                                        </span>
                                    </div>
                                    <div className="flex-grow-1 overflow-hidden ms-3">
                                        <p className="text-capitalize fw-medium text-muted text-truncate mb-1 kpi-title">Inactive</p>
                                        <h4 className="fs-4 flex-grow-1 mb-0"><span className="counter-value" data-target="4">4</span></h4>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters and Table */}
                <div className="row">
                    <div className="col-lg-12">
                        <div className="card">
                            <div className="card-body">
                                <form>
                                    <div className="row g-3 mb-3">
                                        <div className="col-xxl-3 col-sm-12">
                                            <div className="search-box">
                                                <input type="text" className="form-control search bg-light border-light" id="searchJob" placeholder="Search here..." />
                                                <i className="ri-search-line search-icon"></i>
                                            </div>
                                        </div>
                                        <div className="col-xxl-3 col-sm-4">
                                            <div className="input-light">
                                                <select className="form-control" data-choices data-choices-search-false name="partnerStatus" id="partnerStatus">
                                                    <option value="" selected>All Partners</option>
                                                    <option value="Active">Active</option>
                                                    <option value="Pending">Pending</option>
                                                    <option value="Inactive">Inactive</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="col-xxl-3 col-sm-4">
                                            <div className="input-light">
                                                <select className="form-control" data-choices data-choices-search-false name="salesperson" id="salesperson">
                                                    <option value="" selected>All Salespeople</option>
                                                    <option value="Donald Risher">Donald Risher</option>
                                                    <option value="Sofia Cunha">Sofia Cunha</option>
                                                    <option value="Luis Rocha">Luis Rocha</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="col-xxl-3 col-sm-4">
                                            <button type="button" className="btn btn-warning w-100" onClick={() => {/* TODO: implement filter logic */ }}>
                                                <i className="ri-equalizer-fill me-1 align-bottom"></i> Filters
                                            </button>
                                        </div>
                                    </div>
                                </form>
                                <div className="table-responsive table-card mt-1">
                                    <table className="table align-middle table-nowrap table-hover table-striped" id="partnerTable">
                                        <thead className="table-light">
                                            <tr>
                                                <th scope="col" style={{ width: '50px' }}>
                                                    <div className="form-check">
                                                        <input className="form-check-input" type="checkbox" id="checkAll" />
                                                    </div>
                                                </th>
                                                <th className="text-uppercase">Company Name</th>
                                                <th className="text-uppercase">Owner Name</th>
                                                <th className="text-uppercase">Contact Person</th>
                                                <th className="text-uppercase">Email</th>
                                                <th className="text-uppercase">Phone Number</th>
                                                <th className="text-uppercase">Agent</th>
                                                <th className="text-uppercase">Level</th>
                                            </tr>
                                        </thead>
                                        <tbody className="list form-check-all" id="partner-list-data">
                                            {partnerData.map((p) => (
                                                <tr key={p.id}>
                                                    <th scope="row">
                                                        <div className="form-check">
                                                            <input className="form-check-input" type="checkbox" name="chk_partner" value={p.id} />
                                                        </div>
                                                    </th>
                                                    <td>{p.company}</td>
                                                    <td>{p.owner}</td>
                                                    <td>{p.contact}</td>
                                                    <td>{p.email}</td>
                                                    <td>{p.phone}</td>
                                                    <td>{p.agent}</td>
                                                    <td>
                                                        <span className={`level-badge ${p.level === 'Normal' ? 'level-normal' : 'level-white'}`}>{p.level}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pagination */}
                <div className="row g-0 text-center text-sm-start align-items-center">
                    <div className="col-sm-6">
                        <p className="mb-sm-0 text-muted">Showing <span className="fw-semibold">1</span> to <span className="fw-semibold">10</span> of <span className="fw-semibold text-decoration-underline">10</span> entries</p>
                    </div>
                    <div className="col-sm-6">
                        <div className="d-flex justify-content-center justify-content-sm-end align-items-baseline gap-2">
                            <div className="datatable me-2">
                                <label className="mb-0 text-muted d-flex align-items-baseline gap-2 fw-normal">Show
                                    <select name="add-rows_length" className="form-select form-select-sm d-inline-block w-auto align-middle pt-1 pb-1">
                                        <option value="10" selected>10</option>
                                        <option value="25">25</option>
                                        <option value="50">50</option>
                                        <option value="100">100</option>
                                    </select>
                                    entries
                                </label>
                            </div>
                            <ul className="pagination pagination-separated justify-content-center justify-content-sm-end mb-0">
                                <li className="page-item disabled"><a href="#" className="page-link">Previous</a></li>
                                <li className="page-item active"><a href="#" className="page-link">1</a></li>
                                <li className="page-item"><a href="#" className="page-link">Next</a></li>
                            </ul>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
