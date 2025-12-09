import React from 'react';

export default function ClientDocumentsSection() {
    return (
        <div className="card shadow-none border">
            <div className="card-body">
                <div className="d-flex align-items-center mb-4">
                    <div className="flex-shrink-0">
                        <input className="form-control d-none" type="file" id="formFile" />
                        <label htmlFor="formFile" className="btn btn-danger"><i className="ri-upload-2-fill me-1 align-bottom"></i> Upload File</label>
                    </div>
                </div>
                <div className="row">
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
                                                    <h6 className="fs-15 mb-0"><a href="#">Artboard-documents.zip</a></h6>
                                                </div>
                                            </div>
                                        </td>
                                        <td>Zip File</td>
                                        <td>4.57 MB</td>
                                        <td>12 Dec 2021</td>
                                        <td>
                                            <button type="button" className="btn btn-sm btn-link text-danger"><i className="ri-delete-bin-5-line"></i></button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
