import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useFundingRequestDetails, useUpdateFundingRequestStatus } from '../../../modules/application';
import { toast } from 'react-toastify';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
// @ts-ignore
import ApplicationDetailsLoader from '../../../components/Loader/ApplicationDetailsLoader';
import { getFileConfig } from '../../../config/fileTypeConfig';
import { handleFileDownload } from '../../../utils/fileDownload';
import { downloadBorrowerDocument } from '../../../modules/client/services';
import ActivitySidebar from '../../../components/Common/Activity/ActivitySidebar';
import { ENTITY_TYPE_FUNDING_REQUEST } from '../../../config/appConfig';
import { FUNDING_REVIEW_STATUS, FUNDING_REVIEW_STATUS_OPTIONS } from '../../../config/funding';
import { DOCUMENT_STATUS } from '../../../config/documentStatus';
import { Dropdown } from 'primereact/dropdown';
import ReviewProgressCard from './components/ReviewProgressCard';

const formatBytes = (bytes: any, decimals = 2) => {
    if (!bytes || bytes === 0 || bytes === '0') return '-';
    if (isNaN(bytes)) return bytes;
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const getDocStatusBadge = (status: string) => {
    if (!status || status === 'Not Uploaded') return <span className="badge bg-secondary-subtle text-secondary fs-12"><i className="ri-checkbox-blank-circle-line me-1"></i>Not Uploaded</span>;
    if ([DOCUMENT_STATUS.UPLOADED, DOCUMENT_STATUS.ACCEPTED, FUNDING_REVIEW_STATUS.APPROVED].includes(status)) return <span className="badge bg-success-subtle text-success fs-12"><i className="ri-checkbox-circle-fill me-1"></i>Uploaded</span>;
    return <span className="badge bg-warning-subtle text-warning fs-12"><i className="ri-loader-4-line me-1"></i>{status}</span>;
};

const getFileTypeBadge = (type: string) => {
    if (!type) return '-';
    let color = 'primary';
    if (type === 'PDF') color = 'danger';
    if (type === 'XLSX' || type === 'XLS' || type === 'CSV') color = 'success';
    if (type === 'DOCX' || type === 'DOC') color = 'primary';
    return <span className={`badge bg-${color}-subtle text-${color} fs-11 px-2 py-1`}>{type}</span>;
};

import { useAuthStore } from '../../../store/auth/authStore';

export default function FundingRequestDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const currentUser = useAuthStore((state: any) => state.user);
    const isHost = currentUser?.is_host == 1;

    const [rejectReason, setRejectReason] = useState('');
    const [isRejecting, setIsRejecting] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [validationErrors, setValidationErrors] = useState<any>({});

    const { data: apiResponse, isLoading, isFetching, error } = useFundingRequestDetails(id || '');
    const updateStatusMutation = useUpdateFundingRequestStatus();

    const isUpdatingOrFetching = updateStatusMutation.isPending || isFetching;

    const review = apiResponse?.data;

    useEffect(() => {
        if (error || (!isLoading && !review)) {
            toast.error('Failed to load review details');
            navigate('/intake-review/funding-request');
        }
    }, [error, review, isLoading, navigate]);

    // Must be before any early returns (Rules of Hooks)
    useEffect(() => {
        if (review?.status && !selectedStatus) {
            setSelectedStatus(review.status);
        }
    }, [review?.status]);

    if (isLoading) {
        return <ApplicationDetailsLoader />;
    }

    if (!review) return null;

    const handleStatusUpdate = () => {
        setValidationErrors({});
        updateStatusMutation.mutate(
            { id: review.id, status: selectedStatus, ...(selectedStatus === FUNDING_REVIEW_STATUS.REJECTED && { reject_reason: rejectReason }) },
            {
                onSuccess: () => {
                    toast.success(`Funding request status updated to ${selectedStatus} successfully`);
                    setShowStatusModal(false);
                    if (selectedStatus !== FUNDING_REVIEW_STATUS.REJECTED) {
                        setRejectReason('');
                    }
                    // Trigger Activity Log refresh
                    window.dispatchEvent(new Event('refreshActivities'));
                },
                onError: (err: any) => {
                    if (err?.response?.status === 422) {
                        setValidationErrors(err.response.data.errors || {});
                    } else {
                        toast.error(err?.response?.data?.message || 'Failed to update status');
                    }
                }
            }
        );
    };

    const getStatusBadge = (status: string) => {
        if (status === FUNDING_REVIEW_STATUS.APPROVED || status === FUNDING_REVIEW_STATUS.ACCEPTED) return <span className="badge bg-success-subtle text-success fs-13">{status}</span>;
        if (status === FUNDING_REVIEW_STATUS.REJECTED) return <span className="badge bg-danger-subtle text-danger fs-13">Rejected</span>;
        if (status === FUNDING_REVIEW_STATUS.IN_PROGRESS) return <span className="badge bg-info-subtle text-info fs-13">In Progress</span>;
        return <span className="badge bg-warning-subtle text-warning fs-13">Pending</span>;
    };

    return (
        <>
            <div className="page-content">

                <div className="container-fluid">
                    {/* Header */}
                    <div className="row pb-1 page-subheader-sticky bg-body">
                        <div className="col-12">
                            <div className="d-flex align-items-lg-center flex-lg-row flex-column py-2">
                                <div className="flex-grow-1">
                                    <h4 className="fs-20 mb-1">Funding Request Details</h4>
                                    <nav aria-label="breadcrumb">
                                        <ol className="breadcrumb m-0">
                                            <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                            <li className="breadcrumb-item"><Link to="/intake-review/funding-request">Funding Requests</Link></li>
                                            <li className="breadcrumb-item active" aria-current="page">Review Details</li>
                                        </ol>
                                    </nav>
                                </div>
                                <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
                                    <Link to="/intake-review/funding-request" className="btn btn-outline-secondary w-lg waves-effect">
                                        <i className="ri-arrow-left-line align-middle me-1"></i> Back
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="row mt-3">
                        <div className="col-lg-8">
                            <ReviewProgressCard 
                                status={review.status} 
                                createdAt={review.created_at} 
                                updatedAt={review.updated_at} 
                            />

                            <div className="card shadow-sm border-0 mb-4 rounded-3">
                                <div className="card-header bg-white border-0 pt-4 pb-0">
                                    <div className="d-flex align-items-center">
                                        <div className="avatar-xs me-3">
                                            <span className="avatar-title bg-primary-subtle text-primary rounded fs-18">
                                                <i className="ri-user-3-line"></i>
                                            </span>
                                        </div>
                                        <h5 className="card-title mb-0 fs-16 fw-bold">Borrower & Funding Information</h5>
                                    </div>
                                </div>
                                <div className="card-body p-4">
                                    <div className="row g-4">
                                        <div className="col-md-6">
                                            <p className="text-muted mb-1 fs-13">Borrower Name</p>
                                            <h5 className="fs-15 fw-bold mb-0">{`${review.borrower?.first_name || ''} ${review.borrower?.last_name || ''}`}</h5>
                                        </div>
                                        {isHost && (
                                            <div className="col-md-6">
                                                <p className="text-muted mb-1 fs-13">Partner Name</p>
                                                <h5 className="fs-15 fw-bold mb-0">{review.partner?.full_name || '-'}</h5>
                                            </div>
                                        )}
                                        <div className="col-md-6">
                                            <p className="text-muted mb-1 fs-13">Funding Sequence</p>
                                            <h5 className="fs-15 fw-bold mb-0">{review.funding_sequence?.name || '-'}</h5>
                                        </div>
                                        <div className="col-12"><hr className="border-light m-0" /></div>
                                        <div className="col-md-6">
                                            <p className="text-muted mb-1 fs-13">Funding Type</p>
                                            <h5 className="fs-15 fw-bold mb-0">{review.funding_type || '-'}</h5>
                                        </div>
                                        <div className="col-md-6">
                                            <p className="text-muted mb-1 fs-13">Purpose of Funds</p>
                                            <h5 className="fs-15 fw-bold mb-0">{review.use_of_funds || '-'}</h5>
                                        </div>
                                        <div className="col-12"><hr className="border-light m-0" /></div>
                                        <div className="col-md-6">
                                            <p className="text-muted mb-1 fs-13">Requested Amount</p>
                                            <h5 className="fs-15 fw-bold mb-0">
                                                {review.requested_amount
                                                    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(review.requested_amount)
                                                    : '-'}
                                            </h5>
                                        </div>
                                        <div className="col-md-6">
                                            <p className="text-muted mb-1 fs-13">Estimated Speed</p>
                                            <h5 className="fs-15 fw-bold mb-0">{review.estimated_speed || '-'}</h5>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {review.matched_lenders && review.matched_lenders.length > 0 && (
                                <div className="card shadow-sm border-0 mb-4 rounded-3">
                                    <div className="card-header bg-white border-0 pt-4 pb-0">
                                        <div className="d-flex align-items-center">
                                            <div className="avatar-xs me-3">
                                                <span className="avatar-title bg-info-subtle text-info rounded fs-18">
                                                    <i className="ri-bank-line"></i>
                                                </span>
                                            </div>
                                            <h5 className="card-title mb-0 fs-16 fw-bold">Lenders Information</h5>
                                        </div>
                                    </div>
                                    <div className="card-body p-4">
                                        <div className="table-responsive border rounded border-light-subtle bg-white">
                                            <table className="table align-middle mb-0" style={{ tableLayout: 'fixed' }}>
                                                <thead className="bg-light">
                                                    <tr>
                                                        <th scope="col" className="fs-13 fw-semibold text-muted border-bottom-0 px-4" style={{ width: '25%' }}>Lender Name</th>
                                                        <th scope="col" className="fs-13 fw-semibold text-muted border-bottom-0" style={{ width: '20%' }}>Legal Name</th>
                                                        <th scope="col" className="fs-13 fw-semibold text-muted border-bottom-0" style={{ width: '20%' }}>Product Category</th>
                                                        <th scope="col" className="fs-13 fw-semibold text-muted border-bottom-0" style={{ width: '20%' }}>Email</th>
                                                        <th scope="col" className="fs-13 fw-semibold text-muted border-bottom-0" style={{ width: '15%' }}>Phone</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {review.matched_lenders.map((lender: any, idx: number) => (
                                                        <tr key={lender.id || idx}>
                                                            <td className="px-4 py-3 text-body">
                                                                <div className="fw-semibold">{lender.name || '-'}</div>
                                                                {lender.contact_name && (
                                                                    <small className="text-muted d-block mt-1">Contact: {lender.contact_name}</small>
                                                                )}
                                                            </td>
                                                            <td className="py-3 text-body">
                                                                {lender.legal_name || '-'}
                                                            </td>
                                                            <td className="py-3 text-body">
                                                                {lender.product_category || lender.category || '-'}
                                                            </td>
                                                            <td className="py-3 text-truncate">
                                                                {lender.email || '-'}
                                                            </td>
                                                            <td className="py-3 text-truncate">
                                                                {lender.phone || '-'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Documents Uploaded Card */}
                            <div className="card shadow-sm border-0 mb-4 rounded-3">
                                <div className="card-header bg-white border-0 pt-4 pb-0">
                                    <div className="d-flex align-items-center">
                                        <div className="avatar-xs me-3">
                                            <span className="avatar-title bg-primary-subtle text-primary rounded fs-18">
                                                <i className="ri-file-text-line"></i>
                                            </span>
                                        </div>
                                        <h5 className="card-title mb-0 fs-16 fw-bold">Documents Uploaded</h5>
                                    </div>
                                </div>
                                <div className="card-body p-4">
                                    <div className="table-responsive border rounded border-light-subtle bg-white">
                                        <table className="table align-middle mb-0" style={{ tableLayout: 'fixed' }}>
                                            <thead className="bg-light">
                                                <tr>
                                                    <th scope="col" className="fs-13 fw-semibold text-muted border-bottom-0 px-4" style={{ width: '30%' }}>File Name</th>
                                                    <th scope="col" className="fs-13 fw-semibold text-muted border-bottom-0" style={{ width: '20%' }}>Document Type</th>
                                                    <th scope="col" className="fs-13 fw-semibold text-muted border-bottom-0" style={{ width: '20%' }}>Uploaded On</th>
                                                    <th scope="col" className="fs-13 fw-semibold text-muted border-bottom-0" style={{ width: '15%' }}>Status</th>
                                                    <th scope="col" className="fs-13 fw-semibold text-muted border-bottom-0 text-end px-4" style={{ width: '15%' }}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Array.isArray(review.documents_with_urls) && review.documents_with_urls.length > 0 ? (
                                                    review.documents_with_urls.map((doc: any, idx: number) => {
                                                        const displayFileName = doc.file_name ? doc.file_name : doc.name.replace(/_/g, ' ');
                                                        const config = getFileConfig(doc.url || doc.file_name || displayFileName || '');

                                                        const handleDownload = (e: React.MouseEvent) => {
                                                            e.preventDefault();
                                                            let fileName = displayFileName || 'document';
                                                            const ext = (doc.url?.split(/[#?]/)[0].split('.').pop() || '').trim().toLowerCase();
                                                            if (ext && !fileName.toLowerCase().endsWith(`.${ext}`)) {
                                                                fileName += `.${ext}`;
                                                            }

                                                            if (doc.document_id && !String(doc.document_id).startsWith('missing_')) {
                                                                handleFileDownload(
                                                                    () => downloadBorrowerDocument(doc.document_id),
                                                                    fileName,
                                                                    doc.url
                                                                );
                                                            } else if (doc.url) {
                                                                downloadFromUrl(doc.url, fileName);
                                                            } else {
                                                                toast.error('Unable to download this document.');
                                                            }
                                                        };

                                                        return (
                                                            <tr key={idx}>
                                                                <td className="px-4 py-3">
                                                                    <div className="d-flex align-items-center">
                                                                        <div className="avatar-sm flex-shrink-0">
                                                                            <div className={`avatar-title ${config.bg} ${config.color} rounded fs-20 material-shadow`}>
                                                                                <i className={config.icon}></i>
                                                                            </div>
                                                                        </div>
                                                                        <div className="ms-3 flex-grow-1 overflow-hidden" style={{ minWidth: 0 }}>
                                                                            <h6 className="fs-14 mb-0 text-truncate" title={displayFileName}>
                                                                                <a href="#" onClick={handleDownload} className="text-body fw-medium d-block text-truncate">
                                                                                    {displayFileName}
                                                                                </a>
                                                                            </h6>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="py-3">
                                                                    <span className="text-muted d-block text-truncate" title={doc.document_type || doc.name.replace(/_/g, ' ')}>
                                                                        {doc.document_type || doc.name.replace(/_/g, ' ')}
                                                                    </span>
                                                                </td>
                                                                <td className="py-3 text-muted">{doc.uploaded_on || '-'}</td>
                                                                <td className="py-3">
                                                                    {getDocStatusBadge(doc.status)}
                                                                </td>
                                                                <td className="text-end px-4 py-3">
                                                                    <div className="d-flex justify-content-end align-items-center gap-2">
                                                                        {doc.url ? (
                                                                            <a href="#" onClick={handleDownload} className="btn btn-sm text-primary fs-14 p-1 d-flex align-items-center justify-content-center bg-white border border-light-subtle rounded shadow-none" style={{ width: '28px', height: '28px', flexShrink: 0 }} title="Download Document">
                                                                                <i className="ri-download-2-line"></i>
                                                                            </a>
                                                                        ) : null}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                ) : (
                                                    <tr>
                                                        <td colSpan={5} className="text-center text-muted fs-13 py-4">
                                                            <div className="d-flex flex-column align-items-center">
                                                                <i className="ri-folder-open-line fs-24 text-muted mb-2"></i>
                                                                No documents found
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center mt-3">
                                        <span className="text-muted fs-13">
                                            Showing {review.documents_with_urls?.length > 0 ? 1 : 0} to {review.documents_with_urls?.length || 0} of {review.documents_with_urls?.length || 0} documents
                                        </span>
                                        <ul className="pagination pagination-sm mb-0">
                                            <li className="page-item disabled"><span className="page-link"><i className="ri-arrow-left-s-line"></i></span></li>
                                            <li className="page-item active"><span className="page-link">1</span></li>
                                            <li className="page-item disabled"><span className="page-link"><i className="ri-arrow-right-s-line"></i></span></li>
                                        </ul>
                                    </div>
                                </div>
                            </div>


                        </div>

                        <div className="col-lg-4">
                            <div className="card shadow-sm border-0 mb-4 rounded-3">
                                <div className="card-header bg-white border-0 pt-4 pb-0">
                                    <div className="d-flex align-items-center">
                                        <div className="avatar-xs me-3">
                                            <span className="avatar-title bg-primary-subtle text-primary rounded fs-18">
                                                <i className="ri-shield-check-line"></i>
                                            </span>
                                        </div>
                                        <h5 className="card-title mb-0 fs-16 fw-bold">Review Actions</h5>
                                    </div>
                                </div>
                                <div className="card-body p-4">
                                    {isUpdatingOrFetching ? (
                                        <div className="d-flex flex-column gap-3">
                                            <div className="skeleton-line" style={{ width: '120px', height: '14px', borderRadius: '4px' }}></div>
                                            <div className="skeleton-line w-100" style={{ height: '38px', borderRadius: '6px' }}></div>
                                            <div className="skeleton-line w-100" style={{ height: '38px', borderRadius: '6px' }}></div>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-muted fs-13 mb-3">Update the status of this funding sequence step.</p>

                                            {/* Status Row */}
                                            <div className="d-flex gap-2 align-items-start mb-3">
                                                <div className="flex-grow-1">
                                                    <label className="form-label fs-13 fw-semibold">Status</label>
                                                    <Dropdown
                                                        value={selectedStatus}
                                                        options={FUNDING_REVIEW_STATUS_OPTIONS}
                                                        onChange={(e) => setSelectedStatus(e.value)}
                                                        className={`w-100 ${selectedStatus !== FUNDING_REVIEW_STATUS.REJECTED ? 'bg-light border-0' : ''}`}
                                                        placeholder="Select a Status"
                                                        pt={{
                                                            root: { className: 'w-100 rounded' },
                                                            input: { className: 'fs-14' },
                                                            item: { className: 'fs-14' }
                                                        }}
                                                    />
                                                </div>
                                                {/* Show Confirm button in same row ONLY if not Rejected */}
                                                {selectedStatus !== FUNDING_REVIEW_STATUS.REJECTED && (
                                                    <div className="pt-4" style={{ paddingTop: '1.85rem !important' }}>
                                                        <button
                                                            type="button"
                                                            className="btn btn-primary py-2 px-3 fs-14 border-0 rounded fw-semibold"
                                                            style={{ marginTop: '2px' }}
                                                            onClick={() => {
                                                                if (selectedStatus !== review.status) {
                                                                    setShowStatusModal(true);
                                                                } else {
                                                                    toast.info('Status is unchanged.');
                                                                }
                                                            }}
                                                            disabled={selectedStatus === review.status}
                                                        >
                                                            <i className="ri-checkbox-circle-line me-1"></i> Confirm
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Note and Confirm button below for Rejected */}
                                            {selectedStatus === FUNDING_REVIEW_STATUS.REJECTED && (
                                                <div className="mb-2">
                                                    <label className="form-label fs-13 fw-semibold">Reason / Note <span className="text-danger">*</span></label>
                                                    <textarea
                                                        className={`form-control rounded ${validationErrors.reject_reason ? 'is-invalid' : 'bg-light border-0'}`}
                                                        rows={4}
                                                        value={rejectReason}
                                                        onChange={(e) => {
                                                            setRejectReason(e.target.value);
                                                            if (validationErrors.reject_reason) {
                                                                setValidationErrors({ ...validationErrors, reject_reason: null });
                                                            }
                                                        }}
                                                        placeholder="Please provide a reason for rejection..."
                                                        style={{ resize: 'none' }}
                                                    ></textarea>
                                                    {validationErrors.reject_reason && (
                                                        <div className="invalid-feedback d-block mt-2">
                                                            {validationErrors.reject_reason[0]}
                                                        </div>
                                                    )}
                                                    
                                                    <div className="mt-3">
                                                        <button
                                                            type="button"
                                                            className="btn btn-primary py-2 px-4 fs-14 border-0 rounded fw-semibold"
                                                            onClick={() => {
                                                                if (!rejectReason.trim()) {
                                                                    setValidationErrors({ reject_reason: ['The reason / note field is required.'] });
                                                                    return;
                                                                }
                                                                setShowStatusModal(true);
                                                            }}
                                                        >
                                                            <i className="ri-checkbox-circle-line me-1"></i> Confirm
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            <ActivitySidebar
                                entityId={review.id}
                                entityType={ENTITY_TYPE_FUNDING_REQUEST}
                                loading={isUpdatingOrFetching}
                                partnerId={review.partner_id}
                                borrowerEmail={review.borrower?.user?.email || review.borrower?.email}
                                partnerEmail={review.partner?.user?.email || review.partner?.email}
                                isHost={isHost}
                            />
                        </div>
                    </div>
                </div>

                {/* Status Update Modal */}
                <Modal isOpen={showStatusModal} toggle={() => setShowStatusModal(false)} centered size="md">
                    <ModalBody className="p-0">
                        {/* Simple white header band */}
                        <div className="text-center pt-4 pb-3 px-4 rounded-top-3 bg-white">
                            <div className="avatar-md mx-auto mb-3">
                                <span className={`avatar-title rounded-circle fs-22 text-white ${
                                    selectedStatus === FUNDING_REVIEW_STATUS.REJECTED ? 'bg-danger' :
                                    selectedStatus === FUNDING_REVIEW_STATUS.APPROVED ? 'bg-success' :
                                    'bg-primary'
                                }`}>
                                    <i className={
                                        selectedStatus === FUNDING_REVIEW_STATUS.REJECTED ? 'ri-close-circle-line' :
                                        selectedStatus === FUNDING_REVIEW_STATUS.APPROVED ? 'ri-shield-check-line' :
                                        selectedStatus === FUNDING_REVIEW_STATUS.ACCEPTED ? 'ri-checkbox-circle-line' :
                                        selectedStatus === FUNDING_REVIEW_STATUS.IN_PROGRESS ? 'ri-user-3-fill' :
                                        'ri-time-line'
                                    }></i>
                                </span>
                            </div>
                            <h5 className="fw-bold mb-1">Confirm Status Update</h5>
                            <p className="text-muted fs-13 mb-0">
                                Are you sure you want to update the status to <strong>{selectedStatus}</strong>?
                            </p>
                        </div>

                        {/* Request Information */}
                        <div className="p-4">
                            <div className="mb-4 text-start">
                                <p className="fs-12 text-uppercase fw-bold text-muted mb-2" style={{ letterSpacing: '0.07em' }}>
                                    <i className="ri-information-line me-1"></i> Request Information
                                </p>
                                <div className="border rounded-3 p-3">
                                    {/* Borrower Name */}
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <span className="fs-13 text-muted fw-medium">Borrower Name</span>
                                        <span className="fs-13 fw-semibold text-dark">
                                            {review?.borrower?.business_name || `${review?.borrower?.first_name ?? ''} ${review?.borrower?.last_name ?? ''}`.trim() || '—'}
                                        </span>
                                    </div>
                                    
                                    {/* Funding Type */}
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <span className="fs-13 text-muted fw-medium">Funding Type</span>
                                        <span className="fs-13 fw-semibold text-dark">{review?.funding_type || '—'}</span>
                                    </div>
                                    
                                    {/* Status Transition */}
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className="fs-13 text-muted fw-medium">Status Change</span>
                                        <div className="d-flex align-items-center gap-2">
                                            <span className={`badge fs-12 ${
                                                review?.status === FUNDING_REVIEW_STATUS.REJECTED ? 'bg-danger-subtle text-danger' :
                                                review?.status === FUNDING_REVIEW_STATUS.APPROVED ? 'bg-success-subtle text-success' :
                                                review?.status === FUNDING_REVIEW_STATUS.ACCEPTED ? 'bg-info-subtle text-info' :
                                                review?.status === FUNDING_REVIEW_STATUS.IN_PROGRESS ? 'bg-primary-subtle text-primary' :
                                                'bg-warning-subtle text-warning'
                                            }`}>{review?.status}</span>
                                            <i className="ri-arrow-right-line text-muted fs-12"></i>
                                            <span className={`badge fs-12 text-white ${
                                                selectedStatus === FUNDING_REVIEW_STATUS.REJECTED ? 'bg-danger' :
                                                selectedStatus === FUNDING_REVIEW_STATUS.APPROVED ? 'bg-success' :
                                                'bg-primary'
                                            }`}>{selectedStatus}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Reason Note Preview */}
                            {selectedStatus === FUNDING_REVIEW_STATUS.REJECTED && rejectReason && (
                                <div className="mt-1 mb-2">
                                    <p className="fs-12 fw-semibold text-muted mb-2 text-uppercase" style={{ letterSpacing: '0.07em' }}>
                                        <i className="ri-chat-3-line me-1"></i> Rejection Note
                                    </p>
                                    <div className="border rounded-3 p-3 text-dark fs-13" style={{ whiteSpace: 'pre-wrap' }}>
                                        {rejectReason}
                                    </div>
                                </div>
                            )}

                            <div className="d-flex justify-content-end gap-2 mt-4">
                                <button
                                    type="button"
                                    className="btn bg-white border border-secondary-subtle px-4 py-2 fs-14 rounded-2 text-dark fw-medium"
                                    onClick={() => setShowStatusModal(false)}
                                    disabled={updateStatusMutation.isPending}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className={`btn ${
                                        selectedStatus === FUNDING_REVIEW_STATUS.REJECTED ? 'btn-danger' :
                                        selectedStatus === FUNDING_REVIEW_STATUS.APPROVED ? 'btn-success' :
                                        'btn-primary'
                                    } px-4 py-2 fs-14 border-0 rounded-2 fw-semibold`}
                                    onClick={handleStatusUpdate}
                                    disabled={updateStatusMutation.isPending}
                                >
                                    {updateStatusMutation.isPending ? (
                                        <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Updating...</>
                                    ) : (
                                        <><i className="ri-checkbox-circle-line me-1"></i> Confirm {selectedStatus}</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </ModalBody>
                </Modal>
            </div>
        </>
    );
}
