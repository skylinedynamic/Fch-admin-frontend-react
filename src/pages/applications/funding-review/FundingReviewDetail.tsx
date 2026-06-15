import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useFundingReviewDetails, useUpdateFundingReviewStatus } from '../../../modules/application';
import { toast } from 'react-toastify';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
// @ts-ignore
import ApplicationDetailsLoader from '../../../components/Loader/ApplicationDetailsLoader';

export default function FundingReviewDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [rejectReason, setRejectReason] = useState('');
    const [isRejecting, setIsRejecting] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [validationErrors, setValidationErrors] = useState<any>({});

    const { data: apiResponse, isLoading, error } = useFundingReviewDetails(id || '');
    const updateStatusMutation = useUpdateFundingReviewStatus();

    const review = apiResponse?.data;

    useEffect(() => {
        if (error || (!isLoading && !review)) {
            toast.error('Failed to load review details');
            navigate('/intake-review/funding-review');
        }
    }, [error, review, isLoading, navigate]);

    if (isLoading) {
        return <ApplicationDetailsLoader />;
    }

    if (!review) return null;

    const handleApprove = () => {
        setValidationErrors({});
        updateStatusMutation.mutate(
            { id: review.id, status: 'Approved' },
            {
                onSuccess: () => {
                    toast.success('Funding review approved successfully');
                    setShowApproveModal(false);
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

    const handleReject = () => {
        setValidationErrors({});

        updateStatusMutation.mutate(
            { id: review.id, status: 'Rejected', reject_reason: rejectReason },
            {
                onSuccess: () => {
                    toast.success('Funding review rejected successfully');
                    setShowRejectModal(false);
                    setRejectReason('');
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
        if (status === 'Approved') return <span className="badge bg-success-subtle text-success fs-13">Approved</span>;
        if (status === 'Rejected') return <span className="badge bg-danger-subtle text-danger fs-13">Rejected</span>;
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
                                <h4 className="fs-20 mb-1">Funding Review Details</h4>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb m-0">
                                        <li className="breadcrumb-item"><Link to="/">Dashboard</Link></li>
                                        <li className="breadcrumb-item"><Link to="/intake-review/funding-review">Funding Reviews</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">Review Details</li>
                                    </ol>
                                </nav>
                            </div>
                            <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
                                <Link to="/intake-review/funding-review" className="btn btn-outline-secondary w-lg waves-effect">
                                    <i className="ri-arrow-left-line align-middle me-1"></i> Back
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row mt-3">
                    <div className="col-lg-8">
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
                                    <div className="col-md-6">
                                        <p className="text-muted mb-1 fs-13">Company Name</p>
                                        <h5 className="fs-15 fw-bold mb-0">{review.borrower?.company_name || '-'}</h5>
                                    </div>
                                    <div className="col-12"><hr className="border-light m-0" /></div>
                                    <div className="col-md-6">
                                        <p className="text-muted mb-1 fs-13">Funding Sequence</p>
                                        <h5 className="fs-15 fw-bold mb-0">{review.funding_sequence?.name || '-'}</h5>
                                    </div>
                                    <div className="col-md-6">
                                        <p className="text-muted mb-1 fs-13">Funding Type</p>
                                        <h5 className="fs-15 fw-bold mb-0">{review.funding_type || '-'}</h5>
                                    </div>
                                    <div className="col-12"><hr className="border-light m-0" /></div>
                                    <div className="col-md-6">
                                        <p className="text-muted mb-1 fs-13">Purpose of Funds</p>
                                        <h5 className="fs-15 fw-bold mb-0">{review.use_of_funds || '-'}</h5>
                                    </div>
                                    <div className="col-md-6">
                                        <p className="text-muted mb-1 fs-13">Requested Amount</p>
                                        <h5 className="fs-15 fw-bold mb-0">
                                            {review.requested_amount
                                                ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(review.requested_amount)
                                                : '-'}
                                        </h5>
                                    </div>
                                    <div className="col-12"><hr className="border-light m-0" /></div>
                                    <div className="col-md-6">
                                        <p className="text-muted mb-1 fs-13">Estimated Speed</p>
                                        <h5 className="fs-15 fw-bold mb-0">{review.estimated_speed || '-'}</h5>
                                    </div>
                                    <div className="col-md-6">
                                        <p className="text-muted mb-1 fs-13">Documents Uploaded</p>
                                        <div className="d-flex flex-wrap gap-2 mt-2">
                                            {Array.isArray(review.documents_uploaded) && review.documents_uploaded.length > 0 ? (
                                                review.documents_uploaded.map((doc: string, idx: number) => (
                                                    <span key={idx} className="bg-light text-dark border border-light-subtle rounded px-2 py-1 fs-13 fw-medium">
                                                        {doc.replace(/_/g, ' ')}
                                                    </span>
                                                ))
                                            ) : (
                                                <h5 className="fs-15 fw-bold mb-0">-</h5>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card shadow-sm border-0 rounded-3">
                            <div className="card-header bg-white border-0 pt-4 pb-0">
                                <div className="d-flex align-items-center">
                                    <div className="avatar-xs me-3">
                                        <span className="avatar-title bg-primary-subtle text-primary rounded fs-18">
                                            <i className="ri-clipboard-line"></i>
                                        </span>
                                    </div>
                                    <h5 className="card-title mb-0 fs-16 fw-bold">Review Status</h5>
                                </div>
                            </div>
                            <div className="card-body p-4">
                                <div className="row g-4">
                                    <div className="col-md-6">
                                        <p className="text-muted mb-2 fs-13">Current Status</p>
                                        <div>{getStatusBadge(review.status)}</div>
                                    </div>
                                    {review.status === 'Rejected' && (
                                        <div className="col-md-12">
                                            <p className="text-muted mb-2 fs-13">Rejection Reason</p>
                                            <div className="fs-14 p-3 bg-light rounded text-dark border border-light-subtle" style={{ whiteSpace: 'pre-wrap' }}>
                                                {review.reject_reason || 'No reason provided'}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-lg-4">
                        <div className="card shadow-sm border-0 position-sticky rounded-3" style={{ top: '90px' }}>
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
                                <p className="text-muted fs-13 mb-4">Review the details and make a decision to approve or reject this funding sequence step.</p>

                                {review.status === 'Pending' && isRejecting && (
                                    <div className="mb-4">
                                        <label className="form-label fs-14 fw-semibold">Reason / Note <span className="text-danger">*</span></label>
                                        <textarea
                                            className={`form-control bg-light border-0 rounded ${validationErrors.reject_reason ? 'is-invalid' : ''}`}
                                            rows={4}
                                            value={rejectReason}
                                            onChange={(e) => {
                                                setRejectReason(e.target.value);
                                                if (validationErrors.reject_reason) {
                                                    setValidationErrors({ ...validationErrors, reject_reason: null });
                                                }
                                            }}
                                            placeholder="Please provide a reason for rejection..."
                                            autoFocus
                                            style={{ resize: 'none' }}
                                        ></textarea>
                                        {validationErrors.reject_reason && (
                                            <div className="invalid-feedback d-block mt-2">
                                                {validationErrors.reject_reason[0]}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="d-flex flex-column gap-3">
                                    {review.status === 'Pending' && !isRejecting && (
                                        <>
                                            <div
                                                className="card mb-0 border shadow-none border-success-subtle"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => setShowApproveModal(true)}
                                            >
                                                <div className="card-body p-3 d-flex align-items-center">
                                                    <div className="avatar-sm flex-shrink-0 me-3">
                                                        <span className="avatar-title bg-success-subtle text-success rounded-circle fs-20">
                                                            <i className="ri-check-line"></i>
                                                        </span>
                                                    </div>
                                                    <div className="flex-grow-1">
                                                        <h6 className="mb-1 text-success fs-15 fw-bold">Approve Application</h6>
                                                        <p className="text-muted mb-0 fs-12">Approve this application and move forward.</p>
                                                    </div>
                                                    <div className="flex-shrink-0">
                                                        <i className="ri-arrow-right-line text-dark fs-18"></i>
                                                    </div>
                                                </div>
                                            </div>

                                            <div
                                                className="card mb-0 border shadow-none border-danger-subtle"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => setIsRejecting(true)}
                                            >
                                                <div className="card-body p-3 d-flex align-items-center">
                                                    <div className="avatar-sm flex-shrink-0 me-3">
                                                        <span className="avatar-title bg-danger-subtle text-danger rounded-circle fs-20">
                                                            <i className="ri-close-line"></i>
                                                        </span>
                                                    </div>
                                                    <div className="flex-grow-1">
                                                        <h6 className="mb-1 text-danger fs-15 fw-bold">Reject Application</h6>
                                                        <p className="text-muted mb-0 fs-12">Reject this application and provide feedback.</p>
                                                    </div>
                                                    <div className="flex-shrink-0">
                                                        <i className="ri-arrow-right-line text-dark fs-18"></i>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    {review.status === 'Pending' && isRejecting && (
                                        <>
                                            <button
                                                type="button"
                                                className="btn btn-danger py-2 fs-15 border-0 rounded fw-bold"
                                                onClick={() => {
                                                    if (!rejectReason.trim()) {
                                                        setValidationErrors({ reject_reason: ['The reason / note field is required.'] });
                                                        return;
                                                    }
                                                    setShowRejectModal(true);
                                                }}
                                            >
                                                Confirm Rejection
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-light py-2 fs-15 border-0 rounded text-dark fw-bold"
                                                onClick={() => {
                                                    setIsRejecting(false);
                                                    setRejectReason('');
                                                    setValidationErrors({});
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Approve Modal */}
            <Modal isOpen={showApproveModal} toggle={() => setShowApproveModal(false)} centered>
                <ModalBody className="p-4">
                    <div className="text-center mb-4 mt-2">
                        <div className="avatar-md mx-auto mb-3">
                            <span className="avatar-title bg-success-subtle text-success rounded-circle fs-24">
                                <i className="ri-check-line"></i>
                            </span>
                        </div>
                        <h4 className="fw-bold">Approve Application</h4>
                        <p className="text-muted fs-14 mb-0">Are you sure you want to approve this application? This action will move the application forward.</p>
                    </div>
                    <div className="d-flex flex-column gap-2">
                        <button 
                            type="button" 
                            className="btn btn-success py-2 fs-15 border-0 rounded fw-bold" 
                            onClick={handleApprove}
                            disabled={updateStatusMutation.isPending}
                        >
                            {updateStatusMutation.isPending ? 'Approving...' : 'Confirm Approve'}
                        </button>
                        <button 
                            type="button" 
                            className="btn btn-light py-2 fs-15 border-0 rounded text-dark fw-bold" 
                            onClick={() => setShowApproveModal(false)}
                            disabled={updateStatusMutation.isPending}
                        >
                            Cancel
                        </button>
                    </div>
                </ModalBody>
            </Modal>

            {/* Reject Modal */}
            <Modal isOpen={showRejectModal} toggle={() => setShowRejectModal(false)} centered>
                <ModalBody className="p-4">
                    <div className="text-center mb-4 mt-2">
                        <div className="avatar-md mx-auto mb-3">
                            <span className="avatar-title bg-danger-subtle text-danger rounded-circle fs-24">
                                <i className="ri-close-line"></i>
                            </span>
                        </div>
                        <h4 className="fw-bold">Confirm Rejection</h4>
                        <p className="text-muted fs-14 mb-0">Are you sure you want to reject this application? The borrower will be notified with your feedback.</p>
                    </div>

                    <div className="mb-4 text-start">
                        <p className="fs-13 fw-semibold text-muted mb-2">Your Reason / Note:</p>
                        <div className="p-3 bg-light rounded text-dark fs-14 border border-light-subtle" style={{ whiteSpace: 'pre-wrap' }}>
                            {rejectReason}
                        </div>
                    </div>
                    
                    <div className="d-flex flex-column gap-2">
                        <button
                            type="button"
                            className="btn btn-danger py-2 fs-15 border-0 rounded fw-bold"
                            onClick={handleReject}
                            disabled={updateStatusMutation.isPending}
                        >
                            {updateStatusMutation.isPending ? 'Rejecting...' : 'Yes, Reject Application'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-light py-2 fs-15 border-0 rounded text-dark fw-bold"
                            onClick={() => setShowRejectModal(false)}
                            disabled={updateStatusMutation.isPending}
                        >
                            Cancel
                        </button>
                    </div>
                </ModalBody>
            </Modal>
        </div>
        </>
    );
}
