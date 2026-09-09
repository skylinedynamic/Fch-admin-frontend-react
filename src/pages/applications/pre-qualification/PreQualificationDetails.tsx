import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageHeader from '../../common/PageHeader';
import { PreQualificationApplicationDetails as PreQualificationApplicationDetailsType, GPT_STATUS, ISSUE_SEVERITY, isIncorrectUnderwriting } from '../../../modules/application/types';
import { APPLICATION_STATUS_OPTIONS, APPLICATION_STATUS_CLASS_MAP } from '../../../config/borrower';
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

const STEPS = [
    { id: 1, title: 'Personal Info', icon: 'ri-user-line' },
    { id: 2, title: 'Business Details', icon: 'ri-briefcase-line' },
    { id: 3, title: 'Funding Needs', icon: 'ri-money-dollar-circle-line' },
    // Host-only: the result contains the internal memo, risk flags and lender
    // routing. The API withholds it from partners regardless of this list.
    { id: 4, title: 'AI Underwriting Result', icon: 'ri-sparkling-2-line', hostOnly: true }
];

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="row mb-3">
        <label className="col-sm-4 form-label fs-14">{label}</label>
        <div className="col-sm-8">
            <div className="text-muted fs-14">{value || '-'}</div>
        </div>
    </div>
);

