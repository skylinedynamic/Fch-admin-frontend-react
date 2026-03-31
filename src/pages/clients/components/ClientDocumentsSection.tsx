import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchBorrowerDocuments, downloadBorrowerDocument, attachBorrowerDocuments, updateBorrowerDocumentStatus, fetchBorrowerDocumentTypes } from '../../../modules/client/services';
import { toast } from 'react-toastify';
import { getFileConfig, getFileTypeLabel } from '../../../config/fileTypeConfig';
import { DOCUMENT_STATUS, getDocumentStatusLabel } from '../../../config/documentStatus';
import { handleFileDownload } from '../../../utils/fileDownload';
import { Skeleton } from 'primereact/skeleton';
// @ts-ignore
import { FileManagerModal } from '../../../components/FileManagerModal/FileManagerModal';
import { Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, Input, UncontrolledTooltip, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { useAuthStore } from '../../../store/auth/authStore';
// @ts-ignore
import DeleteConfirmationModal from '../../../components/Common/Modals/DeleteConfirmationModal';
import { deleteBorrowerDocument } from '../../../modules/client/services';

interface Document {
    id: number;
    document_name: string;
    document_namea?: string;
    document_number?: string;
    type: string;
    size: string;
    date: string;
    created_at?: string;
    file_path?: string;
    document_url?: string;
    status?: string;
    rejection_reason?: string;
}

interface DocumentType {
    id: number;
    name: string;
    sort_order: number;
}

interface ClientDocumentsSectionProps {
    isLoading?: boolean;
}

export default function ClientDocumentsSection({ isLoading: parentLoading = false }: ClientDocumentsSectionProps) {
    const { id } = useParams();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [showFileManager, setShowFileManager] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingDocId, setDeletingDocId] = useState<number | null>(null);

    const { user } = useAuthStore();

    // Permissions check
    const hasPermission = (permission: string) => {
        return user?.permissions?.includes(permission) || user?.role_name === 'Developer' || user?.is_host === 1;
    };

    const canView = hasPermission('view borrower documents');
    const canUpload = hasPermission('upload borrower documents');
    const canUpdateStatus = hasPermission('update borrower documents status');
    const canDelete = hasPermission('delete borrower documents');
    // Document Types
    const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
    const [selectedTypeId, setSelectedTypeId] = useState<number | string>('');
    const [showTypeSelectionModal, setShowTypeSelectionModal] = useState(false);

    // Status Update State
    const [showStatusUpdateModal, setShowStatusUpdateModal] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [rejectionNote, setRejectionNote] = useState<string>('');
    const [processingDocId, setProcessingDocId] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadDocuments = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const response = await fetchBorrowerDocuments(id);

            if (response && response.status && response.data) {
                setDocuments(response.data);
            } else if (response && Array.isArray(response.data)) {
                setDocuments(response.data);
            }
        } catch (error: any) {
            console.error('Failed to fetch documents:', error);
            const errorMsg = error.response?.data?.message || 'Failed to load documents';
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const loadDocumentTypes = async () => {
        try {
            const response = await fetchBorrowerDocumentTypes();
            if (response && response.status && response.data) {
                setDocumentTypes(response.data);
                if (response.data.length > 0) {
                    setSelectedTypeId(response.data[0].id);
                }
            }
        } catch (error) {
            console.error('Failed to fetch document types:', error);
        }
    };

    useEffect(() => {
        loadDocuments();
        loadDocumentTypes();
    }, [id]);

    const handleDownload = async (docId: number, fileName: string, filePath: string) => {
        await handleFileDownload(
            () => downloadBorrowerDocument(docId),
            fileName,
            filePath
        );
    };

    const handleFileSelection = async (selectedFiles: any[]) => {
        if (!selectedFiles || selectedFiles.length === 0 || !id) return;
        setLoading(true);
        try {
            const filePaths = selectedFiles.map(file => file.path);
            const fileNames = selectedFiles.map(file => file.name);

            await attachBorrowerDocuments({
                borrower_id: id,
                entity_id: id,
                entity_type: 'borrowers',
                file_path: filePaths,
                document_name: fileNames,
                document_type_id: selectedTypeId
            });

            toast.success("Documents uploaded successfully");
            window.dispatchEvent(new Event('refreshActivities'));
            setShowFileManager(false);
            loadDocuments();
        } catch (error: any) {
            console.error("Failed to attach documents", error);
            toast.error(error?.response?.data?.message || "Failed to attach documents");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (docId: number, status: string) => {
        if (status === DOCUMENT_STATUS.REJECTED) {
            setProcessingDocId(docId);
            setSelectedStatus(status);
            setRejectionNote('');
            setShowStatusUpdateModal(true);
            return;
        }

        try {
            setLoading(true);
            await updateBorrowerDocumentStatus(docId, status);
            toast.success(`Status updated to ${getDocumentStatusLabel(status)}`);
            loadDocuments();
        } catch (error: any) {
            console.error("Status update failed", error);
            toast.error(error?.response?.data?.message || "Failed to update status");
        } finally {
            setLoading(false);
        }
    };

    const submitRejection = async () => {
        if (!processingDocId) return;
        if (!rejectionNote.trim()) {
            toast.warning("Please provide a rejection reason.");
            return;
        }

        setIsSubmitting(true);
        try {
            await updateBorrowerDocumentStatus(processingDocId, DOCUMENT_STATUS.REJECTED, rejectionNote);
            toast.success("Document rejected with note");
            setShowStatusUpdateModal(false);
            loadDocuments();
        } catch (error: any) {
            console.error("Rejection failed", error);
            toast.error(error?.response?.data?.message || "Failed to reject document");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingDocId) return;
        try {
            setLoading(true);
            await deleteBorrowerDocument(deletingDocId);
            toast.success("Document deleted successfully");
            window.dispatchEvent(new Event('refreshActivities'));
            setShowDeleteModal(false);
            setDeletingDocId(null);
            loadDocuments();
        } catch (error: any) {
            console.error("Delete failed", error);
            toast.error(error?.response?.data?.message || "Failed to delete document");
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (doc: Document) => {
        const status = doc.status || DOCUMENT_STATUS.UPLOADED;
        const tooltipId = `doc-rejection-${doc.id}`;

        switch (status) {
            case DOCUMENT_STATUS.ACCEPTED:
                return <span className="badge bg-success-subtle text-success">Accepted</span>;
            case DOCUMENT_STATUS.REJECTED:
                return (
                    <>
                        <span
                            className="badge bg-danger-subtle text-danger"
                            id={tooltipId}
                            style={{ cursor: doc.rejection_reason ? 'help' : 'default' }}
                        >
                            Rejected {doc.rejection_reason && <i className="ri-information-line align-middle ms-1"></i>}
                        </span>
                        {doc.rejection_reason && (
                            <UncontrolledTooltip placement="top" target={tooltipId}>
                                {doc.rejection_reason}
                            </UncontrolledTooltip>
                        )}
                    </>
                );
            case DOCUMENT_STATUS.UNDER_REVIEW:
                return <span className="badge bg-warning-subtle text-warning">{getDocumentStatusLabel(status)}</span>;
            case DOCUMENT_STATUS.PENDING:
            case DOCUMENT_STATUS.UPLOADED:
            default:
                return <span className="badge bg-info-subtle text-info">Uploaded</span>;
        }
    };

    const formatDate = (dateString: string | undefined) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    if (!canView) return null;

    return (
        <div className="card shadow-none border">
            <div className="card-header border-bottom-dashed d-flex align-items-center justify-content-between py-3">
                <h5 className="card-title mb-0 flex-grow-1">Documents</h5>
                <div className="flex-shrink-0">
                    {canUpload && (
                        <button
                            className="btn btn-secondary fw-medium"
                            onClick={() => setShowTypeSelectionModal(true)}
                            style={{ backgroundColor: '#405189', borderColor: '#405189' }}
                        >
                            <i className="ri-add-line me-1 align-bottom"></i> Add Document
                        </button>
                    )}
                </div>
            </div>
            <div className="card-body">
                <div className="table-responsive table-card">
                    <table className="table table-nowrap align-middle mb-0" style={{ minWidth: '850px' }}>
                        <thead className="table-light text-muted">
                            <tr>
                                <th scope="col" style={{ width: '25%' }}>File Name</th>
                                <th scope="col" style={{ width: '15%' }}>Document Number</th>
                                <th scope="col" style={{ width: '15%' }}>Document Type</th>
                                <th scope="col" style={{ width: '10%' }}>Size</th>
                                <th scope="col" style={{ width: '15%' }}>Upload Date</th>
                                <th scope="col" style={{ width: '10%' }}>Status</th>
                                <th scope="col" className="text-end" style={{ width: '10%' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading || parentLoading ? (
                                Array.from({ length: 5 }).map((_, index) => (
                                    <tr key={index}>
                                        <td><Skeleton width="100%" height="1.5rem" /></td>
                                        <td><Skeleton width="60%" height="1.5rem" /></td>
                                        <td><Skeleton width="80%" height="1.5rem" /></td>
                                        <td><Skeleton width="60%" height="1.5rem" /></td>
                                        <td><Skeleton width="70%" height="1.5rem" /></td>
                                        <td><Skeleton width="80%" height="1.5rem" /></td>
                                        <td><Skeleton width="40%" height="1.5rem" /></td>
                                    </tr>
                                ))
                            ) : documents.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-4 text-muted">
                                        No documents found
                                    </td>
                                </tr>
                            ) : (
                                documents.map((doc) => {
                                    const displayFileName = doc.document_namea || doc.document_name;
                                    const config = getFileConfig(doc.document_url || doc.file_path || displayFileName || '');
                                    return (
                                        <tr key={doc.id}>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <div className="avatar-sm flex-shrink-0">
                                                        <div className={`avatar-title ${config.bg} ${config.color} rounded fs-20 material-shadow`}>
                                                            <i className={config.icon}></i>
                                                        </div>
                                                    </div>
                                                    <div className="ms-3 flex-grow-1 overflow-hidden" style={{ minWidth: 0 }}>
                                                        <h6 className="fs-14 mb-0 text-truncate" title={displayFileName}>
                                                            <a
                                                                href="#"
                                                                onClick={(e) => { e.preventDefault(); handleDownload(doc.id, displayFileName, doc.file_path || ''); }}
                                                                className="text-body fw-medium d-block text-truncate"
                                                            >
                                                                {displayFileName}
                                                            </a>
                                                        </h6>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="text-muted d-block text-truncate">
                                                    {doc.document_number || '-'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="text-muted d-block text-truncate" title={doc.type}>
                                                    {doc.type}
                                                </span>
                                            </td>
                                            <td><span className="text-muted">{doc.size || '-'}</span></td>
                                            <td><span className="text-muted">{doc.date || formatDate(doc.created_at)}</span></td>
                                            <td>{getStatusBadge(doc)}</td>
                                            <td className="text-end">
                                                <UncontrolledDropdown strategy="fixed">
                                                    <DropdownToggle tag="button" className="btn btn-light btn-icon btn-sm" onClick={(e) => e.preventDefault()}>
                                                        <i className="ri-equalizer-fill"></i>
                                                    </DropdownToggle>
                                                    <DropdownMenu container="body" className="dropdown-menu-end" style={{ minWidth: '180px', zIndex: 1060 }}>
                                                        <DropdownItem onClick={(e) => { e.preventDefault(); handleDownload(doc.id, displayFileName, doc.file_path || ''); }} className="py-2">
                                                            <i className="ri-download-2-fill me-2 align-middle text-muted"></i>Download
                                                        </DropdownItem>

                                                        {canDelete && (
                                                            <DropdownItem onClick={(e) => {
                                                                e.preventDefault();
                                                                setDeletingDocId(doc.id);
                                                                setShowDeleteModal(true);
                                                            }} className="py-2">
                                                                <i className="ri-delete-bin-5-fill me-2 align-middle text-muted"></i>Delete
                                                            </DropdownItem>
                                                        )}

                                                        {canUpdateStatus && (
                                                            <>
                                                                <DropdownItem divider />
                                                                <DropdownItem header className="text-uppercase fs-10 fw-bold text-muted py-2">Change Status</DropdownItem>

                                                                <DropdownItem onClick={(e) => { e.preventDefault(); handleStatusUpdate(doc.id, DOCUMENT_STATUS.UNDER_REVIEW); }} className="py-2">
                                                                    <i className="ri-time-line me-2 align-middle text-warning"></i>Mark as Under Reviewing
                                                                </DropdownItem>
                                                                <DropdownItem onClick={(e) => { e.preventDefault(); handleStatusUpdate(doc.id, DOCUMENT_STATUS.ACCEPTED); }} className="py-2">
                                                                    <i className="ri-checkbox-circle-line me-2 align-middle text-success"></i>Mark as Accepted
                                                                </DropdownItem>
                                                                <DropdownItem onClick={(e) => { e.preventDefault(); handleStatusUpdate(doc.id, DOCUMENT_STATUS.REJECTED); }} className="py-2">
                                                                    <i className="ri-close-circle-line me-2 align-middle text-danger"></i>Mark as Rejected
                                                                </DropdownItem>
                                                            </>
                                                        )}
                                                    </DropdownMenu>
                                                </UncontrolledDropdown>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Document Type Selection Modal */}
            <Modal isOpen={showTypeSelectionModal} toggle={() => setShowTypeSelectionModal(false)} centered size="lg" modalClassName="flip">
                <ModalHeader toggle={() => setShowTypeSelectionModal(false)} className="p-3 bg-light">
                    Add Document
                </ModalHeader>
                <ModalBody className="p-4">
                    <div className="mb-4">
                        <Label className="form-label fw-bold">Select Document Type</Label>
                        <Input
                            type="select"
                            className="form-select border-primary"
                            value={selectedTypeId}
                            onChange={(e) => setSelectedTypeId(e.target.value)}
                        >
                            {documentTypes.length > 0 ? (
                                documentTypes.map((type) => (
                                    <option key={type.id} value={type.id}>{type.name}</option>
                                ))
                            ) : (
                                <option value="">No Document Types Available</option>
                            )}
                        </Input>
                    </div>

                    <div
                        className="rounded border border-2 border-dashed p-5 text-center cursor-pointer transition-all"
                        onClick={() => {
                            if (!selectedTypeId && documentTypes.length > 0) {
                                toast.warning("Please select a document type first");
                                return;
                            }
                            setShowTypeSelectionModal(false);
                            setShowFileManager(true);
                        }}
                        style={{ borderStyle: 'dashed', cursor: 'pointer', backgroundColor: 'rgba(64, 81, 137, 0.03)' }}
                    >
                        <div className="mb-3">
                            <i className="ri-upload-cloud-2-fill display-4 text-muted"></i>
                        </div>
                        <h4 className="mb-0">Click here to upload documents.</h4>
                    </div>
                </ModalBody>
            </Modal>

            <FileManagerModal
                isOpen={showFileManager}
                toggle={() => setShowFileManager(!showFileManager)}
                selectionMode={true}
                onSelectFiles={handleFileSelection}
                entityType="borrowers"
                entityId={id}
            />

            <DeleteConfirmationModal
                show={showDeleteModal}
                text="Are you sure you want to permanently delete this document?"
                onClose={() => {
                    setShowDeleteModal(false);
                    setDeletingDocId(null);
                }}
                onConfirm={handleDelete}
                loading={loading}
            />

            {/* Status Update Modal (For Rejection Note) */}
            <Modal isOpen={showStatusUpdateModal} toggle={() => setShowStatusUpdateModal(false)} centered>
                <ModalHeader toggle={() => setShowStatusUpdateModal(false)} className="bg-danger text-white p-3">
                    Reject Document
                </ModalHeader>
                <ModalBody className="p-4">
                    <Form onSubmit={(e) => { e.preventDefault(); submitRejection(); }}>
                        <FormGroup className="mb-0">
                            <Label for="rejectionNote" className="form-label fw-semibold text-uppercase fs-12">
                                Rejection Reason <span className="text-danger">*</span>
                            </Label>
                            <Input
                                type="textarea"
                                id="rejectionNote"
                                placeholder="Please explain why this document is being rejected..."
                                rows={4}
                                className="form-control bg-light border-light"
                                value={rejectionNote}
                                onChange={(e) => setRejectionNote(e.target.value)}
                                required
                            />
                            <div className="form-text mt-2 text-muted">
                                <i className="ri-information-line align-middle me-1"></i>
                                This reason will be shared with the borrower to help them correct the issue.
                            </div>
                        </FormGroup>
                    </Form>
                </ModalBody>
                <ModalFooter>
                    <button type="button" className="btn btn-light" onClick={() => setShowStatusUpdateModal(false)}>Cancel</button>
                    <button
                        type="button"
                        className="btn btn-danger"
                        onClick={submitRejection}
                        disabled={isSubmitting || !rejectionNote.trim()}
                    >
                        {isSubmitting ? 'Rejecting...' : 'Reject Document'}
                    </button>
                </ModalFooter>
            </Modal>
        </div>
    );
}
