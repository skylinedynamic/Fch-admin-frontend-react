import React, { useEffect, useState, useRef } from 'react';
import { fetchPartnerDocuments, downloadPartnerDocument, uploadPartnerDocument, deletePartnerDocument } from '../../../modules/partner/services';
import { toast } from 'react-toastify';
import { getFileConfig, getFileTypeLabel } from '../../../config/fileTypeConfig';
import { handleFileDownload } from '../../../utils/fileDownload';
import { validateRequired, validateFile, validateFileSize, validateFileType } from '../../../components/errors/validation';
import DeleteConfirmationModal from '../../../components/Common/Modals/DeleteConfirmationModal';

export default function DocumentsSection({ partnerId }) {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(null);
    const [documentName, setDocumentName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [errors, setErrors] = useState({});
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingDocId, setDeletingDocId] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (partnerId) {
            loadDocuments();
        }
    }, [partnerId]);

    const loadDocuments = async () => {
        setLoading(true);
        try {
            const response = await fetchPartnerDocuments(partnerId);
            if (response.status && response.data) {
                setDocuments(response.data);
            }
        } catch (error) {
            console.error("Failed to load documents", error);
            // toast.error("Failed to load documents");
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

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setUploadingFile(file);

            // Clear file error if exists
            if (errors.file) {
                setErrors(prev => ({ ...prev, file: null }));
            }
        }
    };

    const validateForm = () => {
        const newErrors = {};

        const nameError = validateRequired(documentName, 'Document Name');
        if (nameError) newErrors.documentName = nameError;

        const fileError = validateFile(uploadingFile, 'File');
        if (fileError) {
            newErrors.file = fileError;
        } else {
            const sizeError = validateFileSize(uploadingFile);
            if (sizeError) newErrors.file = sizeError;

            const typeError = validateFileType(uploadingFile);
            if (typeError) newErrors.file = typeError;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleUploadDocument = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('file_path', uploadingFile);
            formData.append('document_name', documentName);
            formData.append('partner_id', partnerId);

            await uploadPartnerDocument(partnerId, formData);
            toast.success("Document uploaded successfully");
            setShowUploadModal(false);
            setUploadingFile(null);
            setDocumentName('');
            setErrors({});
            loadDocuments(); // Reload documents
        } catch (error) {
            console.error("Upload failed", error);
            toast.error(error?.response?.data?.message || "Failed to upload document");
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteDocument = async () => {
        if (!deletingDocId) return;

        try {
            setLoading(true);
            await deletePartnerDocument(deletingDocId);
            toast.success("Document deleted successfully");
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
                    onClick={() => {
                        setShowUploadModal(true);
                        setErrors({});
                        setDocumentName('');
                        setUploadingFile(null);
                    }}
                >
                    <i className="ri-add-fill me-1 align-bottom"></i> Add Document
                </button>
            </div>

            <div className="table-responsive">
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
                            <tr>
                                <td colSpan="5" className="text-center py-4">
                                    <div className="spinner-border text-primary" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : documents.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="text-center py-4 text-muted">
                                    No documents found.
                                </td>
                            </tr>
                        ) : (
                            documents.map((doc) => {
                                const config = getFileConfig(doc.file_path);
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
                                                        <a href="javascript:void(0);" onClick={(e) => { e.preventDefault(); handleDownload(doc.id, doc.document_name, doc.file_path); }}>
                                                            {doc.document_name}
                                                        </a>
                                                    </h6>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{getFileTypeLabel(doc.file_path)}</td>
                                        <td>{doc.size}</td>
                                        <td>{formatDate(doc.created_at)}</td>
                                        <td>
                                            <div className="dropdown">
                                                <a href="javascript:void(0);" className="btn btn-light btn-icon" id={`dropdownMenuLink${doc.id}`} data-bs-toggle="dropdown" aria-expanded="false">
                                                    <i className="ri-equalizer-fill"></i>
                                                </a>
                                                <ul className="dropdown-menu dropdown-menu-end" aria-labelledby={`dropdownMenuLink${doc.id}`}>
                                                    {/* <li>
                                                        <a className="dropdown-item" href={doc.file_path} target="_blank" rel="noreferrer">
                                                            <i className="ri-eye-fill me-2 align-middle text-muted"></i>View
                                                        </a>
                                                    </li> */}
                                                    <li>
                                                        <a className="dropdown-item" href="javascript:void(0);" onClick={(e) => { e.preventDefault(); handleDownload(doc.id, doc.document_name, doc.file_path); }}>
                                                            <i className="ri-download-2-fill me-2 align-middle text-muted"></i>Download
                                                        </a>
                                                    </li>
                                                    <li className="dropdown-divider"></li>
                                                    <li>
                                                        <a className="dropdown-item" href="javascript:void(0);" onClick={(e) => {
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

            {/* Upload Document Modal */}
            {showUploadModal && (
                <>
                    <div className="modal fade show d-block" tabIndex="-1" role="dialog">
                        <div className="modal-dialog modal-dialog-centered">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Upload Document</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowUploadModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    <form onSubmit={handleUploadDocument}>
                                        <div className="mb-3">
                                            <label className="form-label">Document Name <span className="text-danger">*</span></label>
                                            <input
                                                type="text"
                                                className={`form-control ${errors.documentName ? 'is-invalid' : ''}`}
                                                value={documentName}
                                                onChange={(e) => {
                                                    setDocumentName(e.target.value);
                                                    if (errors.documentName) setErrors(prev => ({ ...prev, documentName: null }));
                                                }}
                                                placeholder="Enter document name"
                                            />
                                            {errors.documentName && <div className="invalid-feedback">{errors.documentName}</div>}
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label">Choose File <span className="text-danger">*</span></label>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                className={`form-control ${errors.file ? 'is-invalid' : ''}`}
                                                onChange={handleFileSelect}
                                            />
                                            {errors.file && <div className="invalid-feedback">{errors.file}</div>}
                                            {uploadingFile && !errors.file && (
                                                <div className="mt-2">
                                                    <small className="text-muted">
                                                        Selected: <strong>{uploadingFile.name}</strong> ({(uploadingFile.size / 1024).toFixed(2)} KB)
                                                    </small>
                                                </div>
                                            )}
                                        </div>

                                        <div className="d-flex justify-content-end gap-2">
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={() => setShowUploadModal(false)}
                                                disabled={uploading}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="btn btn-primary"
                                                disabled={uploading}
                                            >
                                                {uploading && (
                                                    <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                )}
                                                <i className="ri-upload-2-fill me-1 align-bottom"></i>
                                                {uploading ? 'Uploading...' : 'Upload'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show"></div>
                </>
            )}

            <DeleteConfirmationModal
                show={showDeleteModal}
                onHide={() => {
                    setShowDeleteModal(false);
                    setDeletingDocId(null);
                }}
                onConfirm={handleDeleteDocument}
                title="Delete Document"
                message="Are you sure you want to delete this document?"
            />
        </div>
    );
}
