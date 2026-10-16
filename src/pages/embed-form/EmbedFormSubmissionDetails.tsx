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
import { usePermissions } from '../../lib/auth/usePermissions';
import { formatApiDate } from '../../utils/dates';
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

// Icons for the borrower document types the embedded form uploads under. The
// labels come from the server now, so this only decorates — a type added in the
// admin still renders, with the fallback icon.
const DOC_TYPE_ICONS: Record<string, string> = {
    'business bank statements': 'ri-bank-line',
    'business plan': 'ri-lightbulb-line',
    'business tax returns': 'ri-file-list-3-line',
    'ein / corporation docs': 'ri-government-line',
    'equipment invoice / quote': 'ri-tools-line',
    'personal tax returns': 'ri-user-received-line',
    'voided business check': 'ri-money-dollar-box-line',
    'a/r aging report': 'ri-bar-chart-box-line',
    // Retired buckets, kept so submissions taken before the funding
    // application rewrite still show a sensible icon.
    paystub_document: 'ri-money-dollar-box-line',
    credit_report_document: 'ri-bar-chart-box-line',
};

const COMPLIANCE_QUESTIONS: { key: string; label: string }[] = [
    { key: 'filed_for_bankruptcy', label: 'Filed for Bankruptcy' },
    { key: 'any_pending_lawsuits', label: 'Pending Lawsuits' },
    { key: 'has_federal_loan', label: 'Defaulted on a Federal Loan' },
    { key: 'has_federal_debt', label: 'Delinquent on Federal Debt' },
    { key: 'has_criminal_offense', label: 'Criminal Offense' },
    { key: 'has_parole_or_probation', label: 'On Parole or Probation' },
    { key: 'suspended_or_debarred', label: 'Suspended or Debarred' },
    { key: 'any_outstanding_judgments_business', label: 'Judgments / Liens (Business)' },
    { key: 'any_outstanding_judgments_owner', label: 'Judgments / Liens (Owner)' },
];

const docTypeIcon = (label: string) =>
    DOC_TYPE_ICONS[label?.toLowerCase()] || DOC_TYPE_ICONS[label] || 'ri-folder-line';

/**
 * Credit score band, as resolved by the server.
 *
 * There is deliberately no threshold table here. This screen used to carry its
 * own (`>= 740 good, >= 670 fair`), which labelled 710 and 720 "Fair" when the
 * published FICO ranges put 670-739 in "Good". The API now sends the band it
 * resolved from the one configurable table, and the UI only renders it.
 */
const scoreBand = (submission: any) => ({
    key: submission?.credit_score_band ?? null,
    label: submission?.credit_score_band_label ?? null,
    tone: submission?.credit_score_band_tone ?? 'secondary',
});

const yesNo = (value: boolean | null | undefined) =>
    value === null || value === undefined ? null : (
        <span className={`badge ${value ? 'bg-warning-subtle text-warning' : 'bg-light text-body border'} fs-12`}>
            {value ? 'Yes' : 'No'}
        </span>
    );

const consentBadge = (value: boolean | null | undefined) =>
    value === null || value === undefined ? null : (
        <span className={`badge ${value ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} fs-12`}>
            <i className={value ? 'ri-check-line' : 'ri-close-line'} /> {value ? 'Accepted' : 'Not accepted'}
        </span>
    );

