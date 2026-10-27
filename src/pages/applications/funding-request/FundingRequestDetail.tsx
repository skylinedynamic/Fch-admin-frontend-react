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
import { FUNDING_REVIEW_STATUS, FUNDING_REVIEW_STATUS_OPTIONS, FUNDING_REVIEW_GUIDELINE_CARDS } from '../../../config/funding';
import { FUNDING_APPLICATION_STATUS } from '../../../config/borrower';
import { DOCUMENT_STATUS } from '../../../config/documentStatus';
import { Dropdown } from 'primereact/dropdown';
import { Dialog } from 'primereact/dialog';
import { formatCurrency } from '../../../utils/helper';
import ReviewProgressCard from './components/ReviewProgressCard';
import LenderMatchStats from './components/LenderMatchStats';
import '../../../../assets/css/funding-requests.css';
import { toast } from 'react-toastify';

import { useAuthStore } from '../../../store/auth/authStore';
import { getDocStatusBadgeConfig } from '../../../utils/badgeHelper';
import { PARTNER_EDITOR_TYPES } from '../../../config/partnerTypeOptions';

export default function FundingRequestDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const currentUser = useAuthStore((state: any) => state.user);
    const isHost = currentUser?.is_host == 1;

    const [rejectReason, setRejectReason] = useState('');
    const [isRejecting, setIsRejecting] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showMissingLenderModal, setShowMissingLenderModal] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [validationErrors, setValidationErrors] = useState<any>({});
    const sidebarRef = useRef<HTMLDivElement>(null);
    const sidebarColRef = useRef<HTMLDivElement>(null);
    const lenderTableRef = useRef<HTMLDivElement>(null);

    const { data: apiResponse, isLoading, isFetching, error } = useFundingRequestDetails(id || '');
    const updateStatusMutation = useUpdateFundingRequestStatus();
    const assignLenderMutation = useAssignLenderToFundingRequest();

    const [showAssignModal, setShowAssignModal] = useState(false);
    const [lenderToAssign, setLenderToAssign] = useState<any>(null);
    const [assignedLenderIds, setAssignedLenderIds] = useState<number[]>([]);
    const [showAssignIndicator, setShowAssignIndicator] = useState(false);

    const [lenderSearch, setLenderSearch] = useState('');
    const [lenderCategoryFilter, setLenderCategoryFilter] = useState('');
    const [lenderNameFilter, setLenderNameFilter] = useState('');

    const [appliedLenderSearch, setAppliedLenderSearch] = useState('');
    const [appliedLenderCategoryFilter, setAppliedLenderCategoryFilter] = useState('');
    const [appliedLenderNameFilter, setAppliedLenderNameFilter] = useState('');

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

    // Use standard CSS sticky instead of JS listener to avoid jumping/cut-off issues

    const matchedLenders = review?.matched_lenders || [];

    const uniqueCategories = Array.from(new Set(matchedLenders.map((l: any) => l.product_category))).map(cat => ({ label: cat, value: cat }));
    const uniqueLenderNames = Array.from(new Set(matchedLenders.map((l: any) => l.name))).map(name => ({ label: name, value: name }));

    const filteredLenders = matchedLenders.filter((lender: any) => {
        const matchesSearch = !appliedLenderSearch ||
            lender.name?.toLowerCase().includes(appliedLenderSearch.toLowerCase()) ||
            lender.product_category?.toLowerCase().includes(appliedLenderSearch.toLowerCase()) ||
            lender.requirements?.min_fico?.toString().includes(appliedLenderSearch) ||
            lender.requirements?.min_revenue?.toString().includes(appliedLenderSearch) ||
            lender.requirements?.min_tib?.toString().includes(appliedLenderSearch) ||
            lender.requirements?.min_deposit?.toString().includes(appliedLenderSearch);
        const matchesCategory = !appliedLenderCategoryFilter || lender.product_category === appliedLenderCategoryFilter;
        const matchesName = !appliedLenderNameFilter || lender.name === appliedLenderNameFilter;
        return matchesSearch && matchesCategory && matchesName;
    });

    if (isLoading) {
        return <FundingRequestDetailLoader />;
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
                                <>

                                    <div ref={lenderTableRef} className="card shadow-sm border-0 mb-4 rounded-3">
                                        <div className="card-header bg-white border-bottom-0 pt-4 pb-0 px-2 d-block">
                                            <div className="d-flex align-items-center justify-content-between mb-3 border-bottom">
                                                <h5 className="card-title mb-0 fs-16 fw-bold text-dark">Lender Information</h5>
                                            </div>
                                            <form onSubmit={(e) => {
                                                e.preventDefault();
                                                setAppliedLenderSearch(lenderSearch);
                                                setAppliedLenderCategoryFilter(lenderCategoryFilter);
                                                setAppliedLenderNameFilter(lenderNameFilter);
                                            }}>
                                                <div className="row g-3 mb-3 align-items-end">
                                                    <div className="col-md-3">
                                                        <div className="search-box">
                                                            <input type="text" className="form-control search bg-light border-light" placeholder="Search lenders..." value={lenderSearch} onChange={(e) => setLenderSearch(e.target.value)} />
                                                            <i className="ri-search-line search-icon"></i>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-3">
                                                        <Dropdown value={lenderCategoryFilter} options={[{ label: 'All Categories', value: '' }, ...uniqueCategories]} optionLabel="label" optionValue="value" onChange={(e) => setLenderCategoryFilter(e.value)} placeholder="All Categories" className="w-100" />
                                                    </div>
                                                    <div className="col-md-3">
                                                        <Dropdown value={lenderNameFilter} options={[{ label: 'All Lenders', value: '' }, ...uniqueLenderNames]} optionLabel="label" optionValue="value" onChange={(e) => setLenderNameFilter(e.value)} placeholder="All Lenders" className="w-100" />
                                                    </div>
                                                    <div className="col-md-3">
                                                        <div className="d-flex gap-2">
                                                            <button type="submit" className="btn btn-warning flex-grow-1"><i className="ri-equalizer-fill me-1 align-bottom"></i> Filters</button>
                                                            <button type="button" className="btn btn-default flex-grow-1" onClick={() => {
                                                                setLenderSearch('');
                                                                setLenderCategoryFilter('');
                                                                setLenderNameFilter('');
                                                                setAppliedLenderSearch('');
                                                                setAppliedLenderCategoryFilter('');
                                                                setAppliedLenderNameFilter('');
                                                            }}>
                                                                <i className="ri-close-line me-1 align-bottom"></i> Clear
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </form>
                                        </div>{/* end card-header */}
                                        <div className="card-body p-0">
                                            <div className="fr-style-1d4669b6">
                                                <table className="table align-middle mb-0 fr-style-310c95f3">
                                                    <thead>
                                                        <tr className="fr-style-c2cbac2">
                                                            <th rowSpan={2} className="px-2 py-3 align-middle text-center fr-style-4ff6cdc1">
                                                                <div className="text-dark fw-bold fr-style-3f3c752c">Lender Name</div>
                                                                <div className="text-muted fr-style-3f58a42e">Contact Info</div>
                                                            </th>
                                                            <th rowSpan={2} className="px-2 py-3 text-center fw-bold align-middle fr-style-26842ef4">Category</th>
                                                            <th className="px-3 py-2 text-center fw-bold fr-style-13ecc849">Match Analysis</th>
                                                            <th colSpan={4} className="px-3 py-2 text-center fw-bold fr-style-13ecc849">Requirements Match</th>
                                                            <th rowSpan={2} className="px-2 py-3 text-center fw-bold align-middle fr-style-1b4a0199">Match</th>
                                                            <th rowSpan={2} className="px-2 py-3 text-center fw-bold align-middle fr-style-705890ee">Actions</th>
                                                        </tr>
                                                        <tr className="fr-style-123ff9de">
                                                            <th className="px-1 py-2 text-center fr-style-6fe1846d">Matches</th>

                                                            <th className="px-1 py-2 text-center fr-style-6ed6d344">FICO Score</th>
                                                            <th className="px-1 py-2 text-center fr-style-45c66d77">Min Revenue</th>
                                                            <th className="px-1 py-2 text-center fr-style-350c3165">Min TIB</th>
                                                            <th className="px-1 py-2 text-center fr-style-45c66d77">Min Deposit</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredLenders.length > 0 ? (
                                                            filteredLenders.map((lender: any, idx: number) => {
                                                                const radius = 16;
                                                                const circumference = 2 * Math.PI * radius;
                                                                const strokeDashoffset = circumference - (lender.score / 100) * circumference;

                                                                const isAssigned = assignedLenderIds.includes(lender.id);

                                                                return (
                                                                    <tr
                                                                        key={lender.id || idx}
                                                                        className={showAssignIndicator && idx === 0 ? 'row-pulse-animation' : ''}
                                                                        style={{ borderBottom: '1px solid #e2e8f0', background: isAssigned ? '#f1f5f9' : '#fff' }}
                                                                        onMouseEnter={e => !isAssigned && (e.currentTarget.style.background = showAssignIndicator && idx === 0 ? '' : '#f8fafc')}
                                                                        onMouseLeave={e => !isAssigned && (e.currentTarget.style.background = showAssignIndicator && idx === 0 ? '' : '#fff')}
                                                                    >

                                                                        {/* Lender Name */}
                                                                        <td className="px-2 py-3 text-center fr-style-73d7d324">
                                                                            <div className="fw-bold text-dark fr-style-747e3e7d">{lender.name || 'Lender Name'}</div>
                                                                            <div className="text-muted fr-style-3f58a42e">{lender.phone || lender.email || 'N/A'}</div>
                                                                        </td>
                                                                        {/* Category */}
                                                                        <td className="px-1 py-3 text-center fr-style-579eac21">
                                                                            <span className="fr-style-1db6650e">
                                                                                {lender.product_category || 'Category'}
                                                                            </span>
                                                                        </td>
                                                                        {/* Matches */}
                                                                        <td className="px-2 py-3 text-center fr-style-73d7d324">
                                                                            <div className="fw-bold fr-lender-score-fraction" style={{ color: lender.score_hex }}>{lender.matches_fraction}</div>
                                                                            <div className="fr-lender-score-text" style={{ color: lender.score_hex }}>{lender.score_text}</div>
                                                                        </td>

                                                                        {/* FICO Score */}
                                                                        <td className="px-2 py-3 text-center fr-style-73d7d324">
                                                                            <div className="d-flex align-items-center justify-content-center gap-1 fr-style-66f5a318">
                                                                                {lender.checks.fico ? <i className="ri-checkbox-circle-fill fr-style-6005154d"></i> : <i className="ri-close-circle-fill fr-style-34f57f10"></i>}
                                                                                <span className="fr-style-d7deedb">{lender.requirements.min_fico ? `${lender.requirements.min_fico}+` : 'N/A'}</span>
                                                                            </div>
                                                                        </td>
                                                                        {/* Min Revenue */}
                                                                        <td className="px-2 py-3 text-center fr-style-73d7d324">
                                                                            <div className="d-flex align-items-center justify-content-center gap-1 fr-style-66f5a318">
                                                                                {lender.checks.revenue ? <i className="ri-checkbox-circle-fill fr-style-6005154d"></i> : <i className="ri-close-circle-fill fr-style-34f57f10"></i>}
                                                                                <span className="fr-style-d7deedb">{lender.requirements.min_revenue ? `${formatCurrency(lender.requirements.min_revenue, '$', 1, 0)}+` : 'N/A'}</span>
                                                                            </div>
                                                                        </td>
                                                                        {/* Min TIB */}
                                                                        <td className="px-2 py-3 text-center fr-style-73d7d324">
                                                                            <div className="d-flex align-items-center justify-content-center gap-1 fr-style-66f5a318">
                                                                                {lender.checks.tib ? <i className="ri-checkbox-circle-fill fr-style-6005154d"></i> : <i className="ri-close-circle-fill fr-style-34f57f10"></i>}
                                                                                <span className="fr-style-d7deedb">{lender.requirements.min_tib ? `${lender.requirements.min_tib} mo` : 'N/A'}</span>
                                                                            </div>
                                                                        </td>
                                                                        {/* Min Deposit */}
                                                                        <td className="px-2 py-3 text-center fr-style-73d7d324">
                                                                            <div className="d-flex align-items-center justify-content-center gap-1 fr-style-66f5a318">
                                                                                {lender.checks.deposit ? <i className="ri-checkbox-circle-fill fr-style-6005154d"></i> : <i className="ri-close-circle-fill fr-style-34f57f10"></i>}
                                                                                <span className="fr-style-d7deedb">{lender.requirements.min_deposit ? `${formatCurrency(lender.requirements.min_deposit, '$', 1, 0)}+` : 'N/A'}</span>
                                                                            </div>
                                                                        </td>
                                                                        {/* Overall Match */}
                                                                        <td className="px-2 py-3 text-center fr-style-73d7d324">
                                                                            <div className="d-inline-flex align-items-center justify-content-center position-relative fr-style-210d4313">
                                                                                <svg width="44" height="44" viewBox="0 0 44 44">
                                                                                    <circle cx="22" cy="22" r={radius} stroke="#e2e8f0" strokeWidth="3.5" fill="none" />
                                                                                    <circle cx="22" cy="22" r={radius} stroke={lender.score_hex} strokeWidth="3.5" fill="none" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="fr-style-c5a99bb" />
                                                                                </svg>
                                                                                <span className="position-absolute fw-bold funding-req-circle-text" style={{ color: lender.score_hex }}>{lender.score}%</span>
                                                                            </div>
                                                                        </td>
                                                                        {/* Actions */}
                                                                        <td className="px-2 py-3 text-center fr-style-73d7d324">
                                                                            {!isAssigned ? (
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setLenderToAssign(lender);
                                                                                        setShowAssignModal(true);
                                                                                    }}
                                                                                    disabled={assignLenderMutation.isPending || updateStatusMutation.isPending}
                                                                                    className="btn btn-sm btn-light border text-muted fw-medium d-inline-flex align-items-center gap-1 fr-style-4f21c796"
                                                                                >
                                                                                    <i className="ri-user-add-line fr-style-3f3c752c"></i> Assign
                                                                                </button>
                                                                            ) : (
                                                                                <span className="badge bg-success-subtle text-success fs-12 px-2 py-1">
                                                                                    <i className="ri-check-line me-1"></i> Assigned
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={9} className="text-center py-4 text-muted fs-14">
                                                                    <i className="ri-search-line fs-24 d-block mb-2"></i>
                                                                    No matched lenders found for this funding type.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                        <div className="card-footer bg-white border-top p-3">
                                            <div className="d-flex align-items-center justify-content-between">
                                                <div className="text-muted fs-13">
                                                    Showing <span className="fw-semibold text-dark">1</span> to <span className="fw-semibold text-dark">{review.matched_lenders?.length || 0}</span> of <span className="fw-semibold text-dark">{review.matched_lenders?.length || 0}</span> lenders
                                                </div>
                                                <div className="d-flex align-items-center gap-3">
                                                    <ul className="pagination pagination-sm mb-0">
                                                        <li className="page-item disabled"><a className="page-link border-0 text-muted" href="#!"><i className="ri-arrow-left-double-line"></i></a></li>
                                                        <li className="page-item disabled"><a className="page-link border-0 text-muted" href="#!"><i className="ri-arrow-left-s-line"></i></a></li>
                                                        <li className="page-item active"><a className="page-link rounded bg-dark border-dark text-white fw-medium" href="#!">1</a></li>
                                                        <li className="page-item"><a className="page-link border-0 text-dark" href="#!"><i className="ri-arrow-right-s-line"></i></a></li>
                                                        <li className="page-item"><a className="page-link border-0 text-dark" href="#!"><i className="ri-arrow-right-double-line"></i></a></li>
                                                    </ul>
                                                    <select className="form-select form-select-sm border-light bg-light fw-medium text-dark fr-style-5dc02308">
                                                        <option value="10">10</option>
                                                        <option value="25">25</option>
                                                        <option value="50">50</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>{/* end card */}
                                </>
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
                                                    ></textarea>
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
                                        {rejectReason}
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

                {/* Standard Assign Lender Modal */}
                <Modal isOpen={showAssignModal} toggle={() => !assignLenderMutation.isPending && setShowAssignModal(false)} centered size="md" contentClassName="border-0 shadow-lg" modalClassName="flip">
                    <ModalBody className="p-0">
                        {/* Simple white header band */}
                        <div className="text-center pt-4 pb-3 px-2 rounded-top-3 bg-white">
                            <div className="avatar-md mx-auto mb-3">
                                <span className="avatar-title rounded-circle fs-22 text-white bg-dark">
                                    <i className="ri-bank-line"></i>
                                </span>
                            </div>
                            <h5 className="fw-bold mb-1">Confirm Assign Lender</h5>
                            <p className="text-muted fs-13 mb-0">
                                Are you sure you want to assign <strong>{lenderToAssign?.name}</strong> to this funding request?
                            </p>
                        </div>

                        {/* Request Information */}
                        <div className="p-4">
                            {lenderToAssign && (
                                <div className="mb-4 text-start">
                                    <p className="fs-12 text-uppercase fw-bold text-muted mb-2 fr-style-5385d7b4">
                                        <i className="ri-information-line me-1"></i> Lender Information
                                    </p>
                                    <div className="border rounded-3 p-3">
                                        {/* Lender Name */}
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <span className="fs-13 text-muted fw-medium">Lender Name</span>
                                            <span className="fs-13 fw-semibold text-dark">{lenderToAssign.name}</span>
                                        </div>

                                        {/* Funding Type */}
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <span className="fs-13 text-muted fw-medium">Funding Type</span>
                                            <span className="fs-13 fw-semibold text-dark">{lenderToAssign.product_category || '—'}</span>
                                        </div>

                                        {/* Match Analysis */}
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span className="fs-13 text-muted fw-medium">Match Analysis</span>
                                            <div className="d-flex align-items-center gap-2">
                                                <span className={`fs-13 fw-semibold ${lenderToAssign.score_text?.includes('Excellent') ? 'text-success' :
                                                    lenderToAssign.score_text?.includes('Good') ? 'text-warning' :
                                                        lenderToAssign.score_text?.includes('Poor') ? 'text-danger' :
                                                            'text-primary'
                                                    }`}>
                                                    {lenderToAssign.matches_fraction || 'N/A'}
                                                </span>
                                                <i className="ri-arrow-right-line text-muted fs-12"></i>
                                                <span className={`badge fs-12 text-white ${lenderToAssign.score_text?.includes('Excellent') ? 'bg-success' :
                                                    lenderToAssign.score_text?.includes('Good') ? 'bg-warning' :
                                                        lenderToAssign.score_text?.includes('Poor') ? 'bg-danger' :
                                                            'bg-primary'
                                                    }`}>
                                                    {lenderToAssign.score_text || 'Match'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="d-flex justify-content-center gap-3 mt-4">
                                <button
                                    type="button"
                                    className="btn btn-light fw-medium px-4"
                                    onClick={() => setShowAssignModal(false)}
                                    disabled={assignLenderMutation.isPending || updateStatusMutation.isPending}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-dark fw-medium waves-effect waves-light px-4"
                                    onClick={() => {
                                        assignLenderMutation.mutate(
                                            { id: review.id, lender_ids: [lenderToAssign?.id] },
                                            {
                                                onSuccess: () => {
                                                    toast.success(`Lender assigned successfully`);
                                                    setShowAssignModal(false);
                                                    setLenderToAssign(null);
                                                    setAssignedLenderIds([lenderToAssign?.id]);
                                                    window.dispatchEvent(new Event('refreshActivities'));
                                                },
                                                onError: (err: any) => {
                                                    toast.error(err?.response?.data?.message || 'Failed to assign lender');
                                                }
                                            }
                                        );
                                    }}
                                    disabled={assignLenderMutation.isPending || updateStatusMutation.isPending}
                                >
                                    {assignLenderMutation.isPending || updateStatusMutation.isPending ? (
                                        <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Processing...</>
                                    ) : (
                                        <><i className="ri-user-add-line align-bottom me-1"></i> Assign Lender</>
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
                                Assign to Lender. You can assign Before <strong className="text-dark">Approved</strong>
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