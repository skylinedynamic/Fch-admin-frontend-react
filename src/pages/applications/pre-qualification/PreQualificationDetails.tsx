import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageHeader from '../../common/PageHeader';
import { PreQualificationApplicationDetails as PreQualificationApplicationDetailsType, GPT_STATUS, ISSUE_SEVERITY, isIncorrectUnderwriting, ClientAueResult } from '../../../modules/application/types';
import { APPLICATION_STATUS_OPTIONS, APPLICATION_STATUS_CLASS_MAP } from '../../../config/borrower';
import { ENTITY_TYPE_PARTNER } from '../../../config/appConfig';
import { PARTNER_TYPES } from '../../../config/partnerTypeOptions';
import { Dropdown } from 'primereact/dropdown';
import { toast } from 'react-toastify';
import { usePreQualificationApplicationDetails, useUpdateApplicationStatus, useRunAiPreQualification } from '../../../modules/application/queries';
// @ts-ignore
import ConfirmationModal from '../../../components/Common/Modals/ConfirmationModal';
// @ts-ignore
import ApplicationDetailsLoader from '../../../components/Loader/ApplicationDetailsLoader';
import { AiUnderwritingResultSkeleton } from '../../../components/Loader/SpecificSkeletons';
import { useAuthStore } from '../../../store/auth';
import { usePermissions } from '../../../lib/auth/usePermissions';

type StepType = 1 | 2 | 3 | 4;

// Mirrors PreQualificationRequest::STATUS_NOTE_MAX_LENGTH on the server, which
// the update endpoint validates against. Kept in step with it so the field can
// say what the limit is before the request is sent, rather than after.
const STATUS_NOTE_MAX_LENGTH = 200;

const STEPS = [
    { id: 1, title: 'Personal Info', icon: 'ri-user-line' },
    { id: 2, title: 'Business Details', icon: 'ri-briefcase-line' },
    { id: 3, title: 'Funding Needs', icon: 'ri-money-dollar-circle-line' },
    // Available ONLY to FCH Admin and White-Label Partners (WLP). Certified Partners cannot see this.
    { id: 4, title: 'AI Underwriting Result', icon: 'ri-sparkling-2-line' }
];

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="row mb-3">
        <label className="col-sm-4 form-label fs-14">{label}</label>
        <div className="col-sm-8">
            <div className="text-muted fs-14">{value || '-'}</div>
        </div>
    </div>
);

const formatRange = (min?: number | null, max?: number | null): string => {
    const money = (val: number) => val.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    if (typeof min === 'number' && typeof max === 'number') return `${money(min)} – ${money(max)}`;
    if (typeof min === 'number') return `From ${money(min)}`;
    if (typeof max === 'number') return `Up to ${money(max)}`;
    return 'Not determined';
};

function renderSourceBadge(status?: string) {
    const val = (status || 'Reported').toLowerCase();
    if (val.includes('conflict')) {
        return <span className="badge rounded-pill px-2 py-1 text-uppercase fw-semibold" style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', fontSize: '11px' }}>Conflicting</span>;
    }
    if (val.includes('verified')) {
        return <span className="badge rounded-pill px-2 py-1 text-uppercase fw-semibold" style={{ backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontSize: '11px' }}>Verified</span>;
    }
    if (val.includes('derived')) {
        return <span className="badge rounded-pill px-2 py-1 text-uppercase fw-semibold" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '11px' }}>Derived Data</span>;
    }
    return <span className="badge rounded-pill px-2 py-1 text-uppercase fw-semibold" style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontSize: '11px' }}>Borrower Reported</span>;
}

