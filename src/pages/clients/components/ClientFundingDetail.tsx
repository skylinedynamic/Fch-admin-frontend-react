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
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 0',
            borderBottom: isLast ? 'none' : '1px solid #f3f4f6'
        }}>
            <div className="d-flex align-items-center gap-3">
                <i className={leftIcon} style={{ fontSize: 20, color: leftIconColor }}></i>
                <span style={{ fontSize: 14, color: '#1e293b', fontWeight: 500 }}>{factor.label}</span>
            </div>
            <div style={{
                background: badgeStyle.bg,
                color: badgeStyle.color,
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6
            }}>
                {badgeStyle.icon ? (
                    <i className={badgeStyle.icon} style={{ fontSize: 14 }} />
                ) : (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: badgeStyle.color }}></div>
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
        <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h4 className="fs-20 mb-1">{name}</h4>
                    <span className="text-muted">Viewing Funding Sequence Detail</span>
                </div>
                <button onClick={onBack} className="btn btn-primary fw-medium">
                    <i className="ri-arrow-left-line me-1 align-bottom"></i> Back
                </button>
            </div>

            <div className="card shadow-sm" style={{ borderRadius: 12, border: '1px solid #e8ecf0' }}>
                <div className="card-body p-4">
                    <div className="d-flex align-items-start justify-content-between mb-4 gap-3">
                        <div className="d-flex align-items-center gap-3">
                            <div style={{ width: 56, height: 56, borderRadius: '50%', background: colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <i className={iconClass} style={{ fontSize: 28, color: colors.text }} />
                            </div>
                            <div>
                                <h4 className="mb-1 fw-bold fs-20 text-dark">{name}</h4>
                                {subtitle && <p className="text-muted mb-0 fs-13">{subtitle}</p>}
                            </div>
                        </div>
                        <div className="text-end flex-shrink-0">
                            <span className="badge" style={{ background: isLocked ? '#f3f4f6' : '#eef2ff', color: isLocked ? '#4b5563' : '#4f46e5', padding: '6px 12px', fontSize: 13, borderRadius: 20 }}>
                                {displayLabel}
                            </span>
                        </div>
                    </div>

                    <div className="row g-0 mb-4" style={{ border: '1px solid #e8ecf0', borderRadius: 10, overflow: 'hidden' }}>
                        {metaItems.map((m, i) => (
                            <div key={i} className="col-md-3 col-6" style={{ padding: '14px 18px', borderRight: i < metaItems.length - 1 ? '1px solid #e8ecf0' : 'none' }}>
                                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: 5 }}>{m.label}</p>
                                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1e293b', lineHeight: 1.4 }}>{m.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="row g-4 mb-4">
                        <div className="col-lg-6">
                            <div className="card h-100 border-0 shadow-none mb-0" style={{ background: '#f8fafc', borderRadius: 12 }}>
                                <div className="card-body p-4">
                                    <h5 className="fs-15 fw-bold mb-3" style={{ color: '#1e293b' }}>Why They May Qualify</h5>
                                    {dynamicQualifyReasons.length === 0 ? (
                                        <div className="text-muted fs-13 d-flex align-items-center gap-2">
                                            <i className="ri-information-line fs-16" /> No strong qualifying factors available.
                                        </div>
                                    ) : (
                                        <ul className="list-unstyled mb-0 d-flex flex-column gap-3">
                                            {dynamicQualifyReasons.map((r, idx) => (
                                                <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#374151' }}>
                                                    <i className="ri-checkbox-circle-fill" style={{ color: '#16a34a', fontSize: 16, marginTop: 1, flexShrink: 0 }} />
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
                                            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f0f3f7' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                                    <i className="ri-error-warning-fill" style={{ color: '#dc2626', fontSize: 16 }} />
                                                    <span style={{ fontWeight: 700, fontSize: 13, color: '#0f1b2d' }}>Missing Documents</span>
                                                </div>
                                                <ul style={{ margin: 0, padding: '0 0 0 4px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                    {currentMissingDocs.map((doc: string, i: number) => (
                                                        <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#4b5563' }}>
                                                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#9ca3af', flexShrink: 0, display: 'inline-block' }} />
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
                            <div className="card h-100 border-1 shadow-none mb-0" style={{ borderColor: '#f3f4f6', borderRadius: 12 }}>
                                <div className="card-body p-4">
                                    <h5 className="fs-15 fw-bold mb-3" style={{ color: '#1e293b' }}>Underwriting Factors</h5>
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
                        <div className="card border-0 shadow-none mb-0 bg-light" style={{ borderRadius: 12 }}>
                            <div className="card-body p-4">
                                <h5 className="fs-15 fw-bold mb-2">Description</h5>
                                <p className="text-muted fs-14 mb-0" dangerouslySetInnerHTML={{ __html: description }}></p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
