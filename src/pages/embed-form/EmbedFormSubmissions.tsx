import React, { useCallback, useEffect, useState } from 'react';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { toast } from 'react-toastify';
import PageHeader from '../common/PageHeader';
import { DataTable } from '../../components/Table/DataTableWrapper';
import TableLoader from '../../components/Loader/TableLoader';
import {
    fetchEmbedFormSubmissions,
    getEmbedFormSubmission,
    updateEmbedFormSubmissionStatus,
    downloadEmbedFormAttachment,
} from '../../modules/embed-form/services';

const STATUS_OPTIONS = [
    { label: 'New', value: 'new' },
    { label: 'Reviewing', value: 'reviewing' },
    { label: 'Converted', value: 'converted' },
    { label: 'Rejected', value: 'rejected' },
];

const STATUS_SEVERITY: Record<string, 'info' | 'warning' | 'success' | 'danger'> = {
    new: 'info',
    reviewing: 'warning',
    converted: 'success',
    rejected: 'danger',
};

export default function EmbedFormSubmissions() {
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(15);
    const [totalRecords, setTotalRecords] = useState(0);
    const [searchText, setSearchText] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [appliedStatus, setAppliedStatus] = useState<string>('');

    // Detail modal
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailData, setDetailData] = useState<any>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const payload: any = {
                search: appliedSearch || undefined,
                status: appliedStatus || undefined,
                per_page: perPage,
                page,
            };
            const res = await fetchEmbedFormSubmissions(payload);
            if (res.status) {
                setSubmissions(res.data ?? []);
                setTotalRecords(res.meta?.total ?? 0);
            }
        } catch {
            toast.error('Failed to load submissions.');
        } finally {
            setLoading(false);
        }
    }, [appliedSearch, appliedStatus, perPage, page]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSearch = () => {
        setAppliedSearch(searchText);
        setAppliedStatus(selectedStatus);
        setPage(1);
    };

    const handleClear = () => {
        setSearchText('');
        setSelectedStatus('');
        setAppliedSearch('');
        setAppliedStatus('');
        setPage(1);
    };

    const viewDetail = async (row: any) => {
        setDetailLoading(true);
        setDetailVisible(true);
        try {
            const res = await getEmbedFormSubmission(row.id);
            setDetailData(res.data);
        } catch {
            toast.error('Failed to load submission details.');
        } finally {
            setDetailLoading(false);
        }
    };

    const handleStatusChange = async (id: number, status: string) => {
        try {
            const res = await updateEmbedFormSubmissionStatus(id, status);
            if (res.status) {
                toast.success('Status updated successfully.');
                if (detailData?.id === id) setDetailData({ ...detailData, status });
                setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
            }
        } catch {
            toast.error('Failed to update status.');
        }
    };

    const handleDownload = async (att: any) => {
        try {
            const res = await downloadEmbedFormAttachment(att.id);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = att.original_name || 'document';
            a.click();
            window.URL.revokeObjectURL(url);
        } catch {
            toast.error('Failed to download document.');
        }
    };

    // ── Table Cell Renderers ──
    const nameTemplate = (row: any) => (
        <div>
            <div className="fw-semibold text-dark">{row.first_name} {row.last_name}</div>
            <div className="text-muted fs-11">{row.occupation || 'Applicant'}</div>
        </div>
    );

    const statusTemplate = (row: any) => (
        <Tag
            value={row.status?.toUpperCase()}
            severity={STATUS_SEVERITY[row.status] ?? 'info'}
            style={{ fontSize: '11px', letterSpacing: '0.5px' }}
        />
    );

    const amountTemplate = (row: any) => (
        <span className="fw-semibold text-success">
            {row.desired_funding_amount ? `$${parseFloat(row.desired_funding_amount).toLocaleString()}` : '—'}
        </span>
    );

    const dateTemplate = (row: any) => (
        <span className="text-muted fs-12">
            {row.created_at ? new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
        </span>
    );

    const docsTemplate = (row: any) => (
        <span className="badge bg-light text-dark border">
            <i className="ri-attachment-line me-1 text-primary" />
            {row.attachments?.length ?? 0} file(s)
        </span>
    );

    const actionTemplate = (row: any) => (
        <div className="d-flex justify-content-center gap-2">
            <button
                type="button"
                className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1"
                onClick={() => viewDetail(row)}
                title="View Full Application"
            >
                <i className="ri-eye-line" /> Details
            </button>
        </div>
    );

    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Header */}
                <PageHeader
                    title="Form Submissions"
                    breadcrumbs={[
                        { label: 'Embedded Form', path: '/embed-form/settings' },
                        { label: 'Submissions' }
                    ]}
                />

                {/* Filter Card */}
                <div className="card shadow-sm border-0 mb-4">
                    <div className="card-body p-3">
                        <div className="row g-3 align-items-end">
                            <div className="col-md-5">
                                <label className="form-label fw-semibold fs-12 mb-1">Search Submissions</label>
                                <div className="input-group">
                                    <span className="input-group-text bg-light text-muted">
                                        <i className="ri-search-line" />
                                    </span>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        placeholder="Applicant name, email, phone, employer..."
                                        value={searchText}
                                        onChange={(e) => setSearchText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    />
                                </div>
                            </div>
                            <div className="col-md-3">
                                <label className="form-label fw-semibold fs-12 mb-1">Filter by Status</label>
                                <Dropdown
                                    value={selectedStatus}
                                    onChange={(e) => setSelectedStatus(e.value)}
                                    options={[{ label: 'All Statuses', value: '' }, ...STATUS_OPTIONS]}
                                    optionLabel="label"
                                    optionValue="value"
                                    className="w-100 p-inputtext-sm"
                                    placeholder="All Statuses"
                                />
                            </div>
                            <div className="col-md-auto d-flex gap-2">
                                <button className="btn btn-primary btn-sm px-3" onClick={handleSearch}>
                                    <i className="ri-search-line me-1" /> Search
                                </button>
                                <button className="btn btn-outline-secondary btn-sm px-3" onClick={handleClear}>
                                    <i className="ri-refresh-line me-1" /> Reset
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* DataTable Card */}
                <div className="card shadow-sm border-0">
                    <div className="card-body p-0">
                        {loading ? (
                            <TableLoader />
                        ) : (
                            <DataTable
                                value={submissions}
                                lazy
                                paginator
                                rows={perPage}
                                totalRecords={totalRecords}
                                onPage={(e: any) => { setPage((e.page ?? 0) + 1); setPerPage(e.rows); }}
                                first={(page - 1) * perPage}
                                rowsPerPageOptions={[10, 15, 25, 50]}
                                emptyMessage="No client form submissions found."
                                className="table align-middle"
                            >
                                <Column
                                    field="submission_uid"
                                    header="Ref ID"
                                    body={(row) => <code className="text-muted fs-11">#{row.submission_uid?.slice(0, 8)}</code>}
                                    style={{ width: '110px' }}
                                />
                                <Column header="Applicant" body={nameTemplate} />
                                <Column field="email" header="Email Address" />
                                <Column field="phone" header="Phone" body={(row) => row.phone || '—'} />
                                <Column header="Desired Amount" body={amountTemplate} />
                                <Column field="credit_score" header="Credit Score" body={(row) => row.credit_score ? <span className="fw-semibold">{row.credit_score}</span> : '—'} />
                                <Column header="Documents" body={docsTemplate} />
                                <Column header="Status" body={statusTemplate} />
                                <Column header="Date Submitted" body={dateTemplate} />
                                <Column
                                    header="Action"
                                    body={actionTemplate}
                                    alignHeader="center"
                                    align="center"
                                    headerClassName="text-center"
                                    bodyClassName="text-center"
                                    style={{ width: '110px' }}
                                />
                            </DataTable>
                        )}
                    </div>
                </div>

                {/* Application Detail Modal */}
                <Dialog
                    visible={detailVisible}
                    onHide={() => setDetailVisible(false)}
                    header="Applicant Full Profile"
                    style={{ width: '720px' }}
                    modal
                    draggable={false}
                >
                    {detailLoading ? (
                        <div className="text-center p-5">
                            <div className="spinner-border text-primary" role="status" />
                        </div>
                    ) : detailData ? (
                        <div>
                            {/* Top Status Banner */}
                            <div className="d-flex justify-content-between align-items-center p-3 bg-light rounded border mb-4">
                                <div>
                                    <span className="text-muted fs-12 d-block">Application Status:</span>
                                    <Tag
                                        value={detailData.status?.toUpperCase()}
                                        severity={STATUS_SEVERITY[detailData.status] ?? 'info'}
                                        className="mt-1"
                                    />
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <span className="fw-semibold fs-13 text-muted">Change Status:</span>
                                    <Dropdown
                                        value={detailData.status}
                                        onChange={(e) => handleStatusChange(detailData.id, e.value)}
                                        options={STATUS_OPTIONS}
                                        optionLabel="label"
                                        optionValue="value"
                                        style={{ minWidth: '150px' }}
                                    />
                                </div>
                            </div>

                            {/* Section 1: Personal & Loan */}
                            <h6 className="fw-bold text-primary border-bottom pb-2 mb-3">
                                <i className="ri-user-3-line me-1" /> Personal & Funding Details
                            </h6>
                            <div className="row g-2 fs-13 mb-4">
                                <div className="col-sm-6">
                                    <span className="text-muted d-block fw-semibold">Full Name:</span>
                                    <span className="fw-bold text-dark">{detailData.first_name} {detailData.last_name}</span>
                                </div>
                                <div className="col-sm-6">
                                    <span className="text-muted d-block fw-semibold">Email:</span>
                                    <span>{detailData.email}</span>
                                </div>
                                <div className="col-sm-6">
                                    <span className="text-muted d-block fw-semibold">Phone:</span>
                                    <span>{detailData.phone || '—'}</span>
                                </div>
                                <div className="col-sm-6">
                                    <span className="text-muted d-block fw-semibold">Date of Birth:</span>
                                    <span>{detailData.birthday || '—'}</span>
                                </div>
                                <div className="col-sm-6">
                                    <span className="text-muted d-block fw-semibold">Desired Funding:</span>
                                    <span className="text-success fw-bold">
                                        {detailData.desired_funding_amount ? `$${parseFloat(detailData.desired_funding_amount).toLocaleString()}` : '—'}
                                    </span>
                                </div>
                                <div className="col-sm-6">
                                    <span className="text-muted d-block fw-semibold">Estimated Credit Score:</span>
                                    <span className="fw-bold">{detailData.credit_score || '—'}</span>
                                </div>
                            </div>

                            {/* Section 2: Living & Housing */}
                            <h6 className="fw-bold text-primary border-bottom pb-2 mb-3">
                                <i className="ri-home-4-line me-1" /> Living Information
                            </h6>
                            <div className="row g-2 fs-13 mb-4">
                                <div className="col-sm-6">
                                    <span className="text-muted d-block fw-semibold">Home Address:</span>
                                    <span>{[detailData.home_address, detailData.city, detailData.state, detailData.postal_code].filter(Boolean).join(', ') || '—'}</span>
                                </div>
                                <div className="col-sm-6">
                                    <span className="text-muted d-block fw-semibold">Housing Status:</span>
                                    <span>{detailData.housing_status || '—'} {detailData.monthly_housing_payment ? `($${detailData.monthly_housing_payment}/mo)` : ''}</span>
                                </div>
                            </div>

                            {/* Section 3: Employer */}
                            <h6 className="fw-bold text-primary border-bottom pb-2 mb-3">
                                <i className="ri-briefcase-line me-1" /> Employment Information
                            </h6>
                            <div className="row g-2 fs-13 mb-4">
                                <div className="col-sm-6">
                                    <span className="text-muted d-block fw-semibold">Employer Name:</span>
                                    <span>{detailData.employer_name || '—'}</span>
                                </div>
                                <div className="col-sm-6">
                                    <span className="text-muted d-block fw-semibold">Employer Phone:</span>
                                    <span>{detailData.employer_phone || '—'}</span>
                                </div>
                                <div className="col-sm-6">
                                    <span className="text-muted d-block fw-semibold">Occupation / Job Title:</span>
                                    <span>{detailData.occupation || '—'}</span>
                                </div>
                                <div className="col-sm-6">
                                    <span className="text-muted d-block fw-semibold">Annual Income:</span>
                                    <span className="fw-bold">
                                        {detailData.annual_income ? `$${parseFloat(detailData.annual_income).toLocaleString()}` : '—'}
                                    </span>
                                </div>
                            </div>

                            {/* Section 4: Uploaded Documents */}
                            <h6 className="fw-bold text-primary border-bottom pb-2 mb-3">
                                <i className="ri-attachment-line me-1" /> Uploaded Documents ({detailData.attachments?.length ?? 0})
                            </h6>
                            {detailData.attachments?.length > 0 ? (
                                <div className="row g-2 mb-3">
                                    {detailData.attachments.map((att: any) => (
                                        <div key={att.id} className="col-12">
                                            <div className="d-flex align-items-center justify-content-between p-2 border rounded bg-white">
                                                <div className="d-flex align-items-center gap-2">
                                                    <div className="avatar-xs flex-shrink-0 d-flex align-items-center justify-content-center bg-primary-subtle text-primary rounded">
                                                        <i className="ri-file-text-line" />
                                                    </div>
                                                    <div>
                                                        <div className="fw-semibold text-dark fs-13">{att.original_name}</div>
                                                        <div className="text-muted fs-11 text-capitalize">
                                                            {att.field_name?.replace(/_/g, ' ')} &bull; {att.file_size ? `${(att.file_size / 1024).toFixed(0)} KB` : ''}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button
                                                    icon="pi pi-download"
                                                    label="Download"
                                                    size="small"
                                                    severity="success"
                                                    outlined
                                                    onClick={() => handleDownload(att)}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted fs-13">No documents attached.</p>
                            )}

                            {/* Submission Metadata */}
                            <div className="bg-light p-3 rounded fs-12 text-muted mt-3">
                                <div className="row g-1">
                                    <div className="col-sm-6"><strong>Reference UID:</strong> {detailData.submission_uid}</div>
                                    <div className="col-sm-6"><strong>Date Submitted:</strong> {detailData.created_at ? new Date(detailData.created_at).toLocaleString() : '—'}</div>
                                    {detailData.sales_rep && <div className="col-sm-6"><strong>Sales Rep:</strong> {detailData.sales_rep}</div>}
                                    {detailData.referral_source && <div className="col-sm-6"><strong>Referral Source:</strong> {detailData.referral_source}</div>}
                                </div>
                            </div>
                        </div>
                    ) : null}
                </Dialog>
            </div>
        </div>
    );
}
