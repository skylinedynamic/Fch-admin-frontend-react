import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import PageHeader from '../common/PageHeader';
import {
    getEmbedFormSubmission,
    convertEmbedFormSubmissionToBorrower,
    downloadEmbedFormAttachment
} from '../../modules/embed-form/services';
import { handleFileDownload } from '../../utils/fileDownload';
import { useAuthStore } from '../../store/auth/authStore';
import { PARTNER_TYPES } from '../../config/partnerTypeOptions';
import EmbedFormConvertModal from './components/EmbedFormConvertModal';
// @ts-ignore
import LeadPaymentModal from '../leads/components/LeadPaymentModal';

interface DetailFieldItemProps {
    label: string;
    value: React.ReactNode;
    copyValue?: string;
    colSize?: string;
}

const DetailFieldItem = ({ label, value, copyValue, colSize = 'col-sm-6' }: DetailFieldItemProps) => {
    const [copied, setCopied] = useState(false);

    const textToCopy = copyValue || (typeof value === 'string' ? value : '');

    const handleCopy = () => {
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`${colSize} mb-3 pb-1`}>
            <span className="text-muted d-block fs-11 text-uppercase fw-semibold mb-1">
                {label}
            </span>
            <div className="fw-semibold text-dark fs-13 d-flex align-items-center gap-2">
                <span className="text-break">{value || <span className="text-muted fst-italic">—</span>}</span>
                {textToCopy && (
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="btn btn-sm p-0 border-0 bg-transparent flex-shrink-0 text-muted"
                        title="Copy to clipboard"
                    >
                        <i className={`ri-${copied ? 'check-line text-success' : 'file-copy-line'} fs-13`} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default function EmbedFormSubmissionDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const currentUser = useAuthStore((state) => state.user);
    const isHost = Boolean(currentUser?.is_host == 1 || currentUser?.is_host == true);
    const isWLOrCP = currentUser?.partner_type === PARTNER_TYPES.WHITE_LABEL || currentUser?.partner_type === PARTNER_TYPES.CERTIFIED;

    const [submission, setSubmission] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);

    // Conversion & Payment Modals state
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [conversionLoading, setConversionLoading] = useState(false);

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentBorrowerId, setPaymentBorrowerId] = useState<any>(null);
    const [paymentInvoiceId, setPaymentInvoiceId] = useState<any>(null);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);

    const fetchDetails = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await getEmbedFormSubmission(id);
            if (res.status) {
                setSubmission(res.data);
            } else {
                toast.error(res?.message || 'Failed to load submission details');
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.message || 'Error loading submission details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetails();
    }, [id]);

    const handleOpenConvertModal = () => {
        setShowConvertModal(true);
    };

    const handleConvertConfirm = async (payload: any) => {
        if (!submission?.id) return;
        setConversionLoading(true);
        try {
            const res = await convertEmbedFormSubmissionToBorrower(submission.id, payload);
            if (res.status) {
                const data = res.data?.data || res.data || {};
                const borrowerId = data.id || data.borrower_id || data.borrower?.id;
                const invoiceId = data.invoice_id;
                const amount = Number(payload.payment_amount || payload.enrollment_amount || data.payment_amount || 0);

                setSubmission((prev: any) => ({
                    ...prev,
                    status: 'converted'
                }));

                setShowConvertModal(false);

                if (!isHost && !isWLOrCP && borrowerId && amount > 0 && !payload.is_free_trail) {
                    setPaymentBorrowerId(borrowerId);
                    setPaymentInvoiceId(invoiceId);
                    setPaymentAmount(amount);
                    setShowPaymentModal(true);
                    toast.success(res?.message || "Borrower created. Please complete the enrollment payment.");
                } else {
                    toast.success(res?.message || 'Submission successfully converted to Borrower!');
                }
            } else {
                toast.error(res?.message || 'Failed to convert to borrower.');
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.message || 'Failed to convert to borrower.');
        } finally {
            setConversionLoading(false);
        }
    };

    const handlePaymentSuccess = () => {
        setShowPaymentModal(false);
        toast.success("Payment completed successfully!");
        fetchDetails();
    };

    const handleDownload = async (attachment: any) => {
        setDownloadingId(attachment.id);
        try {
            await handleFileDownload(
                () => downloadEmbedFormAttachment(attachment.id),
                attachment.original_name || 'document.pdf',
                attachment.file_url || attachment.download_url
            );
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.message || 'Failed to download attachment');
        } finally {
            setDownloadingId(null);
        }
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return '—';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const statusMap: Record<string, { badge: string; icon: string }> = {
        new: { badge: 'bg-primary-subtle text-primary border border-primary-subtle', icon: 'ri-flashlight-line' },
        reviewing: { badge: 'bg-warning-subtle text-warning border border-warning-subtle', icon: 'ri-time-line' },
        converted: { badge: 'bg-success-subtle text-success border border-success-subtle', icon: 'ri-checkbox-circle-line' },
        rejected: { badge: 'bg-danger-subtle text-danger border border-danger-subtle', icon: 'ri-close-circle-line' },
    };

    const currentStatus = submission?.status
        ? statusMap[submission.status.toLowerCase()] || { badge: 'bg-light text-body border', icon: 'ri-information-line' }
        : { badge: 'bg-light text-body border', icon: 'ri-information-line' };

    const initials = `${submission?.first_name?.[0] || ''}${submission?.last_name?.[0] || ''}`.toUpperCase() || 'AP';

    return (
        <div className="page-content">
            <div className="container-fluid">
                {/* Header */}
                <PageHeader
                    title="Submission Details"
                    breadcrumbs={[
                        { label: 'Embedded Form', path: '/embed-form/settings' },
                        { label: 'Submissions', path: '/embed-form/submissions' },
                        { label: submission ? `${submission.first_name} ${submission.last_name}` : 'Details' }
                    ]}
                >
                    <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
                        <Link to="/embed-form/submissions" className="btn btn-outline-secondary w-lg waves-effect">
                            <i className="ri-arrow-left-line align-middle me-1" /> Back
                        </Link>
                    </div>
                </PageHeader>

                {loading ? (
                    /* High-Fidelity Borderless Skeleton Loader */
                    <div className="fade-panel">
                        {/* Banner Skeleton */}
                        <div className="card embed-card-r4 shadow-sm mb-4">
                            <div className="card-body p-4">
                                <div className="row align-items-center gy-3">
                                    <div className="col-md-6">
                                        <div className="d-flex align-items-center gap-3">
                                            <div className="skeleton-line rounded-circle flex-shrink-0" style={{ width: '56px', height: '56px' }} />
                                            <div className="flex-grow-1">
                                                <div className="skeleton-line mb-2" style={{ width: '45%', height: '22px' }} />
                                                <div className="skeleton-line" style={{ width: '60%', height: '14px' }} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="d-flex justify-content-md-end gap-4">
                                            <div style={{ width: '100px' }}>
                                                <div className="skeleton-line mb-1" style={{ height: '12px' }} />
                                                <div className="skeleton-line" style={{ height: '22px' }} />
                                            </div>
                                            <div style={{ width: '80px' }}>
                                                <div className="skeleton-line mb-1" style={{ height: '12px' }} />
                                                <div className="skeleton-line" style={{ height: '22px' }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Two Column Grid Skeletons */}
                        <div className="row g-4 mb-4">
                            <div className="col-lg-6">
                                <div className="card embed-card-r4 shadow-sm border-0 h-100 mb-0">
                                    <div className="card-header bg-transparent border-0 p-3">
                                        <div className="skeleton-line" style={{ width: '40%', height: '18px' }} />
                                    </div>
                                    <div className="card-body p-4">
                                        <div className="row g-3">
                                            {[1, 2, 3, 4, 5, 6].map(i => (
                                                <div key={i} className="col-sm-6 mb-2">
                                                    <div className="skeleton-line mb-1.5" style={{ width: '50%', height: '11px' }} />
                                                    <div className="skeleton-line" style={{ width: '80%', height: '16px' }} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-6">
                                <div className="card embed-card-r4 shadow-sm border-0 h-100 mb-0">
                                    <div className="card-header bg-transparent border-0 p-3">
                                        <div className="skeleton-line" style={{ width: '45%', height: '18px' }} />
                                    </div>
                                    <div className="card-body p-4">
                                        <div className="row g-3">
                                            {[1, 2, 3, 4, 5, 6].map(i => (
                                                <div key={i} className="col-sm-6 mb-2">
                                                    <div className="skeleton-line mb-1.5" style={{ width: '50%', height: '11px' }} />
                                                    <div className="skeleton-line" style={{ width: '80%', height: '16px' }} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Documents Table Skeleton */}
                        <div className="card embed-card-r4 shadow-sm border-0 mb-4">
                            <div className="card-header bg-transparent border-0 p-3">
                                <div className="skeleton-line" style={{ width: '30%', height: '18px' }} />
                            </div>
                            <div className="card-body p-4">
                                <div className="skeleton-line w-100 mb-3" style={{ height: '36px' }} />
                                <div className="skeleton-line w-100" style={{ height: '36px' }} />
                            </div>
                        </div>
                    </div>
                ) : !submission ? (
                    <div className="card embed-card-r4 text-center p-5">
                        <i className="ri-error-warning-line display-4 text-warning mb-3" />
                        <h5 className="fw-semibold">Submission Not Found</h5>
                        <p className="text-muted">The requested application could not be found or you do not have permission to view it.</p>
                        <Link to="/embed-form/submissions" className="btn btn-primary embed-card-r4 mx-auto">
                            Back to Submissions
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* 1. Header Profile Banner */}
                        <div className="card embed-card-r4 shadow-sm mb-4">
                            <div className="card-body p-4">
                                <div className="row align-items-center gy-3">
                                    <div className="col-lg-6">
                                        <div className="d-flex align-items-center">
                                            <div className="avatar-md flex-shrink-0 me-3">
                                                <div className="avatar-title bg-primary-subtle text-primary rounded-circle fs-20 fw-bold">
                                                    {initials}
                                                </div>
                                            </div>
                                            <div className="flex-grow-1 min-w-0">
                                                <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                                                    <h4 className="card-title text-dark mb-0 fs-18 fw-bold">
                                                        {submission.first_name} {submission.last_name}
                                                    </h4>
                                                    <span className={`badge ${currentStatus.badge} px-2.5 py-1 rounded-pill fw-medium text-uppercase fs-11 d-inline-flex align-items-center gap-1`}>
                                                        <i className={currentStatus.icon} />
                                                        {submission.status}
                                                    </span>
                                                </div>
                                                <p className="text-muted mb-0 fs-13">
                                                    {submission.occupation && (
                                                        <span className="me-3"><i className="ri-briefcase-line me-1 align-middle" />{submission.occupation}</span>
                                                    )}
                                                    <span><i className="ri-calendar-line me-1 align-middle" />Submitted {submission.created_at_formatted || (submission.created_at ? new Date(submission.created_at).toLocaleDateString() : '—')}</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-lg-6">
                                        <div className="d-flex flex-wrap justify-content-lg-end align-items-center gap-4">
                                            <div className="text-lg-end">
                                                <span className="text-muted d-block fs-11 text-uppercase fw-semibold mb-0.5">Desired Funding</span>
                                                <h4 className="text-success mb-0 fw-bold fs-18">
                                                    {submission.desired_funding_amount_formatted || (submission.desired_funding_amount ? `$${parseFloat(submission.desired_funding_amount).toLocaleString()}` : '—')}
                                                </h4>
                                            </div>
                                            <div className="border-start ps-4 text-lg-end">
                                                <span className="text-muted d-block fs-11 text-uppercase fw-semibold mb-0.5">Credit Score</span>
                                                <span className="badge bg-info-subtle text-info fs-13 px-2.5 py-1">
                                                    {submission.credit_score || 'N/A'}
                                                </span>
                                            </div>
                                            <div className="border-start ps-4 text-lg-end">
                                                <span className="text-muted d-block fs-11 text-uppercase fw-semibold mb-0.5">Attachments</span>
                                                <span className="fw-semibold text-dark fs-14">
                                                    <i className="ri-attachment-line text-primary me-1" />
                                                    {submission.attachments?.length ?? 0}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Structured Information Cards */}
                        <div className="row g-4 mb-4">
                            {/* Left: Applicant Information */}
                            <div className="col-lg-6">
                                <div className="card embed-card-r4 shadow-sm h-100 mb-0">
                                    <div className="card-header bg-transparent border-bottom p-3">
                                        <h5 className="card-title mb-0 fs-14 fw-semibold">
                                            <i className="ri-user-line text-primary me-1.5 align-middle" /> Applicant Information
                                        </h5>
                                    </div>
                                    <div className="card-body p-4">
                                        <div className="row g-2">
                                            <DetailFieldItem
                                                label="First Name"
                                                value={submission.first_name}
                                                copyValue={submission.first_name}
                                            />
                                            <DetailFieldItem
                                                label="Last Name"
                                                value={submission.last_name}
                                                copyValue={submission.last_name}
                                            />
                                            <DetailFieldItem
                                                label="Email Address"
                                                value={
                                                    submission.email ? (
                                                        <a href={`mailto:${submission.email}`} className="text-primary text-decoration-none">{submission.email}</a>
                                                    ) : '—'
                                                }
                                                copyValue={submission.email}
                                            />
                                            <DetailFieldItem
                                                label="Phone Number"
                                                value={
                                                    submission.phone ? (
                                                        <a href={`tel:${submission.phone}`} className="text-dark text-decoration-none">{submission.phone}</a>
                                                    ) : '—'
                                                }
                                                copyValue={submission.phone}
                                            />
                                            <DetailFieldItem
                                                label="Social Security Number"
                                                value={
                                                    <span className="font-monospace">
                                                        {submission.ssn_masked || (submission.last_4_ssn ? `***-**-${submission.last_4_ssn}` : 'Encrypted on record')}
                                                    </span>
                                                }
                                            />
                                            <DetailFieldItem
                                                label="Estimated Credit Score"
                                                value={
                                                    submission.credit_score ? (
                                                        <span className="badge bg-info-subtle text-info fs-12 px-2.5 py-0.5">{submission.credit_score}</span>
                                                    ) : '—'
                                                }
                                            />
                                            <DetailFieldItem
                                                label="Residential Address"
                                                colSize="col-12"
                                                value={[submission.home_address, submission.city, submission.state, submission.postal_code].filter(Boolean).join(', ') || '—'}
                                                copyValue={[submission.home_address, submission.city, submission.state, submission.postal_code].filter(Boolean).join(', ')}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Employment & Funding Details */}
                            <div className="col-lg-6">
                                <div className="card embed-card-r4 shadow-sm h-100 mb-0">
                                    <div className="card-header bg-transparent border-bottom p-3">
                                        <h5 className="card-title mb-0 fs-14 fw-semibold">
                                            <i className="ri-briefcase-line text-success me-1.5 align-middle" /> Employment & Funding Request
                                        </h5>
                                    </div>
                                    <div className="card-body p-4">
                                        <div className="row g-2">
                                            <DetailFieldItem
                                                label="Employer / Business Name"
                                                value={submission.employer_name}
                                                copyValue={submission.employer_name}
                                            />
                                            <DetailFieldItem
                                                label="Occupation / Role"
                                                value={submission.occupation}
                                                copyValue={submission.occupation}
                                            />
                                            <DetailFieldItem
                                                label="Employer Phone"
                                                value={
                                                    submission.employer_phone ? (
                                                        <a href={`tel:${submission.employer_phone}`} className="text-dark text-decoration-none">{submission.employer_phone}</a>
                                                    ) : '—'
                                                }
                                                copyValue={submission.employer_phone}
                                            />
                                            <DetailFieldItem
                                                label="Annual Income"
                                                value={submission.annual_income_formatted || (submission.annual_income ? `$${parseFloat(submission.annual_income).toLocaleString()}` : '—')}
                                            />
                                            <DetailFieldItem
                                                label="Desired Funding Amount"
                                                value={
                                                    <span className="text-success fw-bold fs-14">
                                                        {submission.desired_funding_amount_formatted || (submission.desired_funding_amount ? `$${parseFloat(submission.desired_funding_amount).toLocaleString()}` : '—')}
                                                    </span>
                                                }
                                            />
                                            <DetailFieldItem
                                                label="Reference UID"
                                                value={
                                                    <span className="font-monospace text-muted">
                                                        #{submission.submission_uid?.slice(0, 12)}
                                                    </span>
                                                }
                                                copyValue={submission.submission_uid}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Uploaded Documents Section */}
                        <div className="card embed-card-r4 shadow-sm mb-4">
                            <div className="card-header bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between">
                                <h5 className="card-title mb-0 fs-14 fw-semibold">
                                    <i className="ri-attachment-line text-primary me-1.5 align-middle" /> Uploaded Documents ({submission.attachments?.length ?? 0})
                                </h5>
                            </div>
                            <div className="card-body p-0">
                                {submission.attachments && submission.attachments.length > 0 ? (
                                    <div className="table-responsive">
                                        <table className="table table-nowrap align-middle mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th scope="col" className="ps-4">Document Name</th>
                                                    <th scope="col">File Size</th>
                                                    <th scope="col">Uploaded Date</th>
                                                    <th scope="col" className="text-center pe-4" style={{ width: '120px' }}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {submission.attachments.map((att: any) => (
                                                    <tr key={att.id}>
                                                        <td className="ps-4">
                                                            <div className="d-flex align-items-center gap-3">
                                                                <div className="avatar-xs flex-shrink-0">
                                                                    <div className="avatar-title bg-primary-subtle text-primary rounded fs-16">
                                                                        <i className="ri-file-text-line" />
                                                                    </div>
                                                                </div>
                                                                <div className="fw-medium text-dark fs-13 text-truncate" title={att.original_name}>
                                                                    {att.original_name}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="text-muted fs-13">{formatFileSize(att.file_size)}</td>
                                                        <td className="text-muted fs-13">
                                                            {att.created_at ? new Date(att.created_at).toLocaleDateString() : '—'}
                                                        </td>
                                                        <td className="text-center pe-4">
                                                            <button
                                                                type="button"
                                                                className="btn btn-sm btn-soft-primary embed-card-r4 d-inline-flex align-items-center gap-1 fs-12 px-2.5 py-1"
                                                                onClick={() => handleDownload(att)}
                                                                disabled={downloadingId === att.id}
                                                                title="Download file"
                                                            >
                                                                {downloadingId === att.id ? (
                                                                    <span className="spinner-border spinner-border-sm" />
                                                                ) : (
                                                                    <>
                                                                        <i className="ri-download-2-line" />
                                                                        <span>Download</span>
                                                                    </>
                                                                )}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-muted">
                                        <i className="ri-folder-open-line fs-24 d-block mb-1 text-muted opacity-50" />
                                        <span className="fs-13">No attachments uploaded with this submission</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 4. Bottom Action Footer Card */}
                        <div className="card embed-card-r4 shadow-sm mb-4">
                            <div className="card-body p-4 d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3">
                                <div>
                                    <h5 className="card-title fw-bold fs-15 mb-1">
                                        {submission.status === 'converted' ? 'Borrower Enrollment Status' : 'Borrower Conversion'}
                                    </h5>
                                    <p className="text-muted fs-13 mb-0">
                                        {submission.status === 'converted'
                                            ? 'This form submission has already been converted into an active Borrower account.'
                                            : 'Convert this form submission directly into an active Borrower account to initiate onboarding.'}
                                    </p>
                                </div>
                                <div className="d-flex align-items-center gap-2 flex-shrink-0">

                                    {submission.status !== 'converted' ? (
                                        <button
                                            type="button"
                                            className="btn btn-success waves-effect waves-light fw-medium d-inline-flex align-items-center gap-1.5 text-nowrap px-3 py-2"
                                            onClick={handleOpenConvertModal}
                                            disabled={conversionLoading}
                                        >
                                            <i className="ri-user-add-line align-middle fs-15" />
                                            <span>Convert to Borrower</span>
                                        </button>
                                    ) : (
                                        <span className="badge bg-success-subtle text-success fs-13 px-3 py-2 rounded-pill text-nowrap d-inline-flex align-items-center gap-1.5">
                                            <i className="ri-checkbox-circle-fill fs-15" /> Converted to Borrower
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Conversion Plan / Confirmation Modal */}
                        <EmbedFormConvertModal
                            show={showConvertModal}
                            onHide={() => setShowConvertModal(false)}
                            onConfirm={handleConvertConfirm}
                            submission={submission}
                            loading={conversionLoading}
                            isHost={isHost}
                        />

                        {/* Non-Host Borrower Payment Modal */}
                        <LeadPaymentModal
                            show={showPaymentModal}
                            onHide={() => setShowPaymentModal(false)}
                            amount={paymentAmount}
                            lead={{
                                contact_person: submission ? `${submission.first_name || ''} ${submission.last_name || ''}`.trim() : 'Borrower',
                                email: submission?.email,
                                phone_number: submission?.phone,
                                partner_id: submission?.partner_id,
                                invoice_id: paymentInvoiceId,
                                entity_type: 'Borrower',
                            }}
                            borrowerId={paymentBorrowerId}
                            invoiceId={paymentInvoiceId}
                            onPaymentSuccess={handlePaymentSuccess}
                            loading={conversionLoading}
                        />
                    </>
                )}
            </div>
        </div>
    );
}

