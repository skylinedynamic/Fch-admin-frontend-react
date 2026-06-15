import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useFundingReviewDetails, useUpdateFundingReviewStatus } from '../../../modules/application';
import { toast } from 'react-toastify';
// @ts-ignore
import ApplicationDetailsLoader from '../../../components/Loader/ApplicationDetailsLoader';

export default function FundingReviewDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [rejectReason, setRejectReason] = useState('');
    const [isRejecting, setIsRejecting] = useState(false);
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
        if (!isRejecting) {
            setIsRejecting(true);
            setValidationErrors({});
            return;
        }

        setValidationErrors({});

        updateStatusMutation.mutate(
            { id: review.id, status: 'Rejected', reject_reason: rejectReason },
            {
                onSuccess: () => {
                    toast.success('Funding review rejected successfully');
                    setIsRejecting(false);
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
                        <div className="card shadow-sm border-0">
                            <div className="card-header bg-white border-bottom py-3">
                                <h5 className="card-title mb-0 fs-16">Borrower & Funding Information</h5>
                            </div>
                            <div className="card-body">
                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label fs-13 text-muted">Borrower Name</label>
                                        <div className="fs-14 fw-medium">{`${review.borrower?.first_name || ''} ${review.borrower?.last_name || ''}`}</div>
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label fs-13 text-muted">Company Name</label>
                                        <div className="fs-14">{review.borrower?.company_name || '-'}</div>
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label fs-13 text-muted">Funding Sequence</label>
                                        <div className="fs-14">{review.funding_sequence?.name || '-'}</div>
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label fs-13 text-muted">Funding Type</label>
                                        <div className="fs-14">{review.funding_type || '-'}</div>
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label fs-13 text-muted">Purpose of Funds</label>
                                        <div className="fs-14">{review.use_of_funds || '-'}</div>
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label fs-13 text-muted">Requested Amount</label>
                                        <div className="fs-14 fw-bold">{review.requested_amount || '-'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card shadow-sm border-0">
                            <div className="card-header bg-white border-bottom py-3">
                                <h5 className="card-title mb-0 fs-16">Review Status</h5>
                            </div>
                            <div className="card-body">
                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label fs-13 text-muted">Current Status</label>
                                        <div>{getStatusBadge(review.status)}</div>
                                    </div>
                                    {review.status === 'Rejected' && (
                                        <div className="col-md-12 mb-3">
                                            <label className="form-label fs-13 text-muted">Rejection Reason</label>
                                            <div className="fs-14 p-3 bg-light rounded text-danger border border-danger-subtle">{review.reject_reason || 'No reason provided'}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-lg-4">
                        <div className="card shadow-sm border-0 position-sticky" style={{ top: '90px' }}>
                            <div className="card-header bg-white border-bottom py-3">
                                <h5 className="card-title mb-0 fs-16">Actions</h5>
                            </div>
                            <div className="card-body">
                                <p className="text-muted fs-13 mb-3">Review the details and make a decision to approve or reject this funding sequence step.</p>
                                
                                {review.status === 'Pending' && isRejecting && (
                                    <div className="mb-3">
                                        <label className="form-label fs-13">Reason / Note <span className="text-danger">*</span></label>
                                        <textarea 
                                            className={`form-control bg-light border-light ${validationErrors.reject_reason ? 'is-invalid' : ''}`} 
                                            rows={3} 
                                            value={rejectReason}
                                            onChange={(e) => {
                                                setRejectReason(e.target.value);
                                                if (validationErrors.reject_reason) {
                                                    setValidationErrors({...validationErrors, reject_reason: null});
                                                }
                                            }}
                                            placeholder="Please provide a reason for rejection..."
                                            autoFocus
                                        ></textarea>
                                        {validationErrors.reject_reason && (
                                            <div className="invalid-feedback d-block">
                                                {validationErrors.reject_reason[0]}
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                <div className="d-grid gap-2">
                                    {review.status === 'Pending' && !isRejecting && (
                                        <>
                                            <button 
                                                type="button" 
                                                className="btn btn-success" 
                                                onClick={handleApprove}
                                                disabled={updateStatusMutation.isPending}
                                            >
                                                {updateStatusMutation.isPending ? 'Processing...' : 'Approve Application'}
                                            </button>
                                            <button 
                                                type="button" 
                                                className="btn btn-outline-danger" 
                                                onClick={handleReject}
                                                disabled={updateStatusMutation.isPending}
                                            >
                                                Reject Application
                                            </button>
                                        </>
                                    )}

                                    {review.status === 'Pending' && isRejecting && (
                                        <>
                                            <button 
                                                type="button" 
                                                className="btn btn-danger" 
                                                onClick={handleReject}
                                                disabled={updateStatusMutation.isPending}
                                            >
                                                {updateStatusMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                                            </button>
                                            <button 
                                                type="button" 
                                                className="btn btn-light" 
                                                onClick={() => {
                                                    setIsRejecting(false);
                                                    setRejectReason('');
                                                }}
                                                disabled={updateStatusMutation.isPending}
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
        </div>
    );
}
