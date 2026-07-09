import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useFundingRequestDetails, useUpdateFundingRequestStatus, useAssignLenderToFundingRequest } from '../../../modules/application';
import { toast } from 'react-toastify';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button } from 'reactstrap';
import FundingRequestDetailLoader from './components/FundingRequestDetailLoader';
import { getFileConfig } from '../../../config/fileTypeConfig';
import { handleFileDownload } from '../../../utils/fileDownload';
import { downloadBorrowerDocument } from '../../../modules/client/services';
import ActivitySidebar from '../../../components/Common/Activity/ActivitySidebar';
import { ENTITY_TYPE_FUNDING_REQUEST } from '../../../config/appConfig';
import { FUNDING_REVIEW_STATUS, FUNDING_REVIEW_STATUS_OPTIONS } from '../../../config/funding';
import { DOCUMENT_STATUS } from '../../../config/documentStatus';
import { Dropdown } from 'primereact/dropdown';
import { Dialog } from 'primereact/dialog';
import ReviewProgressCard from './components/ReviewProgressCard';
import LenderMatchStats from './components/LenderMatchStats';


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
    
    const [lenderSearch, setLenderSearch] = useState('');
    const [lenderCategoryFilter, setLenderCategoryFilter] = useState('');
    const [lenderNameFilter, setLenderNameFilter] = useState('');

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
        const matchesSearch = !lenderSearch || 
            lender.name?.toLowerCase().includes(lenderSearch.toLowerCase()) || 
            lender.product_category?.toLowerCase().includes(lenderSearch.toLowerCase()) ||
            lender.requirements?.min_fico?.toString().includes(lenderSearch) ||
            lender.requirements?.min_revenue?.toString().includes(lenderSearch) ||
            lender.requirements?.min_tib?.toString().includes(lenderSearch) ||
            lender.requirements?.min_deposit?.toString().includes(lenderSearch);
        const matchesCategory = !lenderCategoryFilter || lender.product_category === lenderCategoryFilter;
        const matchesName = !lenderNameFilter || lender.name === lenderNameFilter;
        return matchesSearch && matchesCategory && matchesName;
    });

    if (isLoading || isUpdatingOrFetching) {
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

                    

                    


                    <div className="row mt-3" style={{ alignItems: 'flex-start' }}>
                        <div className="col-lg-8">
                            <ReviewProgressCard 
                                status={review.status} 
                                createdAt={review.created_at} 
                                updatedAt={review.updated_at}
                                rejectReason={review.reject_reason} 
                            />
                            {isHost && review.matched_lenders && review.matched_lenders.length > 0 && (
                                <>
                                    
                                    <div ref={lenderTableRef} className="card shadow-sm border-0 mb-4 rounded-3">
                                        <div className="card-header bg-white border-bottom-0 pt-4 pb-0 px-2">
                                        <div className="d-flex align-items-center justify-content-between mb-3 border-bottom">
                                            <h5 className="card-title mb-0 fs-16 fw-bold text-dark">Lender Information</h5>
                                        </div>
                                        <div className="row g-3 mb-3 align-items-end">
                                            <div className="col-md-4">
                                                <div className="search-box">
                                                    <input type="text" className="form-control search bg-light border-light" placeholder="Search lenders..." value={lenderSearch} onChange={(e) => setLenderSearch(e.target.value)} />
                                                    <i className="ri-search-line search-icon"></i>
                                                </div>
                                            </div>
                                            <div className="col-md-3">
                                                <Dropdown value={lenderCategoryFilter} options={[{label: 'All Categories', value: ''}, ...uniqueCategories]} optionLabel="label" optionValue="value" onChange={(e) => setLenderCategoryFilter(e.value)} placeholder="All Categories" className="w-100" />
                                            </div>
                                            <div className="col-md-3">
                                                <Dropdown value={lenderNameFilter} options={[{label: 'All Lenders', value: ''}, ...uniqueLenderNames]} optionLabel="label" optionValue="value" onChange={(e) => setLenderNameFilter(e.value)} placeholder="All Lenders" className="w-100" />
                                            </div>
                                            <div className="col-md-2">
                                                <div className="d-flex gap-2">
                                                    <button type="button" className="btn btn-secondary flex-grow-1 text-white" onClick={() => { setLenderSearch(''); setLenderCategoryFilter(''); setLenderNameFilter(''); }}>
                                                        <i className="ri-refresh-line me-1 align-bottom"></i> Reset
                                                    </button>
                                                    
                                                    
                                                </div>
                                            </div>
                                        </div>
                                        </div>{/* end card-header */}
                                        <div className="card-body p-0">
                                        <div style={{ overflowX: 'auto', overflowY: 'hidden' }}>
                                            <table className="table align-middle mb-0" style={{ borderCollapse: 'collapse', fontSize: '13px', width: '100%', border: '1px solid #e2e8f0' }}>
                                                <thead>
                                                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                        <th rowSpan={2} className="px-2 py-3 align-middle text-center" style={{ border: '1px solid #e2e8f0', minWidth: '100px', verticalAlign: 'middle', background: '#f8fafc' }}>
                                                            <div className="text-dark fw-bold" style={{ fontSize: '13px' }}>Lender Name</div>
                                                            <div className="text-muted" style={{ fontSize: '11px' }}>Contact Info</div>
                                                        </th>
                                                        <th rowSpan={2} className="px-2 py-3 text-center fw-bold align-middle" style={{ border: '1px solid #e2e8f0', fontSize: '13px', color: '#1e293b', width: '1%', verticalAlign: 'middle', background: '#f8fafc', whiteSpace: 'nowrap' }}>Category</th>
                                                        <th className="px-3 py-2 text-center fw-bold" style={{ fontSize: '13px', color: '#1e293b', border: '1px solid #e2e8f0', background: '#f8fafc' }}>Match Analysis</th>
                                                        <th colSpan={4} className="px-3 py-2 text-center fw-bold" style={{ fontSize: '13px', color: '#1e293b', border: '1px solid #e2e8f0', background: '#f8fafc' }}>Requirements Match</th>
                                                        <th rowSpan={2} className="px-2 py-3 text-center fw-bold align-middle" style={{ border: '1px solid #e2e8f0', fontSize: '13px', color: '#1e293b', minWidth: '60px', verticalAlign: 'middle', background: '#f8fafc', whiteSpace: 'nowrap' }}>Match</th>
                                                        <th rowSpan={2} className="px-2 py-3 text-center fw-bold align-middle" style={{ border: '1px solid #e2e8f0', fontSize: '13px', color: '#1e293b', minWidth: '70px', verticalAlign: 'middle', background: '#f8fafc' }}>Actions</th>
                                                    </tr>
                                                    <tr style={{ background: '#f8fafc' }}>
                                                        <th className="px-1 py-2 text-center" style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, border: '1px solid #e2e8f0', minWidth: '50px', background: '#f8fafc' }}>Matches</th>

                                                        <th className="px-1 py-2 text-center" style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, border: '1px solid #e2e8f0', minWidth: '60px', background: '#f8fafc', whiteSpace: 'nowrap' }}>FICO Score</th>
                                                        <th className="px-1 py-2 text-center" style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, border: '1px solid #e2e8f0', minWidth: '65px', background: '#f8fafc', whiteSpace: 'nowrap' }}>Min Revenue</th>
                                                        <th className="px-1 py-2 text-center" style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, border: '1px solid #e2e8f0', minWidth: '50px', background: '#f8fafc', whiteSpace: 'nowrap' }}>Min TIB</th>
                                                        <th className="px-1 py-2 text-center" style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, border: '1px solid #e2e8f0', minWidth: '65px', background: '#f8fafc', whiteSpace: 'nowrap' }}>Min Deposit</th>
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
                                                                <tr key={lender.id || idx} style={{ borderBottom: '1px solid #e2e8f0', background: isAssigned ? '#f1f5f9' : '#fff' }} onMouseEnter={e => !isAssigned && (e.currentTarget.style.background = '#f8fafc')} onMouseLeave={e => !isAssigned && (e.currentTarget.style.background = '#fff')}>
                                                                    
                                                                    {/* Lender Name */}
                                                                    <td className="px-2 py-3 text-center" style={{ border: '1px solid #e2e8f0' }}>
                                                                        <div className="fw-bold text-dark" style={{ fontSize: '13px', marginBottom: '2px' }}>{lender.name || 'Lender Name'}</div>
                                                                        <div className="text-muted" style={{ fontSize: '11px' }}>{lender.phone || lender.email || 'N/A'}</div>
                                                                    </td>
                                                                    {/* Category */}
                                                                    <td className="px-1 py-3 text-center" style={{ border: '1px solid #e2e8f0', width: '1%' }}>
                                                                        <span style={{ background: '#eff6ff', color: '#2563eb', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, display: 'inline-block', whiteSpace: 'nowrap' }}>
                                                                            {lender.product_category || 'Category'}
                                                                        </span>
                                                                    </td>
                                                                    {/* Matches */}
                                                                    <td className="px-2 py-3 text-center" style={{ border: '1px solid #e2e8f0' }}>
                                                                        <div className="fw-bold" style={{ fontSize: '13px', color: lender.score_hex, marginBottom: '2px', whiteSpace: 'nowrap' }}>{lender.matches_fraction}</div>
                                                                        <div style={{ fontSize: '10px', color: lender.score_hex, fontWeight: 600, whiteSpace: 'nowrap' }}>{lender.score_text}</div>
                                                                    </td>

                                                                    {/* FICO Score */}
                                                                    <td className="px-2 py-3 text-center" style={{ border: '1px solid #e2e8f0' }}>
                                                                        <div className="d-flex align-items-center justify-content-center gap-1" style={{ whiteSpace: 'nowrap' }}>
                                                                            {lender.checks.fico ? <i className="ri-checkbox-circle-fill" style={{ color: '#16a34a', fontSize: '15px' }}></i> : <i className="ri-close-circle-fill" style={{ color: '#dc2626', fontSize: '15px' }}></i>}
                                                                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>{lender.requirements.min_fico ? `${lender.requirements.min_fico}+` : 'N/A'}</span>
                                                                        </div>
                                                                    </td>
                                                                    {/* Min Revenue */}
                                                                    <td className="px-2 py-3 text-center" style={{ border: '1px solid #e2e8f0' }}>
                                                                        <div className="d-flex align-items-center justify-content-center gap-1" style={{ whiteSpace: 'nowrap' }}>
                                                                            {lender.checks.revenue ? <i className="ri-checkbox-circle-fill" style={{ color: '#16a34a', fontSize: '15px' }}></i> : <i className="ri-close-circle-fill" style={{ color: '#dc2626', fontSize: '15px' }}></i>}
                                                                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>{lender.requirements.min_revenue ? `$${lender.requirements.min_revenue}+` : 'N/A'}</span>
                                                                        </div>
                                                                    </td>
                                                                    {/* Min TIB */}
                                                                    <td className="px-2 py-3 text-center" style={{ border: '1px solid #e2e8f0' }}>
                                                                        <div className="d-flex align-items-center justify-content-center gap-1" style={{ whiteSpace: 'nowrap' }}>
                                                                            {lender.checks.tib ? <i className="ri-checkbox-circle-fill" style={{ color: '#16a34a', fontSize: '15px' }}></i> : <i className="ri-close-circle-fill" style={{ color: '#dc2626', fontSize: '15px' }}></i>}
                                                                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>{lender.requirements.min_tib ? `${lender.requirements.min_tib} mo` : 'N/A'}</span>
                                                                        </div>
                                                                    </td>
                                                                    {/* Min Deposit */}
                                                                    <td className="px-2 py-3 text-center" style={{ border: '1px solid #e2e8f0' }}>
                                                                        <div className="d-flex align-items-center justify-content-center gap-1" style={{ whiteSpace: 'nowrap' }}>
                                                                            {lender.checks.deposit ? <i className="ri-checkbox-circle-fill" style={{ color: '#16a34a', fontSize: '15px' }}></i> : <i className="ri-close-circle-fill" style={{ color: '#dc2626', fontSize: '15px' }}></i>}
                                                                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>{lender.requirements.min_deposit ? `$${lender.requirements.min_deposit}+` : 'N/A'}</span>
                                                                        </div>
                                                                    </td>
                                                                    {/* Overall Match */}
                                                                    <td className="px-2 py-3 text-center" style={{ border: '1px solid #e2e8f0' }}>
                                                                        <div className="d-inline-flex align-items-center justify-content-center position-relative" style={{ width: '44px', height: '44px' }}>
                                                                            <svg width="44" height="44" viewBox="0 0 44 44">
                                                                                <circle cx="22" cy="22" r={radius} stroke="#e2e8f0" strokeWidth="3.5" fill="none" />
                                                                                <circle cx="22" cy="22" r={radius} stroke={lender.score_hex} strokeWidth="3.5" fill="none" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.5s ease' }} />
                                                                            </svg>
                                                                            <span className="position-absolute fw-bold" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '10px', color: lender.score_hex }}>{lender.score}%</span>
                                                                        </div>
                                                                    </td>
                                                                    {/* Actions */}
                                                                    <td className="px-2 py-3 text-center" style={{ border: '1px solid #e2e8f0' }}>
                                                                        {!isAssigned ? (
                                                                            <button 
                                                                                onClick={() => {
                                                                                    setLenderToAssign(lender);
                                                                                    setShowAssignModal(true);
                                                                                }} 
                                                                                disabled={assignLenderMutation.isPending || updateStatusMutation.isPending}
                                                                                className="btn btn-sm d-inline-flex align-items-center gap-1" 
                                                                                style={{ background: '#fff', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', fontWeight: 500, padding: '5px 12px' }}
                                                                            >
                                                                                <i className="ri-user-add-line" style={{ fontSize: '13px' }}></i> Assign
                                                                            </button>
                                                                        ) : (
                                                                            <span className="badge bg-secondary-subtle text-secondary fs-12 px-2 py-1">
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
                                                <select className="form-select form-select-sm border-light bg-light fw-medium text-dark" style={{ width: '65px' }}>
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
                                    <div className="table-responsive border rounded border-light-subtle bg-white">
                                        <table className="table align-middle mb-0" style={{ tableLayout: 'fixed' }}>
                                            <thead className="bg-light">
                                                <tr>
                                                    <th scope="col" className="fs-13 fw-semibold text-muted border-bottom-0 px-2" style={{ width: '30%' }}>File Name</th>
                                                    <th scope="col" className="fs-13 fw-semibold text-muted border-bottom-0" style={{ width: '20%' }}>Document Type</th>
                                                    <th scope="col" className="fs-13 fw-semibold text-muted border-bottom-0" style={{ width: '20%' }}>Uploaded On</th>
                                                    <th scope="col" className="fs-13 fw-semibold text-muted border-bottom-0" style={{ width: '15%' }}>Status</th>
                                                    <th scope="col" className="fs-13 fw-semibold text-muted border-bottom-0 text-end px-2" style={{ width: '15%' }}>Action</th>
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
                                                                <td className="px-2 py-3">
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
                                                                <td className="text-end px-2 py-3">
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
                        {/* Right sticky column — pure CSS sticky */}
                        <div className="col-lg-4" style={{ position: 'sticky', top: '70px', alignSelf: 'flex-start', zIndex: 10 }}>
                            <div className="card shadow-sm border-0 mb-3 rounded-3">
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
                                                            className="btn btn-primary py-2 px-2 fs-14 border-0 rounded fw-semibold"
                                                            style={{ marginTop: '2px' }}
                                                            onClick={() => {
                                                                if (selectedStatus === FUNDING_REVIEW_STATUS.APPROVED) {
                                                                    if (assignedLenderIds.length === 0) {
                                                                        setShowMissingLenderModal(true);
                                                                        if (lenderTableRef.current) {
                                                                            lenderTableRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                            lenderTableRef.current.classList.add('border-danger');
                                                                            setTimeout(() => lenderTableRef.current?.classList.remove('border-danger'), 2000);
                                                                        }
                                                                        return;
                                                                    }
                                                                }
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
                                                            className="btn btn-primary py-2 px-2 fs-14 border-0 rounded fw-semibold"
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
                        <div className="text-center pt-4 pb-3 px-2 rounded-top-3 bg-white">
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
                                    className="btn bg-white border border-secondary-subtle px-2 py-2 fs-14 rounded-2 text-dark fw-medium"
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
                                    } px-2 py-2 fs-14 border-0 rounded-2 fw-semibold`}
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

                {/* Awesome Assign Lender Modal */}
                <Modal isOpen={showAssignModal} toggle={() => !assignLenderMutation.isPending && setShowAssignModal(false)} centered size="md" className="border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                    <ModalBody className="p-0 position-relative">
                        {/* Decorative Background Element */}
                        <div className="position-absolute top-0 start-0 w-100 bg-primary" style={{ height: '150px', opacity: 0.08, clipPath: 'polygon(0 0, 100% 0, 100% 80%, 0% 100%)' }}></div>
                        
                        <div className="text-center pt-5 pb-3 px-4 rounded-top-4 bg-white position-relative z-1">
                            {/* Icon Container with glowing effect */}
                            <div className="mx-auto mb-4 d-flex align-items-center justify-content-center bg-primary-subtle" style={{ width: '84px', height: '84px', borderRadius: '50%', boxShadow: '0 0 0 10px rgba(var(--bs-primary-rgb), 0.05)' }}>
                                <div className="d-flex align-items-center justify-content-center bg-primary" style={{ width: '64px', height: '64px', borderRadius: '50%', boxShadow: '0 8px 16px rgba(var(--bs-primary-rgb), 0.25)' }}>
                                    <i className="ri-user-add-fill text-white" style={{ fontSize: '32px' }}></i>
                                </div>
                            </div>
                            
                            <h4 className="fw-bolder mb-2 text-dark" style={{ letterSpacing: '-0.02em', fontSize: '24px' }}>Confirm Assignment</h4>
                            <p className="text-muted fs-15 mb-0" style={{ lineHeight: '1.6' }}>
                                Are you sure you want to assign <strong className="text-dark fs-16">{lenderToAssign?.name}</strong> to this funding request?
                                <br />
                                <span className="fs-13 text-primary bg-primary-subtle px-2 py-1 rounded mt-2 d-inline-block">This will automatically approve the request.</span>
                            </p>
                        </div>

                        <div className="p-4 pt-3 pb-4 bg-white">
                            <div className="d-flex justify-content-center gap-3 mt-3 px-2">
                                <button
                                    type="button"
                                    className="btn px-4 py-3 fs-15 border-0 fw-semibold text-secondary w-50"
                                    style={{ 
                                        background: '#f8fafc',
                                        borderRadius: '12px',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                                    onClick={() => setShowAssignModal(false)}
                                    disabled={assignLenderMutation.isPending || updateStatusMutation.isPending}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary px-4 py-3 fs-15 border-0 fw-bold w-50"
                                    style={{ 
                                        borderRadius: '12px',
                                        boxShadow: '0 8px 20px rgba(var(--bs-primary-rgb), 0.25)',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                    onClick={() => {
                                        assignLenderMutation.mutate(
                                            { id: review.id, lender_ids: [lenderToAssign?.id] },
                                            {
                                                onSuccess: () => {
                                                    toast.success(`Lender assigned successfully`);
                                                    setShowAssignModal(false);
                                                    setLenderToAssign(null);
                                                    setAssignedLenderIds([lenderToAssign?.id]);
                                                    
                                                    if (review.status !== FUNDING_REVIEW_STATUS.APPROVED) {
                                                        updateStatusMutation.mutate(
                                                            { id: review.id, status: FUNDING_REVIEW_STATUS.APPROVED },
                                                            {
                                                                onSuccess: () => {
                                                                    setSelectedStatus(FUNDING_REVIEW_STATUS.APPROVED);
                                                                    window.dispatchEvent(new Event('refreshActivities'));
                                                                }
                                                            }
                                                        );
                                                    } else {
                                                        window.dispatchEvent(new Event('refreshActivities'));
                                                    }
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
                                        <><i className="ri-checkbox-circle-line me-1"></i> Confirm</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </ModalBody>
                </Modal>
                {/* Awesome Missing Lender Modal */}
                <Modal isOpen={showMissingLenderModal} toggle={() => setShowMissingLenderModal(false)} centered size="md" className="border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                    <ModalBody className="p-0 position-relative">
                        {/* Decorative Background Element */}
                        <div className="position-absolute top-0 start-0 w-100 bg-primary" style={{ height: '150px', opacity: 0.08, clipPath: 'polygon(0 0, 100% 0, 100% 80%, 0% 100%)' }}></div>
                        
                        <div className="text-center pt-5 pb-3 px-4 rounded-top-4 bg-white position-relative z-1">
                            {/* Icon Container with glowing effect */}
                            <div className="mx-auto mb-4 d-flex align-items-center justify-content-center bg-primary-subtle" style={{ width: '84px', height: '84px', borderRadius: '50%', boxShadow: '0 0 0 10px rgba(var(--bs-primary-rgb), 0.05)' }}>
                                <div className="d-flex align-items-center justify-content-center bg-primary" style={{ width: '64px', height: '64px', borderRadius: '50%', boxShadow: '0 8px 16px rgba(var(--bs-primary-rgb), 0.25)' }}>
                                    <i className="ri-error-warning-fill text-white" style={{ fontSize: '32px' }}></i>
                                </div>
                            </div>
                            
                            <h4 className="fw-bolder mb-2 text-dark" style={{ letterSpacing: '-0.02em', fontSize: '24px' }}>Assignment Required</h4>
                            <p className="text-muted fs-15 mb-0" style={{ lineHeight: '1.6' }}>
                                You can assign Before <strong className="text-dark">Approved</strong>
                            </p>
                        </div>
                        <div className="p-4 pt-3 pb-4 bg-white">
                            <div className="d-flex justify-content-center mt-2 px-3">
                                <button
                                    type="button"
                                    className="btn btn-primary px-4 py-3 fs-15 border-0 fw-bold w-100"
                                    style={{ 
                                        borderRadius: '12px',
                                        boxShadow: '0 8px 20px rgba(var(--bs-primary-rgb), 0.25)',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                    onClick={() => {
                                        setShowMissingLenderModal(false);
                                        if (lenderTableRef.current) {
                                            lenderTableRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }
                                    }}
                                >
                                    Got it, take me there!
                                </button>
                            </div>
                        </div>
                    </ModalBody>
                </Modal>
            </div>
        </>
    );
}
