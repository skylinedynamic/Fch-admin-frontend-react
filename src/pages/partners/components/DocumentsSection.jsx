import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchPartnerDocuments, downloadPartnerDocument, deletePartnerDocument, attachPartnerDocuments } from '../../../modules/partner/services';
import { toast } from 'react-toastify';
import { getFileConfig, getFileTypeLabel } from '../../../config/fileTypeConfig';
import { handleFileDownload } from '../../../utils/fileDownload';
import DeleteConfirmationModal from '../../../components/Common/Modals/DeleteConfirmationModal';
import { Skeleton } from 'primereact/skeleton';
import { FileManagerModal } from '../../../components/FileManagerModal/FileManagerModal';

export default function DocumentsSection({ partnerId: propPartnerId }) {
    const { id: paramId } = useParams();
    const partnerId = propPartnerId || paramId;

    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showFileManager, setShowFileManager] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingDocId, setDeletingDocId] = useState(null);

    useEffect(() => {
        if (partnerId) {
            loadDocuments();
        }
    }, [partnerId]);

    const loadDocuments = async () => {
        setLoading(true);
        try {
            const response = await fetchPartnerDocuments(partnerId);
            if (response?.status && Array.isArray(response.data)) {
                setDocuments(response.data);
            } else if (response?.data && Array.isArray(response.data)) {
                setDocuments(response.data);
            } else if (Array.isArray(response)) {
                setDocuments(response);
            }
        } catch (error) {
            console.error("Failed to load documents", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (docId, fileName, filePath) => {
        await handleFileDownload(
            () => downloadPartnerDocument(docId),
            fileName,
            filePath
        );
    };

    const handleFileSelection = async (selectedFiles) => {
        if (!selectedFiles || selectedFiles.length === 0) return;

        try {
            setLoading(true);
            // We can optionally show a loading indicator here or toast
            const filePaths = selectedFiles.map(file => file.path);

            // Call the attach api
            await attachPartnerDocuments({
                partner_id: partnerId,
                file_path: filePaths
            });

            toast.success("Documents uploaded successfully");
            window.dispatchEvent(new Event('refreshActivities'));
            setShowFileManager(false);
            loadDocuments();
        } catch (error) {
            console.error("Failed to attach documents", error);
            toast.error(error?.response?.data?.message || "Failed to attach documents");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteDocument = async () => {
        if (!deletingDocId) return;

        try {
            setLoading(true);
            await deletePartnerDocument(deletingDocId);
            toast.success("Document deleted successfully");
            window.dispatchEvent(new Event('refreshActivities'));
            setShowDeleteModal(false);
            setDeletingDocId(null);
            loadDocuments();
        } catch (error) {
            console.error("Delete failed", error);
            toast.error(error?.response?.data?.message || "Failed to delete document");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="col-lg-12">
            {/* Header with Add Document Button */}
            <div className="d-flex justify-content-end mb-3">
                <button
                    className="btn btn-primary fw-medium"
                    onClick={() => setShowFileManager(true)}
                >
                    <i className="ri-add-fill me-1 align-bottom"></i> Add Document
                </button>
            </div>

            <div className="table-responsive" style={{ overflow: 'visible' }}>
                <table className="table table-borderless align-middle mb-0">
                    <thead className="table-light">
                        <tr>
                            <th scope="col">File Name</th>
                            <th scope="col">Type</th>
                            <th scope="col">Size</th>
                            <th scope="col">Upload Date</th>
                            <th scope="col">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, index) => (
                                <tr key={index}>
                                    <td><Skeleton width="100%" height="1.5rem" /></td>
                                    <td><Skeleton width="80%" height="1.5rem" /></td>
                                    <td><Skeleton width="60%" height="1.5rem" /></td>
                                    <td><Skeleton width="80%" height="1.5rem" /></td>
                                    <td><Skeleton width="40%" height="1.5rem" /></td>
                                </tr>
                            ))
                        ) : documents.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="text-center py-4 text-muted">
                                    No documents found.
                                </td>
                            </tr>
                        ) : (
                            documents.map((doc) => {
                                const isLink = !doc.file_path && doc.share_link;
                                const config = isLink
                                    ? { icon: 'ri-link', bg: 'bg-info-subtle', color: 'text-info' }
                                    : getFileConfig(doc.file_path || '');

                                return (
                                    <tr key={doc.id}>
                                        <td>
                                            <div className="d-flex align-items-center">
                                                <div className="avatar-sm">
                                                    <div className={`avatar-title ${config.bg} ${config.color} rounded fs-20 material-shadow`}>
                                                        <i className={config.icon}></i>
                                                    </div>
                                                </div>
                                                <div className="ms-3 flex-grow-1">
                                                    <h6 className="fs-15 mb-0">
                                                        {isLink ? (
                                                            <a href={doc.share_link} target="_blank" rel="noopener noreferrer" className="text-reset" title={doc.document_name}>
                                                                {doc.document_name && doc.document_name.length > 50
                                                                    ? `${doc.document_name.substring(0, 50)}...`
                                                                    : doc.document_name}
                                                            </a>
                                                        ) : (
                                                            <a href="#" onClick={(e) => { e.preventDefault(); handleDownload(doc.id, doc.document_name, doc.file_path); }} title={doc.document_name}>
                                                                {doc.document_name && doc.document_name.length > 50
                                                                    ? `${doc.document_name.substring(0, 50)}...`
                                                                    : doc.document_name}
                                                            </a>
                                                        )}
                                                    </h6>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{isLink ? 'Link' : getFileTypeLabel(doc.file_path || '')}</td>
                                        <td>{doc.size || '-'}</td>
                                        <td>{formatDate(doc.created_at)}</td>
                                        <td>
                                            <div className="dropdown">
                                                <a href="#" className="btn btn-light btn-icon" id={`dropdownMenuLink${doc.id}`} data-bs-toggle="dropdown" aria-expanded="false" onClick={(e) => e.preventDefault()}>
                                                    <i className="ri-equalizer-fill"></i>
                                                </a>
                                                <ul className="dropdown-menu dropdown-menu-end" aria-labelledby={`dropdownMenuLink${doc.id}`}>
                                                    <li>
                                                        {isLink ? (
                                                            <a className="dropdown-item" href={doc.share_link} target="_blank" rel="noopener noreferrer">
                                                                <i className="ri-external-link-line me-2 align-middle text-muted"></i>Open Link
                                                            </a>
                                                        ) : (
                                                            <a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); handleDownload(doc.id, doc.document_name, doc.file_path); }}>
                                                                <i className="ri-download-2-fill me-2 align-middle text-muted"></i>Download
                                                            </a>
                                                        )}
                                                    </li>
                                                    <li className="dropdown-divider"></li>
                                                    <li>
                                                        <a className="dropdown-item" href="#" onClick={(e) => {
                                                            e.preventDefault();
                                                            setDeletingDocId(doc.id);
                                                            setShowDeleteModal(true);
                                                        }}>
                                                            <i className="ri-delete-bin-5-line me-2 align-middle text-muted"></i>Delete
                                                        </a>
                                                    </li>
                                                </ul>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <FileManagerModal
                isOpen={showFileManager}
                toggle={() => setShowFileManager(!showFileManager)}
                selectionMode={true}
                onSelectFiles={handleFileSelection}
                entityType="partners"
                entityId={partnerId}
            />

            <DeleteConfirmationModal
                show={showDeleteModal}
                text="Deleting this document will permanently remove all its information."
                onClose={() => {
                    setShowDeleteModal(false);
                    setDeletingDocId(null);
                }}
                onConfirm={handleDeleteDocument}
                loading={loading}
            />
        </div>
    );
}
