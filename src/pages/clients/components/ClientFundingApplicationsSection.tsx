import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getFundingApplications } from '../../../modules/application/services';
import TableLoader from '../../../components/Loader/TableLoader';

/**
 * The funding applications this client has submitted.
 *
 * Companion to the Funding Requests tab: the request is the ask, the
 * application is the file behind it. Both are reachable from the client record
 * so one client's history reads in one place.
 */

const STATUS_TONE: Record<string, string> = {
    Draft: 'secondary',
    'Submitted – Pending Review': 'warning',
    'Submitted (Received)': 'info',
    'Underwriting Review': 'primary',
    'Missing Documents (Action Required)': 'warning',
    'In Verification': 'primary',
    'Approved (Conditional)': 'success',
    'Approved (Final)': 'success',
    'Offer Issued': 'success',
    'Offer Accepted': 'success',
    Funded: 'success',
    'Closed (Completed)': 'secondary',
    Denied: 'danger',
    'On Hold': 'warning',
};

const formatMoney = (value: any) => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'string' && value.trim().startsWith('$')) return value;
    const num = Number(value);
    return Number.isNaN(num) ? String(value) : `$${num.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
};

interface Props {
    borrowerId: string | number;
}

export default function ClientFundingApplicationsSection({ borrowerId }: Props) {
    const [rows, setRows] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        if (!borrowerId) return;
        setLoading(true);
        try {
            const res = await getFundingApplications({ borrower_id: borrowerId, per_page: 50 });
            if (res.status) {
                setRows((res.data as any)?.data ?? (res.data as any) ?? []);
            } else {
                toast.error((res as any)?.message || 'Failed to load funding applications.');
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.message || 'Failed to load funding applications.');
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
                <i className="ri-file-list-3-line fs-1 text-muted d-block mb-2" />
                <p className="text-muted mb-0">This client has no funding applications yet.</p>
            </div>
        );
    }

    return (
        <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                    <tr>
                        <th>Application</th>
                        <th>Business</th>
                        <th>Requested</th>
                        <th>Funding Type</th>
                        <th>Purpose</th>
                        <th>Status</th>
                        <th className="text-end">Open</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row: any) => {
                        const tone = STATUS_TONE[row.status] || 'secondary';
                        return (
                            <tr key={row.id}>
                                <td className="fw-semibold text-dark">{row.application_number || `#${row.id}`}</td>
                                <td>{row.business_name || '—'}</td>
                                <td className="fw-semibold text-success">{formatMoney(row.requested_amount)}</td>
                                <td>{row.preferred_funding_type || '—'}</td>
                                <td>{row.purpose_of_funds || '—'}</td>
                                <td>
                                    <span className={`badge bg-${tone}-subtle text-${tone}`}>{row.status || '—'}</span>
                                </td>
                                <td className="text-end">
                                    <Link
                                        to={`/intake-review/funding-application/${row.id}`}
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
