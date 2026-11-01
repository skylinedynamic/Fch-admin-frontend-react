import React, { useState } from 'react';
import { useClientCapitalAccessOverview, useClientCapitalAccessStrategies } from '../../../modules/client';
import { CapitalAccessSkeleton } from '../../../components/Loader/SpecificSkeletons';

interface CapitalAccessSectionProps {
    clientId: string | number;
}

export default function CapitalAccessSection({ clientId }: CapitalAccessSectionProps) {
    const [showStrategiesList, setShowStrategiesList] = useState(false);

    const { data: responseData, isLoading, isError } = useClientCapitalAccessOverview(clientId, !!clientId);
    const { data: strategiesData, isLoading: isStrategiesLoading, isError: isStrategiesError } = useClientCapitalAccessStrategies(clientId, showStrategiesList && !!clientId);

    if (isLoading) {
        return <CapitalAccessSkeleton />;
    }

    if (isError || !responseData?.status) {
        return (
            <div className="alert alert-danger" role="alert">
                Failed to load Capital Access details for this client.
            </div>
        );
    }

    const overview = responseData.data;

    const score = overview?.readiness_score ?? 0;
    const status = overview?.readiness_status ?? 'N/A';
    const statusColor = overview?.readiness_status_color;
    const factors = overview?.factors ?? [];
    // Short ($1.4M, the API's formatCompactCurrency), the full amount on hover (BUG-031).
    const totalAccessFull = overview?.estimated_total_access ?? '$0';
    const totalAccess = overview?.estimated_total_access_compact || totalAccessFull;
    const exposureBreakdown = overview?.exposure_breakdown ?? [];
    const currentPlay = overview?.current_play ?? null;
    const reasonCode = overview?.reason_code ?? null;

    const maxVal = exposureBreakdown.length > 0
        ? Math.max(...exposureBreakdown.map((item: any) => item.max_exposure))
        : 0;

    /* ─── Strategy List View ─── */
    if (showStrategiesList) {
        if (isStrategiesLoading) {
            return <CapitalAccessSkeleton />;
        }

        if (isStrategiesError || !strategiesData?.status) {
            return (
                <div className="ca-page-wrap pt-0">
                    <div className="d-flex justify-content-end mb-4">
                        <button
                            onClick={() => setShowStrategiesList(false)}
                            className="btn ca-btn-back waves-effect"
                        >
                            <i className="ri-arrow-left-line align-middle me-1"></i> Back to Overview
                        </button>
                    </div>
                    <div className="alert alert-danger" role="alert">
                        Failed to load Capital Access strategies for this client.
                    </div>
                </div>
            );
        }

        const strategies = strategiesData?.data || [];
        const runningPlayId = overview?.current_play?.id;
        const hasRunningPlay = !!runningPlayId;

        const completedPlays = Array.isArray(strategies) ? strategies.filter((p: any) => p.is_completed) : [];
        const activePlays = Array.isArray(strategies) ? strategies.filter((p: any) => !p.is_completed) : [];

        const topPlay = hasRunningPlay
            ? (activePlays.find((p: any) => String(p.id) === String(runningPlayId)) || null)
            : (activePlays.find((p: any) => p.isRecommended) || activePlays[0] || null);

        const otherPlays = topPlay
            ? activePlays.filter((p: any) => String(p.id) !== String(topPlay.id))
            : activePlays;

        return (
            <div className="ca-page-wrap pt-0 text-start">
                {strategies.length === 0 ? (
                    <>
                        <div className="d-flex justify-content-end mb-4">
                            <button
                                onClick={() => setShowStrategiesList(false)}
                                className="btn ca-btn-back waves-effect"
                            >
                                <i className="ri-arrow-left-line align-middle me-1"></i> Back to Overview
                            </button>
                        </div>
                        <div className="ca-empty-state text-center py-5">
                            <div className="ca-empty-icon-wrap mb-3">
                                <i className="ri-search-eye-line fs-32"></i>
                            </div>
                            <h5 className="fw-semibold mb-2 fs-16">No Capital Access Strategies Available</h5>
                            <p className="text-muted mb-0 fs-13">There are no funding strategies available at this time.</p>
                        </div>
                    </>
                ) : (
                    <>
                        {!topPlay && (
                            <div className="d-flex justify-content-end mb-4">
                                <button
                                    onClick={() => setShowStrategiesList(false)}
                                    className="btn ca-btn-back waves-effect"
                                >
                                    <i className="ri-arrow-left-line align-middle me-1"></i> Back to Overview
                                </button>
                            </div>
                        )}
                        {/* Hero / Top Play */}
                        {topPlay && (
                            <div className="ca-hero-play-wrap mb-4">
                                <div className="ca-hero-play-card">
                                    {/* Accent bar */}
                                    <div className="ca-hero-accent-bar"></div>

                                    <div className="ca-hero-play-header">
                                        <div className="d-flex align-items-center gap-3 flex-grow-1">
                                            <div className="ca-hero-avatar">
                                                <i className={hasRunningPlay ? 'ri-play-circle-fill' : 'ri-rocket-2-fill'}></i>
                                            </div>
                                            <div>
                                                <h5 className="fw-semibold mb-1 fs-16 text-dark">{topPlay.name}</h5>
                                                <p className="text-muted fs-12 mb-0">{topPlay.description}</p>
                                            </div>
                                        </div>
                                        <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                            {hasRunningPlay ? (
                                                <span className="ca-badge-running">
                                                    <i className="ri-play-circle-fill me-1"></i> Running Play
                                                </span>
                                            ) : (
                                                <span className="ca-badge-recommended">
                                                    <i className="ri-star-fill me-1"></i> Recommended
                                                </span>
                                            )}
                                            <button
                                                onClick={() => setShowStrategiesList(false)}
                                                className="btn ca-btn-back waves-effect"
                                            >
                                                <i className="ri-arrow-left-line align-middle me-1"></i> Back to Overview
                                            </button>
                                        </div>
                                    </div>

                                    <div className="ca-hero-play-metrics">
                                        <div className="ca-play-metric-item">
                                            <div className="ca-play-metric-icon ca-play-metric-icon--primary">
                                                <i className="ri-money-dollar-circle-line"></i>
                                            </div>
                                            <div>
                                                <span className="ca-play-metric-label">Target Exposure</span>
                                                <p className="ca-play-metric-value text-primary mb-0">{topPlay.target_exposure}</p>
                                            </div>
                                        </div>
                                        <div className="ca-play-metric-divider"></div>
                                        <div className="ca-play-metric-item">
                                            <div className="ca-play-metric-icon ca-play-metric-icon--success">
                                                <i className="ri-percent-line"></i>
                                            </div>
                                            <div>
                                                <span className="ca-play-metric-label">Approval Probability</span>
                                                <p className="ca-play-metric-value text-success mb-0">{topPlay.approval_probability}</p>
                                            </div>
                                        </div>
                                        <div className="ca-play-metric-divider"></div>
                                        <div className="ca-play-metric-item">
                                            <div className="ca-play-metric-icon ca-play-metric-icon--info">
                                                <i className="ri-calendar-check-line"></i>
                                            </div>
                                            <div>
                                                <span className="ca-play-metric-label">Est. Timeline</span>
                                                <p className="ca-play-metric-value text-info mb-0">{topPlay.est_timeline}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Other Eligible Plays */}
                        {otherPlays.length > 0 && (
                            <div className="mb-4">
                                <div className="ca-section-header mb-3">
                                    <div className="d-flex align-items-center gap-2">
                                        <span className="ca-section-dot"></span>
                                        <span className="ca-section-title">Other Eligible Plays</span>
                                    </div>
                                    <span className="badge bg-primary-subtle text-primary border border-primary-subtle">{otherPlays.length} available</span>
                                </div>
                                <div className="d-flex flex-column gap-2">
                                    {otherPlays.map((play: any) => (
                                        <div key={play.id} className="ca-play-row">
                                            <div className="d-flex align-items-center gap-3 flex-grow-1" style={{ minWidth: 0 }}>
                                                <div className="ca-strategy-icon-custom flex-shrink-0">
                                                    <i className="ri-flashlight-line"></i>
                                                </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <div className="d-flex align-items-center gap-2 mb-0.5">
                                                        <h6 className="mb-0 fw-semibold fs-14 text-dark">{play.name}</h6>
                                                        {play.isRecommended && (
                                                            <span className="badge bg-success-subtle text-success fs-10 px-2 py-0.5">Recommended</span>
                                                        )}
                                                    </div>
                                                    <p className="text-muted fs-12 mb-0 text-truncate">{play.description}</p>
                                                </div>
                                            </div>
                                            <div className="ca-play-row-metrics">
                                                <div className="ca-play-row-metric d-none d-sm-flex">
                                                    <span className="ca-play-row-metric-label">Exposure</span>
                                                    <span className="ca-play-row-metric-value text-primary fw-semibold">{play.target_exposure}</span>
                                                </div>
                                                <div className="ca-play-row-metric">
                                                    <span className="ca-play-row-metric-label">Probability</span>
                                                    <span className="ca-play-row-metric-value text-success fw-semibold">{play.approval_probability}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Completed Plays */}
                        {completedPlays.length > 0 && (
                            <div className="mt-2">
                                <div className="ca-section-header mb-3">
                                    <div className="d-flex align-items-center gap-2">
                                        <span className="ca-section-dot ca-section-dot--success"></span>
                                        <span className="ca-section-title text-success">Completed Plays</span>
                                    </div>
                                    <span className="badge bg-success-subtle text-success border border-success-subtle">{completedPlays.length} completed</span>
                                </div>
                                <div className="d-flex flex-column gap-2">
                                    {completedPlays.map((play: any) => (
                                        <div key={play.id} className="ca-play-row ca-play-row--completed">
                                            <div className="d-flex align-items-center gap-3 flex-grow-1" style={{ minWidth: 0 }}>
                                                <div className="ca-strategy-icon-success flex-shrink-0">
                                                    <i className="ri-checkbox-circle-fill"></i>
                                                </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <h6 className="mb-0 fw-semibold fs-14 text-dark">{play.name}</h6>
                                                    <p className="text-muted fs-12 mb-0 text-truncate">{play.description}</p>
                                                </div>
                                            </div>
                                            <div className="ca-play-row-metrics">
                                                <div className="ca-play-row-metric d-none d-sm-flex">
                                                    <span className="ca-play-row-metric-label">Exposure Achieved</span>
                                                    <span className="ca-play-row-metric-value text-success fw-semibold">{play.target_exposure}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    }

    /* ─── Overview Dashboard ─── */
    return (
        <div className="ca-page-wrap pt-0">
            <div className="ca-dashboard-welcome">

                <div className="row g-4 mb-4">
                    {/* Capital Access Readiness Scores Card */}
                    <div className="col-md-6">
                        <div className="ca-metric-card h-100">
                            <div className="ca-metric-header">
                                <div className="ca-metric-title-block">
                                    <h6 className="ca-metric-card-label">
                                        Capital Access Readiness Scores
                                    </h6>
                                    <div className="ca-score-display">
                                        <span
                                            className="ca-score-value animate__animated animate__fadeIn"
                                            style={statusColor ? { color: statusColor } : undefined}
                                        >
                                            {score}
                                        </span>
                                        <span
                                            className="ca-score-status"
                                            style={statusColor ? { color: statusColor, backgroundColor: `${statusColor}1A` } : undefined}
                                        >
                                            {status}
                                        </span>
                                    </div>
                                </div>
                                <div className="ca-metric-icon-wrapper readiness-icon">
                                    <i className="ri-shield-flash-line"></i>
                                </div>
                            </div>

                            <div className="ca-slider-wrapper">
                                <div className="ca-custom-progress-container">
                                    <div className="progress ca-custom-progress">
                                        <div
                                            className="progress-bar ca-progress-bar-green"
                                            role="progressbar"
                                            style={{
                                                width: `${score}%`,
                                                background: statusColor ? `linear-gradient(90deg, ${statusColor}, ${statusColor}cc)` : undefined
                                            }}
                                            aria-valuenow={score}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            <div className="ca-score-factors">
                                {factors.map((factor: any, idx: number) => (
                                    <div key={idx} className="ca-factor-row d-flex align-items-center justify-content-between py-1">
                                        <span className="ca-factor-label fw-medium text-muted small">{factor.label}</span>
                                        <span className="ca-factor-value fw-semibold small">
                                            {factor.status != null && factor.status !== factor.value
                                                ? `${factor.status} (${factor.value})`
                                                : factor.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Estimated Total Access Card */}
                    <div className="col-md-6">
                        <div className="ca-metric-card h-100">
                            <div className="ca-metric-header">
                                <div className="ca-metric-title-block">
                                    {/* The plays the client qualifies for, less those completed: what is left (BUG-031). */}
                                    <h6 className="ca-metric-card-label">
                                        Estimated Remaining Access
                                    </h6>
                                    <div className="ca-access-value animate__animated animate__fadeIn" title={totalAccessFull}>
                                        {totalAccess}
                                    </div>
                                    <small className="text-muted d-block mt-1">From the plays the client qualifies for and has not completed yet</small>
                                </div>
                                <div className="ca-metric-icon-wrapper access-icon">
                                    <i className="ri-money-dollar-box-line"></i>
                                </div>
                            </div>

                            {reasonCode && reasonCode !== 'NO_ACTIVE_PLAY_CHOSEN' && reasonCode !== 'NEXT_PLAY_DELAY_ACTIVE' && (
                                <div className={`alert ${reasonCode === 'ALL_PLAYS_COMPLETED' ? 'alert-success border-success-subtle' : 'alert-danger border-danger-subtle'} rounded-3 fs-13 d-flex align-items-center gap-3 animate__animated animate__fadeIn`}>
                                    <span className="fs-18 flex-shrink-0">
                                        <i className={reasonCode === 'ALL_PLAYS_COMPLETED' ? 'ri-checkbox-circle-fill' : 'ri-lock-2-fill'}></i>
                                    </span>
                                    <div className="flex-grow-1">
                                        <strong className="d-block mb-1 fs-14">
                                            {reasonCode === 'ALL_PLAYS_COMPLETED' && 'All Plays Completed'}
                                            {reasonCode === 'FICO_BELOW_MINIMUM' && 'Qualifications Not Met'}
                                            {reasonCode === 'TIER_BELOW_MINIMUM' && 'Tier Status Insufficient'}
                                            {reasonCode === 'UTILIZATION_ABOVE_MAXIMUM' && 'Utilization Too High'}
                                            {reasonCode === 'RECENT_LATE_PAYMENTS' && 'Recent Late Payments'}
                                            {reasonCode === 'REQUIREMENTS_NOT_MET' && 'Qualifications Not Met'}
                                        </strong>
                                        <span className="fs-12 d-block">
                                            {reasonCode === 'ALL_PLAYS_COMPLETED' && 'All available strategic funding plays have been completed.'}
                                            {reasonCode === 'FICO_BELOW_MINIMUM' && "Client's current FICO score is below the minimum required for available plays."}
                                            {reasonCode === 'TIER_BELOW_MINIMUM' && "Client's current business tier status does not meet the minimum requirements."}
                                            {reasonCode === 'UTILIZATION_ABOVE_MAXIMUM' && "Client's credit utilization ratio exceeds the maximum threshold."}
                                            {reasonCode === 'RECENT_LATE_PAYMENTS' && 'Recent late payments detected on client profile restrict access to new plays.'}
                                            {reasonCode === 'REQUIREMENTS_NOT_MET' && "Client's credit profile does not meet the minimum criteria to initiate plays."}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {exposureBreakdown && exposureBreakdown.length > 0 ? (
                                <div className="ca-exposure-vertical-chart">
                                    {exposureBreakdown.map((item: any, index: number) => {
                                        const percentage = maxVal > 0 ? (item.max_exposure / maxVal) * 100 : 0;
                                        const barHeight = Math.max(percentage, 5);
                                        const barGradient = statusColor
                                            ? `linear-gradient(180deg, ${statusColor}cc 0%, ${statusColor} 100%)`
                                            : undefined;

                                        return (
                                            <div
                                                key={index}
                                                className="ca-exposure-vertical-bar animate__animated animate__fadeInUp"
                                                style={{
                                                    height: `${barHeight}%`,
                                                    background: barGradient
                                                }}
                                            >
                                                <div className="ca-bar-tooltip">
                                                    <span className="ca-tooltip-name">{item.name}</span>
                                                    <span className="ca-tooltip-value">{item.formatted_max_exposure}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="ca-no-chart-wrap">
                                    <div className="ca-no-chart-icon">
                                        <i className="ri-bar-chart-2-line"></i>
                                    </div>
                                    <p className="text-muted mb-0 fs-12 fw-medium text-center lh-base">
                                        Exposure projection chart is unavailable when there are no active eligible strategies.
                                    </p>
                                </div>
                            )}

                            <div className="ca-access-footer">
                                Across Eligible Plays
                            </div>
                        </div>
                    </div>
                </div>

                {/* Active Play / No Play Banner with button on the right */}
                <div className="card mb-0 shadow-sm ca-active-play-card">
                    <div className="card-body p-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
                        <div className="d-flex align-items-center gap-3">
                            <div className="ca-active-play-icon flex-shrink-0">
                                <i className="ri-play-circle-fill"></i>
                            </div>
                            <div className="text-start">
                                <h5 className="fw-semibold mb-1 text-dark fs-16">
                                    {currentPlay ? 'Active Strategy Play' : 'Strategy Action'}
                                </h5>
                                <p className="text-muted mb-0 fs-13">
                                    {currentPlay ? (
                                        <>The client is currently working on the <strong className="text-primary fw-semibold">{currentPlay.name}</strong> play.</>
                                    ) : (
                                        'No active strategy play is currently chosen by the client.'
                                    )}
                                </p>
                            </div>
                        </div>
                        {((exposureBreakdown && exposureBreakdown.length > 0) || currentPlay) && (
                            <div className="flex-shrink-0">
                                <button
                                    onClick={() => setShowStrategiesList(true)}
                                    className="btn btn-primary waves-effect waves-light"
                                >
                                    <i className="ri-list-check-2 align-middle me-2"></i>
                                    View Strategy List
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
