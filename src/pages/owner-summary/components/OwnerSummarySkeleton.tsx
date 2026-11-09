const STREAM_ROWS = 5;
const SIDE_ROWS = 4;
const ATTENTION_ITEMS = 11;

/** Which parts each headline card has, in KpiCards' order: net, funded, deals, partners, clients, leads, conversion. */
const KPI_CARDS = [
    { foot: true, rows: false },
    { foot: true, rows: true },
    { foot: true, rows: true },
    { foot: false, rows: true },
    { foot: false, rows: true },
    { foot: true, rows: true },
    { foot: true, rows: true },
];

type BoneKind = 'line' | 'title' | 'value' | 'tag';

function Bone({ kind = 'line', width }: { kind?: BoneKind; width?: string }) {
    return <div className={`os-skeleton os-skeleton--${kind}`} style={width ? { width } : undefined}></div>;
}

function Lines({ count, left = '45%', right = '20%' }: { count: number; left?: string; right?: string }) {
    return (
        <>
            {Array.from({ length: count }, (_, i) => (
                <div className="os-skeleton-line" key={i}>
                    <Bone width={left} />
                    <Bone width={right} />
                </div>
            ))}
        </>
    );
}

/**
 * The page's first load: the real layout classes with placeholders in them, so
 * it follows the page at every width and nothing jumps when the numbers arrive.
 */
export default function OwnerSummarySkeleton() {
    return (
        <div className="os-skeleton-page" data-testid="owner-skeleton" role="status" aria-label="Loading summary" aria-busy="true">
            <div className="os-skeleton-line">
                <Bone width="55%" />
            </div>

            <div className="os-kpis">
                {KPI_CARDS.map((card, i) => (
                    <div className="os-card os-kpi" key={i}>
                        <Bone kind="title" width="60%" />
                        <Bone kind="value" />
                        {card.foot && (
                            <div className="os-kpi__foot">
                                <Bone kind="tag" />
                                <Bone width="45%" />
                            </div>
                        )}
                        {card.rows && (
                            <div className="os-kpi__rows">
                                <Lines count={2} left="30%" right="25%" />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="os-row">
                <div className="os-card os-grow-wide">
                    <Bone kind="title" width="22%" />
                    <div className="os-skeleton-sub">
                        <Bone width="55%" />
                    </div>
                    <div className="os-skeleton-head"></div>
                    {Array.from({ length: STREAM_ROWS }, (_, i) => (
                        <div className="os-skeleton-stream" key={i}>
                            <div className="os-skeleton-rows" style={{ flex: 1, marginTop: 0, gap: 8 }}>
                                <Bone width="28%" />
                                <Bone width="42%" />
                            </div>
                            <Bone width="10%" />
                        </div>
                    ))}
                    <div className="os-skeleton-total">
                        <Bone width="18%" />
                        <Bone width="12%" />
                    </div>
                    <div className="os-skeleton-note">
                        <Bone width="50%" />
                    </div>
                </div>
                <div className="os-grow-side">
                    <div className="os-card">
                        <Bone kind="title" width="55%" />
                        <div className="os-skeleton-sub">
                            <Bone width="85%" />
                        </div>
                        <div className="os-skeleton-rows">
                            <Lines count={SIDE_ROWS + 1} />
                        </div>
                    </div>
                    <div className="os-card" style={{ flex: 1 }}>
                        <Bone kind="title" width="55%" />
                        <div className="os-skeleton-sub">
                            <Bone width="45%" />
                        </div>
                        <div className="os-skeleton-rows">
                            <Bone kind="value" />
                            <Lines count={3} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="os-card os-card--flush">
                <div className="os-card__head">
                    <Bone kind="title" width="18%" />
                </div>
                <div className="os-attention">
                    {Array.from({ length: ATTENTION_ITEMS }, (_, i) => (
                        <div className="os-attention__item" key={i}>
                            <div className="os-skeleton-rows" style={{ flex: 1, marginTop: 0 }}>
                                <Bone width="70%" />
                                <Bone width="45%" />
                            </div>
                            <Bone kind="tag" width="24px" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
