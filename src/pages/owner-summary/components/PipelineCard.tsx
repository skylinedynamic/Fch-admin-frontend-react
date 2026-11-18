import type { OwnerPipeline } from '../../../modules/owner-summary';
import { PIPELINE_STAGE, PIPELINE_STAGE_LABELS, type PipelineStage } from '../../../config/ownerSummary';
import { compactMoney, money, percent } from './format';

const STAGE_COLORS: Record<PipelineStage, string> = {
    [PIPELINE_STAGE.INTAKE]: '#001f3f',
    [PIPELINE_STAGE.UNDERWRITING]: '#1f4a7a',
    [PIPELINE_STAGE.APPROVED]: '#3a6ea5',
    [PIPELINE_STAGE.WITH_LENDER]: '#5b8cc2',
    [PIPELINE_STAGE.CLOSING]: '#0b6b4c',
    [PIPELINE_STAGE.ON_HOLD]: '#adb5bd',
    [PIPELINE_STAGE.FUNDED]: '#0b6b4c',
};

/** "Underwriting Review to Ready for Submission" - the first and last status of a stage. */
const statusSpan = (statuses: string[]) => (statuses.length > 1 ? `${statuses[0]} to ${statuses[statuses.length - 1]}` : statuses[0] ?? '');

/**
 * Where every open application stands now, and how many reached each stage
 * during the period - separate counts, never a conversion rate.
 */
export default function PipelineCard({ data }: { data: OwnerPipeline }) {
    const most = Math.max(1, ...data.groups.map((group) => group.count));
    const activity = [...data.groups.map((group) => group.key), PIPELINE_STAGE.FUNDED];

    return (
        <div className="os-card os-grow-wide" data-testid="owner-pipeline">
            <div className="os-line" style={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
                <h2 className="os-card-title">Open Applications</h2>
                <span style={{ fontSize: 13, color: 'var(--os-muted)' }}>{data.open.count} open · {compactMoney(data.open.requested)} requested</span>
            </div>
            <p className="os-card-sub">Where every open funding application stands, as of now</p>

            <div className="os-gap" style={{ gap: 14, marginTop: 18 }} role="table" aria-label="Open Applications by stage">
                {data.groups.map((group) => (
                    <div className="os-stage" role="row" key={group.key}>
                        <div role="cell">
                            <span className="os-stage__label">{PIPELINE_STAGE_LABELS[group.key]}</span>
                            <span className="os-stage__statuses">{statusSpan(group.statuses)}</span>
                        </div>
                        <div className="os-stage__track" aria-hidden="true">
                            <div className="os-stage__bar" style={{ width: `${percent(group.count, most)}%`, background: STAGE_COLORS[group.key] }}></div>
                        </div>
                        <div className="os-stage__end" role="cell">
                            <span className="os-stage__count">{group.count}</span>
                            <span className="os-stage__amount">{money(group.requested)}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="os-activity">
                {activity.map((stage) => (
                    <div key={stage}>
                        <div className="os-activity__label">Reached {PIPELINE_STAGE_LABELS[stage].toLowerCase()}</div>
                        <div className="os-activity__count">{data.activity[stage] ?? 0}</div>
                    </div>
                ))}
            </div>
            <p className="os-note" style={{ marginTop: 10 }}>
                What happened this period at each stage. These are separate counts, not one group followed through.{' '}
                {data.median_days_to_fund === null
                    ? 'No deal was funded this period.'
                    : `${data.median_days_to_fund} days median to fund, from application to funded.`}
            </p>
        </div>
    );
}
