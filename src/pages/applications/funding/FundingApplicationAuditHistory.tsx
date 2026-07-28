import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { useFundingApplicationDetails, useFundingApplicationAuditHistory } from '../../../modules/application/queries';
import { downloadHistoryFile } from '../../../modules/application/services';
import { FundingApplicationDetails as FundingApplicationDetailsType } from '../../../modules/application/types';
import { DataTable } from '../../../components/Table/DataTableWrapper';
import { Column } from 'primereact/column';
import { FilterMatchMode } from 'primereact/api';
import TableLoader from '../../../components/Loader/TableLoader';

export default function FundingApplicationAuditHistory() {
    const { id } = useParams();
    const { data: apiResponse, isLoading: isLoadingApp, error } = useFundingApplicationDetails(id || '');
    const [selectedRow, setSelectedRow] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    
    // Pagination state
    const [page, setPage] = useState<number>(1);
    const [perPage, setPerPage] = useState<number>(10);
    const [sortField, setSortField] = useState<string>('downloaded_at');
    const [sortOrder, setSortOrder] = useState<number>(-1);
    const [globalFilterValue, setGlobalFilterValue] = useState<string>('');
    const [appliedSearch, setAppliedSearch] = useState<string>('');

    const { data: auditResponse, isLoading: isLoadingAudit, isFetching: isFetchingAudit } = useFundingApplicationAuditHistory(id || '', {
        page,
        per_page: perPage,
        sort_by: sortField,
        sort_dir: sortOrder === 1 ? 'asc' : 'desc',
        search: appliedSearch
    });

    const handleApplyFilters = () => {
        setAppliedSearch(globalFilterValue);
        setPage(1);
    };

    const handleClearFilters = () => {
        setGlobalFilterValue('');
        setAppliedSearch('');
        setPage(1);
    };

    useEffect(() => {
        document.body.classList.add('table-page-fit-active');
        return () => document.body.classList.remove('table-page-fit-active');
    }, []);

    const app = (apiResponse?.data || apiResponse || {}) as FundingApplicationDetailsType;
    const auditData = auditResponse?.data || [];
    const totalRecords = auditResponse?.meta?.total || 0;
    const isLoading = isLoadingApp || isLoadingAudit || isFetchingAudit;

    const onPage = (event: any) => {
        setPage(event.page + 1);
        setPerPage(event.rows);
    };

    if (error) {
        return <div className="p-5 text-center text-danger">Failed to load application details.</div>;
    }

    // Map file types to human readable names
    const getDocumentName = (type: string) => {
        switch (type) {
            case 'application_pdf': return <><i className="ri-file-pdf-fill text-danger align-middle me-1 fs-15"></i> Funding Application PDF</>;
            case 'signature_certificate': return <><i className="ri-file-pdf-fill text-danger align-middle me-1 fs-15"></i> Signature Certificate PDF</>;
            case 'application_zip': return <><i className="ri-folder-zip-fill text-warning align-middle me-1 fs-15"></i> Funding Documents ZIP</>;
            default: return type;
        }
    };



    return (
        <div className="page-content page-content-fit employee-section">
            <div className="container-fluid">
                {/* Header */}
                <div className="row pb-1">
                    <div className="col-12">
                        <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between py-2 gap-3">
                            <div className="flex-grow-1 overflow-hidden" style={{ width: '100%' }}>
                                <h4 className="fs-20 mb-1 text-truncate">
                                    Document Audit History
                                </h4>
                                <nav aria-label="breadcrumb" className="d-block w-100 overflow-hidden">
                                    <ol className="breadcrumb m-0 flex-nowrap text-truncate">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item"><Link to="/intake-review/funding-application">Funding Applications</Link></li>
                                        <li className="breadcrumb-item"><Link to={`/intake-review/funding-application/${id}`}>Details</Link></li>
                                        <li className="breadcrumb-item active text-truncate" aria-current="page" style={{ display: 'flex', alignItems: 'center' }}>
                                            Audit History 
                                            {isLoading ? (
                                                <span className="badge bg-primary-subtle ms-2 skeleton-line" style={{ width: '80px', height: '20px', display: 'inline-block' }}></span>
                                            ) : (
                                                <span className="badge bg-primary-subtle text-primary ms-2 fs-12">
                                                    ({totalRecords} Downloads)
                                                </span>
                                            )}
                                        </li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="page-actions flex-shrink-0 mt-3 mt-sm-0">
                                <Link to={`/intake-review/funding-application/${id}`} className="btn btn-outline-secondary w-lg waves-effect">
                                    <i className="ri-arrow-left-line align-middle me-1"></i> Back
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row row-table-fit mt-3">


                    <div className="col-12">
                        <div className="card shadow-sm border-0">
                            <div className="card-body">
                                <form onSubmit={(e) => { e.preventDefault(); handleApplyFilters(); }}>
                                    <div className="row g-2 mb-3">
                                        <div className="col-12 col-md">
                                            <div className="search-box">
                                                <input
                                                    type="text"
                                                    className="form-control search bg-light border-light"
                                                    placeholder="Search history..."
                                                    value={globalFilterValue}
                                                    onChange={(e) => setGlobalFilterValue(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                                                />
                                                <i className="ri-search-line search-icon"></i>
                                            </div>
                                        </div>
                                        <div className="col-12 col-md-4 col-xxl-3">
                                            <div className="d-flex gap-2 h-100">
                                                <button type="submit" className="btn btn-warning flex-grow-1" onClick={handleApplyFilters}>
                                                    <i className="ri-equalizer-fill me-1 align-bottom"></i> Filters
                                                </button>
                                                <button type="button" className="btn btn-default flex-grow-1" onClick={handleClearFilters}>
                                                    <i className="ri-close-line me-1 align-bottom"></i> Clear
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                                <div className="table-responsive table-card mt-1">
                                    {isLoading ? (
                                        <TableLoader rows={10} columns={new Array(8).fill({ style: { minWidth: '150px' } })} />
                                    ) : (
                                        <DataTable
                                            lazy
                                            scrollable scrollHeight="flex" responsiveLayout="scroll"
                                            totalRecords={totalRecords}
                                            first={(page - 1) * perPage}
                                            onPage={onPage}
                                            value={auditData}
                                            sortField={sortField}
                                            sortOrder={sortOrder}
                                            onSort={(e) => {
                                                setSortField(e.sortField || 'downloaded_at');
                                                setSortOrder(e.sortOrder || -1);
                                            }}
                                            paginator
                                            rows={perPage}
                                            rowsPerPageOptions={[10, 25, 50]}
                                            className="p-datatable-sm p-datatable-hoverable-rows"
                                            emptyMessage="No history found."
                                        >
                                        <Column field="downloaded_at" header="Date" body={(rowData) => <span className="text-nowrap">{rowData.downloaded_at}</span>} sortable></Column>
                                        <Column field="user_name" header="Name" body={(rowData) => (
                                            <span className="text-nowrap">
                                                {rowData.user_name || 'System'} <span className="text-muted">({rowData.user_type ? rowData.user_type.charAt(0).toUpperCase() + rowData.user_type.slice(1) : 'System'})</span>
                                            </span>
                                        )} sortable></Column>
                                        <Column field="application_number" header="App Number" body={(rowData) => <span>{rowData.application_number || app.application_number || (app.id ? `APP-${app.id}` : 'N/A')}</span>} sortable></Column>
                                        <Column field="certificate_id" header="Cert ID" body={(rowData) => rowData.certificate_id ? <span className="text-muted">{rowData.certificate_id}</span> : <span className="text-muted fst-italic">-</span>} sortable></Column>
                                        <Column field="application_version" header="Version" body={(rowData) => <span className="badge bg-light text-dark border">{rowData.application_version || '1.0'}</span>} sortable></Column>
                                        <Column field="sha256_hash" header="SHA-256 Hash" body={(rowData) => (
                                            <div title={rowData.sha256_hash} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                                                {rowData.sha256_hash}
                                            </div>
                                        )} sortable></Column>
                                        <Column field="ip_address" header="IP Address" sortable></Column>
                                        <Column header="Action" body={(rowData) => (
                                            <button className="btn btn-sm btn-primary px-2 d-inline-flex align-items-center gap-1" onClick={() => { setSelectedRow(rowData); setIsModalOpen(true); }} title="View Details">
                                                <i className="ri-eye-line align-middle"></i> Details
                                            </button>
                                        )}></Column>
                                    </DataTable>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Modal isOpen={isModalOpen} toggle={() => setIsModalOpen(false)} onClosed={() => setSelectedRow(null)} size="lg" centered modalClassName="flip">
                <ModalHeader toggle={() => setIsModalOpen(false)} className="fs-16">Download Activity Details</ModalHeader>
                <ModalBody>
                    {selectedRow && (
                        <div>
                            <div className="row mb-3">
                                <div className="col-md-6 mb-3 mb-md-0">
                                    <h6 className="text-muted fs-13 mb-1">Downloaded Document</h6>
                                    <p className="fw-medium mb-0 text-dark fs-14 d-flex align-items-center">
                                        {getDocumentName(selectedRow.file_type)}
                                    </p>
                                </div>
                                <div className="col-md-6">
                                    <h6 className="text-muted fs-13 mb-1">Date</h6>
                                    <p className="fw-medium mb-0 fs-14">{selectedRow.downloaded_at}</p>
                                </div>
                            </div>

                            <div className="row mb-3">
                                <div className="col-md-6 mb-3 mb-md-0">
                                    <h6 className="text-muted fs-13 mb-1">Action Event</h6>
                                    <p className="fw-medium mb-0">
                                        <span className={`badge text-wrap text-capitalize ${selectedRow.action === 'generated' ? 'bg-success' :
                                            selectedRow.action?.includes('with_password') ? 'bg-warning' : 'bg-primary'
                                            }`}>
                                            {selectedRow.action?.replace(/_/g, ' ')}
                                        </span>
                                    </p>
                                </div>
                                <div className="col-md-6 mb-3 mb-md-0">
                                    <h6 className="text-muted fs-13 mb-1">User</h6>
                                    <p className="fw-medium mb-0 text-capitalize">
                                        {selectedRow.user_name || 'System'} - {selectedRow.user_type || 'System'}
                                    </p>
                                </div>
                            </div>

                            <hr className="my-3 border-dashed" />

                            <div className="row mb-3">
                                <div className="col-md-4 mb-3 mb-md-0">
                                    <h6 className="text-muted fs-13 mb-1">App Version</h6>
                                    <p className="fw-medium mb-0"><span className="badge bg-light text-dark border fs-12">{selectedRow.application_version || '1.0'}</span></p>
                                </div>
                                <div className="col-md-4 mb-3 mb-md-0">
                                    <h6 className="text-muted fs-13 mb-1">App Number</h6>
                                    <p className="fw-medium mb-0">{selectedRow.application_number || (app.id ? `APP-${app.id}` : 'N/A')}</p>
                                </div>
                                <div className="col-md-4">
                                    <h6 className="text-muted fs-13 mb-1">Cert ID</h6>
                                    <p className="fw-medium mb-0">{selectedRow.certificate_id ? selectedRow.certificate_id : <span className="text-muted fst-italic">N/A</span>}</p>
                                </div>
                            </div>

                            <div className="mb-3">
                                <h6 className="text-muted fs-13 mb-1">Exact SHA-256 Hash</h6>
                                <div className="p-3 bg-light rounded text-break font-monospace fs-13 border">
                                    {selectedRow.sha256_hash}
                                </div>
                                <p className="text-muted fs-12 mt-2 mb-0">
                                    <i className="ri-information-line align-middle me-1"></i>
                                    If this exact document version is downloaded again, this hash will precisely match. If the application version was updated or changed, a new hash will be generated.
                                </p>
                            </div>

                            {selectedRow.details?.password && (
                                <div className="mb-3">
                                    <h6 className="text-muted fs-13 mb-1">Document Password Used</h6>
                                    <div className="p-2 bg-warning-subtle text-warning-emphasis border border-warning-subtle rounded fs-13">
                                        <i className="ri-lock-password-line align-middle me-1"></i>
                                        <span className="font-monospace fw-medium">{selectedRow.details.password}</span>
                                    </div>
                                </div>
                            )}

                            {selectedRow.details?.device_type && (
                                <>
                                    <hr className="my-3 border-dashed" />
                                    <h6 className="fs-14 fw-bold mb-3 text-dark">
                                        <i className="ri-computer-line text-info align-middle me-1"></i>
                                        Downloader Device Details
                                    </h6>
                                    <div className="row g-3 mb-3">
                                        <div className="col-md-4">
                                            <span className="text-muted fs-12 d-block">Operating System</span>
                                            <span className="fw-medium fs-13">{selectedRow.details.operating_system || 'N/A'}</span>
                                        </div>
                                        <div className="col-md-4">
                                            <span className="text-muted fs-12 d-block">Browser</span>
                                            <span className="fw-medium fs-13">
                                                {selectedRow.details.browser_name || 'N/A'} {selectedRow.details.browser_version !== 'Unknown' ? selectedRow.details.browser_version : ''}
                                            </span>
                                        </div>
                                        <div className="col-md-4">
                                            <span className="text-muted fs-12 d-block">Device Type</span>
                                            <span className="fw-medium fs-13">{selectedRow.details.device_type || 'N/A'}</span>
                                        </div>
                                        <div className="col-md-12">
                                            <span className="text-muted fs-12 d-block">User Agent</span>
                                            <div className="p-2 bg-light rounded font-monospace fs-12 text-break mt-1">
                                                {selectedRow.details.user_agent || 'N/A'}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {(app as any).signature_data && (
                                <>
                                    <hr className="my-3 border-dashed" />
                                    <h6 className="fs-14 fw-bold mb-3 text-dark">
                                        <i className="ri-shield-check-fill text-success align-middle me-1"></i>
                                        Signature & Audit Log Details
                                    </h6>
                                    <div className="row g-3 mb-3">
                                        <div className="col-md-4">
                                            <span className="text-muted fs-12 d-block">Public IP Address</span>
                                            <span className="fw-medium fs-13">{(app as any).signature_data.ip_address || 'N/A'}</span>
                                        </div>
                                        <div className="col-md-4">
                                            <span className="text-muted fs-12 d-block">Browser</span>
                                            <span className="fw-medium fs-13">
                                                {(app as any).signature_data.browser_name || 'N/A'} {(app as any).signature_data.browser_version !== 'Unknown' ? (app as any).signature_data.browser_version : ''}
                                            </span>
                                        </div>
                                        <div className="col-md-4">
                                            <span className="text-muted fs-12 d-block">Operating System</span>
                                            <span className="fw-medium fs-13">{(app as any).signature_data.operating_system || 'N/A'}</span>
                                        </div>
                                        <div className="col-md-4">
                                            <span className="text-muted fs-12 d-block">Device Type</span>
                                            <span className="fw-medium fs-13">{(app as any).signature_data.device_type || 'N/A'}</span>
                                        </div>
                                        <div className="col-md-4">
                                            <span className="text-muted fs-12 d-block">Timezone</span>
                                            <span className="fw-medium fs-13">{(app as any).signature_data.timezone || 'N/A'}</span>
                                        </div>
                                        <div className="col-md-4">
                                            <span className="text-muted fs-12 d-block">Signature Timestamp</span>
                                            <span className="fw-medium fs-13">{(app as any).signature_data?.signed_at || 'N/A'}</span>
                                        </div>
                                        <div className="col-md-12">
                                            <span className="text-muted fs-12 d-block">User Agent</span>
                                            <div className="p-2 bg-light rounded font-monospace fs-12 text-break mt-1">
                                                {(app as any).signature_data.user_agent || 'N/A'}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <h6 className="fs-13 fw-bold mb-2 text-dark mt-3">Document Policies</h6>
                                    <div className="row g-2 mb-3">
                                        <div className="col-md-4">
                                            <span className="text-muted fs-12 d-block">Terms & Conditions</span>
                                            <span className="badge bg-success-subtle text-success">Agreed</span>
                                        </div>
                                        <div className="col-md-4">
                                            <span className="text-muted fs-12 d-block">Privacy Policy</span>
                                            <span className="badge bg-success-subtle text-success">Agreed</span>
                                        </div>
                                        <div className="col-md-4">
                                            <span className="text-muted fs-12 d-block">Credit Authorization</span>
                                            <span className="badge bg-success-subtle text-success">Agreed</span>
                                        </div>
                                    </div>
                                    {(() => {
                                        const sigData = (app as any).signature_data;
                                        if (!sigData || !sigData.consents_data) return null;
                                        let consents = [];
                                        try {
                                            consents = typeof sigData.consents_data === 'string' ? JSON.parse(sigData.consents_data) : sigData.consents_data;
                                        } catch (e) {
                                            return null;
                                        }
                                        if (!Array.isArray(consents)) return null;

                                        return (
                                            <>
                                                <h6 className="fs-13 fw-bold mb-2 text-dark mt-3">Consent Log</h6>
                                                <div className="table-responsive">
                                                    <table className="table table-sm table-bordered fs-12 mb-0">
                                                        <thead className="table-light">
                                                            <tr>
                                                                <th>Consent Type</th>
                                                                <th className="text-center">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {consents.map((consent: any, idx: number) => (
                                                                <tr key={idx}>
                                                                    <td className="text-wrap" style={{ maxWidth: '300px' }}>{consent.label}</td>
                                                                    <td className="text-center">
                                                                        {consent.checked ? <span className="badge bg-success-subtle text-success">Agreed</span> : <span className="badge bg-danger-subtle text-danger">Not Agreed</span>}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </>
                            )}
                        </div>
                    )}
                </ModalBody>
                <ModalFooter className="d-flex justify-content-between w-100">
                    <div>
                        {selectedRow?.details?.file_path && (
                            <button 
                                className="btn btn-primary" 
                                disabled={isDownloading}
                                onClick={async () => {
                                    try {
                                        setIsDownloading(true);
                                        let defaultName = `Document_${selectedRow.id}.pdf`;
                                        if (selectedRow.file_type === 'application_zip') {
                                            defaultName = `Funding_Documents_${selectedRow.application_number || selectedRow.id}.zip`;
                                        } else if (selectedRow.file_type === 'signature_certificate') {
                                            defaultName = `Signature_Certificate_${selectedRow.application_number || selectedRow.id}.pdf`;
                                        } else if (selectedRow.file_type === 'application_pdf') {
                                            defaultName = `Funding_Application_${selectedRow.application_number || selectedRow.id}.pdf`;
                                        }
                                        await downloadHistoryFile(selectedRow.id, defaultName);
                                    } catch (err) {
                                        console.error('Failed to download file', err);
                                        alert('Failed to download file.');
                                    } finally {
                                        setIsDownloading(false);
                                    }
                                }}
                            >
                                {isDownloading ? (
                                    <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Downloading...</>
                                ) : (
                                    <><i className="ri-download-2-line align-middle me-1"></i> Download Document</>
                                )}
                            </button>
                        )}
                        {!selectedRow?.details?.file_path && selectedRow !== null && (
                            <span className="text-muted fs-13 fst-italic">
                                <i className="ri-information-line align-middle me-1"></i>
                                Document file is not available for this record
                            </span>
                        )}
                    </div>
                    <div>
                        <button className="btn btn-light" onClick={() => setIsModalOpen(false)}>Close</button>
                    </div>
                </ModalFooter>
            </Modal>
        </div>
    );
}
