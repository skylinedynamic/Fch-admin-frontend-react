import React from 'react';

export default function ClientListSection() {
    return (
        <div className="table-responsive table-card">
            <table className="table table-borderless table-hover table-nowrap align-middle mb-0">
                <thead className="table-light">
                    <tr className="text-muted">
                        <th scope="col">Name</th>
                        <th scope="col">Company Name</th>
                        <th scope="col">Email Address</th>
                        <th scope="col">Phone Number</th>
                        <th scope="col">Joining Date</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>John Doe</td>
                        <td>Absternet LLC</td>
                        <td>john.doe@absternet.com</td>
                        <td>(555) 123-4567</td>
                        <td>Jan 12, 2024</td>
                    </tr>
                    <tr>
                        <td>Jane Smith</td>
                        <td>Raitech Soft</td>
                        <td>jane.smith@raitechsoft.io</td>
                        <td>(555) 234-5678</td>
                        <td>Feb 02, 2024</td>
                    </tr>
                    <tr>
                        <td>Luis Rocha</td>
                        <td>William PVT</td>
                        <td>luis.rocha@william-pvt.com</td>
                        <td>(555) 345-6789</td>
                        <td>Mar 21, 2024</td>
                    </tr>
                    <tr>
                        <td>Vitoria Rodrigues</td>
                        <td>Loiusee LLP</td>
                        <td>vitoria.rodrigues@loiusee.llp</td>
                        <td>(555) 456-7890</td>
                        <td>Apr 15, 2024</td>
                    </tr>
                </tbody>
            </table>

            {/* Pagination */}
            <div className="d-flex justify-content-end mt-3">
                <nav>
                    <ul className="pagination pagination-sm mb-0">
                        <li className="page-item disabled">
                            <a className="page-link" href="javascript:void(0);">Previous</a>
                        </li>
                        <li className="page-item active"><a className="page-link" href="javascript:void(0);">1</a></li>
                        <li className="page-item"><a className="page-link" href="javascript:void(0);">2</a></li>
                        <li className="page-item"><a className="page-link" href="javascript:void(0);">3</a></li>
                        <li className="page-item">
                            <a className="page-link" href="javascript:void(0);">Next</a>
                        </li>
                    </ul>
                </nav>
            </div>
        </div>
    );
}
