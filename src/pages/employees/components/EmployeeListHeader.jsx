import React from 'react';
import { Link } from 'react-router-dom';

export default function EmployeeListHeader({ selection, onDeleteSelected }) {
    return (
        <div className="row mb-3 pb-1 page-subheader-sticky bg-body">
            <div className="col-12">
                <div className="d-flex align-items-center justify-content-between flex-row">
                    <div className="flex-grow-1">
                        <h4 className="fs-20 mb-1">Employees</h4>
                        <nav aria-label="breadcrumb" className="d-none d-sm-block">
                            <ol className="breadcrumb m-0">
                                <li className="breadcrumb-item"><a href="/">Dashboard</a></li>
                                <li className="breadcrumb-item active" aria-current="page">Employees</li>
                            </ol>
                        </nav>
                    </div>
                    <div className="mt-0">
                        <form onSubmit={(e) => e.preventDefault()}>
                            <div className="row g-3 mb-0 align-items-center">
                                <div className="col-sm-auto">
                                    <div className="btn-group">
                                        {Array.isArray(selection) && selection.length > 0 ? (
                                            <>
                                                <button type="button" id="primaryActionBtn" className="btn bg-success text-white fw-medium">
                                                    Actions
                                                </button>
                                                <button type="button" id="primaryActionToggleBtn" className="btn bg-success text-white fw-medium dropdown-toggle dropdown-toggle-split" data-bs-toggle="dropdown" aria-expanded="false">
                                                    <span className="visually-hidden">Toggle dropdown</span>
                                                </button>
                                                <ul className="dropdown-menu dropdown-menu-end" id="primaryActionMenu">
                                                    <li>
                                                        <button
                                                            type="button"
                                                            className="dropdown-item text-danger"
                                                            onClick={onDeleteSelected}
                                                        >
                                                            <i className="ri-delete-bin-6-line me-1 align-bottom"></i> Delete Selected
                                                        </button>
                                                    </li>
                                                </ul>
                                            </>
                                        ) : (
                                            <Link to="/employee-details" id="primaryActionBtn" className="btn btn-primary fw-medium waves-effect waves-light">
                                                <i className="ri-add-fill me-1 align-bottom"></i> Add Employee
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