export default function PreQualificationDetails() {
    const { id } = useParams();
    const { data: details, isLoading, error } = usePreQualificationApplicationDetails(id || '');
    const [currentStep, setCurrentStep] = useState<StepType>(1);

    const { user } = useAuthStore();
    const isPartner = user?.is_host == false;
    const { hasPermission } = usePermissions();
    const visibleSteps = STEPS.filter(step => !step.hostOnly || !isPartner);

    // Status update state
    const app = (details?.data || details || {}) as PreQualificationApplicationDetailsType;
    const [status, setStatus] = useState<string>('');
    const [status_note, setStatusNote] = useState<string>('');
    const [notesError, setNotesError] = useState<string>('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const updateMutation = useUpdateApplicationStatus();
    const runAiMutation = useRunAiPreQualification();

    // Sync state with fetched data
    useEffect(() => {
        if (app?.status) setStatus(app.status);
        if (app?.status_note) setStatusNote(app.status_note);
    }, [app]);

    const handleRunPrequal = () => {
        if (!app.id) return;
        runAiMutation.mutate(app.id, {
            onSuccess: (response: any) => {
                const resData = response?.data || response;
                const aiResult = resData?.ai_result;
                if (aiResult?.incorrect || aiResult?.blocked) {
                    toast.warning(aiResult?.borrower_message || 'Data integrity check found corrections needed before AI underwriting can run.');
                    setCurrentStep(4);
                    return;
                }
                // The short note, not the memo: Status Notes is capped at 1000
                // characters and is visible to partners.
                if (aiResult?.admin_status_note) {
                    setStatusNote(aiResult.admin_status_note);
                }
                if (aiResult?.failed) {
                    toast.error(aiResult.failure_reason || 'Automated underwriting did not complete. This file needs manual review.');
                } else {
                    toast.success('AI Pre-Qualification analysis completed!');
                }
                setCurrentStep(4);
            },
            onError: (err: any) => {
                toast.error(err?.response?.data?.message || 'Failed to run AI pre-qualification.');
            }
        });
    };

    const handleQuickStatusChange = (newStatus: string) => {
        setStatus(newStatus);
        setNotesError('');
        setShowConfirmModal(true);
    };

    // Inserts the short, lender-free note — never the full memo, which exceeds the
    // 1000-character limit on Status Notes and is visible to partners.
    const handleApplyMemoToNotes = () => {
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

    const handleUpdateClick = () => {
        setNotesError('');
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
            },
            onError: (error: any) => {
                setShowConfirmModal(false);
                if (error?.response?.data?.errors) {
                    const backendErrors = error.response.data.errors;
                    if (backendErrors.status_note) {
                        const message = Array.isArray(backendErrors.status_note)
                            ? backendErrors.status_note[0]
                            : backendErrors.status_note;
                        setNotesError(message);
                    }
                } else {
                    toast.error('Failed to update status. Please try again.');
                }
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

    const renderAiEvaluation = () => {
        const ai = app.ai_result;

        if (runAiMutation.isPending) {
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
                        <i className="ri-error-warning-line fs-18 text-warning mt-1"></i>
                        <div>
                            <div className="fw-semibold fs-14">Corrections Needed Before AI Underwriting Can Run</div>
                            <div className="fs-13 text-muted">
                                {app.validation_summary || ai?.borrower_message || 'The automated data integrity check found issues with this submission that need to be resolved first.'}
                            </div>
                        </div>
                    </div>

                    {issues.length > 0 && (
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
                                Only <span className="badge bg-danger-subtle text-danger fs-11">INCORRECT</span> issues prevent underwriting from running. Fix them, then use Rerun Pre-Qualification.
                            </p>
                        </div>
                    )}
                </div>
            );
        }

        if (!ai) {
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

        return (
            <div className="ai-evaluation-container">
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
                            <span className="text-muted fs-12">
                                <i className="ri-calendar-check-line me-1"></i>Evaluated: {app.gpt_generated_at}
                            </span>
                        )}
                    </div>
                </div>

                {/* The evaluation did not complete. Says so plainly rather than
                    presenting anything as an underwriting outcome — nothing was
                    generated, so there is nothing to act on. */}
                {ai.failed && (
                    <div className="alert alert-warning d-flex align-items-start gap-2 mb-4" role="alert">
                        <i className="ri-error-warning-line fs-18 text-warning mt-1"></i>
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

                {/* Section 1: Recommended Qualified Programs */}
                <div className="mb-4">
                    <h6 className="fs-15 fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                        <i className="ri-checkbox-circle-fill text-success"></i>
                        Recommended Funding Programs
                    </h6>
                    {ai.qualified_programs && ai.qualified_programs.length > 0 ? (
                        <div className="row g-3">
                            {ai.qualified_programs.map((program, idx) => (
                                <div key={idx} className="col-md-6 col-lg-4">
                                    <div className="card border shadow-none mb-0 h-100 bg-white hover-shadow">
                                        <div className="card-body p-3 d-flex align-items-center gap-3">
                                            <div className="avatar-sm flex-shrink-0">
                                                <div className="avatar-title bg-success-subtle text-success rounded fs-18">
                                                    <i className="ri-shield-check-line"></i>
                                                </div>
                                            </div>
                                            <div className="flex-grow-1">
                                                <h6 className="fs-14 fw-semibold text-dark mb-1">{program}</h6>
                                                <span className="badge bg-success-subtle text-success fs-11">Qualified</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted fs-14">No qualified programs identified.</p>
                    )}
                </div>

                {/* Section 2: Required Document Checklist */}
                <div className="mb-4">
                    <h6 className="fs-15 fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                        <i className="ri-file-list-3-line text-primary"></i>
                        Required Document Checklist
                    </h6>
                    {ai.document_checklist && ai.document_checklist.length > 0 ? (
                        <div className="bg-light p-3 rounded border">
                            <ul className="list-unstyled mb-0">
                                {ai.document_checklist.map((doc, idx) => (
                                    <li key={idx} className="d-flex align-items-start gap-2 py-2 border-bottom border-light-subtle last:border-0">
                                        <i className="ri-checkbox-circle-line text-primary fs-16 mt-1 flex-shrink-0"></i>
                                        <span className="fs-14 text-dark">{doc}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <p className="text-muted fs-14">No document requirements listed.</p>
                    )}
                </div>

                {/* Section 3: Borrower-Facing Summary */}
                {ai.borrower_summary && (
                    <div className="mb-4">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                            <h6 className="fs-15 fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                                <i className="ri-user-smile-line text-info"></i>
                                Borrower-Facing Summary
                            </h6>
                            <button
                                type="button"
                                className="btn btn-sm btn-light border py-0 px-2 fs-12 text-muted"
                                onClick={() => handleCopyText(ai.borrower_summary || '', 'Borrower Summary')}
                            >
                                <i className="ri-file-copy-line me-1"></i> Copy
                            </button>
                        </div>
                        <div className="p-3 bg-success-subtle rounded border border-success-subtle">
                            <p className="fs-14 text-success-emphasis mb-0 fw-medium" style={{ whiteSpace: 'pre-line' }}>
                                {ai.borrower_summary}
                            </p>
                        </div>
                    </div>
                )}

                {/* Section 4: Internal Underwriting Memo */}
                {ai.internal_summary && (
                    <div className="mb-4">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                            <h6 className="fs-15 fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                                <i className="ri-file-text-line text-dark"></i>
                                Internal Underwriting Memo (Admin-Only)
                            </h6>
                            {/* No "Apply to Status Notes" here: the memo is ~3KB and
                                Status Notes is capped at 1000 characters and visible to
                                partners. The short AI note is inserted there instead. */}
                            <button
                                type="button"
                                className="btn btn-sm btn-light border py-1 px-2 fs-12 text-muted"
                                onClick={() => handleCopyText(ai.internal_summary || '', 'Internal Underwriting Memo')}
                            >
                                <i className="ri-file-copy-line me-1"></i> Copy Memo
                            </button>
                        </div>
                        <div className="p-3 bg-light rounded border">
                            <pre className="fs-13 text-dark mb-0" style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', lineHeight: '1.6' }}>
                                {ai.internal_summary}
                            </pre>
                        </div>
                    </div>
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
                            {/* Host-only: running an evaluation produces internal
                                underwriting output. The API enforces this too. */}
                            {!isPartner && (
                                <button
                                    type="button"
                                    className="btn btn-primary d-flex align-items-center gap-2 waves-effect shadow-sm"
                                    onClick={handleRunPrequal}
                                    disabled={runAiMutation.isPending}
                                >
                                    {runAiMutation.isPending ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                            <span>Running Pre-Qualification...</span>
                                        </>
                                    ) : (
                                        <>
                                            <i className="ri-sparkling-2-fill fs-16 text-warning"></i>
                                            <span>{app.ai_result ? 'Rerun Pre-Qualification' : 'Run Pre-Qualification'}</span>
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

                                    {!isPartner ? (
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
                                                <label htmlFor="status-select" className="form-label text-muted">Status</label>
                                                <Dropdown
                                                    value={status}
                                                    options={APPLICATION_STATUS_OPTIONS}
                                                    onChange={(e) => setStatus(e.value)}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    placeholder="Select status..."
                                                    className="w-100"
                                                    disabled={!hasPermission("update pre qualification")}
                                                />
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
                                                    onChange={(e) => {
                                                        setStatusNote(e.target.value);
                                                        if (notesError) setNotesError('');
                                                    }}
                                                    disabled={!hasPermission("update pre qualification")}
                                                ></textarea>
                                                {notesError && <div className="invalid-feedback">{notesError}</div>}
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
                                    {currentStep === 4 && renderAiEvaluation()}
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
