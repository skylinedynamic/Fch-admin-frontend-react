import React, { useEffect, useState, useRef } from 'react';
import { fetchPartnerDocuments, downloadPartnerDocument, uploadPartnerDocument, deletePartnerDocument } from '../../../modules/partner/services';
import { toast } from 'react-toastify';
import { getFileConfig, getFileTypeLabel } from '../../../config/fileTypeConfig';
import { handleFileDownload } from '../../../utils/fileDownload';
import { validateRequired, validateFile, validateFileSize, validateFileType } from '../../../components/errors/validation';
import DeleteConfirmationModal from '../../../components/Common/Modals/DeleteConfirmationModal';
import { Skeleton } from 'primereact/skeleton';
import TableLoader from '../../../components/Loader/TableLoader';


export default function DocumentsSection({ partnerId }) {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadingFile, setUploadingFile] = useState(null);
    const [documentName, setDocumentName] = useState('');
    const [uploadType, setUploadType] = useState('file'); // 'file' or 'link'
    const [documentLink, setDocumentLink] = useState('');
    const [uploading, setUploading] = useState(false);
    const [errors, setErrors] = useState({});
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingDocId, setDeletingDocId] = useState(null);
    const [largeFileDetected, setLargeFileDetected] = useState(false);
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
            // Check file size (20MB)
            if (file.size > 20 * 1024 * 1024) {
                setUploadType('link');
                setLargeFileDetected(true);
                toast.info("File is larger than 20MB. Please use the 'Share Link' option.");
                setUploadingFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }

            setLargeFileDetected(false);
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

        if (uploadType === 'file') {
            const fileError = validateFile(uploadingFile, 'File');
            if (fileError) {
                newErrors.file = fileError;
            } else {
                const sizeError = validateFileSize(uploadingFile, 20); // 20MB
                if (sizeError) newErrors.file = sizeError;

                const typeError = validateFileType(uploadingFile, ['doc', 'docx', 'zip', 'pdf', 'jpg', 'jpeg', 'png', 'xls', 'xlsx', 'csv']);
                if (typeError) newErrors.file = typeError;
            }
        } else {
            const linkError = validateRequired(documentLink, 'Document Link');
            if (linkError) newErrors.documentLink = linkError;
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
            formData.append('document_name', documentName);
            formData.append('partner_id', partnerId);

            if (uploadType === 'file') {
                formData.append('file_path', uploadingFile);
            } else {
                formData.append('share_link', documentLink);
            }

            await uploadPartnerDocument(partnerId, formData);
            toast.success("Document uploaded successfully");
            setShowUploadModal(false);
            setUploadingFile(null);
            setDocumentName('');
            setDocumentLink('');
            setUploadType('file');
            setLargeFileDetected(false);
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
                        setDocumentLink('');
                        setUploadType('file');
                        setLargeFileDetected(false);
                    }}
                >
                    <i className="ri-add-fill me-1 align-bottom"></i> Add Document
                </button>
            </div>

            <div className="table-responsive" style={{ overflow: 'visible' }}>
                {loading ? (
                    <TableLoader
                        rows={5}
                        columns={[
                            { style: { width: '40%' } }, // File Name
                            { style: { width: '15%' } }, // Type
                            { style: { width: '15%' } }, // Size
                            { style: { width: '15%' } }, // Upload Date
                            { style: { width: '15%' } }  // Action
                        ]}
                    />
                ) : (
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
                            {documents.length === 0 ? (
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
                                                                <a href={doc.share_link} target="_blank" rel="noopener noreferrer" className="text-reset">
                                                                    {doc.document_name}
                                                                </a>
                                                            ) : (
                                                                <a href="javascript:void(0);" onClick={(e) => { e.preventDefault(); handleDownload(doc.id, doc.document_name, doc.file_path); }}>
                                                                    {doc.document_name}
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
                                                    <a href="javascript:void(0);" className="btn btn-light btn-icon" id={`dropdownMenuLink${doc.id}`} data-bs-toggle="dropdown" aria-expanded="false">
                                                        <i className="ri-equalizer-fill"></i>
                                                    </a>
                                                    <ul className="dropdown-menu dropdown-menu-end" aria-labelledby={`dropdownMenuLink${doc.id}`}>
                                                        <li>
                                                            {isLink ? (
                                                                <a className="dropdown-item" href={doc.share_link} target="_blank" rel="noopener noreferrer">
                                                                    <i className="ri-external-link-line me-2 align-middle text-muted"></i>Open Link
                                                                </a>
                                                            ) : (
                                                                <a className="dropdown-item" href="javascript:void(0);" onClick={(e) => { e.preventDefault(); handleDownload(doc.id, doc.document_name, doc.file_path); }}>
                                                                    <i className="ri-download-2-fill me-2 align-middle text-muted"></i>Download
                                                                </a>
                                                            )}
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
                )}
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
                                            <label className="form-label">Upload Type</label>
                                            <div className="d-flex gap-3">
                                                <div className="form-check">
                                                    <input
                                                        className="form-check-input"
                                                        type="radio"
                                                        name="uploadType"
                                                        id="typeFile"
                                                        checked={uploadType === 'file'}
                                                        onChange={() => {
                                                            setUploadType('file');
                                                            setLargeFileDetected(false);
                                                            setErrors({});
                                                        }}
                                                    />
                                                    <label className="form-check-label" htmlFor="typeFile">Upload File</label>
                                                </div>
                                                <div className="form-check">
                                                    <input
                                                        className="form-check-input"
                                                        type="radio"
                                                        name="uploadType"
                                                        id="typeLink"
                                                        checked={uploadType === 'link'}
                                                        onChange={() => {
                                                            setUploadType('link');
                                                            setErrors({});
                                                        }}
                                                    />
                                                    <label className="form-check-label" htmlFor="typeLink">
                                                        Share Link
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        {uploadType === 'file' ? (
                                            <div className="mb-3">
                                                <label className="form-label">Choose File <span className="text-danger">*</span></label>
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    className={`form-control ${errors.file ? 'is-invalid' : ''}`}
                                                    onChange={handleFileSelect}
                                                />
                                                {errors.file && <div className="invalid-feedback">{errors.file}</div>}

                                                <div className="alert alert-info py-2 mt-2 mb-0">
                                                    <small>
                                                        <i className="ri-information-line me-1"></i>
                                                        Allowed types: doc, docx, zip, pdf, jpg, jpeg, png, xls, xlsx, csv. Max size: 20MB.
                                                    </small>
                                                </div>

                                                {uploadingFile && !errors.file && (
                                                    <div className="mt-2">
                                                        <small className="text-muted">
                                                            Selected: <strong>{uploadingFile.name}</strong> ({(uploadingFile.size / 1024).toFixed(2)} KB)
                                                        </small>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="mb-3">
                                                <label className="form-label">Document Link <span className="text-danger">*</span></label>
                                                {largeFileDetected && (
                                                    <div className="alert alert-warning d-flex align-items-center py-2 mb-2" role="alert">
                                                        <i className="ri-alert-line me-2 fs-5"></i>
                                                        <small>
                                                            The file you selected exceeds the 20MB limit. Please provide a link to the file (e.g., Google Drive, Dropbox) instead.
                                                        </small>
                                                    </div>
                                                )}
                                                <input
                                                    type="text"
                                                    className={`form-control ${errors.documentLink ? 'is-invalid' : ''}`}
                                                    value={documentLink}
                                                    onChange={(e) => {
                                                        setDocumentLink(e.target.value);
                                                        if (errors.documentLink) setErrors(prev => ({ ...prev, documentLink: null }));
                                                    }}
                                                    placeholder="Enter document link (e.g., Google Drive)"
                                                />
                                                {errors.documentLink && <div className="invalid-feedback">{errors.documentLink}</div>}
                                            </div>
                                        )}

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
