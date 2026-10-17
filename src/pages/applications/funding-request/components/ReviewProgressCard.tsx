import React from 'react';
import { 
    FUNDING_REVIEW_STATUS, 
    getFundingReviewProgress, 
    FUNDING_REVIEW_TIMELINE_STEPS, 
    FUNDING_REVIEW_GUIDELINE_CARDS 
} from '../../../../config/funding';

interface ReviewProgressCardProps {
    status: string;
    createdAt?: string;
    updatedAt?: string;
    rejectReason?: string;
}

export default function ReviewProgressCard({
    status,
    createdAt,
    updatedAt,
    rejectReason,
}: ReviewProgressCardProps) {

    const progressPercentage = getFundingReviewProgress(status);
    const isRejected = status === FUNDING_REVIEW_STATUS.REJECTED;
    const isCanceled = status === FUNDING_REVIEW_STATUS.CANCELED;
    const isErrorState = isRejected || isCanceled;
    const guidelineCards = FUNDING_REVIEW_GUIDELINE_CARDS;
    
    const terminalStatuses = [FUNDING_REVIEW_STATUS.APPROVED, FUNDING_REVIEW_STATUS.REJECTED, FUNDING_REVIEW_STATUS.CANCELED];
    const isCurrentTerminal = terminalStatuses.includes(status);
    const terminalKey = isCurrentTerminal ? status : FUNDING_REVIEW_STATUS.APPROVED;

    const displaySteps = FUNDING_REVIEW_TIMELINE_STEPS.filter(step => {
        if (terminalStatuses.includes(step.key)) {
            return step.key === terminalKey;
        }
        // If it's an error state, we don't show Accepted or In Progress
        // because we don't know the exact history and it's confusing to see them.
        if (isErrorState && (step.key === FUNDING_REVIEW_STATUS.ACCEPTED || step.key === FUNDING_REVIEW_STATUS.IN_PROGRESS)) {
            return false;
        }
        return true;
    });

    let currentStatusIndex = displaySteps.findIndex((x) => x.key === status);
    if (currentStatusIndex === -1) {
        currentStatusIndex = 1;
    }

    const formatDateTime = (date?: string) => {
        if (!date) return null;
        const d = new Date(date);
        const datePart = new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }).format(d);
        const timePart = new Intl.DateTimeFormat('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        }).format(d);
        return (
            <>
                <div className="mb-1">{datePart}</div>
                <div>{timePart}</div>
            </>
        );
    };

    return (
        <div className="card shadow-sm border-0 mb-4 rounded-3">
            <div className="card-header bg-white border-bottom border-light p-4">
                <div className="d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center">
                        <div
                            className="d-flex align-items-center justify-content-center rounded-3 fr-progress-style-3c782fa9"
                        >
                            <i className="ri-line-chart-line fs-4"></i>
                        </div>
                        <div>
                            <h5 className="card-title mb-1 fs-16 fw-bold fr-progress-style-3ded13b6">Review Progress</h5>
                            <p className="mb-0 text-muted fs-13">Track the progress of this funding request</p>
                        </div>
                    </div>

                    <div className="d-flex align-items-center position-relative fr-progress-style-484b8e41">
                        <svg width="76" height="76" className="fr-progress-style-386cac71">
                            <circle cx="38" cy="38" r="34" stroke="#f1f5f9" strokeWidth="6" fill="none" />
                            <circle cx="38" cy="38" r="34" stroke={isErrorState ? '#ef4444' : progressPercentage === 100 ? '#22c55e' : '#2563eb'} strokeWidth="6" fill="none"
                                strokeDasharray="213" strokeDashoffset={213 - (213 * progressPercentage / 100)}
                                strokeLinecap="round" />
                        </svg>
                        <div className="position-absolute w-100 h-100 d-flex flex-column align-items-center justify-content-center">
                            <span className="fw-bolder text-dark fr-progress-style-67aa90fa">{progressPercentage}%</span>
                            <span className="fw-bold text-muted fr-progress-style-33f3a8e">Complete</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card-body p-0 pt-4">

                {/* Timeline */}
                <div className="px-4 pb-4 overflow-x-auto funding-request-scrollbar">
                    <div className="d-flex w-100 position-relative timeline-track-container">
                        {displaySteps.map((step, idx) => {
                            // Since we now have a clean 5-step track, we just use simple index logic
                            // If it's an error state (Rejected or Canceled) and this step is before the terminal step (which is at index 4),
                            // we show it as completed if we've passed it, or incomplete if we haven't?
                            // Actually, if it's Rejected or Canceled, we just mark everything before the current step as completed.
                            const completed = idx < currentStatusIndex;
                            const current = idx === currentStatusIndex;
                            const future = idx > currentStatusIndex;

                            let iconClass = step.icon;
                            if (completed) iconClass = 'ri-check-line';
                            if (isErrorState && current) iconClass = isCanceled ? 'ri-stop-circle-line' : 'ri-close-line';

                            const lineCompleted = idx < currentStatusIndex - 1;
                            const lineActive = idx === currentStatusIndex - 1;

                            const getStatusColor = (key: string) => {
                                if (key === 'SUBMITTED') return '#16a34a';
                                if (key === FUNDING_REVIEW_STATUS.PENDING) return '#16a34a';
                                if (key === FUNDING_REVIEW_STATUS.IN_PROGRESS) return '#3b82f6';
                                if (key === FUNDING_REVIEW_STATUS.ACCEPTED) return '#eab308';
                                if (key === FUNDING_REVIEW_STATUS.APPROVED) return '#16a34a';
                                if (key === FUNDING_REVIEW_STATUS.REJECTED) return '#ef4444';
                                if (key === FUNDING_REVIEW_STATUS.CANCELED) return '#ef4444';
                                return '#3b82f6';
                            };

                            const stepColor = getStatusColor(step.key);

                            return (
                                <React.Fragment key={step.key}>
                                    <div className="d-flex flex-column align-items-center position-relative fr-progress-style-2134b75c">
                                        <div
                                            className="rounded-circle d-flex align-items-center justify-content-center"
                                            style={{
                                                width: 36,
                                                height: 36,
                                                backgroundColor: completed || current ? stepColor : '#fff',
                                                color: completed || current ? '#fff' : '#94a3b8',
                                                border: future ? '1.5px solid #cbd5e1' : 'none',
                                                zIndex: 2,
                                                boxShadow: current ? `0 0 0 4px ${stepColor}25` : 'none'
                                            }}
                                        >
                                            <i className={`${iconClass} fs-5`} />
                                        </div>

                                        <div
                                            className="mt-2 fs-13 fw-semibold text-center"
                                            style={{ color: completed || current ? stepColor : '#64748b' }}
                                        >
                                            {step.label}
                                        </div>

                                        {step.subtext && current && (
                                            <div className="text-center mt-1 fr-progress-style-1a4a5286">
                                                {step.subtext}
                                            </div>
                                        )}

                                        {idx === 0 && createdAt && (
                                            <div className="text-center mt-1 fw-medium fr-progress-style-1a4a5286">
                                                {formatDateTime(createdAt)}
                                            </div>
                                        )}
                                        {current && updatedAt && (
                                            <div className="text-center mt-1 fw-medium fr-progress-style-1a4a5286">
                                                {formatDateTime(updatedAt)}
                                            </div>
                                        )}
                                    </div>

                                    {idx < displaySteps.length - 1 && (
                                        <div
                                            className="flex-grow-1"
                                            style={{
                                                height: 2,
                                                marginTop: 17,
                                                backgroundColor: lineCompleted || lineActive ? getStatusColor(displaySteps[idx + 1].key) : '#e2e8f0',
                                                zIndex: 1,
                                                marginLeft: -36,
                                                marginRight: -36
                                            }}
                                        />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                <hr className="my-0 border-light" />

                {/* Status Guideline */}
                <section aria-labelledby="fr-status-guideline-title" className="p-4 pt-3">
                    <div className="d-flex align-items-center mb-3">
                        <i className="ri-information-line fs-5 me-2 fr-progress-style-3ded13b6"></i>
                        <h5 id="fr-status-guideline-title" className="mb-0 fw-bold fs-15 fr-progress-style-3ded13b6">
                            Status Guideline
                        </h5>
                    </div>

                    {/* One row per status; the request's current status is highlighted. */}
                    <ul className="list-unstyled mb-0 border rounded-3 overflow-hidden">
                        {guidelineCards.map((item, idx) => {
                            const isCurrent = item.label === status;
                            return (
                                <li
                                    key={item.label}
                                    aria-current={isCurrent ? 'step' : undefined}
                                    className={`d-flex align-items-start gap-3 px-3 py-2 ${idx > 0 ? 'border-top' : ''}`}
                                    style={{
                                        backgroundColor: isCurrent ? `${item.color}14` : '#fff',
                                        boxShadow: isCurrent ? `inset 3px 0 0 ${item.color}` : 'none',
                                    }}
                                >
                                    <div
                                        className="d-flex align-items-center justify-content-center rounded-circle text-white mt-1"
                                        style={{ width: 24, height: 24, background: item.color, flexShrink: 0 }}
                                    >
                                        <i className={`${item.icon} fs-12`}></i>
                                    </div>
                                    <div className="flex-grow-1">
                                        <div className="d-flex align-items-center gap-2">
                                            <h6 className="mb-0 fw-bold text-dark fs-14">{item.label}</h6>
                                            {isCurrent && (
                                                <span className="badge rounded-pill fs-11" style={{ backgroundColor: item.color }}>Current</span>
                                            )}
                                        </div>
                                        <p className="mb-0 fs-13 text-body">{item.desc}</p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </section>

            </div>
        </div>
    );
}