const formatMoney = (formatted?: string | null, raw?: string | number | null) => {
    if (formatted) return formatted;
    if (raw === null || raw === undefined || raw === '') return null;
    const value = Number(raw);
    return Number.isNaN(value) ? String(raw) : `$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
};

// Calendar dates (date_of_birth, business_checking_start_date, birthday) must
// not be parsed as UTC midnight, or they render a day early behind UTC.
const formatDate = (value?: string | null, withTime = false) =>
    formatApiDate(value, withTime);

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
    const { hasPermission } = usePermissions();
    const canConvert = hasPermission('convert application');

    const [submission, setSubmission] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);
    const [statusSaving, setStatusSaving] = useState(false);

    const [showConvertModal, setShowConvertModal] = useState(false);
    const [existingBorrower, setExistingBorrower] = useState<any>(null);
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
                        is_free_trail: data.is_free_trail ?? true,
                    },
                    converted_funding_application_id: data.funding_application_id ?? null,
                }));
                setShowConvertModal(false);
                setExistingBorrower(null);
                toast.success(res?.message || 'Submission converted to a Free Plan Borrower!');
            } else {
                toast.error(res?.message || 'Failed to convert to free plan borrower.');
            }
        } catch (err: any) {
            const body = err?.response?.data;
            if (err?.response?.status === 409 && body?.code === 'existing_borrower_confirmation_required') {
                // Show who already exists and let the user confirm before anything is created.
                setExistingBorrower(body?.data?.existing_borrower ?? {});
                return;
            }
            toast.error(body?.message || err?.message || 'Failed to convert to free plan borrower.');
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

    const coBorrowers = submission?.co_borrowers ?? [];

    const groupedAttachments = useMemo(() => {
        const groups: Record<string, any[]> = {};
        attachments.forEach((att: any) => {
            const key = att.document_type || att.field_name || 'Other Documents';
            (groups[key] = groups[key] || []).push(att);
        });
        return groups;
    }, [attachments]);

    const isConverted = submission?.status === 'converted';
    const isRejected = submission?.status === 'rejected';
    const convertedBorrower = submission?.converted_borrower;
    const convertedBorrowerId = convertedBorrower?.id || submission?.converted_borrower_id || null;
    // The funding application the conversion created. Its page sits behind
    // "view funding application", so the button is only offered with it.
    const convertedFundingApplicationId = submission?.converted_funding_application_id || null;
    const canViewFundingApplication = hasPermission('view funding application');
    const currentStatus = STATUS_META[submission?.status?.toLowerCase()] || STATUS_META.new;
    const initials = `${submission?.first_name?.[0] || ''}${submission?.last_name?.[0] || ''}`.toUpperCase() || 'AP';

    const fullAddress = submission
        ? [
              submission.street_address || submission.home_address,
              submission.city,
              submission.state,
              submission.zip_code || submission.postal_code,
          ].filter(Boolean).join(', ')
        : '';

    const businessAddress = submission
        ? [
              submission.business_address,
              submission.business_city,
              submission.business_state,
              submission.business_postal_code,
          ].filter(Boolean).join(', ')
        : '';

    // Displayed score and its server-resolved band.
    const personalCreditScore =
        submission?.credit_score_display ?? submission?.credit_score ?? null;
    const creditBand = scoreBand(submission);

    const heroStats = submission
        ? [
              {
                  label: 'Requested Amount',
                  value:
                      formatMoney(submission.requested_amount_formatted, submission.requested_amount) ||
                      formatMoney(submission.desired_funding_amount_formatted, submission.desired_funding_amount) ||
                      '—',
                  icon: 'ri-hand-coin-line',
                  tone: 'success',
              },
              {
                  label: 'Monthly Revenue',
                  value: formatMoney(submission.monthly_revenue_formatted, submission.monthly_revenue) || '—',
                  icon: 'ri-line-chart-line',
                  tone: 'info',
              },
              {
                  // Named "Estimated" and tagged self-reported: this is the
                  // applicant's own figure, never a bureau-verified one, and the
                  // two must never be presented identically.
                  label: 'Estimated Credit Score',
                  value: personalCreditScore || '—',
                  hint: creditBand.label,
                  selfReported: true,
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
                      ? 'Converted to Free Plan Borrower'
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
                    title="Loan Application Details"
                    breadcrumbs={[
                        { label: 'Embedded Form', path: '/embed-form/settings' },
                        { label: 'Loan Applications', path: '/embed-form/loan-applications' },
                        { label: submission ? `${submission.first_name} ${submission.last_name}` : 'Details' }
                    ]}
                >
                    <Link to="/embed-form/loan-applications" className="btn btn-outline-secondary waves-effect">
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
                        <h5 className="fw-semibold">Application Not Found</h5>
                        <p className="text-muted fs-13">
                            The requested application could not be found or you do not have permission to view it.
                        </p>
                        <Link to="/embed-form/loan-applications" className="btn btn-primary mx-auto">
                            Back to Loan Applications
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
                                                        <i className="ri-vip-crown-2-fill" /> Free Plan Borrower
                                                    </span>
                                                )}
                                            </div>
                                            <div className="ef-hero__meta">
                                                {(submission.business_name || submission.occupation) && (
                                                    <span>
                                                        <i className="ri-briefcase-line" />
                                                        {submission.business_name || submission.occupation}
                                                    </span>
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
                                            <>
                                                {convertedFundingApplicationId && canViewFundingApplication && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary ef-convert-btn ef-convert-btn--lg"
                                                        onClick={() => navigate(`/intake-review/funding-application/${convertedFundingApplicationId}`)}
                                                    >
                                                        <i className="ri-file-list-3-line" />
                                                        <span>View Funding Application</span>
                                                    </button>
                                                )}
                                                {convertedBorrowerId && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary ef-convert-btn ef-convert-btn--lg"
                                                        onClick={() => navigate(`/clients/${convertedBorrowerId}`)}
                                                    >
                                                        <i className="ri-external-link-line" />
                                                        <span>View Borrower</span>
                                                    </button>
                                                )}
                                            </>
                                        ) : canConvert ? (
                                            <button
                                                type="button"
                                                className="btn btn-primary ef-convert-btn ef-convert-btn--lg"
                                                onClick={() => setShowConvertModal(true)}
                                                disabled={conversionLoading}
                                            >
                                                <i className="ri-vip-crown-2-line" />
                                                <span>Convert to Free Plan Borrower</span>
                                            </button>
                                        ) : null}
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
                                                        <span className={`badge bg-${creditBand.tone}-subtle text-${creditBand.tone} fs-11`}>
                                                            {stat.hint}
                                                        </span>
                                                    )}
                                                    {(stat as any).selfReported && (
                                                        <span className="d-block text-muted fs-11 mt-1">Self-reported</span>
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
                                <SectionCard title="Business Information" icon="ri-building-line" tone="primary">
                                    <div className="row g-3">
                                        <DetailFieldItem label="Legal Business Name" value={submission.business_name} copyValue={submission.business_name} />
                                        <DetailFieldItem label="Business Contact" value={submission.full_name} copyValue={submission.full_name} />
                                        <DetailFieldItem label="Business Email" value={submission.business_email} copyValue={submission.business_email} />
                                        <DetailFieldItem
                                            label="Business Phone"
                                            value={submission.business_phone_display || submission.business_phone_no}
                                            copyValue={submission.business_phone_no}
                                        />
                                        <DetailFieldItem label="Industry Type" value={submission.industry_type} />
                                        <DetailFieldItem label="Entity Type" value={submission.entity_type} />
                                        <DetailFieldItem
                                            label="Business EIN"
                                            value={submission.business_ein_display || submission.business_ein}
                                            copyValue={submission.business_ein_display || submission.business_ein}
                                        />
                                        {/* Worked out from the business start date; older submissions picked it. */}
                                        <DetailFieldItem label="Years in Business" value={submission.years_in_business} />
                                        <DetailFieldItem label="Number of Employees" value={submission.number_of_employees} />
                                        <DetailFieldItem
                                            label="Business Address"
                                            colSize="col-12"
                                            value={businessAddress || null}
                                            copyValue={businessAddress}
                                        />
                                    </div>
                                </SectionCard>

                                <SectionCard title="Ownership Information" icon="ri-user-3-line" tone="info">
                                    <div className="row g-3">
                                        <DetailFieldItem label="First Name" value={submission.first_name} copyValue={submission.first_name} />
                                        <DetailFieldItem label="Last Name" value={submission.last_name} copyValue={submission.last_name} />
                                        <DetailFieldItem label="Email Address" value={submission.email} copyValue={submission.email} />
                                        <DetailFieldItem
                                            label="Phone Number"
                                            value={submission.phone_display || submission.phone}
                                            copyValue={submission.phone}
                                        />
                                        <DetailFieldItem label="Date of Birth" value={formatDate(submission.date_of_birth || submission.birthday)} />
                                        <DetailFieldItem
                                            label="Social Security Number"
                                            value={
                                                submission.last_4_ssn ? (
                                                    <span className="font-monospace d-inline-flex align-items-center gap-1">
                                                        <i className="ri-lock-2-line text-muted" />
                                                        {`•••-••-${submission.last_4_ssn}`}
                                                    </span>
                                                ) : null
                                            }
                                        />
                                        <DetailFieldItem label="Citizenship Status" value={submission.citizenship_status} />
                                        <DetailFieldItem
                                            label="Ownership"
                                            value={submission.ownership !== null && submission.ownership !== undefined
                                                ? `${Number(submission.ownership)}%`
                                                : null}
                                        />
                                        <DetailFieldItem
                                            label="Home Address"
                                            colSize="col-12"
                                            value={fullAddress || null}
                                            copyValue={fullAddress}
                                        />
                                    </div>
                                </SectionCard>

                                {coBorrowers.length > 0 && (
                                    <SectionCard
                                        title={`Co-Borrowers (${coBorrowers.length})`}
                                        icon="ri-team-line"
                                        tone="info"
                                    >
                                        {coBorrowers.map((co: any, index: number) => (
                                            <div key={co.id ?? index} className={index ? 'pt-3 mt-3 border-top' : ''}>
                                                <div className="d-flex align-items-center gap-2 mb-2">
                                                    <span className="fw-semibold text-dark fs-13">
                                                        {co.full_name || `${co.first_name || ''} ${co.last_name || ''}`.trim()}
                                                    </span>
                                                    {co.title_role && (
                                                        <span className="badge bg-light text-body border fs-12">{co.title_role}</span>
                                                    )}
                                                    {co.ownership_percentage !== null && co.ownership_percentage !== undefined && (
                                                        <span className="badge bg-primary-subtle text-primary fs-12">
                                                            {Number(co.ownership_percentage)}%
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="row g-3">
                                                    <DetailFieldItem label="Email" value={co.email} copyValue={co.email} />
                                                    <DetailFieldItem label="Mobile Phone" value={co.mobile_phone} copyValue={co.mobile_phone} />
                                                    <DetailFieldItem label="Home Phone" value={co.home_phone} copyValue={co.home_phone} />
                                                    <DetailFieldItem label="Date of Birth" value={formatDate(co.date_of_birth)} />
                                                    <DetailFieldItem
                                                        label="Social Security Number"
                                                        value={co.last_4_ssn ? (
                                                            <span className="font-monospace d-inline-flex align-items-center gap-1">
                                                                <i className="ri-lock-2-line text-muted" />
                                                                {`•••-••-${co.last_4_ssn}`}
                                                            </span>
                                                        ) : null}
                                                    />
                                                    <DetailFieldItem
                                                        label="Drivers License"
                                                        value={[co.drivers_license_number, co.drivers_license_state].filter(Boolean).join(' · ') || null}
                                                    />
                                                    <DetailFieldItem
                                                        label="Address"
                                                        colSize="col-12"
                                                        value={[co.street_address, co.city, co.state, co.zip_code].filter(Boolean).join(', ') || null}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </SectionCard>
                                )}

                                <SectionCard title="Financial Information" icon="ri-line-chart-line" tone="success">
                                    <div className="row g-3">
                                        <DetailFieldItem
                                            label="Average Monthly Revenue"
                                            value={
                                                formatMoney(submission.monthly_revenue_formatted, submission.monthly_revenue)
                                                    ? <span className="fw-bold text-success">{formatMoney(submission.monthly_revenue_formatted, submission.monthly_revenue)}</span>
                                                    : null
                                            }
                                        />
                                        <DetailFieldItem
                                            label="Annual Revenue"
                                            value={formatMoney(submission.annual_revenue_formatted, submission.annual_revenue)}
                                        />
                                        <DetailFieldItem label="Business Bank" value={submission.business_bank_name} />
                                        {/* Stored as business_checking_start_date. */}
                                        <DetailFieldItem label="Business Start Date" value={formatDate(submission.business_checking_start_date)} />
                                        <DetailFieldItem
                                            label="Estimated Credit Score (self-reported)"
                                            value={personalCreditScore ? (
                                                <span className="d-inline-flex align-items-center gap-2">
                                                    <span className="fw-semibold">
                                                        <i className="ri-speed-up-line me-1" />{personalCreditScore}
                                                    </span>
                                                    {creditBand.label && (
                                                        <span className={`badge bg-${creditBand.tone}-subtle text-${creditBand.tone} fs-11`}>
                                                            {creditBand.label}
                                                        </span>
                                                    )}
                                                </span>
                                            ) : null}
                                        />
                                        <DetailFieldItem label="Business Credit Score" value={submission.self_reported_business_credit_score} />
                                        <DetailFieldItem label="Existing Business Debt" value={yesNo(submission.has_business_debt)} />
                                        {submission.has_business_debt && (
                                            <DetailFieldItem
                                                label="Outstanding Balance"
                                                value={formatMoney(submission.debt_balance_formatted, submission.debt_balance)}
                                            />
                                        )}
                                    </div>
                                </SectionCard>

                                <SectionCard title="Funding Request" icon="ri-hand-coin-line" tone="warning">
                                    <div className="row g-3">
                                        <DetailFieldItem
                                            label="Requested Amount"
                                            value={
                                                formatMoney(submission.requested_amount_formatted, submission.requested_amount)
                                                    ? (
                                                        <span className="d-inline-flex align-items-center gap-2">
                                                            <span className="fw-bold text-success fs-14">{formatMoney(submission.requested_amount_formatted, submission.requested_amount)}</span>
                                                            {submission.currency && (
                                                                <span className="badge bg-light text-body border fs-11">{submission.currency}</span>
                                                            )}
                                                        </span>
                                                    )
                                                    : null
                                            }
                                        />
                                        <DetailFieldItem label="Preferred Funding Type" value={submission.preferred_funding_type} />
                                        <DetailFieldItem
                                            label="Additional Funding Types"
                                            value={submission.additional_funding_types?.length ? submission.additional_funding_types.join(', ') : null}
                                        />
                                        <DetailFieldItem label="Purpose of Funds" value={submission.purpose_of_funds} />
                                        <DetailFieldItem label="Timeframe Needed" value={submission.timeframe_needed} />
                                        <DetailFieldItem label="Collateral Available" value={submission.collateral_available} />
                                        <DetailFieldItem label="Approved Funding" value={submission.approved_funding} />
                                        {submission.purpose_note && (
                                            <DetailFieldItem label="Purpose Note" colSize="col-12" value={submission.purpose_note} />
                                        )}
                                        <DetailFieldItem
                                            label="Referral Source"
                                            value={submission.referral_source_other
                                                ? `${submission.referral_source} — ${submission.referral_source_other}`
                                                : submission.referral_source}
                                        />
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
                                        Object.entries(groupedAttachments).map(([label, files]) => {
                                            return (
                                                <div key={label} className="ef-doc-group">
                                                    <div className="ef-doc-group__title">
                                                        <i className={docTypeIcon(label)} /> {label}
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

                                <SectionCard title="Disclosures and Consent" icon="ri-file-shield-2-line" tone="info">
                                    <div className="row g-3">
                                        <DetailFieldItem
                                            label="Credit Pull Authorization"
                                            value={consentBadge(submission.credit_pull_authorization)}
                                        />
                                        <DetailFieldItem
                                            label="Terms and Conditions"
                                            value={consentBadge(submission.terms_conditions_acceptance)}
                                        />
                                    </div>
                                </SectionCard>

                                <SectionCard title="Federal Compliance Disclosures" icon="ri-bank-line" tone="danger">
                                    <div className="row g-3">
                                        {COMPLIANCE_QUESTIONS.map(({ key, label }) => (
                                            <DetailFieldItem key={key} label={label} value={yesNo(submission[key])} />
                                        ))}
                                        {submission.federal_compliance_disclosures_explanation && (
                                            <DetailFieldItem
                                                label="Applicant Explanation"
                                                colSize="col-12"
                                                value={submission.federal_compliance_disclosures_explanation}
                                            />
                                        )}
                                    </div>
                                </SectionCard>

                                <SectionCard title="Attestation and Authorization" icon="ri-quill-pen-line" tone="success">
                                    <div className="row g-3">
                                        <DetailFieldItem
                                            label="Electronic Signature"
                                            colSize="col-12"
                                            value={submission.signature_name ? (
                                                <span className="fs-16 fst-italic fw-semibold text-dark">{submission.signature_name}</span>
                                            ) : null}
                                        />
                                        <DetailFieldItem label="E-Sign Consent" value={consentBadge(submission.esign_consent)} />
                                        <DetailFieldItem label="Accuracy Certification" value={consentBadge(submission.terms_consent)} />
                                        <DetailFieldItem label="Verification Authorization" value={consentBadge(submission.credit_consent)} />
                                        <DetailFieldItem label="Legally Binding Acknowledgement" value={consentBadge(submission.legal_binding_consent)} />
                                        <DetailFieldItem
                                            label="Signed At"
                                            value={submission.signed_at || formatDate(submission.signature_data?.signed_at, true)}
                                        />
                                        <DetailFieldItem label="Applicant Timezone" value={submission.submission_timezone} />
                                        <DetailFieldItem label="Application Version" value={submission.application_version} />
                                        <DetailFieldItem
                                            label="Signed From"
                                            colSize="col-12"
                                            value={submission.signature_data?.user_agent ? (
                                                <span className="fs-12 text-muted text-break">
                                                    {submission.signature_data.ip_address} &middot; {submission.signature_data.user_agent}
                                                </span>
                                            ) : null}
                                        />
                                    </div>
                                </SectionCard>

                                {/* Answers from before the funding application rewrite. Only these
                                    submissions carry them, so the card stays off every new one. */}
                                {submission.has_legacy_consumer_data && (
                                    <SectionCard title="Legacy Application Answers" icon="ri-archive-line" tone="secondary">
                                        <p className="text-muted fs-12 mb-3">
                                            This submission was taken with the previous consumer loan form. These answers have
                                            no equivalent on the funding application and are shown here for reference.
                                        </p>
                                        <div className="row g-3">
                                            <DetailFieldItem label="Employer / Business Name" value={submission.employer_name} />
                                            <DetailFieldItem label="Occupation / Role" value={submission.occupation} />
                                            <DetailFieldItem label="Employer Phone" value={submission.employer_phone} />
                                            <DetailFieldItem label="Employer Address" value={submission.employer_address} />
                                            <DetailFieldItem
                                                label="Annual Income"
                                                value={formatMoney(submission.annual_income_formatted, submission.annual_income)}
                                            />
                                            <DetailFieldItem label="Housing Status" value={submission.housing_status} />
                                            <DetailFieldItem
                                                label="Monthly Housing Payment"
                                                value={formatMoney(submission.monthly_housing_payment_formatted, submission.monthly_housing_payment)}
                                            />
                                            <DetailFieldItem
                                                label="Desired Funding Amount"
                                                value={formatMoney(submission.desired_funding_amount_formatted, submission.desired_funding_amount)}
                                            />
                                        </div>
                                    </SectionCard>
                                )}
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
                                                    <i className="ri-vip-crown-2-fill" /> Free Plan
                                                </span>
                                                {submission.converted_funding_application_id && (
                                                    <span className="badge bg-warning-subtle text-warning ef-status-pill mt-1 ms-1">
                                                        <i className="ri-file-list-3-line" /> Funding application created
                                                    </span>
                                                )}
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
                            onHide={() => { setShowConvertModal(false); setExistingBorrower(null); }}
                            onConfirm={handleConvertConfirm}
                            submission={submission}
                            loading={conversionLoading}
                            existingBorrower={existingBorrower}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