export default function PreQualificationDetails() {
    const { id } = useParams();
    const { data: details, isLoading, error } = usePreQualificationApplicationDetails(id || '');
    const [currentStep, setCurrentStep] = useState<StepType>(1);

    const { user } = useAuthStore();
    const isHost = Boolean(user?.is_host == 1 || user?.is_host === true);
    const isHostPartner = Boolean(isHost && user?.entity_type === ENTITY_TYPE_PARTNER);
    const isWhiteLabelPartner = Boolean(
        user?.entity_type === ENTITY_TYPE_PARTNER &&
        (user?.partner_type === PARTNER_TYPES.WHITE_LABEL || (user as any)?.partner?.partner_type === PARTNER_TYPES.WHITE_LABEL)
    );
    // AI Underwriting Result tab (Step 4) is strictly available ONLY to Host and White-Label Partners (WLP).
    // Certified Partners (and any non-WLP partners) must NEVER see or access the AI underwriting result.
    const canViewUnderwritingResult = Boolean(isHost || isWhiteLabelPartner);
    const visibleSteps = STEPS.filter((step) => step.id !== 4 || canViewUnderwritingResult);
    const { hasPermission } = usePermissions();
    const [aueViewMode, setAueViewMode] = useState<'internal' | 'client'>('internal');

    // Status update state
    const app = (details?.data || details || {}) as PreQualificationApplicationDetailsType;
    const [status, setStatus] = useState<string>('');
    const [status_note, setStatusNote] = useState<string>('');
    const [notesError, setNotesError] = useState<string>('');
    const [statusError, setStatusError] = useState<string>('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const updateMutation = useUpdateApplicationStatus();
    const runAiMutation = useRunAiPreQualification();

    // Sync state with fetched data
    useEffect(() => {
        if (app?.status) setStatus(app.status);

        if (app?.status_note) {
            setStatusNote(app.status_note);

            // Notes written before the length limit can still be longer than it.
            // Flagging that on load tells the reviewer to trim before they try to
            // save, instead of letting them write a status update and only then
            // find out the field will not go through.
            if (app.status_note.trim().length > STATUS_NOTE_MAX_LENGTH) {
                setNotesError(
                    `This note is ${app.status_note.trim().length} characters and exceeds the ${STATUS_NOTE_MAX_LENGTH}-character limit. Shorten it before updating the status.`,
                );
            }
        }
    }, [app]);

    // Safety fallback: if user cannot view AI underwriting (e.g. Certified Partner), fallback to Step 1
    useEffect(() => {
        if (!canViewUnderwritingResult && currentStep === 4) {
            setCurrentStep(1);
        }
    }, [canViewUnderwritingResult, currentStep]);

    // run-ai only starts the evaluation; the details query polls while the
    // server reports PENDING, so "running" covers both the request and the wait.
    const isAiRunning = runAiMutation.isPending || app.gpt_status === GPT_STATUS.PENDING;

    // Tracks a run this page started, so the outcome toast fires for that run
    // only — not when a reviewer merely opens a file that is already evaluating.
    // The result is only reported after PENDING has been seen, so a response that
    // still carries the previous run's status cannot be announced as this one's.
    const aiRunTracking = useRef<'idle' | 'started' | 'pending-seen'>('idle');

    useEffect(() => {
        if (aiRunTracking.current === 'idle' || !app.gpt_status) return;
        if (app.gpt_status === GPT_STATUS.PENDING) {
            aiRunTracking.current = 'pending-seen';
            return;
        }
        if (aiRunTracking.current !== 'pending-seen') return;
        aiRunTracking.current = 'idle';

        const aiResult = app.ai_result;
        if (isIncorrectUnderwriting(app, aiResult)) {
            toast.warning(aiResult?.borrower_message || 'Data integrity check found corrections needed before AI underwriting can run.');
            return;
        }
        // The short note, not the memo: Status Notes is length-capped
        // and is visible to partners.
        if (aiResult?.admin_status_note) {
            setStatusNote(aiResult.admin_status_note);
        }
        if (app.gpt_status === GPT_STATUS.FAILED || aiResult?.failed) {
            toast.error(aiResult?.failure_reason || 'Automated underwriting did not complete. This file needs manual review.');
        } else {
            toast.success('AI Pre-Qualification analysis completed!');
        }
    }, [app]);

    const handleRunPrequal = () => {
        if (!isHostPartner || !app.id || isAiRunning) return;
        aiRunTracking.current = 'started';
        runAiMutation.mutate(app.id, {
            onSuccess: () => {
                toast.info('AI Pre-Qualification started. This can take a few minutes.');
                setCurrentStep(4);
            },
            onError: (err: any) => {
                aiRunTracking.current = 'idle';
                // No response at all is already reported by the API client.
                if (err?.response) {
                    toast.error(err.response.data?.message || 'Failed to run AI pre-qualification.');
                }
            }
        });
    };

    // The note that will be sent has to clear the same rules whichever control
    // starts the update, so the quick-action buttons validate it too rather than
    // opening the confirm modal on a note the server will reject.
    const statusNoteError = (note: string) => {
        const trimmed = note.trim();

        if (!trimmed) {
            return 'Status notes are required.';
        }

        if (trimmed.length > STATUS_NOTE_MAX_LENGTH) {
            return `Status notes may not be longer than ${STATUS_NOTE_MAX_LENGTH} characters. Currently ${trimmed.length}.`;
        }

        return '';
    };

    const handleQuickStatusChange = (newStatus: string) => {
        const noteError = statusNoteError(status_note);

        if (noteError) {
            setNotesError(noteError);
            toast.error(noteError);

            return;
        }

        setStatus(newStatus);
        setNotesError('');
        setStatusError('');
        setShowConfirmModal(true);
    };

    // Inserts the short, lender-free note — never the full memo, which exceeds the
    // length limit on Status Notes and is visible to partners.
    const handleApplyMemoToNotes = () => {
        if (!isHost) return;
        const note = app.ai_result?.admin_status_note;
        if (note) {
            setStatusNote(note);
            toast.success('AI note inserted into Status Notes.');
        } else {
            toast.info('No AI note available yet. Run the pre-qualification first.');
        }
    };

    const handleCopyText = (text: string, label: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard!`);
    };

    // Checked here rather than only on the server, so a note that is too long is
    // caught against the field the moment Update is pressed instead of after a
    // round trip that could only report itself as a toast.
    const validateStatusForm = () => {
        let valid = true;

        if (!status) {
            setStatusError('Select a status before updating.');
            valid = false;
        } else {
            setStatusError('');
        }

        const noteError = statusNoteError(status_note);
        setNotesError(noteError);

        if (noteError) {
            valid = false;
        }

        return valid;
    };

    const handleUpdateClick = () => {
        if (!validateStatusForm()) return;

        setShowConfirmModal(true);
    };

    const handleConfirmUpdate = () => {
        if (!app.id) return;
        updateMutation.mutate({
            id: app.id,
            status: status,
            status_note: status_note
        }, {
            onSuccess: () => {
                toast.success('Status updated successfully');
                setShowConfirmModal(false);
                setNotesError('');
                setStatusError('');
            },
            onError: (error: any) => {
                setShowConfirmModal(false);

                const backendErrors = error?.response?.data?.errors;
                const firstMessage = (value: unknown) =>
                    Array.isArray(value) ? String(value[0]) : String(value);

                // Every field error is put against its own field. Previously only
                // status_note was read, so an error on any other field closed the
                // modal and showed nothing at all.
                let shown = false;

                if (backendErrors?.status_note) {
                    setNotesError(firstMessage(backendErrors.status_note));
                    shown = true;
                }

                if (backendErrors?.status) {
                    setStatusError(firstMessage(backendErrors.status));
                    shown = true;
                }

                if (shown) return;

                // Anything with no field to attach to — a rejected id, a server
                // fault — falls back to a toast, but carries the server's own
                // message instead of a fixed string that says nothing.
                const message = backendErrors
                    ? Object.values(backendErrors).map(firstMessage).join(' ')
                    : error?.response?.data?.message;

                toast.error(message || 'Failed to update status. Please try again.');
            }
        });
    };

    // Show error toast and redirect if error
    useEffect(() => {
        if (error || (!isLoading && !details)) {
            toast.error('Failed to load application details');
        }
    }, [error, details, isLoading]);

    if (isLoading) {
        return (
            <ApplicationDetailsLoader
                title="Application Details"
                breadcrumbs={[
                    { label: 'Pre-Qualification Applications', path: '/intake-review/pre-qualification' },
                    { label: 'Details' }
                ]}
            >
                <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
                    <Link to="/intake-review/pre-qualification" className="btn btn-outline-secondary w-lg waves-effect">
                        <i className="ri-arrow-left-line align-middle me-1"></i> Back
                    </Link>
                </div>
            </ApplicationDetailsLoader>
        );
    }

    if (error || !details) {
        return null;
    }

    const renderPersonalInfo = () => (
        <>
            <DetailRow label="First Name" value={app.first_name} />
            <DetailRow label="Last Name" value={app.last_name} />
            <DetailRow label="Email" value={app.email} />
            <DetailRow label="Phone Number" value={app.phone_number} />
            <DetailRow label="Business Website" value={<a href={app.business_website} target="_blank" rel="noopener noreferrer">{app.business_website}</a>} />
            <DetailRow label="State of Incorporation" value={app.state_of_incorporation} />
        </>
    );

    const renderBusinessDetails = () => (
        <>
            <DetailRow label="Business Name" value={app.business_name} />
            <DetailRow label="Industry Type" value={app.industry_type} />
            <DetailRow label="Business Structure" value={app.business_structure} />
            <DetailRow label="Monthly Revenue" value={app.monthly_revenue} />
            <DetailRow label="Annual Revenue" value={app.annual_revenue} />
            <DetailRow label="Years in Business" value={app.years_in_business} />
        </>
    );

    const renderFundingNeeds = () => (
        <>
            <DetailRow label="Funding Requested Amount" value={app.funding_requested_amount} />
            <DetailRow label="Funding Urgency" value={app.funding_urgency} />
            <DetailRow label="Purpose of Funding" value={app.purpose_of_funding} />
            {app.purpose_note && <DetailRow label="Purpose of Funding Note" value={app.purpose_note} />}
            <DetailRow label="Personal Credit Score" value={app.personal_credit_score} />
            <DetailRow label="Estimated Business Credit Score" value={app.estimated_business_credit_score} />
            <DetailRow label="Existing Business Debt" value={app.existing_business_debt ? 'Yes' : 'No'} />
            <DetailRow label="Debt Balance" value={app.debt_balance} />
            <DetailRow label="Notes" value={app.notes} />
        </>
    );


    const renderClientAue = (client?: ClientAueResult | null) => {
        if (!client) {
            return (
                <div className="card shadow-sm border rounded-3 p-4 text-center my-3 bg-white">
                    <div className="avatar-md mx-auto mb-3">
                        <div className="avatar-title bg-info-subtle text-info rounded-circle fs-24">
                            <i className="ri-information-line"></i>
                        </div>
                    </div>
                    <h6 className="fs-15 fw-semibold text-dark mb-1">Client Evaluation Not Available</h6>
                    <p className="text-muted fs-13 mb-0 mx-auto" style={{ maxWidth: '480px' }}>
                        The borrower-facing readiness assessment has not been generated for this application yet.
                    </p>
                </div>
            );
        }

        return (
            <div className="client-aue-content">
                {/* 1. Assessment Header / Status Bar */}
                <div className="card shadow-sm border mb-4 rounded-3 overflow-hidden bg-white">
                    <div className="card-body p-3 p-md-4">
                        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                            <div className="d-flex align-items-center gap-3">
                                <div
                                    className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                    style={{
                                        width: '46px',
                                        height: '46px',
                                        backgroundColor: '#ecfdf5',
                                        color: '#10b981',
                                    }}
                                >
                                    <i className="ri-shield-check-fill fs-24"></i>
                                </div>
                                <div>
                                    <h5 className="fw-bold mb-1 fs-18 text-dark">
                                        {client.assessment_title || 'Funding Readiness Assessment'}
                                    </h5>
                                    <p className="text-muted fs-13 mb-0">
                                        Client-facing underwriting readiness &amp; profile assessment
                                    </p>
                                </div>
                            </div>

                            <div className="d-flex flex-wrap align-items-center gap-2">
                                <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-light border">
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Review Status:</span>
                                    <span className="badge rounded-pill px-2.5 py-1 d-inline-flex align-items-center gap-1" style={{ backgroundColor: '#059669', color: '#ffffff', fontSize: '11px', fontWeight: 600 }}>
                                        <i className="ri-check-line"></i> Completed
                                    </span>
                                </div>
                                <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-light border">
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Application:</span>
                                    <span className="badge rounded-pill px-2.5 py-1 d-inline-flex align-items-center gap-1" style={{ backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontSize: '11px', fontWeight: 700 }}>
                                        <i className="ri-time-fill"></i> {app.status || 'Pending'}
                                    </span>
                                </div>
                                {app.gpt_generated_at && (
                                    <div className="d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-light border">
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Evaluated:</span>
                                        <span className="d-inline-flex align-items-center text-muted" style={{ fontSize: '12px', fontWeight: 500, gap: '6px' }}>
                                            <i className="ri-calendar-line"></i>
                                            <span>{app.gpt_generated_at}</span>
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Estimated Funding Range Hero */}
                {client.estimated_funding_range?.available && (
                    <div
                        className="card shadow-sm mb-4 rounded-3 border-0"
                        style={{
                            background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
                            border: '1px solid #bbf7d0',
                            borderLeft: '5px solid #16a34a',
                        }}
                    >
                        <div className="card-body p-3 p-md-4">
                            <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
                                <div>
                                    <div className="d-flex align-items-center gap-2 mb-1">
                                        <span className="badge bg-success-subtle text-success fs-11 fw-semibold text-uppercase px-2 py-1 rounded">
                                            Indicative Capacity
                                        </span>
                                        <span className="text-muted fs-12">Preliminary Assessment</span>
                                    </div>
                                    <h6 className="text-muted fs-13 fw-semibold text-uppercase mb-2" style={{ letterSpacing: '0.05em' }}>
                                        Estimated Funding Range
                                    </h6>
                                    <div className="fs-2 fw-bold text-success mb-1">
                                        {formatRange(client.estimated_funding_range.minimum, client.estimated_funding_range.maximum)}
                                    </div>
                                    {client.estimated_funding_range.basis && (
                                        <p className="text-muted fs-13 mb-0">
                                            <i className="ri-information-line me-1"></i>
                                            {client.estimated_funding_range.basis}
                                        </p>
                                    )}
                                </div>
                                <div
                                    className="d-none d-md-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                                    style={{ width: '64px', height: '64px', backgroundColor: '#dcfce7', color: '#16a34a' }}
                                >
                                    <i className="ri-money-dollar-circle-fill" style={{ fontSize: '36px' }}></i>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Executive Readiness Summary */}
                {client.funding_readiness_summary && (
                    <div
                        className="card shadow-sm mb-4 rounded-3"
                        style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderLeft: '4px solid #3b82f6',
                        }}
                    >
                        <div className="card-body p-3 p-md-4">
                            <div className="d-flex align-items-center gap-2 mb-2">
                                <i className="ri-file-text-line text-primary fs-18"></i>
                                <h6 className="fw-bold mb-0 text-dark fs-15">Executive Readiness Summary</h6>
                            </div>
                            <p className="mb-0 fs-14" style={{ lineHeight: '1.7', color: '#334155' }}>
                                {client.funding_readiness_summary}
                            </p>
                        </div>
                    </div>
                )}

                {/* 4. Readiness Snapshot */}
                {!!client.readiness_snapshot?.length && (
                    <div className="card shadow-sm mb-4 rounded-3 border">
                        <div className="card-header bg-light py-3 px-3 px-md-4 border-bottom d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-2">
                                <i className="ri-dashboard-3-line text-primary fs-18"></i>
                                <h6 className="fw-bold mb-0 text-dark fs-15">Readiness Snapshot</h6>
                            </div>
                            <span className="badge bg-white text-muted border fs-12 fw-medium">
                                {client.readiness_snapshot.length} Areas Evaluated
                            </span>
                        </div>
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th scope="col" className="ps-4 py-3 text-muted text-uppercase fs-11 fw-bold" style={{ width: '28%', minWidth: '180px' }}>
                                                Evaluation Area
                                            </th>
                                            <th scope="col" className="py-3 text-muted text-uppercase fs-11 fw-bold">
                                                Assessment
                                            </th>
                                            <th scope="col" className="pe-4 py-3 text-muted text-uppercase fs-11 fw-bold text-end" style={{ width: '22%', minWidth: '160px' }}>
                                                Source Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {client.readiness_snapshot.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="ps-4 py-3 fw-semibold text-dark fs-13">
                                                    {item.area}
                                                </td>
                                                <td className="py-3 fs-13" style={{ lineHeight: '1.5', color: '#334155' }}>
                                                    {item.assessment}
                                                </td>
                                                <td className="pe-4 py-3 text-end">
                                                    {renderSourceBadge(item.source_status)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* 5. Strengths & Areas Requiring Attention (2-Column Grid) */}
                <div className="row g-3 g-md-4 mb-4">
                    {/* Strengths Card */}
                    {!!client.strengths?.length && (
                        <div className={client.areas_requiring_attention?.length ? 'col-lg-6' : 'col-12'}>
                            <div
                                className="card h-100 shadow-sm rounded-3 border"
                                style={{ backgroundColor: '#ffffff', borderColor: '#bbf7d0' }}
                            >
                                <div
                                    className="card-header py-3 px-3 px-md-4 border-bottom d-flex align-items-center justify-content-between"
                                    style={{ backgroundColor: '#f0fdf4', borderColor: '#dcfce7' }}
                                >
                                    <div className="d-flex align-items-center gap-2">
                                        <i className="ri-shield-check-fill text-success fs-18"></i>
                                        <h6 className="fw-bold mb-0 text-success fs-15">Profile Strengths</h6>
                                    </div>
                                    <span className="badge bg-white text-success border border-success-subtle fs-12 fw-semibold px-2 py-1 rounded-pill">
                                        {client.strengths.length} {client.strengths.length === 1 ? 'Strength' : 'Strengths'}
                                    </span>
                                </div>
                                <div className="card-body p-3 p-md-4">
                                    <div className="d-flex flex-column" style={{ gap: '12px' }}>
                                        {client.strengths.map((item, idx) => (
                                            <div
                                                className="d-flex align-items-start rounded-3"
                                                style={{
                                                    backgroundColor: '#f0fdf4',
                                                    border: '1px solid #bbf7d0',
                                                    padding: '12px 14px',
                                                    gap: '12px',
                                                }}
                                                key={idx}
                                            >
                                                <i
                                                    className="ri-checkbox-circle-fill text-success fs-17 flex-shrink-0"
                                                    style={{ marginTop: '2px', lineHeight: 1 }}
                                                ></i>
                                                <span
                                                    style={{
                                                        fontSize: '13px',
                                                        lineHeight: '1.55',
                                                        color: '#166534',
                                                        fontWeight: 500,
                                                        flex: 1,
                                                        minWidth: 0,
                                                    }}
                                                >
                                                    {item}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Areas Requiring Attention Card */}
                    {!!client.areas_requiring_attention?.length && (
                        <div className={client.strengths?.length ? 'col-lg-6' : 'col-12'}>
                            <div
                                className="card h-100 shadow-sm rounded-3 border"
                                style={{ backgroundColor: '#ffffff', borderColor: '#fde68a' }}
                            >
                                <div
                                    className="card-header py-3 px-3 px-md-4 border-bottom d-flex align-items-center justify-content-between"
                                    style={{ backgroundColor: '#fffbeb', borderColor: '#fef3c7' }}
                                >
                                    <div className="d-flex align-items-center gap-2">
                                        <i className="ri-alert-fill text-warning fs-18"></i>
                                        <h6 className="fw-bold mb-0 text-warning fs-15">Areas Requiring Attention</h6>
                                    </div>
                                    <span className="badge bg-white text-warning border border-warning-subtle fs-12 fw-semibold px-2 py-1 rounded-pill">
                                        {client.areas_requiring_attention.length} {client.areas_requiring_attention.length === 1 ? 'Item' : 'Items'}
                                    </span>
                                </div>
                                <div className="card-body p-3 p-md-4">
                                    <div className="d-flex flex-column" style={{ gap: '12px' }}>
                                        {client.areas_requiring_attention.map((item, idx) => (
                                            <div
                                                className="d-flex align-items-start rounded-3"
                                                style={{
                                                    backgroundColor: '#fffbeb',
                                                    border: '1px solid #fde68a',
                                                    padding: '12px 14px',
                                                    gap: '12px',
                                                }}
                                                key={idx}
                                            >
                                                <i
                                                    className="ri-error-warning-fill text-warning fs-17 flex-shrink-0"
                                                    style={{ marginTop: '2px', lineHeight: 1 }}
                                                ></i>
                                                <span
                                                    style={{
                                                        fontSize: '13px',
                                                        lineHeight: '1.55',
                                                        color: '#92400e',
                                                        fontWeight: 500,
                                                        flex: 1,
                                                        minWidth: 0,
                                                    }}
                                                >
                                                    {item}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 6. Structuring Considerations & Submission Positioning Overview */}
                {(client.submission_positioning_overview || !!client.structuring_considerations?.length) && (
                    <div className="row g-3 g-md-4 mb-4">
                        {client.submission_positioning_overview && (
                            <div className={client.structuring_considerations?.length ? 'col-lg-6' : 'col-12'}>
                                <div className="card h-100 shadow-sm rounded-3 border">
                                    <div className="card-header bg-light py-3 px-3 px-md-4 border-bottom d-flex align-items-center gap-2">
                                        <i className="ri-compass-3-line text-primary fs-18"></i>
                                        <h6 className="fw-bold mb-0 text-dark fs-15">Submission Positioning Overview</h6>
                                    </div>
                                    <div className="card-body p-3 p-md-4">
                                        <p className="mb-0 fs-14" style={{ lineHeight: '1.7', color: '#334155' }}>
                                            {client.submission_positioning_overview}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!!client.structuring_considerations?.length && (
                            <div className={client.submission_positioning_overview ? 'col-lg-6' : 'col-12'}>
                                <div className="card h-100 shadow-sm rounded-3 border">
                                    <div className="card-header bg-light py-3 px-3 px-md-4 border-bottom d-flex align-items-center justify-content-between">
                                        <div className="d-flex align-items-center gap-2">
                                            <i className="ri-stack-line text-primary fs-18"></i>
                                            <h6 className="fw-bold mb-0 text-dark fs-15">Structuring Considerations</h6>
                                        </div>
                                        <span className="badge bg-white text-primary border fs-12 fw-semibold px-2 py-1 rounded-pill">
                                            {client.structuring_considerations.length} {client.structuring_considerations.length === 1 ? 'Point' : 'Points'}
                                        </span>
                                    </div>
                                    <div className="card-body p-3 p-md-4">
                                        <div className="d-flex flex-column" style={{ gap: '12px' }}>
                                            {client.structuring_considerations.map((item, idx) => (
                                                <div
                                                    className="d-flex align-items-start rounded-3"
                                                    style={{
                                                        backgroundColor: '#f8fafc',
                                                        border: '1px solid #e2e8f0',
                                                        padding: '12px 14px',
                                                        gap: '12px',
                                                    }}
                                                    key={idx}
                                                >
                                                    <i
                                                        className="ri-arrow-right-circle-fill text-primary fs-17 flex-shrink-0"
                                                        style={{ marginTop: '2px', lineHeight: 1 }}
                                                    ></i>
                                                    <span
                                                        style={{
                                                            fontSize: '13px',
                                                            lineHeight: '1.55',
                                                            color: '#334155',
                                                            fontWeight: 500,
                                                            flex: 1,
                                                            minWidth: 0,
                                                        }}
                                                    >
                                                        {item}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 7. Required Next Steps */}
                {!!client.required_next_steps && (
                    <div className="card shadow-sm mb-4 rounded-3 border">
                        <div className="card-header bg-light py-3 px-3 px-md-4 border-bottom d-flex align-items-center gap-2">
                            <i className="ri-guide-line text-info fs-18"></i>
                            <h6 className="fw-bold mb-0 text-dark fs-15">Required Next Steps</h6>
                        </div>
                        <div className="card-body p-3 p-md-4">
                            <div className="d-flex flex-column gap-4">
                                {([
                                    {
                                        label: 'Complete Assessment',
                                        icon: 'ri-file-list-3-line',
                                        color: '#3b82f6',
                                        bg: '#eff6ff',
                                        items: client.required_next_steps.complete_assessment,
                                    },
                                    {
                                        label: 'Underwriting Review',
                                        icon: 'ri-search-eye-line',
                                        color: '#8b5cf6',
                                        bg: '#f5f3ff',
                                        items: client.required_next_steps.underwriting_review,
                                    },
                                    {
                                        label: 'Submission Readiness',
                                        icon: 'ri-rocket-line',
                                        color: '#10b981',
                                        bg: '#ecfdf5',
                                        items: client.required_next_steps.submission_readiness,
                                    },
                                ] as const)
                                    .filter((group) => !!group.items?.length)
                                    .map((group) => (
                                        <div key={group.label} className="p-3 rounded-3 border bg-white">
                                            <div className="d-flex align-items-center gap-2 mb-3">
                                                <span
                                                    className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                                    style={{ width: '28px', height: '28px', backgroundColor: group.bg, color: group.color }}
                                                >
                                                    <i className={`${group.icon} fs-14`}></i>
                                                </span>
                                                <span className="fw-bold text-dark fs-14">{group.label}</span>
                                            </div>

                                            <div className="d-flex flex-column gap-2 ms-1">
                                                {group.items!.map((step, idx) => (
                                                    <div className="d-flex align-items-start gap-3 fs-13" style={{ color: '#334155' }} key={idx}>
                                                        <span
                                                            className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 fw-bold fs-11"
                                                            style={{
                                                                width: '20px',
                                                                height: '20px',
                                                                marginTop: '2px',
                                                                backgroundColor: group.bg,
                                                                color: group.color,
                                                                border: `1px solid ${group.color}40`,
                                                            }}
                                                        >
                                                            {idx + 1}
                                                        </span>
                                                        <span style={{ lineHeight: '1.6' }}>{step}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* 8. Important Notice */}
                {client.important_notice && (
                    <div
                        className="card shadow-none mb-4 rounded-3"
                        style={{
                            backgroundColor: '#fffbeb',
                            border: '1px solid #fde68a',
                            borderLeft: '5px solid #f59e0b',
                        }}
                    >
                        <div className="card-body p-3 p-md-4">
                            <div className="d-flex align-items-start gap-3">
                                <div
                                    className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                    style={{ width: '42px', height: '42px', backgroundColor: '#fef3c7', color: '#d97706' }}
                                >
                                    <i className="ri-alert-fill fs-22"></i>
                                </div>
                                <div className="flex-grow-1">
                                    <h6 className="fw-bold mb-1 fs-15" style={{ color: '#92400e' }}>Important Notice</h6>
                                    <p className="mb-0 fs-13" style={{ lineHeight: '1.65', color: '#451a03' }}>
                                        {client.important_notice}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 9. Disclosures & Disclaimers */}
                {(client.final_disclosure || client.disclaimer) && (
                    <div className="pt-3 border-top fs-12 text-muted" style={{ lineHeight: '1.65' }}>
                        {client.final_disclosure && (
                            <p className="mb-2">{client.final_disclosure}</p>
                        )}
                        {client.disclaimer && (
                            <p className="mb-0">{client.disclaimer}</p>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderAiEvaluation = () => {
        const ai = app.ai_result;

        if (isAiRunning) {
            return (
                <>
                    <div className="text-center mb-4">
                        <h5 className="fs-16 fw-semibold text-dark mb-1">Running AI Underwriting Evaluation...</h5>
                        <p className="text-muted fs-14 mb-0">
                            Analyzing borrower snapshot, revenue rhythm, and credit profile with OpenAI...
                        </p>
                    </div>
                    <AiUnderwritingResultSkeleton />
                </>
            );
        }

        if (isIncorrectUnderwriting(app, ai)) {
            const issues = app.validation_issues || [];
            const severityClass = (s: string) =>
                (s === ISSUE_SEVERITY.BLOCKING || s === ISSUE_SEVERITY.INCORRECT) ? 'bg-danger-subtle text-danger'
                    : s === ISSUE_SEVERITY.WARNING ? 'bg-warning-subtle text-warning'
                        : 'bg-secondary-subtle text-secondary';

            return (
                <div>
                    <div className="alert alert-warning d-flex align-items-start gap-2" role="alert">
                        <i className="ri-alert-line fs-18 text-warning mt-1"></i>
                        <div>
                            <div className="fw-semibold fs-14">Corrections Needed Before AI Underwriting Can Run</div>
                            <div className="fs-13 text-muted">
                                {app.validation_summary || ai?.borrower_message || 'The automated data integrity check found issues with this submission that need to be resolved first.'}
                            </div>
                        </div>
                    </div>

                    {isHostPartner && issues.length > 0 && (
                        <div className="mb-2">
                            <h6 className="fs-15 fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                                <i className="ri-list-check-2 text-primary"></i>
                                Why It Is Incorrect
                                {app.validated_at && (
                                    <span className="text-muted fw-normal fs-12 ms-auto">
                                        <i className="ri-calendar-check-line me-1"></i>Checked: {app.validated_at}
                                    </span>
                                )}
                            </h6>
                            <div className="d-flex flex-column gap-2">
                                {issues.map((issue, idx) => (
                                    <div key={idx} className="p-3 bg-light rounded border">
                                        <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                                            <span className={`badge ${severityClass(issue.severity)} fs-11`}>
                                                {issue.severity === ISSUE_SEVERITY.BLOCKING ? 'INCORRECT' : issue.severity}
                                            </span>
                                            <span className="fw-semibold fs-13 text-dark">{issue.field}</span>
                                            <code className="fs-11 text-muted">{issue.code}</code>
                                        </div>
                                        <div className="fs-13 text-dark mb-1">{issue.internal_message}</div>
                                        {issue.suggested_action && (
                                            <div className="fs-12 text-muted">
                                                <i className="ri-arrow-right-line me-1"></i>{issue.suggested_action}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <p className="text-muted fs-12 mt-3 mb-0">
                                Only <span className="badge bg-danger-subtle text-danger fs-11">INCORRECT</span> issues prevent underwriting from running. Fix them, then use Re-run Pre-Qualification.
                            </p>
                        </div>
                    )}
                </div>
            );
        }

        if (!ai) {
            if (!isHostPartner) {
                return (
                    <div className="text-center py-5 px-4">
                        <div className="avatar-lg mx-auto mb-3">
                            <div className="avatar-title bg-primary-subtle text-primary rounded-circle fs-36">
                                <i className="ri-sparkling-2-line"></i>
                            </div>
                        </div>
                        <h5 className="fs-16 fw-semibold text-dark mb-2">Evaluation In Progress</h5>
                        <p className="text-muted fs-14 mb-0 mx-auto" style={{ maxWidth: '520px' }}>
                            The pre-qualification underwriting review is currently in progress or awaiting evaluation by the underwriting team. Once completed, the full Client Underwriting Evaluation will appear here.
                        </p>
                    </div>
                );
            }
            return (
                <div className="text-center py-5 px-4">
                    <div className="avatar-lg mx-auto mb-3">
                        <div className="avatar-title bg-primary-subtle text-primary rounded-circle fs-36">
                            <i className="ri-sparkling-2-line"></i>
                        </div>
                    </div>
                    <h5 className="fs-16 fw-semibold text-dark mb-2">No AI Evaluation Run Yet</h5>
                    <p className="text-muted fs-14 mb-0 mx-auto" style={{ maxWidth: '520px' }}>
                        Use <strong>Run Pre-Qualification</strong> at the top of the page to trigger automated OpenAI underwriting. The engine will evaluate the borrower's submitted data, recommend funding programs, produce a required document checklist, and generate an internal underwriting memo.
                    </p>
                </div>
            );
        }

        const activeMode = isHostPartner ? aueViewMode : 'client';

        return (
            <div className="ai-evaluation-container">
                {/* Host Admin View Mode Switcher */}
                {isHostPartner && (
                    <div className="d-flex align-items-center justify-content-between p-2 mb-4 rounded-3 border bg-white shadow-sm flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-2">
                            <button
                                type="button"
                                className={`btn btn-sm ${aueViewMode === 'internal' ? 'btn-primary' : 'btn-light border'} d-flex align-items-center fw-medium px-3 py-2`}
                                style={{ gap: '8px' }}
                                onClick={() => setAueViewMode('internal')}
                            >
                                <i className="ri-shield-keyhole-line fs-14"></i>
                                <span>Internal Underwriting (Confidential - FCH Only)</span>
                            </button>
                            <button
                                type="button"
                                className={`btn btn-sm ${aueViewMode === 'client' ? 'btn-primary' : 'btn-light border'} d-flex align-items-center fw-medium px-3 py-2`}
                                style={{ gap: '8px' }}
                                onClick={() => setAueViewMode('client')}
                            >
                                <i className="ri-eye-line fs-14"></i>
                                <span>Client Readiness View (Borrower &amp; WLP View)</span>
                            </button>
                        </div>
                        <span className="badge bg-light text-muted border px-2 py-1 fs-11">
                            {aueViewMode === 'internal' ? 'Restricted Staff View' : 'Customer & Partner View'}
                        </span>
                    </div>
                )}

                {activeMode === 'client' ? (
                    renderClientAue(ai?.client)
                ) : (
                    <>
                        {/* Meta Header */}
                        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 p-3 mb-4 rounded-3 border bg-light">
                            <div className="d-flex align-items-center gap-2">
                                <div className="badge bg-primary-subtle text-primary fs-12 px-3 py-2 rounded-pill d-flex align-items-center gap-1">
                                    <i className="ri-cpu-line"></i>
                                    <span>Model: {ai.model || 'gpt-4o-mini'}</span>
                                </div>
                                {app.gpt_status && (
                                    <span className={`badge ${app.gpt_status === GPT_STATUS.COMPLETED ? 'bg-success-subtle text-success' : isIncorrectUnderwriting(app, ai) ? 'bg-danger-subtle text-danger' : 'bg-warning-subtle text-warning'} fs-12 px-3 py-2 rounded-pill`}>
                                        Status: {isIncorrectUnderwriting(app, ai) ? 'Incorrect' : app.gpt_status}
                                    </span>
                                )}
                                {ai.latency_ms && (
                                    <span className="text-muted fs-12">
                                        <i className="ri-timer-line me-1"></i>{ai.latency_ms} ms
                                    </span>
                                )}
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                {app.gpt_generated_at && (
                                    <span className="text-muted fs-12 d-inline-flex align-items-center" style={{ gap: '6px' }}>
                                        <i className="ri-calendar-check-line"></i>
                                        <span>Evaluated: {app.gpt_generated_at}</span>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* The evaluation did not complete. Says so plainly rather than
                    presenting anything as an underwriting outcome — nothing was
                    generated, so there is nothing to act on. */}
                        {ai.failed && (
                            <div className="alert alert-warning d-flex align-items-start gap-2 mb-4" role="alert">
                                <i className="ri-alert-line fs-18 text-warning mt-1"></i>
                                <div>
                                    <div className="fw-semibold fs-14">Automated Underwriting Did Not Complete</div>
                                    <div className="fs-13 text-muted">
                                        {ai.failure_reason || 'The OpenAI Responses API did not return a result.'}
                                        {' '}This file needs manual underwriting. Run it again once the cause is resolved.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Rows written before the deterministic engine was removed. */}
                        {ai.is_fallback && (
                            <div className="alert alert-secondary d-flex align-items-start gap-2 mb-4" role="alert">
                                <i className="ri-history-line fs-18 mt-1"></i>
                                <div>
                                    <div className="fw-semibold fs-14">Legacy Result — Not Model Generated</div>
                                    <div className="fs-13 text-muted">
                                        This result predates the current pipeline and was produced by a local rule engine,
                                        not by an underwriting model. Re-run the pre-qualification before relying on it.
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* The FCH_Internal_Prequalification_AUE_v3 result. This whole block
                    is internal: the API withholds ai_result from any non-host caller,
                    and nothing here is repeated on a borrower or partner screen. */}
                        {ai.internal && (
                            <>
                                {/* Driven by the payload's own classification rather than a
                            fixed string, so the banner cannot outlive a change to it. */}
                                {ai.internal.classification && (
                                    <div className="alert alert-dark d-flex align-items-center gap-2 py-2 fs-13 mb-3" role="alert">
                                        <i className="ri-lock-2-line"></i>
                                        <span className="fw-semibold">{ai.internal.classification.replace(/_/g, ' ')}</span>
                                        <span>Do not distribute to borrowers, clients or partners.</span>
                                    </div>
                                )}

                                <div className="d-flex flex-wrap gap-2 mb-3 fs-12 text-muted">
                                    {ai.internal.prompt_version && <span className="badge bg-light text-muted">{ai.internal.prompt_version}</span>}
                                    {ai.internal.submission_id && <span className="badge bg-light text-muted">Submission {ai.internal.submission_id}</span>}
                                    {ai.internal.matrix_version && <span className="badge bg-light text-muted">Matrix {ai.internal.matrix_version}</span>}
                                </div>

                                <div className="d-flex flex-wrap gap-3 mb-4">
                                    {ai.internal.overall_stance && (
                                        <div className="p-2 px-3 bg-light rounded border">
                                            <div className="fs-11 text-muted text-uppercase">Overall Stance</div>
                                            <div className="fs-14 fw-semibold text-dark">{ai.internal.overall_stance.replace(/_/g, ' ')}</div>
                                        </div>
                                    )}
                                    {ai.internal.data_status && (
                                        <div className="p-2 px-3 bg-light rounded border">
                                            <div className="fs-11 text-muted text-uppercase">Data Status</div>
                                            <div className="fs-14 fw-semibold text-dark">{ai.internal.data_status}</div>
                                        </div>
                                    )}
                                    {ai.internal.manual_review?.required && (
                                        <div className="p-2 px-3 bg-warning-subtle rounded border border-warning-subtle">
                                            <div className="fs-11 text-warning-emphasis text-uppercase">Manual Review</div>
                                            <div className="fs-14 fw-semibold text-warning-emphasis">Required</div>
                                        </div>
                                    )}
                                </div>

                                {/* Why a human has to look at this, not just that one must. */}
                                {!!ai.internal.manual_review?.reasons?.length && (
                                    <div className="mb-4">
                                        <h6 className="fs-15 fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                                            <i className="ri-user-search-line text-warning"></i>
                                            Manual Review Reasons
                                        </h6>
                                        <ul className="mb-0 ps-3">
                                            {ai.internal.manual_review.reasons.map((reason, idx) => (
                                                <li key={idx} className="fs-13 text-dark py-1">{reason}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Every value the evaluation reasoned over, with how each was
                            sourced — the record of what was verified vs merely stated. */}
                                {!!ai.internal.borrower_request_snapshot?.length && (
                                    <div className="mb-4">
                                        <h6 className="fs-15 fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                                            <i className="ri-list-check-2 text-dark"></i>
                                            Borrower Request Snapshot
                                        </h6>
                                        <div className="table-responsive">
                                            <table className="table table-sm align-middle mb-0">
                                                <thead>
                                                    <tr>
                                                        <th>Field</th>
                                                        <th>Value</th>
                                                        <th>Source</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {ai.internal.borrower_request_snapshot.map((row, idx) => (
                                                        <tr key={idx}>
                                                            <td className="fw-medium">{(row.field || '').replace(/_/g, ' ')}</td>
                                                            <td className="fs-13">{row.value === null || row.value === undefined ? '—' : String(row.value)}</td>
                                                            <td>
                                                                <span className="badge bg-light text-muted text-uppercase fs-11">
                                                                    {(row.source_status || '').replace(/_/g, ' ')}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {!!ai.internal.aus_model_determination?.length && (
                                    <div className="mb-4">
                                        <h6 className="fs-15 fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                                            <i className="ri-calculator-line text-dark"></i>
                                            AUS Model Determination
                                        </h6>
                                        <ul className="list-unstyled mb-0">
                                            {ai.internal.aus_model_determination.map((row, idx) => (
                                                <li key={idx} className="py-2 border-bottom border-light-subtle">
                                                    <div className="d-flex align-items-center gap-2 mb-1">
                                                        <span className="fs-14 fw-medium text-dark">{row.product_path}</span>
                                                        <span className="badge bg-dark-subtle text-dark fs-11">{row.model?.replace(/_/g, ' ')}</span>
                                                    </div>
                                                    <div className="fs-13 text-muted">{row.rationale}</div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {!!ai.internal.strengths?.length && (
                                    <div className="mb-4">
                                        <h6 className="fs-15 fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                                            <i className="ri-thumb-up-line text-success"></i>
                                            Strengths
                                        </h6>
                                        <ul className="list-unstyled mb-0">
                                            {ai.internal.strengths.map((item, idx) => (
                                                <li key={idx} className="d-flex align-items-start gap-2 py-2 border-bottom border-light-subtle">
                                                    <i className="ri-check-line text-success mt-1"></i>
                                                    <span className="fs-14 text-dark">{item}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {ai.internal.executive_underwriting_conclusion && (
                                    <div className="mb-4">
                                        <div className="d-flex align-items-center justify-content-between mb-2">
                                            <h6 className="fs-15 fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                                                <i className="ri-file-text-line text-dark"></i>
                                                Executive Underwriting Conclusion
                                            </h6>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-light border py-1 px-2 fs-12 text-muted"
                                                onClick={() => handleCopyText(ai.internal?.executive_underwriting_conclusion || '', 'Executive Underwriting Conclusion')}
                                            >
                                                <i className="ri-file-copy-line me-1"></i> Copy
                                            </button>
                                        </div>
                                        <div className="p-3 bg-light rounded border">
                                            <p className="fs-14 text-dark mb-0" style={{ whiteSpace: 'pre-line' }}>
                                                {ai.internal.executive_underwriting_conclusion}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {!!ai.internal.recommended_funding_paths?.length && (
                                    <div className="mb-4">
                                        <h6 className="fs-15 fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                                            <i className="ri-route-line text-success"></i>
                                            Recommended Funding Paths
                                        </h6>
                                        <div className="row g-3">
                                            {ai.internal.recommended_funding_paths.map((path, idx) => (
                                                <div key={idx} className="col-lg-6">
                                                    <div className="card border shadow-none mb-0 h-100">
                                                        <div className="card-body p-3">
                                                            <div className="d-flex align-items-center justify-content-between mb-2">
                                                                <h6 className="fs-14 fw-semibold text-dark mb-0">
                                                                    #{path.priority} {path.product_category}
                                                                </h6>
                                                                <span className="badge bg-light text-dark fs-11">{path.fit_status?.replace(/_/g, ' ')}</span>
                                                            </div>
                                                            <div className="fs-13 text-muted mb-2">{path.fit_rationale}</div>
                                                            {(path.amount_min != null || path.amount_max != null) && (
                                                                <div className="fs-13 text-dark mb-2">
                                                                    <strong>Amount:</strong> {path.amount_min ?? '—'} – {path.amount_max ?? '—'}
                                                                    {path.amount_basis ? <span className="text-muted"> ({path.amount_basis})</span> : null}
                                                                </div>
                                                            )}
                                                            <div className="fs-12 text-muted">
                                                                <span className="badge bg-dark-subtle text-dark me-1">{path.aus_model?.replace(/_/g, ' ')}</span>
                                                                <span className="badge bg-info-subtle text-info">{path.execution_action?.replace(/_/g, ' ')}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {!!ai.internal.active_lender_matches?.length && (
                                    <div className="mb-4">
                                        <h6 className="fs-15 fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                                            <i className="ri-bank-line text-primary"></i>
                                            Active Lender Matches
                                        </h6>
                                        <div className="table-responsive">
                                            <table className="table table-sm align-middle mb-0">
                                                <thead>
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Lender</th>
                                                        <th>Fit</th>
                                                        <th>Rationale</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {ai.internal.active_lender_matches.map((match, idx) => (
                                                        <tr key={idx}>
                                                            <td>{match.priority}</td>
                                                            <td className="fw-medium">{match.lender_name}</td>
                                                            <td><span className="badge bg-light text-dark">{match.fit_status?.replace(/_/g, ' ')}</span></td>
                                                            <td className="fs-13">{match.rationale}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {!!ai.internal.conditions_and_flags?.length && (
                                    <div className="mb-4">
                                        <h6 className="fs-15 fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                                            <i className="ri-flag-line text-warning"></i>
                                            Conditions &amp; Flags
                                        </h6>
                                        <ul className="list-unstyled mb-0">
                                            {ai.internal.conditions_and_flags.map((flag, idx) => (
                                                <li key={idx} className="py-2 border-bottom border-light-subtle">
                                                    <div className="d-flex align-items-center gap-2 mb-1">
                                                        <span className={`badge fs-11 ${flag.severity === 'BLOCKING' ? 'bg-danger-subtle text-danger' : flag.severity === 'MATERIAL' ? 'bg-warning-subtle text-warning' : 'bg-light text-muted'}`}>
                                                            {flag.severity}
                                                        </span>
                                                        <span className="fs-14 fw-medium text-dark">{flag.category}</span>
                                                    </div>
                                                    <div className="fs-13 text-dark mb-1">{flag.finding}</div>
                                                    {flag.required_action && (
                                                        <div className="fs-13 text-muted"><strong>Action:</strong> {flag.required_action}</div>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {!!ai.internal.underwriting_analysis?.length && (
                                    <div className="mb-4">
                                        <h6 className="fs-15 fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                                            <i className="ri-search-eye-line text-dark"></i>
                                            Underwriting Analysis
                                        </h6>
                                        <ul className="list-unstyled mb-0">
                                            {ai.internal.underwriting_analysis.map((row, idx) => (
                                                <li key={idx} className="py-2 border-bottom border-light-subtle">
                                                    <div className="fs-14 fw-medium text-dark">{row.section}</div>
                                                    <div className="fs-13 text-dark">{row.finding}</div>
                                                    {!!row.evidence_fields?.length && (
                                                        <div className="fs-12 text-muted mt-1">Evidence: {row.evidence_fields.join(', ')}</div>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {ai.internal.routing_recommendation && (
                                    <div className="mb-4">
                                        <h6 className="fs-15 fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                                            <i className="ri-direction-line text-info"></i>
                                            Routing Recommendation
                                        </h6>
                                        <div className="p-3 bg-light rounded border fs-14 text-dark">
                                            <div><strong>Primary product:</strong> {ai.internal.routing_recommendation.primary_product || '—'}</div>
                                            <div><strong>Primary lender:</strong> {ai.internal.routing_recommendation.primary_lender || '—'}</div>
                                            <div><strong>Next action:</strong> {ai.internal.routing_recommendation.next_action?.replace(/_/g, ' ') || '—'}</div>
                                            {ai.internal.routing_recommendation.fallback_path && (
                                                <div><strong>Fallback:</strong> {ai.internal.routing_recommendation.fallback_path}</div>
                                            )}
                                            {ai.internal.routing_recommendation.reason && (
                                                <div className="text-muted mt-1">{ai.internal.routing_recommendation.reason}</div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {!!ai.internal.required_documentation?.length && (
                                    <div className="mb-4">
                                        <h6 className="fs-15 fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                                            <i className="ri-file-list-3-line text-primary"></i>
                                            Required Documentation
                                        </h6>
                                        {ai.internal.required_documentation.map((group, idx) => (
                                            <div key={idx} className="mb-2">
                                                <div className="fs-14 fw-medium text-dark mb-1">{group.path_or_lender}</div>
                                                <ul className="mb-0 ps-3">
                                                    {(group.items || []).map((item, i) => (
                                                        <li key={i} className="fs-13 text-dark py-1">{item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {!!ai.internal.credit_building_pathway?.length && (
                                    <div className="mb-4">
                                        <h6 className="fs-15 fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                                            <i className="ri-seedling-line text-success"></i>
                                            Credit Building Pathway
                                        </h6>
                                        <ul className="list-unstyled mb-0">
                                            {ai.internal.credit_building_pathway.map((step, idx) => (
                                                <li key={idx} className="d-flex align-items-start gap-2 py-2 border-bottom border-light-subtle">
                                                    <i className="ri-arrow-right-s-line text-success mt-1"></i>
                                                    <span className="fs-14 text-dark">{step}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {ai.internal.final_internal_disposition && (
                                    <div className="mb-4">
                                        <h6 className="fs-15 fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                                            <i className="ri-stamp-line text-dark"></i>
                                            Final Internal Disposition
                                        </h6>
                                        <div className="p-3 bg-light rounded border">
                                            <p className="fs-14 text-dark mb-0" style={{ whiteSpace: 'pre-line' }}>
                                                {ai.internal.final_internal_disposition}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {(ai.internal.closing_tag || ai.internal.disclaimer) && (
                                    <div className="mb-4 pt-2 border-top">
                                        {ai.internal.closing_tag && (
                                            <p className="fs-12 text-muted mb-1 fw-semibold">{ai.internal.closing_tag}</p>
                                        )}
                                        {ai.internal.disclaimer && (
                                            <p className="fs-12 text-muted mb-0">{ai.internal.disclaimer}</p>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}

                {/* Section 5: Quick Decision Actions */}
                {hasPermission("update pre qualification") && (
                    <div className="p-3 bg-white rounded border mt-4">
                        <h6 className="fs-14 fw-bold text-dark mb-2">Quick Decision Actions</h6>
                        <p className="text-muted fs-13 mb-3">
                            Apply status changes based on this underwriting evaluation:
                        </p>
                        <div className="d-flex flex-wrap gap-2">
                            <button
                                type="button"
                                className="btn btn-success btn-sm d-flex align-items-center gap-1"
                                onClick={() => handleQuickStatusChange('Approved')}
                                disabled={updateMutation.isPending}
                            >
                                <i className="ri-check-line"></i>
                                <span>Mark as Approved</span>
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary btn-sm d-flex align-items-center gap-1"
                                onClick={() => handleQuickStatusChange('In Review')}
                                disabled={updateMutation.isPending}
                            >
                                <i className="ri-time-line"></i>
                                <span>Mark as In Review</span>
                            </button>
                            <button
                                type="button"
                                className="btn btn-danger btn-sm d-flex align-items-center gap-1"
                                onClick={() => handleQuickStatusChange('Declined')}
                                disabled={updateMutation.isPending}
                            >
                                <i className="ri-close-line"></i>
                                <span>Mark as Declined</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <div className="page-content">
                <div className="container-fluid">
                    {/* Header */}
                    <PageHeader
                        title="Application Details"
                        breadcrumbs={[
                            { label: 'Pre-Qualification Applications', path: '/intake-review/pre-qualification' },
                            { label: 'Details' }
                        ]}
                    >
                        <div className="page-actions d-flex align-items-center gap-2 mt-3 mt-lg-0">
                            {/* Host Partner only: running/re running an evaluation produces internal
                                underwriting output. The API enforces this strictly as well. */}
                            {isHostPartner && (
                                <button
                                    type="button"
                                    className="btn btn-primary d-flex align-items-center gap-2 waves-effect shadow-sm"
                                    onClick={handleRunPrequal}
                                    disabled={isAiRunning}
                                >
                                    {isAiRunning ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                            <span>Running Pre-Qualification...</span>
                                        </>
                                    ) : (
                                        <>
                                            <i className="ri-sparkling-2-fill fs-16 text-warning"></i>
                                            <span>{app.ai_result ? 'Re-run Pre-Qualification' : 'Run Pre-Qualification'}</span>
                                        </>
                                    )}
                                </button>
                            )}
                            <Link to="/intake-review/pre-qualification" className="btn btn-outline-secondary w-lg waves-effect">
                                <i className="ri-arrow-left-line align-middle me-1"></i> Back
                            </Link>
                        </div>
                    </PageHeader>

                    <div className="row">
                        {/* Sidebar Tabs */}
                        <div className="col-lg-3">
                            {/* Steps List */}
                            <div className="card">
                                <div className="card-header bg-white py-3">
                                    <h6 className="card-title mb-0 fs-16">Application Progress Steps</h6>
                                </div>
                                <div className="list-group list-group-flush p-2">
                                    {visibleSteps.map((step) => (
                                        <button
                                            key={step.id}
                                            type="button"
                                            className={`list-group-item list-group-item-action d-flex align-items-center gap-2 rounded-2 border-0 py-2 px-3 mb-1 fs-14 ${currentStep === step.id ? 'active' : 'text-body'}`}
                                            onClick={() => setCurrentStep(step.id as StepType)}
                                        >
                                            <div className={`rounded-circle d-flex align-items-center justify-content-center me-1 ${currentStep === step.id ? 'bg-white text-primary' : 'bg-light text-muted'}`} style={{ width: '32px', height: '32px', fontSize: '14px', fontWeight: '600' }}>
                                                {step.id}
                                            </div>
                                            <span className="fw-medium">{step.title}</span>
                                            {step.id === 4 && app.ai_result ? (
                                                <span className={`badge ${currentStep === step.id ? 'bg-white text-primary' : 'bg-success-subtle text-success'} rounded-pill ms-auto`}>
                                                    Ready
                                                </span>
                                            ) : (
                                                currentStep === step.id
                                                    ? <i className="ri-checkbox-circle-fill ms-auto opacity-75 fs-14"></i>
                                                    : <i className="ri-arrow-right-s-line ms-auto text-muted fs-14"></i>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* Status Card */}
                            <div className="card">
                                <div className="card-body">
                                    <h5 className="fs-15 fw-bold mb-3">Application Status</h5>

                                    {isHost ? (
                                        <>
                                            {/* AI underwriting status summary */}
                                            <div className="mb-3 p-3 bg-light rounded border">
                                                <div className="d-flex align-items-center justify-content-between mb-2">
                                                    <span className="fs-13 fw-semibold text-dark d-flex align-items-center gap-1">
                                                        <i className="ri-sparkling-2-fill text-warning"></i> AI Underwriting Analysis
                                                    </span>
                                                    {app.gpt_status && (
                                                        <span className={`badge ${app.gpt_status === GPT_STATUS.COMPLETED ? 'bg-success-subtle text-success' : isIncorrectUnderwriting(app, app.ai_result) ? 'bg-danger-subtle text-danger' : 'bg-warning-subtle text-warning'} fs-11`}>
                                                            {isIncorrectUnderwriting(app, app.ai_result) ? 'Incorrect' : app.gpt_status}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-muted fs-12 mb-0">
                                                    Run automated underwriting to evaluate programs, checklist, and internal memo.
                                                </p>
                                            </div>

                                            <div className="mb-3">
                                                <label htmlFor="status-select" className="form-label text-muted">Status <span className="text-danger">*</span></label>
                                                <Dropdown
                                                    value={status}
                                                    options={APPLICATION_STATUS_OPTIONS}
                                                    onChange={(e) => {
                                                        setStatus(e.value);
                                                        if (statusError) setStatusError('');
                                                    }}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    placeholder="Select status..."
                                                    className={`w-100 ${statusError ? 'p-invalid' : ''}`}
                                                    disabled={!hasPermission("update pre qualification")}
                                                />
                                                {statusError && <div className="text-danger fs-12 mt-1">{statusError}</div>}
                                            </div>
                                            <div className="mb-3">
                                                <div className="d-flex align-items-center justify-content-between mb-1">
                                                    <label htmlFor="status-notes" className="form-label text-muted mb-0">Status Notes <span className="text-danger">*</span></label>
                                                    {app.ai_result?.admin_status_note && (
                                                        <button
                                                            type="button"
                                                            className="btn btn-link p-0 text-primary fs-11 text-decoration-none"
                                                            onClick={handleApplyMemoToNotes}
                                                            title="Insert the short AI-generated note"
                                                        >
                                                            Insert AI Note
                                                        </button>
                                                    )}
                                                </div>
                                                <textarea
                                                    className={`form-control ${notesError ? 'is-invalid' : ''}`}
                                                    id="status-notes"
                                                    rows={4}
                                                    placeholder="Add notes..."
                                                    value={status_note}
                                                    maxLength={STATUS_NOTE_MAX_LENGTH}
                                                    onChange={(e) => {
                                                        setStatusNote(e.target.value);
                                                        if (notesError) setNotesError('');
                                                    }}
                                                    disabled={!hasPermission("update pre qualification")}
                                                ></textarea>
                                                {notesError && <div className="invalid-feedback">{notesError}</div>}
                                                {/* The limit is shown while typing rather than only on rejection —
                                                    the AI note can be long, and the field silently stopping at the
                                                    cap is worse than saying where the cap is. */}
                                                <div className={`fs-11 mt-1 text-end ${status_note.length >= STATUS_NOTE_MAX_LENGTH ? 'text-danger' : 'text-muted'}`}>
                                                    {status_note.length} / {STATUS_NOTE_MAX_LENGTH} characters
                                                </div>
                                            </div>

                                            {hasPermission("update pre qualification") && (
                                                <div className="d-grid">
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary"
                                                        onClick={handleUpdateClick}
                                                        disabled={updateMutation.isPending}
                                                    >
                                                        {updateMutation.isPending ? 'Updating...' : 'Update Status'}
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <div className="mb-3">
                                                <label className="form-label text-muted d-block">Status</label>
                                                <span className={`badge ${APPLICATION_STATUS_CLASS_MAP[app.status] || 'bg-primary-subtle text-primary'} fs-12 text-uppercase`}>
                                                    {app.status}
                                                </span>
                                            </div>
                                            <div className="mb-0">
                                                <label className="form-label text-muted d-block">Status Notes</label>
                                                <div className="text-muted fs-14 bg-light p-3 rounded" style={{ minHeight: '80px' }}>
                                                    {app.status_note || 'No notes available'}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="col-lg-9">
                            <div className="card">
                                <div className="card-header">
                                    <div className="d-flex align-items-center justify-content-between">
                                        <h5 className="card-title mb-0">
                                            {STEPS.find(s => s.id === currentStep)?.title}
                                        </h5>
                                    </div>
                                </div>
                                <div className="card-body p-4">
                                    {currentStep === 1 && renderPersonalInfo()}
                                    {currentStep === 2 && renderBusinessDetails()}
                                    {currentStep === 3 && renderFundingNeeds()}
                                    {currentStep === 4 && canViewUnderwritingResult && renderAiEvaluation()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div >

            <ConfirmationModal
                show={showConfirmModal}
                onHide={() => setShowConfirmModal(false)}
                onConfirm={handleConfirmUpdate}
                loading={updateMutation.isPending}
                title="Update Status"
                message={`Are you sure you want to update the application status to "${status}"?`}
                confirmText="Update"
                variant="primary"
            />
        </>
    );
}
