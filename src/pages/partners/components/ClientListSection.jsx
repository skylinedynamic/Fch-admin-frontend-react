import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchBorrowers } from '../../../modules/partner/services';
import { toast } from 'react-toastify';

export default function ClientListSection() {
    const { id } = useParams();
    const [borrowers, setBorrowers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        total: 0
    });

    const loadBorrowers = async (page = 1) => {
        try {
            setLoading(true);
            const response = await fetchBorrowers({
                partner_id: id,
                page: page,
                per_page: 10
            });

            if (response && response.status) {
                setBorrowers(response.data || []);
                if (response.meta) {
                    setPagination({
                        current_page: response.meta.current_page || 1,
                        last_page: response.meta.last_page || 1,
                        total: response.meta.total || 0
                    });
                }
            } else if (Array.isArray(response)) {
                setBorrowers(response);
            }
        } catch (error) {
            console.error('Failed to fetch borrowers', error);
            // toast.error('Failed to load client list');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            loadBorrowers();
        }
    }, [id]);

    const handlePageChange = (page) => {
        if (page >= 1 && page <= pagination.last_page) {
            loadBorrowers(page);
        }
    };

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
                    {loading ? (
                        <tr>
                            <td colSpan="5" className="text-center py-5">
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                <div className="mt-2 text-muted">Loading clients...</div>
                            </td>
                        </tr>
                    ) : borrowers.length > 0 ? (
                        borrowers.map((borrower, index) => (
                            <tr key={borrower.id || index}>
                                <td>{borrower.full_name || borrower.name || 'N/A'}</td>
                                <td>{borrower.company_name || 'N/A'}</td>
                                <td>{borrower.business_email || 'N/A'}</td>
                                <td>{borrower.business_phone || 'N/A'}</td>
                                <td>{borrower.business_start_date || 'Invalid Date'}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="5" className="text-center py-4">No clients found</td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* Pagination */}
            {pagination.last_page > 1 && (
                <div className="d-flex justify-content-end mt-3">
                    <nav>
                        <ul className="pagination pagination-sm mb-0">
                            <li className={`page-item ${pagination.current_page === 1 ? 'disabled' : ''}`}>
                                <button
                                    className="page-link"
                                    onClick={() => handlePageChange(pagination.current_page - 1)}
                                    disabled={pagination.current_page === 1}
                                >
                                    Previous
                                </button>
                            </li>
                            {[...Array(pagination.last_page)].map((_, i) => (
                                <li key={i + 1} className={`page-item ${pagination.current_page === i + 1 ? 'active' : ''}`}>
                                    <button
                                        className="page-link"
                                        onClick={() => handlePageChange(i + 1)}
                                    >
                                        {i + 1}
                                    </button>
                                </li>
                            ))}
                            <li className={`page-item ${pagination.current_page === pagination.last_page ? 'disabled' : ''}`}>
                                <button
                                    className="page-link"
                                    onClick={() => handlePageChange(pagination.current_page + 1)}
                                    disabled={pagination.current_page === pagination.last_page}
                                >
                                    Next
                                </button>
                            </li>
                        </ul>
                    </nav>
                </div>
            )}
        </div>
    );
}
