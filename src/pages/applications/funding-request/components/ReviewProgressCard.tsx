import React from 'react';
import { FUNDING_REVIEW_STATUS } from '../../../../config/funding';

interface ReviewProgressCardProps {
    status: string;
    createdAt?: string;
    updatedAt?: string;
}

export default function ReviewProgressCard({
    status,
    createdAt,
    updatedAt,
}: ReviewProgressCardProps) {

    const isRejected =
        status === FUNDING_REVIEW_STATUS.REJECTED;

    const timelineSteps = [
        {
            key: 'SUBMITTED',
            label: 'Submitted',
            icon: 'ri-file-list-3-line',
        },
        {
            key: FUNDING_REVIEW_STATUS.PENDING,
            label: 'Pending',
            icon: 'ri-time-line',
        },
        {
            key: FUNDING_REVIEW_STATUS.IN_PROGRESS,
            label: 'In Progress',
            subtext: 'Under Review',
            icon: 'ri-user-3-fill',
        },
        {
            key: FUNDING_REVIEW_STATUS.ACCEPTED,
            label: 'Accepted',
            icon: 'ri-checkbox-circle-line',
        },
        {
            key: FUNDING_REVIEW_STATUS.APPROVED,
            label: 'Approved',
            icon: 'ri-user-follow-line',
        },
        {
            key: FUNDING_REVIEW_STATUS.REJECTED,
            label: 'Rejected',
            icon: 'ri-user-unfollow-line',
        },
    ];

    const guidelines = [
        {
            label: 'Pending',
            desc: 'Request submitted and waiting for review',
            color: '#10b981',
        },
        {
            label: 'In Progress',
            desc: 'Admin is reviewing the request',
            color: '#3b82f6',
        },
        {
            label: 'Accepted',
            desc: 'Review completed successfully',
            color: '#f59e0b',
        },
        {
            label: 'Approved',
            desc: 'Request approved and funding can begin',
            color: '#22c55e',
        },
        {
            label: 'Rejected',
            desc: 'Request has been rejected',
            color: '#ef4444',
        },
    ];

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
            <div className="card-header bg-white border-0 p-4 pb-0">
                <div className="d-flex align-items-center">
                    <div 
                        className="d-flex align-items-center justify-content-center rounded" 
                        style={{ width: 32, height: 32, background: '#f0f5ff', color: '#3b82f6', marginRight: 12 }}
                    >
                        <i className="ri-team-line fs-5"></i>
                    </div>
                    <h5 className="card-title mb-0 fs-15 fw-bold" style={{ color: '#0f172a' }}>Review Progress</h5>
                </div>
            </div>

            <div className="card-body p-0 pt-4">

                {/* Timeline */}
                <div className="px-4 pb-4 overflow-auto">

                    <div className="d-flex w-100 position-relative" style={{ minWidth: 600 }}>
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
                <div className="p-4">
                    <div className="d-flex align-items-center mb-3">
                        <i className="ri-information-line fs-5 me-2" style={{ color: '#0f172a' }}></i>
                        <h6 className="mb-0 fw-bold" style={{ color: '#0f172a' }}>
                            Status Guideline
                        </h6>
                    </div>

                    <div className="row g-3">
                        {guidelines.map((item) => (
                            <div
                                className="col-xl col-md-6"
                                key={item.label}
                            >
                                <div
                                    className="h-100 bg-white border border-light-subtle rounded-3 shadow-sm"
                                    style={{
                                        borderTop: `4px solid ${item.color} !important`,
                                        padding: 18,
                                    }}
                                >
                                    <div className="d-flex align-items-center mb-2">
                                        <span
                                            style={{
                                                width: 10,
                                                height: 10,
                                                borderRadius:
                                                    '50%',
                                                background:
                                                    item.color,
                                                marginRight: 10,
                                            }}
                                        />

                                        <h6 className="mb-0 fw-bold">
                                            {item.label}
                                        </h6>
                                    </div>

                                    <p className="mb-0 text-muted small">
                                        {item.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}