import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import PageHeader from '../../common/PageHeader';
import { useFundingRequestDetails, useUpdateFundingRequestStatus, useAssignLenderToFundingRequest } from '../../../modules/application';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import FundingRequestDetailLoader from './components/FundingRequestDetailLoader';
import { getFileConfig } from '../../../config/fileTypeConfig';
import { handleFileDownload, downloadFromUrl } from '../../../utils/fileDownload';
import { downloadBorrowerDocument } from '../../../modules/client/services';
import ActivitySidebar from '../../../components/Common/Activity/ActivitySidebar';
import { ENTITY_TYPE_FUNDING_REQUEST } from '../../../config/appConfig';
import { FUNDING_REVIEW_STATUS, FUNDING_REVIEW_STATUS_OPTIONS, FUNDING_REVIEW_GUIDELINE_CARDS, REJECT_REASON_MAX_LENGTH, REJECT_NOTE_PREVIEW_LENGTH } from '../../../config/funding';
import { FUNDING_APPLICATION_STATUS } from '../../../config/borrower';
import { DOCUMENT_STATUS } from '../../../config/documentStatus';
import { Dropdown } from 'primereact/dropdown';
import { Dialog } from 'primereact/dialog';
import { isStaleRecordError, staleRecordMessage, withExpectedStatus } from '../../../utils/staleRecord';
import ReviewProgressCard from './components/ReviewProgressCard';
import LenderMatchStats from './components/LenderMatchStats';
import LenderInformationCard, { type MatchedLender } from '../../../components/Common/Lender/LenderInformationCard';
import '../../../../assets/css/funding-requests.css';
import { toast } from 'react-toastify';
import { lenderDisplayName } from '../../../modules/lender/displayName';

import { useAuthStore } from '../../../store/auth/authStore';
import { getDocStatusBadgeConfig } from '../../../utils/badgeHelper';
import { PARTNER_EDITOR_TYPES } from '../../../config/partnerTypeOptions';

