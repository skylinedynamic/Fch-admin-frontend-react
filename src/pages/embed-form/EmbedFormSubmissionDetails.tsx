import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Dropdown } from 'primereact/dropdown';
import { toast } from 'react-toastify';
import PageHeader from '../common/PageHeader';
import {
    getEmbedFormSubmission,
    convertEmbedFormSubmissionToBorrower,
    updateEmbedFormSubmissionStatus,
    downloadEmbedFormAttachment
} from '../../modules/embed-form/services';
import { handleFileDownload } from '../../utils/fileDownload';
// @ts-ignore
import EmbedFormConvertModal from './components/EmbedFormConvertModal';

const STATUS_META: Record<string, { label: string; badge: string; icon: string }> = {
    new: { label: 'New', badge: 'bg-primary-subtle text-primary', icon: 'ri-flashlight-line' },
    reviewing: { label: 'Reviewing', badge: 'bg-warning-subtle text-warning', icon: 'ri-time-line' },
    converted: { label: 'Converted', badge: 'bg-success-subtle text-success', icon: 'ri-checkbox-circle-line' },
    rejected: { label: 'Rejected', badge: 'bg-danger-subtle text-danger', icon: 'ri-close-circle-line' },
};

// 'converted' is reached through the conversion flow, never set by hand.
const MANUAL_STATUS_OPTIONS = [
    { label: 'New', value: 'new' },
    { label: 'Reviewing', value: 'reviewing' },
    { label: 'Rejected', value: 'rejected' },
];

const FILE_GROUPS: Record<string, { label: string; icon: string }> = {
    paystub_document: { label: 'Paystubs', icon: 'ri-money-dollar-box-line' },
    credit_report_document: { label: 'Credit Reports', icon: 'ri-bar-chart-box-line' },
};

const creditScoreBand = (score: number | string) => {
    const value = Number(score);
    if (!value) return 'muted';
    if (value >= 740) return 'good';
    if (value >= 670) return 'fair';
    return 'poor';
};

const creditScoreLabel = (score: number | string) => {
    const band = creditScoreBand(score);
    return band === 'good' ? 'Good — Very Good' : band === 'fair' ? 'Fair' : band === 'poor' ? 'Needs Work' : '';
};

