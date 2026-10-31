import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { fetchBorrowerDocuments, downloadBorrowerDocument, attachBorrowerDocuments, updateBorrowerDocumentStatus, fetchBorrowerDocumentTypes } from '../../../modules/client/services';
import { toast } from 'react-toastify';
import { getFileTypeLabel } from '../../../config/fileTypeConfig';
import { DOCUMENT_STATUS, getDocumentStatusLabel } from '../../../config/documentStatus';
import { handleFileDownload } from '../../../utils/fileDownload';
import { Skeleton } from 'primereact/skeleton';
// @ts-ignore
import { FileManagerModal } from '../../../components/FileManagerModal/FileManagerModal';
import { Modal, ModalHeader, ModalBody, ModalFooter, Form, FormGroup, Label, Input, UncontrolledTooltip, UncontrolledDropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { useAuthStore } from '../../../store/auth/authStore';
import { usePermissions } from '../../../lib/auth/usePermissions';
// @ts-ignore
import DeleteConfirmationModal from '../../../components/Common/Modals/DeleteConfirmationModal';
import { deleteBorrowerDocument } from '../../../modules/client/services';
import { groupDocumentsByCategory, type ClientDocument } from '../../../utils/documentCategories';
import DocumentCategoryTable from './documents/DocumentCategoryTable';
import CustomDropdown from '../../../components/Common/CustomDropdown';
import './documents/ClientDocuments.css';

type Document = ClientDocument;

interface DocumentType {
    id: number;
    name: string;
    sort_order: number;
    is_required?: boolean;
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
        // The host account itself may do everything here. Being on the host's
        // team is not the same thing: a host employee is limited to what their
        // role grants, like anyone else.
        const isHostAccount = user?.is_host == 1 && user?.entity_type === 'Partner';
        return user?.permissions?.includes(permission) || user?.role_name == 'Developer' || isHostAccount;
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

    // The tab is laid out category by category (required first).
    const grouped = useMemo(
        () => groupDocumentsByCategory(
            documents.map((d) => ({ ...d, date: d.date || formatDate(d.created_at) })),
            documentTypes
        ),
        [documents, documentTypes]
    );

    // A category's own Upload: straight to the file manager, into that category.
    const uploadInto = (typeId: number) => {
        setSelectedTypeId(typeId);
        setShowFileManager(true);
    };

    const renderActions = (doc: Document) => {
        const displayFileName = doc.document_namea || doc.document_name;
        return (
            <UncontrolledDropdown strategy="fixed">
                <DropdownToggle tag="button" className="btn btn-light btn-icon btn-sm" aria-label="Document actions" onClick={(e) => e.preventDefault()}>
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
        );
    };

    if (!canView) return null;

    return (
        <div className="card shadow-none cdoc">
            <div className="card-header border-bottom-dashed py-3">
                <div className="cdoc-header">
                    <div className="cdoc-header-text">
                        <h5 className="card-title mb-0">Documents</h5>
                        {!(loading || parentLoading) && (
                            <div className="cdoc-summary" aria-label="Documents summary">
                                <span className="cdoc-summary-progress">
                                    <span className="cdoc-summary-bar" aria-hidden="true">
                                        <span style={{ width: `${grouped.requiredTotal ? Math.round((grouped.requiredDone / grouped.requiredTotal) * 100) : 0}%` }}></span>
                                    </span>
                                    {grouped.requiredDone} of {grouped.requiredTotal} required categories complete
                                </span>
                                {/* Only the counts there are: no "0 Rejected". */}
                                {grouped.counts.accepted > 0 && <span className="cdoc-chip is-accepted">{grouped.counts.accepted} Accepted</span>}
                                {grouped.counts.review > 0 && <span className="cdoc-chip is-review">{grouped.counts.review} In review</span>}
                                {grouped.counts.rejected > 0 && <span className="cdoc-chip is-reupload">{grouped.counts.rejected} Rejected</span>}
                            </div>
                        )}
                    </div>
                    {canUpload && (
                        <button
                            type="button"
                            className="btn btn-primary fw-medium cdoc-add-btn"
                            onClick={() => setShowTypeSelectionModal(true)}
                        >
                            <i className="ri-add-line me-1 align-bottom" aria-hidden="true"></i> Add Document
                        </button>
                    )}
                </div>
            </div>
            <div className="card-body p-0">
                {loading || parentLoading ? (
                    <div className="cdoc-loading">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div key={index} className="cdoc-loading-group">
                                <Skeleton width="35%" height="1.25rem" className="mb-2" />
                                <Skeleton width="100%" height="2.5rem" />
                            </div>
                        ))}
                    </div>
                ) : documents.length === 0 ? (
                    // Nothing uploaded yet: say so once, with the required documents to start on.
                    <section className="cdoc-empty-state" aria-labelledby="cdoc-empty-title">
                        <span className="cdoc-empty-icon" aria-hidden="true">
                            <i className="ri-folder-open-line"></i>
                        </span>
                        <h6 className="cdoc-empty-title" id="cdoc-empty-title">No documents uploaded yet</h6>
                        <p className="cdoc-empty-text">
                            {grouped.requiredTotal > 0
                                ? 'These are needed before the client can apply for funding.'
                                : 'Documents the client or your team upload will show here.'}
                        </p>
                        {grouped.requiredTotal > 0 && (
                            <div className="cdoc-empty-list">
                                {grouped.categories.filter((c) => c.required && c.typeId !== null).map((c) => (
                                    <button
                                        key={c.typeId}
                                        type="button"
                                        className="cdoc-empty-item"
                                        disabled={!canUpload}
                                        aria-label={`Upload ${c.name}`}
                                        onClick={() => uploadInto(c.typeId as number)}
                                    >
                                        <span className="cdoc-empty-item-icon" aria-hidden="true">
                                            <i className={canUpload ? 'ri-upload-2-line' : 'ri-file-line'}></i>
                                        </span>
                                        <span className="cdoc-empty-item-text">
                                            <span className="cdoc-empty-item-name">{c.name}</span>
                                            <span className="cdoc-empty-item-meta" aria-hidden="true">Required · Not uploaded</span>
                                        </span>
                                        {canUpload && <i className="ri-arrow-right-line cdoc-empty-item-go" aria-hidden="true"></i>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>
                ) : (
                    <DocumentCategoryTable
                        categories={grouped.categories}
                        canUpload={canUpload}
                        onUpload={uploadInto}
                        onDownload={(doc) => handleDownload(doc.id, doc.document_namea || doc.document_name, doc.file_path || '')}
                        renderStatus={getStatusBadge}
                        renderActions={renderActions}
                    />
                )}
            </div>

            {/* Document Type Selection Modal */}
            <Modal
                isOpen={showTypeSelectionModal}
                toggle={() => setShowTypeSelectionModal(false)}
                centered
                modalClassName="flip"
                contentClassName="cdoc cdoc-modal"
                labelledBy="cdoc-add-title"
            >
                <ModalHeader toggle={() => setShowTypeSelectionModal(false)} className="cdoc-modal-header">
                    <span className="cdoc-modal-icon" aria-hidden="true"><i className="ri-file-add-line"></i></span>
                    <span>
                        <span className="cdoc-modal-title" id="cdoc-add-title">Add Document</span>
                        <span className="cdoc-modal-subtitle">Choose the category, then the files from the client's file manager.</span>
                    </span>
                </ModalHeader>
                <ModalBody className="cdoc-modal-body">
                    <Label className="form-label">Document type</Label>
                    {documentTypes.length > 0 ? (
                        <CustomDropdown
                            options={documentTypes}
                            value={selectedTypeId}
                            onChange={setSelectedTypeId}
                            optionLabel="name"
                            optionValue="id"
                            placeholder="Select a document type"
                            searchable
                        />
                    ) : (
                        <p className="text-muted mb-0">No document types available.</p>
                    )}

                    <button
                        type="button"
                        className="cdoc-modal-drop"
                        disabled={documentTypes.length === 0}
                        onClick={() => {
                            if (!selectedTypeId) {
                                toast.warning("Please select a document type first");
                                return;
                            }
                            setShowTypeSelectionModal(false);
                            setShowFileManager(true);
                        }}
                    >
                        <span className="cdoc-modal-drop-icon" aria-hidden="true"><i className="ri-upload-cloud-2-line"></i></span>
                        <span className="cdoc-modal-drop-title">Choose files</span>
                        <span className="cdoc-modal-drop-text">Upload new files or pick ones already in the file manager.</span>
                    </button>
                </ModalBody>
                <ModalFooter className="cdoc-modal-footer">
                    <button type="button" className="btn btn-light" onClick={() => setShowTypeSelectionModal(false)}>Cancel</button>
                </ModalFooter>
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
