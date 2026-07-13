import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { fetchClientReadinessFactors } from '../../../modules/client';
import { QUALIFY_REASONS_MAP, READINESS_BADGE_STYLES, META_ITEM_LABELS, FACTOR_ICON_STYLES, READINESS_FACTOR_LABELS, FACTOR_STATUS_VALUES, BADGE_LABELS } from '../../../config/funding';
import { FundingDetailLoader } from '../../../components/Loader/FundingSkeletonLoader';

const ReadinessItem: React.FC<{ factor: any, isLast: boolean }> = ({ factor, isLast }) => {
    const s = (factor.status || '').toLowerCase();
    let leftIcon = 'ri-question-line';
    let leftIconColor = '#9ca3af';

    if (FACTOR_ICON_STYLES[s]) {
        leftIcon = FACTOR_ICON_STYLES[s].icon;
        leftIconColor = FACTOR_ICON_STYLES[s].color;
    }

    let badgeText = factor.status;
    if ((factor.label === READINESS_FACTOR_LABELS.RESTRICTED_STATE || factor.label === READINESS_FACTOR_LABELS.RESTRICTED_INDUSTRY) && s === FACTOR_STATUS_VALUES.MISSING) {
        badgeText = BADGE_LABELS.RESTRICTED;
    } else if ((factor.label === READINESS_FACTOR_LABELS.STATE_ELIGIBILITY || factor.label === READINESS_FACTOR_LABELS.INDUSTRY_ELIGIBILITY) && (s === FACTOR_STATUS_VALUES.GOOD || s === FACTOR_STATUS_VALUES.STRONG)) {
        badgeText = BADGE_LABELS.ELIGIBLE;
    }

    const badgeStyle = READINESS_BADGE_STYLES[s] || READINESS_BADGE_STYLES.default || { bg: '#f3f4f6', color: '#4b5563' };

    return (
        <div className={`ca-readiness-row status-${s} ${isLast ? 'is-last' : ''}`}>
            <div className="d-flex align-items-center gap-3">
                <i className={`${leftIcon} ca-readiness-icon`} style={{ color: leftIconColor }} />
                <span className="ca-readiness-label">{factor.label.toLowerCase() === 'time in business' ? 'Months' : factor.label}</span>
            </div>
            <div className="ca-readiness-badge">
                {badgeStyle.icon ? (
                    <i className={`${badgeStyle.icon} ca-badge-icon`} />
                ) : (
                    <div className="ca-badge-dot" />
                )}
                {badgeText}
            </div>
        </div>
    );
};

interface ClientFundingDetailProps {
    clientId: string | number;
    fundingData: any;
    onBack: () => void;
    iconClass: string;
    colors: { bg: string; text: string };
}

