import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { fetchClientFundingOptions } from '../../../modules/client';
import ClientFundingDetail from './ClientFundingDetail';
import CustomDropdown from '../../../components/Common/CustomDropdown';
import { FundingOptionsLoader } from '../../../components/Loader/FundingSkeletonLoader';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const FUNDING_ICON_MAP: Record<string, string> = {
    'credit-card': 'bank-card',
    'shopping-cart': 'shopping-cart-2',
    'star': 'star',
    'refresh-cw': 'refresh',
    'landmark': 'bank',
    'camera': 'camera',
    'trending-up': 'line-chart',
    'settings': 'settings-3',
    'file-text': 'file-text',
    'briefcase': 'briefcase',
    'truck': 'truck',
    'building': 'building-4',
    'link': 'links',
    'tool': 'tools',
    'hard-hat': 'user-settings',
    'dollar-sign': 'money-dollar-circle',
    'percent': 'percent',
    'home': 'home-4',
    'bar-chart': 'bar-chart-2',
    'pie-chart': 'pie-chart',
    'shield': 'shield-check',
    'check-circle': 'checkbox-circle',
    'users': 'team',
    'user': 'user-3',
    'globe': 'global',
    'map-pin': 'map-pin',
    'clock': 'time',
    'calendar': 'calendar-event',
    'phone': 'phone',
    'mail': 'mail',
    'award': 'award',
    'layers': 'stack',
    'package': 'archive',
    'box': 'inbox',
    'leaf': 'plant',
    'anchor': 'anchor',
    'cpu': 'cpu',
    'zap': 'flashlight',
    'cloud': 'cloud',
    'database': 'database-2',
};

const resolveIcon = (icon: any): string => {
    const s = String(icon ?? '').trim();
    if (!s) return 'ri-file-list-3-line';
    if (s.startsWith('ri-')) return s;
    const key = s.toLowerCase();
    if (FUNDING_ICON_MAP[key]) {
        const mapped = String(FUNDING_ICON_MAP[key]).trim();
        return mapped.startsWith('ri-') ? mapped : `ri-${mapped}-line`;
    }
    const alt = key.replace(/[_\s]+/g, '-');
    if (FUNDING_ICON_MAP[alt]) {
        const mapped = String(FUNDING_ICON_MAP[alt]).trim();
        return mapped.startsWith('ri-') ? mapped : `ri-${mapped}-line`;
    }
    return `ri-${alt}-line`;
};

const getFundingColorStyles = (colorName: string) => {
    const defaultColor = { bg: '#eef2ff', text: '#4f46e5' };
    if (!colorName) return defaultColor;
    const colors: Record<string, { bg: string; text: string }> = {
        'green': { bg: '#ecfdf5', text: '#059669' },
        'blue': { bg: '#eff6ff', text: '#2563eb' },
        'purple': { bg: '#f5f3ff', text: '#7c3aed' },
        'orange': { bg: '#fff7ed', text: '#ea580c' },
        'red': { bg: '#fef2f2', text: '#dc2626' },
        'teal': { bg: '#f0fdfa', text: '#0d9488' },
        'indigo': { bg: '#eef2ff', text: '#4f46e5' },
        'pink': { bg: '#fdf2f8', text: '#db2777' },
        'yellow': { bg: '#fefce8', text: '#ca8a04' },
    };
    return colors[colorName.toLowerCase()] || defaultColor;
};

