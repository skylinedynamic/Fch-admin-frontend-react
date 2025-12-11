import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchBorrowerDocuments, downloadBorrowerDocument } from '../../../modules/client/services';
import { toast } from 'react-toastify';

interface Document {
    id: number;
    document_name: string;
    type: string;
    size: string;
    date: string;
    document_url?: string;
}

export default function ClientDocumentsSection() {
    const { id } = useParams();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);

    useEffect(() => {
        if (!id) return;

        const loadDocuments = async () => {
            try {
                setLoading(true);
                const response = await fetchBorrowerDocuments(id);

                if (response && response.status && response.data) {
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

        loadDocuments();
    }, [id]);

    const handleDownload = async (documentId: number, fileName: string) => {
        try {
            setDownloadingId(documentId);
            const response = await downloadBorrowerDocument(documentId);

            // Create blob from response
            const blob = new Blob([response.data]);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

        } catch (error: any) {
            console.error('Failed to download document:', error);
            const errorMsg = error.response?.data?.message || 'Failed to download document';
            toast.error(errorMsg);
        } finally {
            setDownloadingId(null);
        }
    };

    const getFileIcon = (fileType: string) => {
        if (!fileType) return 'ri-file-text-fill text-secondary';

        const type = fileType.toLowerCase();
        if (type.includes('pdf')) return 'ri-file-pdf-fill text-danger';
        if (type.includes('word') || type.includes('doc')) return 'ri-file-word-fill text-primary';
        if (type.includes('excel') || type.includes('xls')) return 'ri-file-excel-fill text-success';
        if (type.includes('zip') || type.includes('rar')) return 'ri-file-zip-fill text-warning';
        if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg')) return 'ri-image-fill text-info';
        return 'ri-file-text-fill text-secondary';
    };

    if (loading) {
        return (
            <div className="card shadow-none border">
                <div className="card-body">
                    <div className="row">
                        <div className="col-lg-12">
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
                                        {[1, 2, 3].map((i) => (
                                            <tr key={i}>
                                                <td>
                                                    <div className="placeholder-glow">
                                                        <span className="placeholder col-8"></span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="placeholder-glow">
                                                        <span className="placeholder col-6"></span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="placeholder-glow">
                                                        <span className="placeholder col-5"></span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="placeholder-glow">
                                                        <span className="placeholder col-7"></span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="placeholder-glow">
                                                        <span className="placeholder col-4"></span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="card shadow-none border">
            <div className="card-body">
                <div className="row">
                    <div className="col-lg-12">
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
                                    {documents.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-center py-4 text-muted">
                                                No documents found
                                            </td>
                                        </tr>
                                    ) : (
                                        documents.map((doc) => (
                                            <tr key={doc.id}>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        <div className="avatar-sm">
                                                            <div className="avatar-title bg-primary-subtle text-primary rounded fs-20 material-shadow">
                                                                <i className={getFileIcon(doc.type)}></i>
                                                            </div>
                                                        </div>
                                                        <div className="ms-3 flex-grow-1">
                                                            <h6 className="fs-15 mb-0">{doc.document_name}</h6>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>{doc.type}</td>
                                                <td>{doc.size}</td>
                                                <td>{new Date(doc.date).toLocaleDateString('en-US', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}</td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-link text-primary"
                                                        onClick={() => handleDownload(doc.id, doc.document_name)}
                                                        disabled={downloadingId === doc.id}
                                                    >
                                                        {downloadingId === doc.id ? (
                                                            <>
                                                                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                                                Downloading...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <i className="ri-download-2-line"></i> Download
                                                            </>
                                                        )}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