export default function ClientFundingDetail({ clientId, fundingData, onBack, iconClass, colors }: ClientFundingDetailProps) {
    const [loading, setLoading] = useState(true);
    const [dynamicReadiness, setDynamicReadiness] = useState<any[]>([]);
    const [dynamicQualifyReasons, setDynamicQualifyReasons] = useState<any[]>([]);

    useEffect(() => {
        setLoading(true);
        fetchClientReadinessFactors(clientId, fundingData.id).then((res) => {
            if (res.status && Array.isArray(res.data)) {
                setDynamicReadiness(res.data);
                const generatedReasons: any[] = [];
                res.data.forEach((r: any) => {
                    if (r.status === 'Good' || r.status === 'Strong') {
                        const l = r.label || '';
                        let text = QUALIFY_REASONS_MAP[l] || `${l} meets requirements`;
                        generatedReasons.push({ label: text, status: r.status });
                    }
                });
                setDynamicQualifyReasons(generatedReasons);
            }
        }).catch(() => {
            toast.error("Failed to load readiness factors");
        }).finally(() => setLoading(false));
    }, [clientId, fundingData.id]);

    const {
        name, subtitle, amount_range, terms, speed_to_funds, uses = [], description, engine_status, engine_status_label
    } = fundingData;

    const displayLabel = engine_status_label || 'Likely Eligible';
    const isLocked = engine_status === 'Locked';

    const metaItems = [
        { label: META_ITEM_LABELS.RECOMMENDED_RANGE, value: amount_range || '—' },
        { label: META_ITEM_LABELS.TERM, value: terms || '—' },
        { label: META_ITEM_LABELS.SPEED_TO_FUNDS, value: speed_to_funds ? `${speed_to_funds} Days` : '—' },
        { label: META_ITEM_LABELS.USES, value: Array.isArray(uses) && uses.length > 0 ? uses.join(', ') : '—' },
    ];

    if (loading) {
        return <FundingDetailLoader />;
    }

    return (
        <div className="client-funding-options w-100">
            <div className="row">
                <div className="col-12">
                    <div className="card shadow-sm ca-funding-detail-card">
                        <div className="card-body p-4">
                            <div className="d-flex align-items-start justify-content-between mb-4 gap-3">
                                <div className="d-flex align-items-center gap-3">
                                    <div className={`ca-detail-icon-wrapper color-${fundingData.icon_color?.toLowerCase() || 'indigo'}`}>
                                        <i className={`${iconClass} ca-detail-icon`} />
                                    </div>
                                    <div>
                                        <h4 className="mb-1 fs-16 text-dark">{name}</h4>
                                        {subtitle && <p className="text-muted mb-0 fs-13">{subtitle}</p>}
                                    </div>
                                </div>
                                <div className="text-end flex-shrink-0 d-flex align-items-center gap-2">
                                    <span className={`badge ca-detail-status-badge ${isLocked ? 'is-locked' : 'is-eligible'}`}>
                                        {displayLabel}
                                    </span>
                                    <button onClick={onBack} className="btn btn-light ca-detail-back-btn">
                                        <i className="ri-arrow-left-line align-middle me-1"></i> Back
                                    </button>
                                </div>
                            </div>

                            <div className="row g-0 mb-4 ca-detail-meta-grid">
                                {metaItems.map((m, i) => (
                                    <div key={i} className={`col-md-3 col-6 ca-detail-meta-item ${i === metaItems.length - 1 ? 'is-last' : ''}`}>
                                        <p className="ca-meta-label">{m.label}</p>
                                        <p className="ca-meta-value">{m.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="row g-4 mb-4">
                                <div className="col-lg-6">
                                    <div className="card h-100 border-0 shadow-none mb-0 ca-detail-qualify-card">
                                        <div className="card-body p-4">
                                            <h5 className="fs-15 fw-bold mb-3 text-dark">Why They May Qualify</h5>
                                            {dynamicQualifyReasons.length === 0 ? (
                                                <div className="text-muted fs-13 d-flex align-items-center gap-2">
                                                    <i className="ri-information-line fs-16" /> No strong qualifying factors available.
                                                </div>
                                            ) : (
                                                <ul className="list-unstyled mb-0 d-flex flex-column gap-3">
                                                    {dynamicQualifyReasons.map((r, idx) => (
                                                        <li key={idx} className="ca-qualify-reason-item">
                                                            <i className="ri-checkbox-circle-fill text-success fs-16 flex-shrink-0" />
                                                            {r.label}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}

                                            {(() => {
                                                const extractedDocs = dynamicReadiness
                                                    .filter((f: any) => f.missing_docs && f.missing_docs.length > 0)
                                                    .flatMap((f: any) => f.missing_docs);
                                                const combinedDocs = [...extractedDocs, ...(fundingData.missing_documents || [])];
                                                const currentMissingDocs = Array.from(new Set(combinedDocs));

                                                return currentMissingDocs.length > 0 && (
                                                    <div className="ca-detail-missing-docs-wrap">
                                                        <div className="ca-detail-missing-docs-header">
                                                            <i className="ri-error-warning-fill text-danger fs-16" />
                                                            <span className="fw-bold fs-13 text-dark">Missing Documents</span>
                                                        </div>
                                                        <ul className="ca-detail-missing-docs-list">
                                                            {currentMissingDocs.map((doc: string, i: number) => (
                                                                <li key={i} className="ca-detail-missing-docs-item">
                                                                    <span className="ca-bullet-dot" />
                                                                    {doc}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                <div className="col-lg-6">
                                    <div className="card h-100 shadow-none mb-0 ca-detail-underwriting-card">
                                        <div className="card-body p-4">
                                            <h5 className="fs-15 fw-bold mb-3 text-dark">Underwriting Factors</h5>
                                            <div className="d-flex flex-column">
                                                {dynamicReadiness.map((factor, idx) => (
                                                    <ReadinessItem key={idx} factor={factor} isLast={idx === dynamicReadiness.length - 1} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {description && (
                                <div className="card border-0 shadow-none mb-0 ca-detail-desc-card">
                                    <div className="card-body p-4">
                                        <h5 className="fs-15 fw-bold mb-2 text-dark">Description</h5>
                                        <p className="text-muted fs-14 mb-0" dangerouslySetInnerHTML={{ __html: description }}></p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
