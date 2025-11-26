import React from 'react';

export default function DocumentsSection() {
    return (
        <div className="col-lg-12">
            <div className="table-responsive">
                <table className="table table-borderless align-middle mb-0">
                    <thead className="table-light">
                        <tr>
                            <th scope="col">File Name</th>
                            <th scope="col">Type</th>
                            <th scope="col">Size</th>
                            <th scope="col">Upload Date</th>
                            <th scope="col">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <div className="d-flex align-items-center">
                                    <div className="avatar-sm">
                                        <div className="avatar-title bg-primary-subtle text-primary rounded fs-20 material-shadow">
                                            <i className="ri-file-zip-fill"></i>
                                        </div>
                                    </div>
                                    <div className="ms-3 flex-grow-1">
                                        <h6 className="fs-15 mb-0"><a href="javascript:void(0)">Artboard-documents.zip</a></h6>
                                    </div>
                                </div>
                            </td>
                            <td>Zip File</td>
                            <td>4.57 MB</td>
                            <td>12 Dec 2021</td>
                            <td>
                                <div className="dropdown">
                                    <a href="javascript:void(0);" className="btn btn-light btn-icon" data-bs-toggle="dropdown" aria-expanded="false">
                                        <i className="ri-more-fill"></i>
                                    </a>
                                    <ul className="dropdown-menu dropdown-menu-end">
                                        <li><a className="dropdown-item" href="javascript:void(0);"><i className="ri-eye-fill me-2 align-middle text-muted"></i>View</a></li>
                                        <li><a className="dropdown-item" href="javascript:void(0);"><i className="ri-download-2-fill me-2 align-middle text-muted"></i>Download</a></li>
                                        <li className="dropdown-divider"></li>
                                        <li><a className="dropdown-item" href="javascript:void(0);"><i className="ri-delete-bin-5-line me-2 align-middle text-muted"></i>Delete</a></li>
                                    </ul>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <div className="d-flex align-items-center">
                                    <div className="avatar-sm">
                                        <div className="avatar-title bg-danger-subtle text-danger rounded fs-20 material-shadow">
                                            <i className="ri-file-pdf-fill"></i>
                                        </div>
                                    </div>
                                    <div className="ms-3 flex-grow-1">
                                        <h6 className="fs-15 mb-0"><a href="javascript:void(0);">Bank Management System</a></h6>
                                    </div>
                                </div>
                            </td>
                            <td>PDF File</td>
                            <td>8.89 MB</td>
                            <td>24 Nov 2021</td>
                            <td>
                                <div className="dropdown">
                                    <a href="javascript:void(0);" className="btn btn-light btn-icon" data-bs-toggle="dropdown" aria-expanded="false">
                                        <i className="ri-more-fill"></i>
                                    </a>
                                    <ul className="dropdown-menu dropdown-menu-end">
                                        <li><a className="dropdown-item" href="javascript:void(0);"><i className="ri-eye-fill me-2 align-middle text-muted"></i>View</a></li>
                                        <li><a className="dropdown-item" href="javascript:void(0);"><i className="ri-download-2-fill me-2 align-middle text-muted"></i>Download</a></li>
                                        <li className="dropdown-divider"></li>
                                        <li><a className="dropdown-item" href="javascript:void(0);"><i className="ri-delete-bin-5-line me-2 align-middle text-muted"></i>Delete</a></li>
                                    </ul>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
