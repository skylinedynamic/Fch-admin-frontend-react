import React, { useState } from 'react';
import { toast } from 'react-toastify';

import { downloadCreditAuthorizationPdf } from '../../../../modules/credit-profile-request/services';
import type { CreditAuthorization } from '../../../../modules/credit-profile-request/types';

interface Props {
    borrowerId: number;
    /**
     * Served with the request details rather than fetched here - the screen
     * shows both together, so it is one call. Empty or absent for anyone but the
     * host partner, which is what hides this panel.
     */
    rows?: CreditAuthorization[];
}

/**
 * The FCRA authorisations behind this client's credit pulls, and the PDF that
 * answers an iSoftPull audit.
 *
 * Host partner only, decided by the API: these rows carry the consumer's IP and
 * device and exist to prove the platform's own permissible purpose. Anyone else
 * is served none, and sees nothing here rather than an error.
 */
export default function CreditAuthorizationPanel({ borrowerId, rows }: Props) {
    const [downloadingId, setDownloadingId] = useState<number | null>(null);
    const [showAll, setShowAll] = useState(false);

    const handleDownload = async (row: CreditAuthorization) => {
        setDownloadingId(row.id);
        try {
            const blob = await downloadCreditAuthorizationPdf(row.id);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `credit-authorization-client-${borrowerId}-record-${row.id}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            // Released straight away: the blob is the whole PDF in memory and
            // nothing refers to it once the download has started.
            window.URL.revokeObjectURL(url);
        } catch {
            toast.error('Could not download the authorization record.');
        } finally {
            setDownloadingId(null);
        }
    };

    if (!rows) return null;

    const displayedRows = showAll ? rows : rows.slice(0, 5);

    return (
        <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-transparent border-bottom py-3">
                <div className="d-flex align-items-center gap-2">
                    <div className="rounded bg-primary-subtle p-2">
                        <i className="ri-shield-check-line text-primary fs-16" />
                    </div>
                    <div>
                        <div className="fw-semibold text-dark fs-14">Credit Authorization</div>
                        <div className="text-muted fs-12">
                            Proof the client authorized each credit pull, for iSoftPull
                        </div>
                    </div>
                </div>
            </div>

            <div className="card-body">
                {rows.length === 0 ? (
                    /* Stated plainly rather than left blank: a pull with no record
                       behind it is the exact situation an audit asks about. */
                    <div className="alert alert-warning border-0 fs-13 mb-0">
                        No authorization on file for this client. Any credit pull recorded before
                        the authorization checkboxes were introduced will have no record here.
                    </div>
                ) : (
                    <>
                        <div className="table-responsive">
                            <table className="table table-sm align-middle mb-0 fs-13">
                                <thead>
                                    <tr>
                                        <th>Agreed (UTC)</th>
                                        <th>Version</th>
                                        <th>Consents</th>
                                        <th>IP</th>
                                        <th>iSoftPull txn</th>
                                        <th className="text-end">PDF</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayedRows.map((row) => (
                                        <tr key={row.id}>
                                            <td>
                                                {row.consented_at
                                                    ? row.consented_at.replace('T', ' ').slice(0, 19)
                                                    : '—'}
                                            </td>
                                            <td>{row.authorization_version}</td>
                                            <td>
                                                {/* Two legally distinct consents, so both are
                                                    shown rather than a single "agreed". */}
                                                <span
                                                    className={`badge me-1 ${row.credit_authorization_accepted ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}
                                                >
                                                    FCRA
                                                </span>
                                                <span
                                                    className={`badge ${row.e_consent_accepted ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}
                                                >
                                                    E-SIGN
                                                </span>
                                            </td>
                                            <td>{row.ip_address || '—'}</td>
                                            <td>
                                                {row.isoftpull_transaction_id || (
                                                    <span className="text-muted">not recorded</span>
                                                )}
                                            </td>
                                            <td className="text-end">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-primary"
                                                    onClick={() => handleDownload(row)}
                                                    disabled={downloadingId === row.id}
                                                >
                                                    {downloadingId === row.id ? 'Preparing…' : 'Download'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {rows.length > 5 && (
                            <div className="text-center pt-3 border-top">
                                <button
                                    type="button"
                                    className="btn btn-link btn-sm text-decoration-none fw-medium text-primary p-0"
                                    onClick={() => setShowAll((prev) => !prev)}
                                >
                                    {showAll ? 'Show less' : 'See all'}
                                    <i className={`ri-arrow-${showAll ? 'up' : 'down'}-s-line ms-1 align-middle`} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
