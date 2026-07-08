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
    const timelineSteps = FUNDING_REVIEW_TIMELINE_STEPS;
    const guidelineCards = FUNDING_REVIEW_GUIDELINE_CARDS;

    let currentStatusIndex = timelineSteps.findIndex(
        (x) => x.key === status
    );

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
                            className="d-flex align-items-center justify-content-center rounded-3"
                            style={{ width: 48, height: 48, background: '#f8fafc', color: '#1e293b', marginRight: 16 }}
                        >
                            <i className="ri-line-chart-line fs-4"></i>
                        </div>
                        <div>
                            <h5 className="card-title mb-1 fs-16 fw-bold" style={{ color: '#0f172a' }}>Review Progress</h5>
                            <p className="mb-0 text-muted fs-13">Track the progress of this funding request</p>
                        </div>
                    </div>

                    <div className="d-flex align-items-center position-relative" style={{ width: 76, height: 76 }}>
                        <svg width="76" height="76" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="38" cy="38" r="34" stroke="#f1f5f9" strokeWidth="6" fill="none" />
                            <circle cx="38" cy="38" r="34" stroke={isRejected ? '#ef4444' : progressPercentage === 100 ? '#22c55e' : '#2563eb'} strokeWidth="6" fill="none"
                                strokeDasharray="213" strokeDashoffset={213 - (213 * progressPercentage / 100)}
                                strokeLinecap="round" />
                        </svg>
                        <div className="position-absolute w-100 h-100 d-flex flex-column align-items-center justify-content-center">
                            <span className="fw-bolder text-dark" style={{ fontSize: '15px', lineHeight: '1' }}>{progressPercentage}%</span>
                            <span className="fw-bold text-muted" style={{ fontSize: '10px', marginTop: '2px' }}>Complete</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card-body p-0 pt-4">

                {/* Timeline */}
                <div className="px-4 pb-4 overflow-x-auto">
                    <div className="d-flex w-100 position-relative" style={{ minWidth: 500 }}>
                        {timelineSteps.map((step, idx) => {
                            const completed = isRejected ? idx < 3 : idx < currentStatusIndex;
                            const current = idx === currentStatusIndex;
                            const future = isRejected ? (idx >= 3 && !current) : idx > currentStatusIndex;

                            let iconClass = step.icon;
                            if (completed) iconClass = 'ri-check-line';

                            const lineCompleted = isRejected ? idx < 2 : idx < currentStatusIndex - 1;
                            const lineActive = isRejected ? false : idx === currentStatusIndex - 1;

                            const getStatusColor = (key: string) => {
                                if (key === 'SUBMITTED') return '#16a34a';
                                if (key === FUNDING_REVIEW_STATUS.PENDING) return '#10b981';
                                if (key === FUNDING_REVIEW_STATUS.IN_PROGRESS) return '#3b82f6';
                                if (key === FUNDING_REVIEW_STATUS.ACCEPTED) return '#f59e0b';
                                if (key === FUNDING_REVIEW_STATUS.APPROVED) return '#22c55e';
                                if (key === FUNDING_REVIEW_STATUS.REJECTED) return '#ef4444';
                                return '#3b82f6';
                            };

                            const stepColor = getStatusColor(step.key);

                            return (
                                <React.Fragment key={step.key}>
                                    <div className="d-flex flex-column align-items-center position-relative" style={{ width: 100, flexShrink: 0 }}>
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
                                            <div className="text-center mt-1" style={{ color: '#64748b', fontSize: 11 }}>
                                                {step.subtext}
                                            </div>
                                        )}

                                        {idx === 0 && createdAt && (
                                            <div className="text-center mt-1 fw-medium" style={{ color: '#64748b', fontSize: 11 }}>
                                                {formatDateTime(createdAt)}
                                            </div>
                                        )}
                                        {current && updatedAt && (
                                            <div className="text-center mt-1 fw-medium" style={{ color: '#64748b', fontSize: 11 }}>
                                                {formatDateTime(updatedAt)}
                                            </div>
                                        )}
                                    </div>

                                    {idx < timelineSteps.length - 1 && (
                                        <div
                                            className="flex-grow-1"
                                            style={{
                                                height: 2,
                                                marginTop: 17,
                                                backgroundColor: lineCompleted || lineActive ? getStatusColor(timelineSteps[idx + 1].key) : '#e2e8f0',
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
                <div className="p-4 pt-3">
                    <div className="d-flex align-items-center mb-3">
                        <i className="ri-information-line fs-5 me-2" style={{ color: '#0f172a' }}></i>
                        <h6 className="mb-0 fw-bold" style={{ color: '#0f172a' }}>
                            Status Guideline
                        </h6>
                    </div>

                    <div className="overflow-x-auto pb-2">
                        <div className="d-flex align-items-stretch gap-2 w-100" style={{ minWidth: 800 }}>
                            {guidelineCards.map((item, idx) => (
                                <React.Fragment key={item.label}>
                                <div className="d-flex align-items-center p-2 px-xl-3 rounded-3" style={{
                                    backgroundColor: item.bg,
                                    border: `1px solid ${item.border}`,
                                    flex: 1
                                }}>
                                    <div className="d-flex align-items-center justify-content-center rounded-circle text-white me-3" style={{ width: 24, height: 24, background: item.iconBg, flexShrink: 0 }}>
                                        {item.icon ? <i className={item.icon} style={{ fontSize: '12px' }}></i> : null}
                                    </div>
                                    <div>
                                        <h6 className="mb-1 fw-bold text-dark fs-13">{item.label}</h6>
                                        <p className="mb-0 text-muted" style={{ fontSize: '11px', lineHeight: '1.4' }}>{item.desc}</p>
                                    </div>
                                </div>
                                {idx < guidelineCards.length - 1 && (
                                    <div className="d-flex align-items-center">
                                        <i className="ri-arrow-right-s-line text-muted fs-4"></i>
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}