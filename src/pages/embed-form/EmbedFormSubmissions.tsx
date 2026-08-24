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

    useEffect(() => { loadData(); }, [loadData]);

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
                toast.success('Status updated.');
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
            a.download = att.original_name || 'attachment';
            a.click();
            window.URL.revokeObjectURL(url);
        } catch {
            toast.error('Failed to download file.');
        }
    };

    // ── Templates ──
    const nameTemplate = (row: any) => (
        <span className="fw-semibold">{row.first_name} {row.last_name}</span>
    );

    const statusTemplate = (row: any) => (
        <Tag
            value={row.status?.toUpperCase()}
            severity={STATUS_SEVERITY[row.status] ?? 'info'}
            style={{ fontSize: '11px' }}
        />
    );

    const amountTemplate = (row: any) => (
        <span>{row.desired_funding_amount ? `$${parseFloat(row.desired_funding_amount).toLocaleString()}` : '—'}</span>
    );

    const dateTemplate = (row: any) => (
        <span>{row.created_at ? new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
    );

    const docsTemplate = (row: any) => (
        <span className="text-muted">{row.attachments?.length ?? 0} file(s)</span>
    );

    const actionTemplate = (row: any) => (
        <div className="d-flex justify-content-center gap-2">
            <Button
                icon="pi pi-eye"
                size="small"
                outlined
                severity="info"
                tooltip="View Details"
                tooltipOptions={{ position: 'top' }}
                onClick={() => viewDetail(row)}
            />
        </div>
    );

    return (
        <div>
            <PageHeader
                title="Form Submissions"
                breadcrumbs={[
                    { label: 'Settings', path: '/admin/settings' },
                    { label: 'Embed Form', path: '/embed-form/settings' },
                    { label: 'Submissions' },
                ]}
            />

            {/* Filters */}
            <div className="card shadow-none border mb-3">
                <div className="card-body py-3">
                    <div className="row g-2 align-items-end">
                        <div className="col-md-4">
                            <label className="form-label fw-semibold mb-1" style={{ fontSize: '12px' }}>Search</label>
                            <input
                                className="form-control form-control-sm"
                                placeholder="Name, email, phone..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label fw-semibold mb-1" style={{ fontSize: '12px' }}>Status</label>
                            <Dropdown
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.value)}
                                options={[{ label: 'All Statuses', value: '' }, ...STATUS_OPTIONS]}
                                optionLabel="label"
                                optionValue="value"
                                className="w-100"
                                placeholder="All Statuses"
                            />
                        </div>
                        <div className="col-md-auto d-flex gap-2">
                            <button className="btn btn-primary btn-sm" onClick={handleSearch}>
                                <i className="ri-search-line me-1" /> Search
                            </button>
                            <button className="btn btn-outline-secondary btn-sm" onClick={handleClear}>
                                <i className="ri-close-line me-1" /> Clear
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* DataTable */}
            {loading ? <TableLoader /> : (
                <DataTable
                    value={submissions}
                    lazy
                    paginator
                    rows={perPage}
                    totalRecords={totalRecords}
                    onPage={(e: any) => { setPage((e.page ?? 0) + 1); setPerPage(e.rows); }}
                    first={(page - 1) * perPage}
                    rowsPerPageOptions={[10, 15, 25, 50]}
                    emptyMessage="No submissions found."
                >
                    <Column field="submission_uid" header="Reference" style={{ fontSize: '12px' }} body={(row) => <code style={{ fontSize: '11px' }}>{row.submission_uid?.slice(0, 8)}...</code>} />
                    <Column header="Applicant" body={nameTemplate} />
                    <Column field="email" header="Email" />
                    <Column field="phone" header="Phone" body={(row) => row.phone || '—'} />
                    <Column header="Desired Amount" body={amountTemplate} />
                    <Column field="credit_score" header="Credit Score" body={(row) => row.credit_score || '—'} />
                    <Column header="Documents" body={docsTemplate} />
                    <Column header="Status" body={statusTemplate} />
                    <Column header="Submitted" body={dateTemplate} />
                    <Column
                        header="Action"
                        body={actionTemplate}
                        alignHeader="center"
                        align="center"
                        headerClassName="text-center"
                        bodyClassName="text-center"
                        style={{ width: '80px' }}
                    />
                </DataTable>
            )}

            {/* Detail Modal */}
            <Dialog
                visible={detailVisible}
                onHide={() => setDetailVisible(false)}
                header="Application Details"
                style={{ width: '680px' }}
                modal
                draggable={false}
            >
                {detailLoading ? (
                    <div className="text-center p-4"><i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem' }} /></div>
                ) : detailData ? (
                    <div>
                        {/* Status update */}
                        <div className="d-flex align-items-center gap-2 mb-4">
                            <span className="fw-semibold" style={{ fontSize: '13px' }}>Status:</span>
                            <Dropdown
                                value={detailData.status}
                                onChange={(e) => handleStatusChange(detailData.id, e.value)}
                                options={STATUS_OPTIONS}
                                optionLabel="label"
                                optionValue="value"
                                style={{ minWidth: '150px' }}
                            />
                        </div>

                        {/* Info grid */}
                        {[
                            { label: 'Full Name', value: `${detailData.first_name} ${detailData.last_name}` },
                            { label: 'Email', value: detailData.email },
                            { label: 'Phone', value: detailData.phone },
                            { label: 'Date of Birth', value: detailData.birthday },
                            { label: 'Credit Score', value: detailData.credit_score },
                            { label: 'Desired Amount', value: detailData.desired_funding_amount ? `$${parseFloat(detailData.desired_funding_amount).toLocaleString()}` : null },
                            { label: 'Home Address', value: [detailData.home_address, detailData.city, detailData.state, detailData.postal_code].filter(Boolean).join(', ') },
                            { label: 'Housing', value: `${detailData.housing_status || '—'} — ${detailData.monthly_housing_payment ? `$${detailData.monthly_housing_payment}/mo` : '—'}` },
                            { label: 'Employer', value: detailData.employer_name },
                            { label: 'Occupation', value: detailData.occupation },
                            { label: 'Annual Income', value: detailData.annual_income ? `$${parseFloat(detailData.annual_income).toLocaleString()}` : null },
                            { label: 'Sales Rep', value: detailData.sales_rep },
                            { label: 'Referral Source', value: detailData.referral_source },
                            { label: 'Submitted', value: detailData.created_at ? new Date(detailData.created_at).toLocaleString() : null },
                            { label: 'Origin URL', value: detailData.origin_url },
                        ].map(({ label, value }) => value ? (
                            <div key={label} className="d-flex border-bottom py-2" style={{ fontSize: '13px' }}>
                                <span className="text-muted fw-semibold" style={{ width: '160px', flexShrink: 0 }}>{label}</span>
                                <span style={{ wordBreak: 'break-all' }}>{value}</span>
                            </div>
                        ) : null)}

                        {/* Attachments */}
                        {detailData.attachments?.length > 0 && (
                            <div className="mt-4">
                                <h6 className="fw-bold mb-3">Uploaded Documents</h6>
                                {detailData.attachments.map((att: any) => (
                                    <div
                                        key={att.id}
                                        className="d-flex align-items-center justify-content-between border rounded p-2 mb-2"
                                        style={{ fontSize: '13px' }}
                                    >
                                        <div>
                                            <i className="ri-file-line me-2 text-primary" />
                                            <span className="fw-medium">{att.original_name}</span>
                                            <span className="text-muted ms-2" style={{ fontSize: '11px' }}>
                                                ({att.field_name?.replace(/_/g, ' ')})
                                            </span>
                                        </div>
                                        <Button
                                            icon="pi pi-download"
                                            size="small"
                                            outlined
                                            severity="success"
                                            tooltip="Download"
                                            tooltipOptions={{ position: 'top' }}
                                            onClick={() => handleDownload(att)}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : null}
            </Dialog>
        </div>
    );
}