const formatMoney = (formatted?: string | null, raw?: string | number | null) => {
    if (formatted) return formatted;
    if (raw === null || raw === undefined || raw === '') return null;
    const value = Number(raw);
    return Number.isNaN(value) ? String(raw) : `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
};

const formatDate = (value?: string | null, withTime = false) => {
    if (!value) return null;
    const date = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
    });
};

const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const fileIcon = (mimeType?: string, name?: string) => {
    const value = `${mimeType || ''} ${name || ''}`.toLowerCase();
    if (value.includes('pdf')) return { icon: 'ri-file-pdf-2-line', tone: 'danger' };
    if (value.includes('image') || /\.(png|jpe?g|gif|webp)$/.test(value)) return { icon: 'ri-image-line', tone: 'info' };
    if (value.includes('sheet') || value.includes('excel') || /\.(xlsx?|csv)$/.test(value)) return { icon: 'ri-file-excel-2-line', tone: 'success' };
    if (value.includes('word') || /\.docx?$/.test(value)) return { icon: 'ri-file-word-2-line', tone: 'primary' };
    return { icon: 'ri-file-text-line', tone: 'secondary' };
};

interface DetailFieldItemProps {
    label: string;
    value: React.ReactNode;
    copyValue?: string;
    colSize?: string;
    icon?: string;
}

const DetailFieldItem = ({ label, value, copyValue, colSize = 'col-sm-6', icon }: DetailFieldItemProps) => {
    const [copied, setCopied] = useState(false);
    const textToCopy = copyValue || (typeof value === 'string' ? value : '');
    const isEmpty = value === null || value === undefined || value === '';

    const handleCopy = () => {
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };

    return (
        <div className={colSize}>
            <div className="ef-field">
                <span className="ef-field__label">
                    {icon && <i className={`${icon} me-1`} />}
                    {label}
                </span>
                <div className="ef-field__value">
                    <span className="text-break">
                        {isEmpty ? <span className="ef-field__empty">Not provided</span> : value}
                    </span>
                    {textToCopy && (
                        <button
                            type="button"
                            onClick={handleCopy}
                            className="ef-field__copy"
                            title={copied ? 'Copied' : 'Copy to clipboard'}
                        >
                            <i className={copied ? 'ri-check-line text-success' : 'ri-file-copy-line'} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const SectionCard = ({
    title,
    icon,
    tone = 'primary',
    action,
    children,
    bodyClass = 'p-3',
}: {
    title: string;
    icon: string;
    tone?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
    bodyClass?: string;
}) => (
    <div className="card ef-card mb-4">
        <div className="card-header ef-card__header">
            <h5 className="ef-card__title">
                <span className={`ef-card__icon bg-${tone}-subtle text-${tone}`}>
                    <i className={icon} />
                </span>
                {title}
            </h5>
            {action}
        </div>
        <div className={`card-body ${bodyClass}`}>{children}</div>
    </div>
);

export default function EmbedFormSubmissionDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [submission, setSubmission] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);
    const [statusSaving, setStatusSaving] = useState(false);

    const [showConvertModal, setShowConvertModal] = useState(false);
    const [conversionLoading, setConversionLoading] = useState(false);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleStatusChange = async (nextStatus: string) => {
        if (!submission?.id || nextStatus === submission.status) return;
        const previousStatus = submission.status;
        setStatusSaving(true);
        setSubmission((prev: any) => ({ ...prev, status: nextStatus }));
        try {
            const res = await updateEmbedFormSubmissionStatus(submission.id, nextStatus);
            if (res.status) {
                toast.success(res?.message || 'Status updated successfully.');
            } else {
                setSubmission((prev: any) => ({ ...prev, status: previousStatus }));
                toast.error(res?.message || 'Failed to update status.');
            }
        } catch (err: any) {
            setSubmission((prev: any) => ({ ...prev, status: previousStatus }));
            toast.error(err?.response?.data?.message || err?.message || 'Failed to update status.');
        } finally {
            setStatusSaving(false);
        }
    };

    const handleConvertConfirm = async (payload: any) => {
        if (!submission?.id) return;
        setConversionLoading(true);
        try {
            const res = await convertEmbedFormSubmissionToBorrower(submission.id, payload);
            if (res.status) {
                const data = res.data?.data || res.data || {};
                const borrowerId = data.id || data.borrower_id || data.borrower?.id || null;
                setSubmission((prev: any) => ({
                    ...prev,
                    status: 'converted',
                    converted_borrower_id: borrowerId,
                    converted_borrower: {
                        id: borrowerId,
                        full_name: `${prev?.first_name || ''} ${prev?.last_name || ''}`.trim(),
                        is_free_trail: true,
                    },
                }));
                setShowConvertModal(false);
                toast.success(res?.message || 'Submission converted to a Free Trial Borrower!');
            } else {
                toast.error(res?.message || 'Failed to convert to free trial borrower.');
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err?.message || 'Failed to convert to free trial borrower.');
        } finally {
            setConversionLoading(false);
        }
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

    const attachments = submission?.attachments ?? [];

    const groupedAttachments = useMemo(() => {
        const groups: Record<string, any[]> = {};
        attachments.forEach((att: any) => {
            const key = att.field_name || 'other';
            (groups[key] = groups[key] || []).push(att);
        });
        return groups;
    }, [attachments]);

    const isConverted = submission?.status === 'converted';
    const isRejected = submission?.status === 'rejected';
    const convertedBorrower = submission?.converted_borrower;
    const convertedBorrowerId = convertedBorrower?.id || submission?.converted_borrower_id || null;
    const currentStatus = STATUS_META[submission?.status?.toLowerCase()] || STATUS_META.new;
    const initials = `${submission?.first_name?.[0] || ''}${submission?.last_name?.[0] || ''}`.toUpperCase() || 'AP';

    const fullAddress = submission
        ? [submission.home_address, submission.city, submission.state, submission.postal_code].filter(Boolean).join(', ')
        : '';

    const heroStats = submission
        ? [
              {
                  label: 'Desired Funding',
                  value: formatMoney(submission.desired_funding_amount_formatted, submission.desired_funding_amount) || '—',
                  icon: 'ri-hand-coin-line',
                  tone: 'success',
              },
              {
                  label: 'Annual Income',
                  value: formatMoney(submission.annual_income_formatted, submission.annual_income) || '—',
                  icon: 'ri-line-chart-line',
                  tone: 'info',
              },
              {
                  label: 'Credit Score',
                  value: submission.credit_score || '—',
                  hint: submission.credit_score ? creditScoreLabel(submission.credit_score) : '',
                  icon: 'ri-speed-up-line',
                  tone: 'warning',
              },
              {
                  label: 'Documents',
                  value: attachments.length,
                  icon: 'ri-attachment-2',
                  tone: 'primary',
              },
          ]
        : [];

    // Application progress: Submitted -> In Review -> Decision (Converted / Rejected).
    const reachedReview = ['reviewing', 'converted', 'rejected'].includes(submission?.status);
    const timelineSteps = submission
        ? [
              {
                  key: 'submitted',
                  title: 'Application Submitted',
                  meta: formatDate(submission.created_at, true),
                  state: 'is-done',
                  icon: 'ri-check-line',
              },
              {
                  key: 'review',
                  title: 'In Review',
                  meta: reachedReview ? 'Reviewed by team' : 'Awaiting review',
                  state: reachedReview ? 'is-done' : 'is-current',
                  icon: reachedReview ? 'ri-check-line' : 'ri-time-line',
              },
              {
                  key: 'decision',
                  title: isConverted
                      ? 'Converted to Free Trial Borrower'
                      : isRejected
                      ? 'Application Rejected'
                      : 'Decision Pending',
                  meta: isConverted
                      ? 'Active borrower account created'
                      : isRejected
                      ? formatDate(submission.updated_at, true) || undefined
                      : 'Convert or reject to continue',
                  state: isConverted ? 'is-done' : isRejected ? 'is-rejected' : '',
                  icon: isConverted ? 'ri-vip-crown-2-fill' : isRejected ? 'ri-close-line' : 'ri-flag-line',
              },
          ]
        : [];

    return (
        <div className="page-content">
            <div className="container-fluid">
                <PageHeader
                    title="Submission Details"
                    breadcrumbs={[
                        { label: 'Embedded Form', path: '/embed-form/settings' },
                        { label: 'Submissions', path: '/embed-form/submissions' },
                        { label: submission ? `${submission.first_name} ${submission.last_name}` : 'Details' }
                    ]}
                >
                    <Link to="/embed-form/submissions" className="btn btn-outline-secondary waves-effect">
                        <i className="ri-arrow-left-line align-middle me-1" /> Back
                    </Link>
                </PageHeader>

                {loading ? (
                    <div className="fade-panel">
                        <div className="card ef-card ef-hero mb-4">
                            <div className="card-body p-4">
                                <div className="d-flex align-items-center gap-3 mb-4">
                                    <div className="skeleton-line rounded-circle flex-shrink-0" style={{ width: '64px', height: '64px' }} />
                                    <div className="flex-grow-1">
                                        <div className="skeleton-line mb-2" style={{ width: '220px', height: '22px' }} />
                                        <div className="skeleton-line" style={{ width: '320px', height: '14px' }} />
                                    </div>
                                </div>
                                <div className="row g-3">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="col-6 col-lg-3">
                                            <div className="ef-stat">
                                                <div className="skeleton-line mb-2" style={{ width: '60%', height: '11px' }} />
                                                <div className="skeleton-line" style={{ width: '80%', height: '20px' }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="row g-0 gx-4">
                            <div className="col-xl-8">
                                {[1, 2].map(card => (
                                    <div key={card} className="card ef-card mb-4">
                                        <div className="card-header ef-card__header">
                                            <div className="skeleton-line" style={{ width: '180px', height: '16px' }} />
                                        </div>
                                        <div className="card-body p-3">
                                            <div className="row g-3">
                                                {[1, 2, 3, 4, 5, 6].map(i => (
                                                    <div key={i} className="col-sm-6">
                                                        <div className="ef-field">
                                                            <div className="skeleton-line mb-2" style={{ width: '45%', height: '10px' }} />
                                                            <div className="skeleton-line" style={{ width: '75%', height: '15px' }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="col-xl-4">
                                <div className="card ef-card mb-4">
                                    <div className="card-body p-4">
                                        <div className="skeleton-line mb-3" style={{ width: '60%', height: '18px' }} />
                                        <div className="skeleton-line mb-2" style={{ width: '100%', height: '12px' }} />
                                        <div className="skeleton-line mb-4" style={{ width: '85%', height: '12px' }} />
                                        <div className="skeleton-line" style={{ width: '100%', height: '38px' }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : !submission ? (
                    <div className="card ef-card text-center p-5">
                        <i className="ri-error-warning-line display-5 text-warning mb-3" />
                        <h5 className="fw-semibold">Submission Not Found</h5>
                        <p className="text-muted fs-13">
                            The requested application could not be found or you do not have permission to view it.
                        </p>
                        <Link to="/embed-form/submissions" className="btn btn-primary mx-auto">
                            Back to Submissions
                        </Link>
                    </div>
                ) : (
                    <div className="fade-panel">
                        {/* ── Hero ── */}
                        <div className="card ef-card ef-hero mb-4">
                            <div className="card-body p-4">
                                <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3 mb-4">
                                    <div className="d-flex align-items-center gap-3 min-w-0">
                                        <div className="ef-avatar ef-avatar--lg flex-shrink-0">{initials}</div>
                                        <div className="min-w-0">
                                            <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                                                <h4 className="mb-0 fs-18 fw-bold text-dark text-truncate">
                                                    {submission.first_name} {submission.last_name}
                                                </h4>
                                                <span className={`badge ${currentStatus.badge} ef-status-pill`}>
                                                    <i className={currentStatus.icon} /> {currentStatus.label}
                                                </span>
                                                {isConverted && (
                                                    <span className="badge bg-success-subtle text-success ef-status-pill">
                                                        <i className="ri-vip-crown-2-fill" /> Free Trial Borrower
                                                    </span>
                                                )}
                                            </div>
                                            <div className="ef-hero__meta">
                                                {submission.occupation && (
                                                    <span><i className="ri-briefcase-line" />{submission.occupation}</span>
                                                )}
                                                {submission.email && (
                                                    <span><i className="ri-mail-line" />{submission.email}</span>
                                                )}
                                                {submission.phone && (
                                                    <span><i className="ri-phone-line" />{submission.phone}</span>
                                                )}
                                                <span>
                                                    <i className="ri-calendar-line" />
                                                    Submitted {formatDate(submission.created_at, true) || '—'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="d-flex align-items-end gap-2 flex-shrink-0 flex-wrap">
                                        <div className="ef-status-select">
                                            <label className="ef-field__label mb-1 d-block">Submission Status</label>
                                            <Dropdown
                                                value={submission.status}
                                                options={
                                                    isConverted
                                                        ? [{ label: 'Converted', value: 'converted' }]
                                                        : MANUAL_STATUS_OPTIONS
                                                }
                                                onChange={(e) => handleStatusChange(e.value)}
                                                optionLabel="label"
                                                optionValue="value"
                                                disabled={isConverted || statusSaving}
                                                className="w-100"
                                                placeholder="Set status"
                                            />
                                        </div>
                                        {isConverted ? (
                                            convertedBorrowerId && (
                                                <button
                                                    type="button"
                                                    className="btn btn-soft-primary ef-convert-btn ef-convert-btn--lg"
                                                    onClick={() => navigate(`/clients/${convertedBorrowerId}`)}
                                                >
                                                    <i className="ri-external-link-line" />
                                                    <span>View Borrower</span>
                                                </button>
                                            )
                                        ) : (
                                            <button
                                                type="button"
                                                className="btn btn-primary ef-convert-btn ef-convert-btn--lg"
                                                onClick={() => setShowConvertModal(true)}
                                                disabled={conversionLoading}
                                            >
                                                <i className="ri-vip-crown-2-line" />
                                                <span>Convert to Free Trial Borrower</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="row g-3">
                                    {heroStats.map((stat) => (
                                        <div key={stat.label} className="col-6 col-lg-3">
                                            <div className="ef-stat">
                                                <span className={`ef-stat__icon bg-${stat.tone}-subtle text-${stat.tone}`}>
                                                    <i className={stat.icon} />
                                                </span>
                                                <div className="min-w-0">
                                                    <span className="ef-stat__label">{stat.label}</span>
                                                    <span className="ef-stat__value">{stat.value}</span>
                                                    {stat.hint && (
                                                        <span className={`ef-score ef-score--${creditScoreBand(submission.credit_score)}`}>
                                                            {stat.hint}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="row g-0 gx-4">
                            {/* ── Main column ── */}
                            <div className="col-xl-8">
                                <SectionCard title="Applicant Information" icon="ri-user-3-line" tone="primary">
                                    <div className="row g-3">
                                        <DetailFieldItem label="First Name" value={submission.first_name} copyValue={submission.first_name} />
                                        <DetailFieldItem label="Last Name" value={submission.last_name} copyValue={submission.last_name} />
                                        <DetailFieldItem label="Email Address" value={submission.email} copyValue={submission.email} />
                                        <DetailFieldItem label="Phone Number" value={submission.phone} copyValue={submission.phone} />
                                        <DetailFieldItem label="Date of Birth" value={formatDate(submission.birthday)} />
                                        <DetailFieldItem
                                            label="Social Security Number"
                                            value={
                                                <span className="font-monospace d-inline-flex align-items-center gap-1">
                                                    <i className="ri-lock-2-line text-muted" />
                                                    {submission.ssn_masked || (submission.last_4_ssn ? `•••-••-${submission.last_4_ssn}` : 'Encrypted on record')}
                                                </span>
                                            }
                                        />
                                        <DetailFieldItem
                                            label="Estimated Credit Score"
                                            value={submission.credit_score ? (
                                                <span className={`ef-score ef-score--${creditScoreBand(submission.credit_score)}`}>
                                                    <i className="ri-speed-up-line" /> {submission.credit_score} · {creditScoreLabel(submission.credit_score)}
                                                </span>
                                            ) : null}
                                        />
                                        <DetailFieldItem
                                            label="Residential Address"
                                            colSize="col-12"
                                            value={fullAddress || null}
                                            copyValue={fullAddress}
                                        />
                                    </div>
                                </SectionCard>

                                <SectionCard title="Employment & Income" icon="ri-briefcase-4-line" tone="success">
                                    <div className="row g-3">
                                        <DetailFieldItem label="Employer / Business Name" value={submission.employer_name} copyValue={submission.employer_name} />
                                        <DetailFieldItem label="Occupation / Role" value={submission.occupation} copyValue={submission.occupation} />
                                        <DetailFieldItem label="Employer Phone" value={submission.employer_phone} copyValue={submission.employer_phone} />
                                        <DetailFieldItem
                                            label="Annual Income"
                                            value={
                                                formatMoney(submission.annual_income_formatted, submission.annual_income)
                                                    ? <span className="fw-bold text-success">{formatMoney(submission.annual_income_formatted, submission.annual_income)}</span>
                                                    : null
                                            }
                                        />
                                        <DetailFieldItem
                                            label="Employer Address"
                                            colSize="col-12"
                                            value={submission.employer_address}
                                            copyValue={submission.employer_address}
                                        />
                                    </div>
                                </SectionCard>

                                <SectionCard title="Housing & Funding Request" icon="ri-home-4-line" tone="info">
                                    <div className="row g-3">
                                        <DetailFieldItem
                                            label="Housing Status"
                                            value={submission.housing_status ? (
                                                <span className="badge bg-light text-body border fs-12 text-capitalize">{submission.housing_status}</span>
                                            ) : null}
                                        />
                                        <DetailFieldItem
                                            label="Monthly Housing Payment"
                                            value={formatMoney(submission.monthly_housing_payment_formatted, submission.monthly_housing_payment)}
                                        />
                                        <DetailFieldItem
                                            label="Desired Funding Amount"
                                            value={
                                                formatMoney(submission.desired_funding_amount_formatted, submission.desired_funding_amount)
                                                    ? <span className="fw-bold text-success fs-14">{formatMoney(submission.desired_funding_amount_formatted, submission.desired_funding_amount)}</span>
                                                    : null
                                            }
                                        />
                                        <DetailFieldItem label="Referral Source" value={submission.referral_source} />
                                        <DetailFieldItem label="Sales Representative" value={submission.sales_rep} />
                                    </div>
                                </SectionCard>

                                <SectionCard
                                    title={`Uploaded Documents (${attachments.length})`}
                                    icon="ri-attachment-2"
                                    tone="primary"
                                    bodyClass={attachments.length ? 'p-3' : 'p-0'}
                                >
                                    {attachments.length ? (
                                        Object.entries(groupedAttachments).map(([field, files]) => {
                                            const group = FILE_GROUPS[field] || { label: 'Other Documents', icon: 'ri-folder-line' };
                                            return (
                                                <div key={field} className="ef-doc-group">
                                                    <div className="ef-doc-group__title">
                                                        <i className={group.icon} /> {group.label}
                                                        <span className="ef-doc-group__count">{files.length}</span>
                                                    </div>
                                                    <div className="row g-2">
                                                        {files.map((att: any) => {
                                                            const meta = fileIcon(att.mime_type, att.original_name);
                                                            return (
                                                                <div key={att.id} className="col-md-6">
                                                                    <div className="ef-doc">
                                                                        <span className={`ef-doc__icon bg-${meta.tone}-subtle text-${meta.tone}`}>
                                                                            <i className={meta.icon} />
                                                                        </span>
                                                                        <div className="min-w-0 flex-grow-1">
                                                                            <div className="ef-doc__name" title={att.original_name}>
                                                                                {att.original_name}
                                                                            </div>
                                                                            <div className="ef-doc__meta">
                                                                                {formatFileSize(att.file_size)} · {formatDate(att.created_at) || '—'}
                                                                            </div>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-sm btn-soft-primary ef-icon-btn flex-shrink-0"
                                                                            onClick={() => handleDownload(att)}
                                                                            disabled={downloadingId === att.id}
                                                                            title="Download file"
                                                                        >
                                                                            {downloadingId === att.id ? (
                                                                                <span className="spinner-border spinner-border-sm" />
                                                                            ) : (
                                                                                <i className="ri-download-2-line" />
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="ef-empty">
                                            <i className="ri-folder-open-line" />
                                            <span>No attachments were uploaded with this submission</span>
                                        </div>
                                    )}
                                </SectionCard>
                            </div>

                            {/* ── Side column ── */}
                            <div className="col-xl-4">
                                {isConverted && (
                                    <div className="card ef-card mb-4">
                                        <div className="card-body p-3 d-flex align-items-center gap-3">
                                            <div className="ef-avatar ef-avatar--md flex-shrink-0">{initials}</div>
                                            <div className="min-w-0 flex-grow-1">
                                                <span className="ef-field__label d-block">Linked Borrower</span>
                                                <div className="fw-semibold text-dark fs-13 text-truncate">
                                                    {convertedBorrower?.full_name || `${submission.first_name} ${submission.last_name}`}
                                                </div>
                                                <span className="badge bg-primary-subtle text-primary ef-status-pill mt-1">
                                                    <i className="ri-vip-crown-2-fill" /> Free Trial
                                                </span>
                                            </div>
                                            {convertedBorrowerId && (
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-soft-primary ef-icon-btn flex-shrink-0"
                                                    onClick={() => navigate(`/clients/${convertedBorrowerId}`)}
                                                    title="View borrower"
                                                >
                                                    <i className="ri-external-link-line" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <SectionCard title="Application Timeline" icon="ri-route-line" tone="primary">
                                    <ul className="ef-timeline list-unstyled mb-0">
                                        {timelineSteps.map((step) => (
                                            <li key={step.key} className={`ef-timeline__item ${step.state}`}>
                                                <span className="ef-timeline__dot">
                                                    <i className={step.icon} />
                                                </span>
                                                <div className="min-w-0">
                                                    <div className="ef-timeline__title">{step.title}</div>
                                                    {step.meta && <div className="ef-timeline__meta">{step.meta}</div>}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </SectionCard>

                                <SectionCard title="Submission Metadata" icon="ri-information-line" tone="secondary">
                                    <div className="row g-3">
                                        <DetailFieldItem
                                            label="Received Via Partner"
                                            colSize="col-12"
                                            value={submission.partner?.company_name || submission.partner?.full_name}
                                        />
                                        <DetailFieldItem
                                            label="Reference UID"
                                            colSize="col-12"
                                            value={submission.submission_uid ? (
                                                <span className="font-monospace fs-12">{submission.submission_uid}</span>
                                            ) : null}
                                            copyValue={submission.submission_uid}
                                        />
                                        <DetailFieldItem
                                            label="Source Page"
                                            colSize="col-12"
                                            value={submission.origin_url ? (
                                                <a
                                                    href={submission.origin_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-primary text-decoration-none text-break"
                                                >
                                                    {submission.origin_url}
                                                </a>
                                            ) : null}
                                            copyValue={submission.origin_url}
                                        />
                                        <DetailFieldItem
                                            label="IP Address"
                                            value={submission.ip_address ? (
                                                <span className="font-monospace fs-12">{submission.ip_address}</span>
                                            ) : null}
                                        />
                                        <DetailFieldItem label="Submitted" value={formatDate(submission.created_at, true)} />
                                        <DetailFieldItem label="Last Updated" value={formatDate(submission.updated_at, true)} />
                                    </div>
                                </SectionCard>
                            </div>
                        </div>

                        <EmbedFormConvertModal
                            show={showConvertModal}
                            onHide={() => setShowConvertModal(false)}
                            onConfirm={handleConvertConfirm}
                            submission={submission}
                            loading={conversionLoading}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
