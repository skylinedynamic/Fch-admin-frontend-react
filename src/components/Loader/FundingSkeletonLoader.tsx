import React from 'react';

// ─── Reusable skeleton card — IDENTICAL layout every time ────────────────────
export const SkeletonCard = () => (
    <div
        style={{
            display: 'flex',
            alignItems: 'stretch',
            gap: 14,
            background: '#fff',
            border: '1px solid #e8ecf0',
            borderRadius: 12,
            padding: '16px 18px',
            width: '100%',
            minHeight: 110,
        }}
    >
        <div className="skeleton-line flex-shrink-0" style={{ width: 44, height: 44, borderRadius: 10, alignSelf: 'center' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div className="skeleton-line" style={{ width: '72%', height: 14, borderRadius: 4 }} />
            <div style={{ margin: '8px 0' }}>
                <div className="skeleton-line mb-1" style={{ width: '90%', height: 11, borderRadius: 4 }} />
                <div className="skeleton-line" style={{ width: '75%', height: 11, borderRadius: 4 }} />
            </div>
            <div className="d-flex gap-2">
                <div className="skeleton-line" style={{ width: 80, height: 20, borderRadius: 20 }} />
                <div className="skeleton-line" style={{ width: 60, height: 20, borderRadius: 20 }} />
            </div>
        </div>
        <div className="skeleton-line flex-shrink-0" style={{ width: 30, height: 30, borderRadius: '50%', alignSelf: 'center' }} />
    </div>
);

// ─── Reusable group skeleton ──────────────────────────────────────────────────
export const SkeletonGroup = ({ cards = 3, titleWidth = 200 }: { cards?: number; titleWidth?: number }) => (
    <div className="mb-5">
        <div className="d-flex align-items-center gap-2 mb-4 pb-2 border-bottom">
            <div className="skeleton-line" style={{ width: 32, height: 32, borderRadius: '50%' }} />
            <div>
                <div className="skeleton-line mb-2" style={{ width: titleWidth, height: 18, borderRadius: 4 }} />
                <div className="skeleton-line" style={{ width: titleWidth + 100, height: 14, borderRadius: 4 }} />
            </div>
        </div>
        <div className="row g-4">
            {Array.from({ length: cards }).map((_, i) => (
                <div className="col-12 col-md-6 col-lg-4 d-flex align-items-stretch" key={i}>
                    <SkeletonCard />
                </div>
            ))}
        </div>
    </div>
);

export const FundingOptionsLoader = () => (
    <div className="client-funding-options p-2">
        <SkeletonGroup cards={3} titleWidth={150} />
        <SkeletonGroup cards={2} titleWidth={200} />
    </div>
);

export const FundingDetailLoader = () => (
    <div>
        <div className="d-flex align-items-center justify-content-between mb-4">
            <div>
                <div className="skeleton-line mb-2" style={{ width: 180, height: 22, borderRadius: 4 }} />
                <div className="skeleton-line" style={{ width: 110, height: 13, borderRadius: 4 }} />
            </div>
            <div className="skeleton-line" style={{ width: 80, height: 36, borderRadius: 4 }} />
        </div>
        
        <div className="card border-0 shadow-sm" style={{ borderRadius: 12, overflow: 'hidden' }}>
            <div className="card-body p-4">
                <div className="d-flex align-items-start justify-content-between mb-4 flex-wrap gap-3">
                    <div className="d-flex align-items-center gap-3">
                        <div className="skeleton-line flex-shrink-0" style={{ width: 56, height: 56, borderRadius: '50%' }} />
                        <div>
                            <div className="skeleton-line mb-2" style={{ width: 220, height: 20, borderRadius: 4 }} />
                            <div className="skeleton-line" style={{ width: 280, height: 13, borderRadius: 4 }} />
                        </div>
                    </div>
                    <div className="text-end flex-shrink-0">
                        <div className="skeleton-line" style={{ width: 110, height: 32, borderRadius: 20 }} />
                    </div>
                </div>
                <div className="row g-0 mb-4" style={{ border: '1px solid #e8ecf0', borderRadius: 10, overflow: 'hidden' }}>
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className={`col-md-3 col-6 p-3`} style={{ borderRight: i < 3 ? '1px solid #e8ecf0' : 'none' }}>
                            <div className="skeleton-line mb-2" style={{ width: '60%', height: 10, borderRadius: 4 }} />
                            <div className="skeleton-line" style={{ width: '80%', height: 14, borderRadius: 4 }} />
                        </div>
                    ))}
                </div>
                <div className="row g-4 mb-4">
                    {[0, 1].map(i => (
                        <div key={i} className="col-md-6">
                            <div style={{ border: i === 0 ? 'none' : '1px solid #f3f4f6', background: i === 0 ? '#f8fafc' : '#fff', borderRadius: 12, padding: '20px 22px', minHeight: 220 }}>
                                <div className="skeleton-line mb-4" style={{ width: 140, height: 14, borderRadius: 4 }} />
                                {[90, 80, 85, 70].map((w, j) => (
                                    <div key={j} className="d-flex align-items-center gap-2 mb-3">
                                        <div className="skeleton-line flex-shrink-0" style={{ width: 16, height: 16, borderRadius: '50%' }} />
                                        <div className="skeleton-line" style={{ width: `${w}%`, height: 12, borderRadius: 4 }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);