// ─── Tooltips ────────────────────────────────────────────────────────────────
const MissingTooltip: React.FC<{ factors: any[]; visible: boolean }> = ({ factors, visible }) => {
    if (!visible || factors.length === 0) return null;
    return (
        <div className="funding-missing-tooltip">
            <div className="funding-missing-tooltip-header">
                <i className="ri-error-warning-fill" style={{ color: '#F59E0B', fontSize: 18 }} />
                <span>Missing Requirements</span>
            </div>
            <p className="funding-missing-tooltip-desc">This funding option is currently locked because the following requirement(s) are not met.</p>
            <div className="funding-missing-tooltip-divider" />
            <ul className="funding-missing-tooltip-list">
                {factors.map((f, i) => {
                    const label = f.label;
                    const req = f.required_value;
                    const act = f.borrower_value;
                    
                    const lowerLabel = label.toLowerCase();
                    let actVal = act;
                    let reqVal = req;
                    
                    if (req !== undefined && req !== null) {
                        if (lowerLabel.includes('revenue') || lowerLabel.includes('deposit') || lowerLabel.includes('balance')) {
                            const fmt = (val: any) => {
                                const num = Number(val);
                                if (isNaN(num)) return val || '0';
                                return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
                            };
                            actVal = fmt(act);
                            reqVal = fmt(req);
                        } else if (lowerLabel.includes('time') || lowerLabel === 'time in business') {
                            const fmtMonths = (months: any) => {
                                const m = Number(months);
                                if (isNaN(m)) return months || '0 Months';
                                return `${Math.round(m)} Month${Math.round(m) === 1 ? '' : 's'}`;
                            };
                            actVal = fmtMonths(act);
                            reqVal = fmtMonths(req);
                        }
                    }

                    return (
                        <li key={i} className="funding-missing-tooltip-item">
                            <div className="d-flex align-items-start gap-2">
                                <i className="ri-close-circle-fill" style={{ color: '#EF4444', fontSize: 15, marginTop: 1 }} />
                                <div>
                                    <div className="tooltip-item-title">{label}: {actVal ?? 'Missing'}</div>
                                    {req !== undefined && req !== null && (
                                        <div className="tooltip-item-req">Required: {reqVal}</div>
                                    )}
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
            <div className="funding-missing-tooltip-divider" />
            <div className="funding-missing-tooltip-footer-info">
                <i className="ri-information-fill" style={{ color: '#3B82F6', fontSize: 16, marginTop: 1 }} />
                <span>Update the missing requirement(s) above to unlock this funding option.</span>
            </div>
        </div>
    );
};

const PendingTooltip: React.FC<{ visible: boolean }> = ({ visible }) => {
    if (!visible) return null;
    return (
        <div className="funding-missing-tooltip">
            <div className="funding-missing-tooltip-header">
                <i className="ri-time-fill" style={{ color: '#3B82F6', fontSize: 18 }} />
                <span>Application Under Review</span>
            </div>
            <p className="funding-missing-tooltip-desc">You have already submitted an application for this funding option.</p>
            <div className="funding-missing-tooltip-divider" />
            <ul className="funding-missing-tooltip-list">
                <li className="funding-missing-tooltip-item">
                    <div className="d-flex align-items-start gap-2">
                        <i className="ri-information-line" style={{ color: '#3B82F6', fontSize: 15, marginTop: 1 }} />
                        <div className="tooltip-item-title">Status: Awaiting Review</div>
                    </div>
                </li>
            </ul>
            <div className="funding-missing-tooltip-divider" />
            <div className="funding-missing-tooltip-footer-info">
                <i className="ri-information-fill" style={{ color: '#3B82F6', fontSize: 16, marginTop: 1 }} />
                <span>Please wait for approval or rejection before reapplying.</span>
            </div>
        </div>
    );
};

const EngineLockedTooltip: React.FC<{ visible: boolean }> = ({ visible }) => {
    if (!visible) return null;
    return (
        <div className="funding-missing-tooltip">
            <div className="funding-missing-tooltip-header">
                <i className="ri-lock-fill" style={{ color: '#6B7280', fontSize: 18 }} />
                <span>Locked</span>
            </div>
            <p className="funding-missing-tooltip-desc">This funding option is currently locked because no underwriting logic is configured.</p>
            <div className="funding-missing-tooltip-divider" />
            <div className="funding-missing-tooltip-footer-info">
                <i className="ri-information-fill" style={{ color: '#3B82F6', fontSize: 16, marginTop: 1 }} />
                <span>Please wait until requirements are set up.</span>
            </div>
        </div>
    );
};

// ─── Simple Funding Card Component ──────────────────────────────────────────────
const AdminFundingCard = ({ item, onClick }: { item: any; onClick: () => void }) => {
    const iconClass = resolveIcon(item.icon);
    const colors = getFundingColorStyles(item.icon_color);
    const [tooltipVisible, setTooltipVisible] = useState(false);
    
    // Status badges based on borrower's logic
    const missingFactors = (item.readiness_factors || []).filter((f: any) => f.status?.toLowerCase() === 'missing');
    const hasMissing = missingFactors.length > 0;
    const isPending = item.latest_review_status === 'Pending';
    const isEngineLocked = item.engine_status === 'Locked';
    const isFullyDisabled = (isPending && !hasMissing) || isEngineLocked;
    const isLocked = hasMissing || isEngineLocked;

    const displayLabel = isEngineLocked ? 'Locked' : (hasMissing ? 'Missing Info' : isPending ? 'Under Review' : 'Likely Eligible');
    const pillBg = isEngineLocked ? '#f3f4f6' : hasMissing ? '#fef3c7' : isPending ? '#f0f0ff' : `#eef2ff`;
    const pillColor = isEngineLocked ? '#4b5563' : hasMissing ? '#78350f' : isPending ? '#4f52c8' : '#4f46e5';

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div 
                className={`funding-card ${isFullyDisabled ? 'funding-card-grayed' : ''} ${isLocked ? 'funding-card-locked' : ''}`}
                onClick={(e) => {
                    if (isFullyDisabled) {
                        e.preventDefault();
                        return;
                    }
                    onClick();
                }}
                onMouseEnter={() => { 
                    if (isFullyDisabled || isLocked) setTooltipVisible(true);
                }}
                onMouseLeave={() => { 
                    setTooltipVisible(false);
                }}
            >
                {(hasMissing || isEngineLocked) && (
                    <div className="funding-card-missing-badge">
                        <i className="ri-lock-line" />
                    </div>
                )}
                {isPending && !hasMissing && !isEngineLocked && (
                    <div className="funding-card-missing-badge funding-card-pending-badge">
                        <i className="ri-time-line" />
                    </div>
                )}

                <div className="funding-card-top">
                    <div className={`funding-card-icon-wrapper ${(isFullyDisabled || isLocked) ? 'disabled' : ''}`} style={{ background: colors.bg }}>
                        <i className={iconClass} style={{ color: colors.text }} />
                    </div>
                    <div className="funding-card-text-content">
                        <h3 className="funding-card-title">{item.name}</h3>
                        <p className="funding-card-subtitle">{item.subtitle || '\u00A0'}</p>
                    </div>
                </div>

                <div className="funding-card-bottom">
                    <div className="funding-card-meta">
                        {item.amount_range && (
                            <span className="funding-card-amount">{item.amount_range}</span>
                        )}
                        <div>
                            <span className="funding-pill" style={{ background: pillBg, color: pillColor, border: `1px solid ${pillBg}` }}>
                                {displayLabel}
                            </span>
                        </div>
                    </div>
                    <div className="funding-card-arrow">
                        <i className="ri-arrow-right-line" />
                    </div>
                </div>
            </div>
            
            <MissingTooltip factors={missingFactors} visible={tooltipVisible && hasMissing && !isEngineLocked} />
            <PendingTooltip visible={tooltipVisible && isPending && !hasMissing && !isEngineLocked} />
            <EngineLockedTooltip visible={tooltipVisible && isEngineLocked} />
        </div>
    );
};

// ─── Main Component ─────────────────────────────────────────────────────────────
interface Props {
    clientId?: string | null;
}

const ClientFundingRequests: React.FC<Props> = ({ clientId }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [selectedSequence, setSelectedSequence] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeType, setActiveType] = useState<string>('all');

    useEffect(() => {
        if (clientId) loadData();
    }, [clientId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetchClientFundingOptions(clientId!);
            if (res.status) setData(res.data);
            else toast.error(res.message || 'Failed to fetch funding options');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Error fetching funding options');
        } finally {
            setLoading(false);
        }
    };

    if (!clientId) return <div className="text-muted p-4">No client selected.</div>;

    if (loading) {
        return <FundingOptionsLoader />;
    }

    if (!data || !data.groups || data.groups.length === 0) {
        return (
            <div className="text-center py-5">
                <i className="ri-information-line fs-1 text-muted d-block mb-3" />
                <h6 className="fw-semibold text-dark mb-1">No Funding Options</h6>
                <p className="text-muted fs-13">This client has no active funding options available.</p>
            </div>
        );
    }

    if (selectedSequence) {
        return (
            <ClientFundingDetail 
                clientId={clientId} 
                fundingData={selectedSequence} 
                onBack={() => setSelectedSequence(null)}
                iconClass={resolveIcon(selectedSequence.icon)}
                colors={getFundingColorStyles(selectedSequence.icon_color)}
            />
        );
    }

    const allTypes = [{ id: 'all', name: 'All Categories' }, ...(data.types || [])];
    const hasFilter = searchQuery.trim() !== '' || activeType !== 'all';

    const matchesQuery = (seq: any, q: string) => {
        if (!q) return true;
        const lq = q.toLowerCase();
        const str = (v: any) => typeof v === 'string' && v.toLowerCase().includes(lq);
        if (str(seq.name) || str(seq.subtitle) || str(seq.amount_range) || str(seq.terms) || str(seq.description)) return true;
        if (Array.isArray(seq.uses) && seq.uses.some((u: any) => String(u).toLowerCase().includes(lq))) return true;
        return false;
    };

    const filteredGroups = data.groups
        .map((group: any) => ({
            ...group,
            sequencings: group.sequencings.filter((seq: any) => {
                const matchesTab = activeType === 'all' || seq.funding_type_id?.toString() === activeType;
                const matchesSearch = matchesQuery(seq, searchQuery.trim());
                return matchesTab && matchesSearch;
            }),
        }))
        .filter((g: any) => g.sequencings.length > 0);

    const clearAll = () => { setSearchQuery(''); setActiveType('all'); };

    return (
        <div className="client-funding-options funding-page p-2">
            <div className="row mb-3">
                <div className="col-12">
                    <div className="card shadow-sm border-0 bg-white mb-2">
                        <div className="card-body p-3">
                            <div className="d-flex flex-column flex-lg-row align-items-stretch align-items-lg-center gap-3">
                                <div className="flex-grow-1">
                                    <div className="row g-3">
                                        <div className="col-12 col-md-9">
                                            <div className="input-group vendor-filter-input-group border-0 transition-all shadow-sm-hover bg-light rounded" style={{ backgroundColor: '#f3f6f9' }}>
                                                <span className="input-group-text bg-transparent border-0 pe-1">
                                                    <i className="ri-search-line text-muted opacity-75"></i>
                                                </span>
                                                <input
                                                    type="text"
                                                    className="form-control bg-transparent border-0 ps-1 fs-13 shadow-none"
                                                    placeholder="Search here..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-12 col-md-3">
                                            <div className="h-100">
                                                <CustomDropdown
                                                    options={allTypes.map(t => ({ id: t.id.toString(), name: t.name }))}
                                                    value={activeType}
                                                    onChange={(val) => { setActiveType(val.toString()); setSearchQuery(''); }}
                                                    optionLabel="name"
                                                    optionValue="id"
                                                    placeholder="All Categories"
                                                    className="border-0 rounded-2 fs-13 vendor-filter-bg h-100 w-100"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="d-flex gap-2 flex-shrink-0">
                                    <button className="btn btn-warning d-flex align-items-center justify-content-center gap-2 px-3 transition-all fs-13 shadow-sm text-white">
                                        <i className="ri-equalizer-fill align-bottom"></i> Filters
                                    </button>
                                    {hasFilter && (
                                        <button className="btn-clear d-flex align-items-center justify-content-center gap-2 px-3 transition-all fs-13" onClick={clearAll}>
                                            <i className="ri-close-line align-bottom"></i> Clear
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {filteredGroups.length === 0 ? (
                <div className="text-center py-5">
                    <i className="ri-search-eye-line fs-1 text-muted d-block mb-3" />
                    <h6 className="fw-semibold text-dark mb-1">No funding options found</h6>
                    <p className="text-muted fs-13">Try adjusting your search or filter to see more results.</p>
                    <button onClick={clearAll} className="btn btn-dark px-4 py-2 mt-2 fw-medium shadow-sm">Reset Filters</button>
                </div>
            ) : (
                filteredGroups.map((group: any) => (
                    <div key={group.id} className="mb-4">
                        <div className="d-flex align-items-center gap-2 mb-3">
                            <h5 className="mb-0 fw-bold fs-15 text-dark">{group.name}</h5>
                            <span className="funding-group-count">
                                {group.sequencings?.length || 0}
                            </span>
                        </div>
                        <div className="row g-4">
                            {group.sequencings?.map((seq: any) => (
                                <div key={seq.id} className="col-12 col-md-6 col-lg-4">
                                    <AdminFundingCard item={seq} onClick={() => setSelectedSequence(seq)} />
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default ClientFundingRequests;
