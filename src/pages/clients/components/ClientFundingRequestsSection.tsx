import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getFundingRequests } from '../../../modules/application/services';
import TableLoader from '../../../components/Loader/TableLoader';
import { formatApiDate } from '../../../utils/dates';

/**
 * The funding requests raised for this client.
 *
 * A client's requests were only reachable through the global Funding Requests
 * list, so following one applicant's file meant searching for them by name.
 * That gap mattered most right after a conversion: the request opened from an
 * embedded form submission had nowhere on the client record to be seen.
 */

const STATUS_TONE: Record<string, string> = {
    Pending: 'warning',
    'In Progress': 'info',
    Approved: 'success',
    Accepted: 'success',
    Rejected: 'danger',
    Cancelled: 'secondary',
};

const formatMoney = (value: any) => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'string' && value.trim().startsWith('$')) return value;
    const num = Number(value);
    return Number.isNaN(num) ? String(value) : `$${num.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
};

const formatDate = (value?: string | null) => formatApiDate(value, false, '—');

interface Props {
    borrowerId: string | number;
}

export default function ClientFundingRequestsSection({ borrowerId }: Props) {
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!borrowerId) return;
        setLoading(true);
        try {
            const res = await getFundingRequests({ borrower_id: borrowerId, per_page: 50 });
            if (res.status) {
                setRows((res.data as any)?.data ?? (res.data as any) ?? []);
            } else {
                toast.error((res as any)?.message || 'Failed to load funding requests.');
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.message || 'Failed to load funding requests.');
        } finally {
            setLoading(false);
        }
    }, [borrowerId]);

    useEffect(() => {
        load();
    }, [load]);

    if (loading) return <TableLoader />;

    if (!rows.length) {
        return (
            <div className="text-center py-5">
                <i className="ri-inbox-line fs-1 text-muted d-block mb-2" />
                <p className="text-muted mb-0">No funding requests have been raised for this client yet.</p>
            </div>
        );
    }

    return (
        <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                    <tr>
                        <th>Request</th>
                        <th>Funding Program</th>
                        <th>Requested</th>
                        <th>Application</th>
                        <th>Status</th>
                        <th>Raised</th>
                        <th className="text-end">Review</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row: any) => {
                        const tone = STATUS_TONE[row.status] || 'secondary';
                        return (
                            <tr key={row.id}>
                                <td className="fw-semibold text-dark">#{row.id}</td>
                                <td>{row.funding_sequence?.name || row.funding_type || '—'}</td>
                                <td className="fw-semibold text-success">{formatMoney(row.requested_amount)}</td>
                                <td>
                                    {row.funding_application?.application_number ? (
                                        <Link
                                            to={`/intake-review/funding-application/${row.funding_application.id}`}
                                            className="text-primary text-decoration-none"
                                        >
                                            {row.funding_application.application_number}
                                        </Link>
                                    ) : (
                                        <span className="text-muted">Not started</span>
                                    )}
                                </td>
                                <td>
                                    <span className={`badge bg-${tone}-subtle text-${tone}`}>{row.status}</span>
                                </td>
                                <td className="text-muted">{formatDate(row.created_at)}</td>
                                <td className="text-end">
                                    <Link
                                        to={`/intake-review/funding-request/${row.id}`}
                                        className="btn btn-sm btn-soft-primary"
                                    >
                                        <i className="ri-external-link-line me-1" />
                                        Open
                                    </Link>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