export default function FundingRequestDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const currentUser = useAuthStore((state: any) => state.user);
    const isHost = currentUser?.is_host == 1;

    const [rejectReason, setRejectReason] = useState('');
    // A long note is folded in the confirmation; it opens folded each time.
    const [rejectNoteExpanded, setRejectNoteExpanded] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    useEffect(() => { if (showStatusModal) setRejectNoteExpanded(false); }, [showStatusModal]);
    const [showMissingLenderModal, setShowMissingLenderModal] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [validationErrors, setValidationErrors] = useState<any>({});
    const sidebarRef = useRef<HTMLDivElement>(null);
    const sidebarColRef = useRef<HTMLDivElement>(null);
    const lenderTableRef = useRef<HTMLDivElement>(null);

    const { data: apiResponse, isLoading, isFetching, error, refetch } = useFundingRequestDetails(id || '');
    const updateStatusMutation = useUpdateFundingRequestStatus();
    const assignLenderMutation = useAssignLenderToFundingRequest();

    const [assignedLenderIds, setAssignedLenderIds] = useState<number[]>([]);
    const [showAssignIndicator, setShowAssignIndicator] = useState(false);

    const isUpdatingOrFetching = updateStatusMutation.isPending || isFetching;

    const review = apiResponse?.data;

    useEffect(() => {
        if (review) {
            setAssignedLenderIds(review.assign_lender ? [review.assign_lender] : []);
        }
    }, [review]);

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

    // A rejected request opens with the reason it was saved with.
    useEffect(() => {
        if (review?.status === FUNDING_REVIEW_STATUS.REJECTED && review.reject_reason) {
            setRejectReason(review.reject_reason);
        }
    }, [review?.status, review?.reject_reason]);

    // Use standard CSS sticky instead of JS listener to avoid jumping/cut-off issues

    // Lender Information (LenderInformationCard): assign, then show it as assigned.
    const assignLender = (lender: MatchedLender) =>
        assignLenderMutation.mutateAsync({ id: review.id, lender_ids: [lender.id] }).then(
            () => {
                toast.success(`Lender assigned successfully`);
                setAssignedLenderIds([lender.id]);
                window.dispatchEvent(new Event('refreshActivities'));
            },
            (err: any) => {
                toast.error(err?.response?.data?.message || 'Failed to assign lender');
                throw err;
            }
        );

    if (isLoading) {
        return <FundingRequestDetailLoader />;
    }

    if (!review) return null;

    const handleStatusUpdate = () => {
        setValidationErrors({});
        updateStatusMutation.mutate(
            // With the status this page shows: a decision made on a stale page
            // is refused instead of flipping what someone else decided (R2 BUG-048).
            withExpectedStatus(
                { id: review.id, status: selectedStatus, ...(selectedStatus === FUNDING_REVIEW_STATUS.REJECTED && { reject_reason: rejectReason }) },
                review.status
            ),
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
                    if (isStaleRecordError(err)) {
                        // Already decided elsewhere: say so and show the current state.
                        setShowStatusModal(false);
                        toast.error(staleRecordMessage(err));
                        refetch();
                        window.dispatchEvent(new Event('refreshActivities'));
                    } else if (err?.response?.status === 422) {
                        setValidationErrors(err.response.data.errors || {});
                    } else {
                        toast.error(err?.response?.data?.message || 'Failed to update status');
                    }
                }
            }
        );
    };

    const getExactStatusStyles = (status: string) => {
        const label = status || FUNDING_REVIEW_STATUS.PENDING;
        const card = FUNDING_REVIEW_GUIDELINE_CARDS.find(c => c.label === label);
        return {
            bg: card?.bg || '#f0fdf4',
            border: card?.border || '#bbf7d0',
            iconBg: card?.iconBg || '#16a34a',
        };
    };

    const getStatusBadge = (status: string) => {
        const styles = getExactStatusStyles(status);

        return (
            <span
                className="badge fs-13"
                style={{
                    backgroundColor: styles.bg,
                    color: styles.iconBg,
                    border: `1px solid ${styles.border}`
                }}
            >
                {status}
            </span>
        );
    };

    return (
        <>
            <div className="page-content">

                <div className="container-fluid">
                    {/* Header */}
                    {/* Header */}
                    <PageHeader
                        title="Funding Request Details"
                        breadcrumbs={[
                            { label: 'Funding Requests', path: '/intake-review/funding-request' },
                            { label: 'Details' }
                        ]}
                    >
                        <div className="page-actions page-actions-wrap d-flex align-items-center flex-wrap gap-2 mt-2 mt-lg-0">
                            {(review?.borrower?.id || review?.borrower_id) && (
                                <Link to={`/clients/${review.borrower?.id || review.borrower_id}`} className="btn btn-primary waves-effect">
                                    <i className="ri-user-line align-middle me-1"></i> Go to Client
                                </Link>
                            )}
                            {/* No application yet, or one still being prepared (Draft / On Hold):
                                everyone who can see the request processes it, as before. */}
                            {review?.status === FUNDING_REVIEW_STATUS.APPROVED && review?.id && (
                                !review.funding_application ||
                                review.funding_application.status === FUNDING_APPLICATION_STATUS.ON_HOLD ||
                                review.funding_application.status === FUNDING_APPLICATION_STATUS.DRAFT
                            ) && (
                                <Link to={`/fund-application/${review.id}`} className="btn btn-primary waves-effect">
                                    <i className="ri-file-list-3-line align-middle"></i> Process Application
                                </Link>
                            )}
                            {/* A Draft / On Hold application also offers Edit to the host (anyone's) and
                                a white-label or certified partner (its own borrowers'); nothing is signed yet. */}
                            {(isHost || (PARTNER_EDITOR_TYPES.includes(currentUser?.partner_type) && review?.partner_id == currentUser?.partner_id)) &&
                                review?.status === FUNDING_REVIEW_STATUS.APPROVED && review?.id && (
                                review.funding_application?.status === FUNDING_APPLICATION_STATUS.ON_HOLD ||
                                review.funding_application?.status === FUNDING_APPLICATION_STATUS.DRAFT
                            ) && (
                                <Link to={`/fund-application/${review.id}`} className="btn btn-warning waves-effect py-2 fw-normal">
                                    <i className="ri-edit-line align-middle me-1"></i> Edit Funding Application
                                </Link>
                            )}
                            {/* Already submitted: the host edits any partner's (any status - the API
                                says so in is_editable), a white-label or certified partner only its
                                own borrowers' and only up to status key 9. */}
                            {(isHost || (PARTNER_EDITOR_TYPES.includes(currentUser?.partner_type) && review?.partner_id == currentUser?.partner_id)) &&
                                review?.status === FUNDING_REVIEW_STATUS.APPROVED && review?.id &&
                                review.funding_application?.is_editable &&
                                review.funding_application.status !== FUNDING_APPLICATION_STATUS.ON_HOLD &&
                                review.funding_application.status !== FUNDING_APPLICATION_STATUS.DRAFT && (
                                <Link
                                    to={`/fund-application/${review.id}`}
                                    className="btn btn-warning waves-effect py-2 fw-normal"
                                    title="Editing will require the borrower to re-sign the application"
                                >
                                    <i className="ri-edit-line align-middle me-1"></i> Edit Funding Application
                                </Link>
                            )}
                            <Link to="/intake-review/funding-request" className="btn btn-outline-secondary w-lg waves-effect">
                                <i className="ri-arrow-left-line align-middle me-1"></i> Back
                            </Link>
                        </div>
                    </PageHeader>
                    <div className="row">
                        <div className="col-lg-8">
                            <ReviewProgressCard
                                status={review.status}
                                createdAt={review.created_at}
                                updatedAt={review.updated_at}
                                rejectReason={review.reject_reason}
                                statusDates={review.status_dates}
                            />
                            {isHost && review.matched_lenders && review.matched_lenders.length > 0 && (
                                <LenderInformationCard
                                    cardRef={lenderTableRef}
                                    // "Lender Name - Legal Name", as on the funding application details page (R2 BUG-008).
                                    lenders={review.matched_lenders.map((lender: MatchedLender) => (
                                        lender.legal_name ? { ...lender, name: `${lender.name} - ${lender.legal_name}` } : lender
                                    ))}
                                    assignedLenderIds={assignedLenderIds}
                                    subjectLabel="funding request"
                                    onAssign={assignLender}
                                    isBusy={assignLenderMutation.isPending || updateStatusMutation.isPending}
                                    highlightFirstRow={showAssignIndicator}
                                    // As on the application page: past its editable statuses the
                                    // lender is fixed (SCRUM-434 S434-BUG-03) - just that lender.
                                    canAssign={review.can_assign_lender !== false}
                                    assignDisabledReason={`The lender can't be changed now that the funding application is "${review.funding_application?.status ?? ''}".`}
                                    onlyAssigned={review.can_assign_lender === false && assignedLenderIds.length > 0}
                                />
                            )}



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
                                    <div className="row gy-3 gx-4">
                                        <div className="col-md-4">
                                            <p className="text-muted mb-1 fs-12">Borrower Name</p>
                                            <h5 className="fs-14 fw-bold mb-0">{`${review.borrower?.first_name || ''} ${review.borrower?.last_name || ''}`}</h5>
                                        </div>
                                        {isHost && (
                                            <div className="col-md-4">
                                                <p className="text-muted mb-1 fs-12">Partner Name</p>
                                                <h5 className="fs-14 fw-bold mb-0">{review.partner?.full_name || '-'}</h5>
                                            </div>
                                        )}
                                        <div className="col-md-4">
                                            <p className="text-muted mb-1 fs-12">Funding Sequence</p>
                                            <h5 className="fs-14 fw-bold mb-0">{review.funding_sequence?.name || '-'}</h5>
                                        </div>
                                        <div className="col-md-4">
                                            <p className="text-muted mb-1 fs-12">Purpose of Funds</p>
                                            <h5 className="fs-14 fw-bold mb-0">{review.use_of_funds || '-'}</h5>
                                        </div>
                                        <div className="col-md-4">
                                            <p className="text-muted mb-1 fs-12">Funding Type</p>
                                            <h5 className="fs-14 fw-bold mb-0">{review.funding_type || '-'}</h5>
                                        </div>
                                        <div className="col-md-4">
                                            <p className="text-muted mb-1 fs-12">Requested Amount</p>
                                            <h5 className="fs-14 fw-bold mb-0">
                                                {review.requested_amount
                                                    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(review.requested_amount)
                                                    : '-'}
                                            </h5>
                                        </div>
                                        <div className="col-md-4">
                                            <p className="text-muted mb-1 fs-12">Estimated Speed</p>
                                            <h5 className="fs-14 fw-bold mb-0">{review.estimated_speed || '-'}</h5>
                                        </div>
                                    </div>
                                </div>
                            </div>



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
                                    <div className="table-responsive border rounded border-light-subtle bg-white lender-match-table-container">
                                        <table className="table align-middle mb-0 fr-style-4ac477ea fr-style-docs-table">
                                            <thead className="bg-light">
                                                <tr>
                                                    <th scope="col" className="fs-13 fw-semibold text-muted border-bottom-0 px-2 fr-style-55c8853f">File Name</th>
                                                    <th scope="col" className="fs-13 fw-semibold text-muted border-bottom-0 fr-style-55d69cc0">Uploaded On</th>
                                                    <th scope="col" className="fs-13 fw-semibold text-muted border-bottom-0 fr-style-55e26e66">Status</th>
                                                    <th scope="col" className="fs-13 fw-semibold text-muted border-bottom-0 text-end px-2 fr-style-55e26e66">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {Array.isArray(review.documents_with_urls) && review.documents_with_urls.length > 0 ? (
                                                    Object.entries(
                                                        // One title per document type, its files listed under it.
                                                        (review.documents_with_urls as any[]).reduce((groups: Record<string, any[]>, doc: any) => {
                                                            const title = doc.document_type || doc.name.replace(/_/g, ' ');
                                                            (groups[title] ||= []).push(doc);
                                                            return groups;
                                                        }, {})
                                                    ).map(([title, docs]) => {
                                                        const fileCount = (docs as any[]).filter((d: any) => d.document_id).length;
                                                        return (
                                                    <React.Fragment key={title}>
                                                        <tr className="bg-light-subtle">
                                                            <td colSpan={4} className="px-2 py-2 fw-semibold text-dark fs-14">
                                                                <i className="ri-folder-3-line me-2 text-primary"></i>
                                                                {title}
                                                                <span className="ms-2 badge bg-primary-subtle text-primary fs-12">
                                                                    {fileCount} {fileCount === 1 ? 'file' : 'files'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    {(docs as any[]).map((doc: any, idx: number) => {
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
                                                            <tr key={`${title}-${idx}`}>
                                                                <td className="ps-4 pe-2 py-3">
                                                                    <div className="d-flex align-items-center">
                                                                        <div className="avatar-sm flex-shrink-0">
                                                                            <div className={`avatar-title ${config.bg} ${config.color} rounded fs-20 material-shadow`}>
                                                                                <i className={config.icon}></i>
                                                                            </div>
                                                                        </div>
                                                                        <div className="ms-3 flex-grow-1 overflow-hidden fr-style-18eb16e4">
                                                                            <h6 className="fs-14 mb-0 text-truncate" title={displayFileName}>
                                                                                <a href="#" onClick={handleDownload} className="text-body fw-medium d-block text-truncate">
                                                                                    {displayFileName}
                                                                                </a>
                                                                            </h6>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="py-3 text-muted">{doc.uploaded_on || '-'}</td>
                                                                <td className="py-3">
                                                                    {(() => {
                                                                        const badgeConfig = getDocStatusBadgeConfig(doc.status);
                                                                        return (
                                                                            <span className={`badge ${badgeConfig.badgeClass} fs-12`}>
                                                                                <i className={`${badgeConfig.iconClass} me-1`}></i>{badgeConfig.label}
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                </td>
                                                                <td className="text-end px-2 py-3">
                                                                    <div className="d-flex justify-content-end align-items-center gap-2">
                                                                        {doc.url ? (
                                                                            <a href="#" onClick={handleDownload} className="btn btn-sm text-primary fs-14 p-1 d-flex align-items-center justify-content-center bg-white border border-light-subtle rounded shadow-none fr-style-affbd8f" title="Download Document">
                                                                                <i className="ri-download-2-line"></i>
                                                                            </a>
                                                                        ) : null}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    </React.Fragment>
                                                        );
                                                    })
                                                ) : (
                                                    <tr>
                                                        <td colSpan={4} className="text-center text-muted fs-13 py-4">
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
                                            {(() => {
                                                const files = (review.documents_with_urls || []).filter((d: any) => d.document_id).length;
                                                return `Showing ${files > 0 ? 1 : 0} to ${files} of ${files} documents`;
                                            })()}
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
                        {/* Right sticky column — pure CSS sticky */}
                        <div className="col-lg-4" style={{ position: 'sticky', top: '133px', height: 'calc(100vh - 133px)', zIndex: 10 }}>
                            <div className="d-flex flex-column gap-3 fr-style-30509dca" style={{ height: '100%', paddingBottom: '20px' }}>
                                {isHost && (
                                    <div className="card shadow-sm border-0 mb-0 rounded-3 flex-shrink-0">
                                        <div className="card-header bg-white border-0 pt-4 pb-0">
                                            <div className="d-flex align-items-center">
                                                <div className="avatar-xs me-3">
                                                    <span className="avatar-title bg-light text-dark rounded fs-18">
                                                        <i className="ri-shield-check-line"></i>
                                                    </span>
                                                </div>
                                                <h5 className="card-title mb-0 fs-16 fw-bold">Review Actions</h5>
                                            </div>
                                        </div>
                                        <div className="card-body p-4">
                                            <p className="text-muted fs-13 mb-3">Update the status of this funding sequence step.</p>

                                            {/* Status Row */}
                                            <div className="mb-3">
                                                <label className="form-label fs-13 fw-semibold mb-2">Status</label>
                                                <div className="d-flex gap-2" style={{ height: '42px' }}>
                                                    <div className="flex-grow-1" style={{ minWidth: 0, height: '100%' }}>
                                                        <Dropdown
                                                            value={selectedStatus}
                                                            options={FUNDING_REVIEW_STATUS_OPTIONS}
                                                            onChange={(e) => setSelectedStatus(e.value)}
                                                            className={`w-100 d-flex align-items-center h-100 ${selectedStatus !== FUNDING_REVIEW_STATUS.REJECTED ? 'bg-light border-0' : ''}`}
                                                            placeholder="Select a Status"
                                                            pt={{
                                                                root: { className: 'w-100 rounded h-100' },
                                                                input: { className: 'fs-14 d-flex align-items-center h-100 text-truncate', style: { minHeight: '42px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', paddingRight: '2rem' } },
                                                                item: { className: 'fs-14' }
                                                            }}
                                                        />
                                                    </div>

                                                    {/* Show Confirm button in same row ONLY if not Rejected */}
                                                    {selectedStatus !== FUNDING_REVIEW_STATUS.REJECTED && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-primary fw-medium waves-effect waves-light d-flex align-items-center justify-content-center gap-1 px-3 h-100 flex-shrink-0"
                                                            onClick={() => {
                                                                if (selectedStatus === FUNDING_REVIEW_STATUS.APPROVED) {
                                                                    if (isHost && assignedLenderIds.length === 0) {
                                                                        setShowMissingLenderModal(true);
                                                                        return;
                                                                    }
                                                                }
                                                                if (selectedStatus !== review.status) {
                                                                    setShowStatusModal(true);
                                                                } else {
                                                                    toast.info('Status is unchanged.');
                                                                }
                                                            }}
                                                            disabled={updateStatusMutation.isPending}
                                                        >
                                                            Confirm <i className="ri-arrow-right-line"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Note and Confirm button below for Rejected */}
                                            {selectedStatus === FUNDING_REVIEW_STATUS.REJECTED && (
                                                <div className="mb-2 mt-3">
                                                    <label className="form-label fs-13 fw-semibold mb-2">Reason / Note <span className="text-danger">*</span></label>
                                                    <textarea
                                                        className={`form-control rounded fr-style-6e003d7 ${validationErrors.reject_reason ? 'is-invalid' : 'bg-light border-0'}`}
                                                        rows={4}
                                                        value={rejectReason}
                                                        onChange={(e) => {
                                                            setRejectReason(e.target.value);
                                                            if (validationErrors.reject_reason) {
                                                                setValidationErrors({ ...validationErrors, reject_reason: null });
                                                            }
                                                        }}
                                                        placeholder="Please provide a reason for rejection..."
                                                        maxLength={REJECT_REASON_MAX_LENGTH}
                                                    ></textarea>
                                                    <div className="form-text text-end">
                                                        {rejectReason.length.toLocaleString('en-US')} / {REJECT_REASON_MAX_LENGTH.toLocaleString('en-US')}
                                                    </div>
                                                    {validationErrors.reject_reason && (
                                                        <div className="invalid-feedback d-block mt-2">
                                                            {validationErrors.reject_reason[0]}
                                                        </div>
                                                    )}

                                                    <div className="mt-3">
                                                        <button
                                                            type="button"
                                                            className="btn btn-primary fw-medium waves-effect waves-light d-flex align-items-center gap-2 px-4"
                                                            onClick={() => {
                                                                if (!rejectReason.trim()) {
                                                                    setValidationErrors({ reject_reason: ['The reason / note field is required.'] });
                                                                    return;
                                                                }
                                                                setShowStatusModal(true);
                                                            }}
                                                        >
                                                            Confirm <i className="ri-arrow-right-line ms-1"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <ActivitySidebar
                                    entityId={review.id}
                                    entityType={ENTITY_TYPE_FUNDING_REQUEST}
                                    loading={isUpdatingOrFetching}
                                    partnerId={review.partner_id}
                                    // No owner field of its own: its borrower's "Assign to".
                                    taskOwner={review.borrower?.assign_id ? { id: review.borrower.assign_id } : null}
                                    borrowerEmail={review.borrower?.user?.email || review.borrower?.email}
                                    partnerEmail={review.partner?.user?.email || review.partner?.email}
                                    hostEmail={review.host_email}
                                    isHost={isHost}
                                    disableSticky={true}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status Update Modal */}
                <Modal isOpen={showStatusModal} toggle={() => setShowStatusModal(false)} centered size="md">
                    <ModalBody className="p-0">
                        {/* Simple white header band */}
                        <div className="text-center pt-4 pb-3 px-2 rounded-top-3 bg-white">
                            <div className="avatar-md mx-auto mb-3">
                                <span
                                    className="avatar-title rounded-circle fs-22 text-white bg-dark"
                                >
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
                                {selectedStatus === FUNDING_REVIEW_STATUS.APPROVED && !isHost
                                    ? "Are you sure you want to Approve?"
                                    : <>Are you sure you want to update the status to <strong>{selectedStatus}</strong>?</>}
                            </p>
                        </div>

                        {/* Request Information */}
                        <div className="p-4">
                            <div className="mb-4 text-start">
                                <p className="fs-12 text-uppercase fw-bold text-muted mb-2 fr-style-5385d7b4">
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
                                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
                                        <span className="fs-13 text-muted fw-medium flex-shrink-0">Status Change</span>
                                        <div className="d-flex align-items-center justify-content-sm-end flex-wrap gap-2 text-start text-sm-end">
                                            <span
                                                className="badge fs-12 px-2 py-1"
                                                style={{
                                                    backgroundColor: getExactStatusStyles(review?.status || '').bg,
                                                    color: getExactStatusStyles(review?.status || '').iconBg,
                                                    border: `1px solid ${getExactStatusStyles(review?.status || '').border}`
                                                }}
                                            >
                                                {review?.status === 'IN_PROGRESS' ? 'In Progress' : review?.status}
                                            </span>
                                            <i className="ri-arrow-right-line text-muted fs-12"></i>
                                            <span
                                                className="badge fs-12 px-2 py-1"
                                                style={{
                                                    backgroundColor: getExactStatusStyles(selectedStatus).bg,
                                                    color: getExactStatusStyles(selectedStatus).iconBg,
                                                    border: `1px solid ${getExactStatusStyles(selectedStatus).border}`
                                                }}
                                            >
                                                {selectedStatus === 'IN_PROGRESS' ? 'In Progress' : selectedStatus}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Reason Note Preview */}
                            {selectedStatus === FUNDING_REVIEW_STATUS.REJECTED && rejectReason && (
                                <div className="mt-1 mb-2">
                                    <p className="fs-12 fw-semibold text-muted mb-2 text-uppercase fr-style-5385d7b4">
                                        <i className="ri-chat-3-line me-1"></i> Rejection Note
                                    </p>
                                    <div className="border rounded-3 p-3 text-dark fs-13 fr-style-44b06d7f">
                                        {/* A long note folds, so the dialog stays on one screen. */}
                                        <div data-testid="reject-note-preview" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                                            {rejectNoteExpanded || rejectReason.length <= REJECT_NOTE_PREVIEW_LENGTH
                                                ? rejectReason
                                                : `${rejectReason.slice(0, REJECT_NOTE_PREVIEW_LENGTH).trimEnd()}…`}
                                        </div>
                                        {rejectReason.length > REJECT_NOTE_PREVIEW_LENGTH && (
                                            <button
                                                type="button"
                                                className="btn btn-link btn-sm p-0 mt-2 fw-semibold"
                                                onClick={() => setRejectNoteExpanded(v => !v)}
                                                aria-expanded={rejectNoteExpanded}
                                            >
                                                {rejectNoteExpanded ? 'See less' : 'See more'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="d-flex justify-content-center gap-3 mt-4">
                                <button
                                    type="button"
                                    className="btn btn-light fw-medium px-4"
                                    onClick={() => setShowStatusModal(false)}
                                    disabled={updateStatusMutation.isPending}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-dark fw-medium waves-effect waves-light px-4"
                                    onClick={handleStatusUpdate}
                                    disabled={updateStatusMutation.isPending}
                                >
                                    {updateStatusMutation.isPending ? (
                                        <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Updating...</>
                                    ) : (
                                        <><i className="ri-checkbox-circle-line me-1"></i> Confirm</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </ModalBody>
                </Modal>

                {/* Standard Missing Lender Modal */}
                <Modal isOpen={showMissingLenderModal} toggle={() => setShowMissingLenderModal(false)} centered size="md" contentClassName="border-0 shadow-lg" modalClassName="flip">
                    <ModalBody className="p-0">
                        <div className="text-center pt-4 pb-3 px-2 rounded-top-3 bg-white">
                            <div className="avatar-md mx-auto mb-3">
                                <span className="avatar-title rounded-circle fs-22 text-white bg-dark">
                                    <i className="ri-bank-line"></i>
                                </span>
                            </div>
                            <h5 className="fw-bold mb-1">Lender Required</h5>
                            <p className="text-muted fs-13 mb-0">
                                Assign a lender before approving this request.
                            </p>
                        </div>
                        <div className="p-4">
                            <div className="d-flex justify-content-center gap-3 mt-2">
                                <button
                                    type="button"
                                    className="btn btn-light fw-medium px-4"
                                    onClick={() => setShowMissingLenderModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-dark fw-medium px-4"
                                    onClick={() => {
                                        setShowMissingLenderModal(false);
                                        if (lenderTableRef.current) {
                                            lenderTableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                            lenderTableRef.current.classList.add('border-danger');
                                            setShowAssignIndicator(true);
                                            setTimeout(() => {
                                                lenderTableRef.current?.classList.remove('border-danger');
                                                setShowAssignIndicator(false);
                                            }, 30000);
                                        }
                                    }}
                                >
                                    Got it, take me there! <i className="ri-arrow-right-line ms-1"></i>
                                </button>
                            </div>
                        </div>
                    </ModalBody>
                </Modal>
            </div>
        </>
    );
}
