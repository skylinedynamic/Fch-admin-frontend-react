import React, { useCallback, useEffect, useState } from 'react';
import { DataTable } from '../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { Dropdown } from 'primereact/dropdown';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { toast } from 'react-toastify';
import PageHeader from '../common/PageHeader';
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

export default function EmbedFormSubmissions() {
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [totalRecords, setTotalRecords] = useState(0);

    // Filters
    const [searchText, setSearchText] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [appliedSearchText, setAppliedSearchText] = useState('');
    const [appliedStatus, setAppliedStatus] = useState<string>('');

    // Detail Modal
    const [detailVisible, setDetailVisible] = useState(false);
    const [detailData, setDetailData] = useState<any>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const payload: any = {
                search: appliedSearchText || undefined,
                status: appliedStatus || undefined,
                per_page: perPage,
                page,
            };
            const res = await fetchEmbedFormSubmissions(payload);
            if (res.status) {
                setSubmissions(res.data ?? []);
                setTotalRecords(res.meta?.total ?? 0);
            }
        } catch (err: any) {
            toast.error(err?.message || 'Failed to fetch form submissions');
        } finally {
            setLoading(false);
        }
    }, [appliedSearchText, appliedStatus, perPage, page]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            loadData();
        }, 200);
        return () => clearTimeout(timeout);
    }, [loadData]);

    const handleApplyFilters = () => {
        setAppliedSearchText(searchText);
        setAppliedStatus(selectedStatus);
        setPage(1);
    };

    const handleClearFilters = () => {
        setSearchText('');
        setSelectedStatus('');
        setAppliedSearchText('');
        setAppliedStatus('');
        setPage(1);
    };

    const onPage = (event: any) => {
        const nextPerPage = event.rows;
        const nextPage = Math.floor(event.first / event.rows) + 1;
        setPerPage(nextPerPage);
        setPage(nextPage);
    };

    const viewDetail = async (row: any) => {
        setDetailLoading(true);
        setDetailVisible(true);
        try {
            const res = await getEmbedFormSubmission(row.id);
            setDetailData(res.data);
        } catch {
            toast.error('Failed to load application details.');
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

    // ── Table Body Templates ──
    const applicantBodyTemplate = (rowData: any) => {
        return (
            <div>
                <div className="fw-medium text-dark">{rowData.first_name} {rowData.last_name}</div>
                {rowData.occupation && <div className="text-muted fs-11">{rowData.occupation}</div>}
            </div>
        );
    };

    const statusBodyTemplate = (rowData: any) => {
        const statusMap: Record<string, string> = {
            new: 'bg-primary-subtle text-primary',
            reviewing: 'bg-warning-subtle text-warning',
            converted: 'bg-success-subtle text-success',
            rejected: 'bg-danger-subtle text-danger',
        };
        const className = statusMap[rowData.status?.toLowerCase()] || 'bg-light text-body';
        return (
            <span className={`badge ${className} px-3 py-1 rounded-pill fw-medium text-uppercase`}>
                {rowData.status}
            </span>
        );
    };

    const amountBodyTemplate = (rowData: any) => {
        return (
            <span>
                {rowData.desired_funding_amount ? `$${parseFloat(rowData.desired_funding_amount).toLocaleString()}` : '-'}
            </span>
        );
    };

    const dateBodyTemplate = (rowData: any) => {
        return (
            <span className="text-muted fs-12">
                {rowData.created_at ? new Date(rowData.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
            </span>
        );
    };

    const docsBodyTemplate = (rowData: any) => {
        const count = rowData.attachments?.length ?? 0;
        return (
            <span className="badge bg-light text-dark border">
                <i className="ri-attachment-line me-1 text-primary"></i>
                {count} file(s)
            </span>
        );
    };

    const actionBodyTemplate = (rowData: any) => {
        return (
            <div className="d-flex align-items-center justify-content-center">
                <button
                    type="button"
                    className="btn btn-soft-primary btn-sm p-1 d-flex align-items-center justify-content-center"
                    style={{ width: '28px', height: '28px' }}
                    onClick={() => viewDetail(rowData)}
                    title="View Details"
                >
                    <i className="ri-eye-line fs-14"></i>
                </button>
            </div>
        );
    };

    return (
        <div className="page-content page-content-fit">
            <div className="container-fluid">
                {/* Header */}
                <PageHeader
                    title="Form Submissions"
                    breadcrumbs={[
                        { label: 'Embedded Form', path: '/embed-form/settings' },
                        { label: 'Submissions' }
                    ]}
                />

                {/* Filters and Table Section */}
                <div className="row row-table-fit">
                    <div className="col-lg-12">
                        <div className="card">
                            <div className="card-body">
                                {/* Filter Bar */}
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    handleApplyFilters();
                                }}>
                                    <div className="row g-3 mb-3">
                                        <div className="col-xxl-4 col-sm-12">
                                            <div className="search-box">
                                                <input
                                                    type="text"
                                                    className="form-control search bg-light border-light"
                                                    placeholder="Search here..."
                                                    value={searchText}
                                                    onChange={(e) => setSearchText(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                                                />
                                                <i className="ri-search-line search-icon"></i>
                                            </div>
                                        </div>
                                        <div className="col-xxl-3 col-sm-6">
                                            <Dropdown
                                                value={selectedStatus}
                                                options={[{ label: 'All Status', value: '' }, ...STATUS_OPTIONS]}
                                                onChange={(e) => setSelectedStatus(e.value)}
                                                optionLabel="label"
                                                optionValue="value"
                                                placeholder="All Status"
                                                className="w-100 employee-filter-dropdown"
                                            />
                                        </div>
                                        <div className="col-xxl-3 col-sm-6">
                                            <div className="d-flex gap-2">
                                                <button type="button" className="btn btn-warning flex-grow-1" onClick={handleApplyFilters}>
                                                    <i className="ri-equalizer-fill me-1 align-bottom"></i> Filters
                                                </button>
                                                <button type="button" className="btn btn-default flex-grow-1" onClick={handleClearFilters}>
                                                    <i className="ri-close-line me-1 align-bottom"></i> Clear
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </form>

                                {/* Table */}
                                {loading ? (
                                    <TableLoader rows={10} columns={new Array(8).fill({ style: { minWidth: '100px' } })} />
                                ) : (
                                    <div className="table-responsive table-card mt-1">
                                        <DataTable
                                            scrollable
                                            scrollHeight="flex"
                                            value={submissions}
                                            paginator
                                            lazy
                                            totalRecords={totalRecords}
                                            first={(page - 1) * perPage}
                                            rows={perPage}
                                            rowsPerPageOptions={[10, 25, 50, 100]}
                                            onPage={onPage}
                                            dataKey="id"
                                            responsiveLayout="scroll"
                                            className="p-datatable-sm"
                                            emptyMessage="No form submissions found"
                                        >
                                            <Column
                                                field="submission_uid"
                                                header="Ref ID"
                                                body={(rowData) => <code className="text-muted fs-11">#{rowData.submission_uid?.slice(0, 8)}</code>}
                                                style={{ minWidth: '110px' }}
                                            />
                                            <Column field="first_name" header="Applicant" body={applicantBodyTemplate} style={{ minWidth: '160px' }} />
                                            <Column field="email" header="Email" body={(rowData) => rowData.email || '-'} style={{ minWidth: '180px' }} />
                                            <Column field="phone" header="Phone" body={(rowData) => rowData.phone || '-'} style={{ minWidth: '130px' }} />
                                            <Column field="desired_funding_amount" header="Desired Amount" body={amountBodyTemplate} style={{ minWidth: '140px' }} />
                                            <Column field="credit_score" header="Credit Score" body={(rowData) => rowData.credit_score || '-'} style={{ minWidth: '120px' }} />
                                            <Column header="Documents" body={docsBodyTemplate} style={{ minWidth: '120px' }} />
                                            <Column field="status" header="Status" body={statusBodyTemplate} style={{ minWidth: '120px' }} />
                                            <Column header="Date Submitted" body={dateBodyTemplate} style={{ minWidth: '130px' }} />
                                            <Column
                                                header="Action"
                                                body={actionBodyTemplate}
                                                alignHeader="center"
                                                align="center"
                                                headerClassName="text-center"
                                                bodyClassName="text-center"
                                                style={{ width: '80px', minWidth: '80px' }}
                                            />
                                        </DataTable>
                                    </div>
                                )}
                            </div>
                        </div>
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
                                    <span className={`badge bg-primary-subtle text-primary px-3 py-1 rounded-pill fw-medium text-uppercase mt-1`}>
                                        {detailData.status}
                                    </span>
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
